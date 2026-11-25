/* Do the plan cards keep out of each other's way?

   The plans on Pricing were redesigned as full width ruled rows, but the
   layer underneath still said grid-template-columns: repeat(3, 1fr) with
   gap: 0, and the new rules never said otherwise. Above 900px wide that
   put three rows side by side in three columns with no gutter at all, so
   "$99 a month" sat on top of "THE FULL PICTURE / House", "$199" on top of
   "Group", and each disclosure's plus sign touched the next column. It
   shipped. Nothing caught it: every run of text still cleared its contrast
   floor, no page scrolled sideways, and nothing was invisible.

   So this asks the question those checks do not. Wherever the plan grid has
   more than one column:

     every card keeps at least MIN_GAP between its box and the next card's,
     nothing inside a card reaches into another card's box at all, and
     the Request a demo buttons in one row share a top edge,

   with the feature lists closed and again with them open, because a card
   that grows when a disclosure opens can push its button off the line.

   Usage: node checks/cards.js [width ...]                              */
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8806/alfredo-site-staging/';
const ARGS = process.argv.slice(2).map(Number).filter(Boolean);
const WIDTHS = ARGS.length ? ARGS : [320, 360, 390, 430, 768, 900, 1024, 1180, 1366, 1440, 1680];
const MIN_GAP = 24;          // between one card's box and the next
const BTN_SLOP = 1;          // a row's buttons may differ by this much

let fails = 0;
const ok = (c, m) => { console.log('    ' + (c ? 'pass  ' : 'FAIL  ') + m); if (!c) fails++; };

const look = `() => {
  const cards = [...document.querySelectorAll('.tiers > .tier')];
  const box = e => { const b = e.getBoundingClientRect();
    return { left: b.left + scrollX, right: b.right + scrollX, top: b.top + scrollY, bottom: b.bottom + scrollY,
             w: b.width, h: b.height }; };
  return cards.map((c, i) => ({
    i,
    name: (c.querySelector('.tier-name') || {}).textContent || ('card ' + i),
    box: box(c),
    button: c.querySelector('.btn') ? box(c.querySelector('.btn')) : null,
    // everything inside the card that paints something
    parts: [...c.querySelectorAll('*')].filter(e => {
      const b = e.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) return false;
      const cs = getComputedStyle(e);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    }).map(e => ({ what: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).trim().split(/\\s+/)[0] : ''),
                   text: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30), ...box(e) })),
  }));
}`;

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--headless=new'] });
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 },
      isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    for (const state of ['closed', 'open']) {
      await pg.goto(BASE + 'pricing.html', { waitUntil: 'networkidle' });
      if (state === 'open') {
        await pg.evaluate(() => document.querySelectorAll('.tiers details').forEach(d => { d.open = true; }));
      }
      await pg.evaluate(() => { const t = document.querySelector('.tiers'); if (t) t.scrollIntoView(); });
      await pg.waitForTimeout(700);
      const cards = await pg.evaluate(eval('(' + look + ')'));
      if (!cards.length) { ok(false, `${w}px ${state}: no plan cards found at all`); continue; }

      // group cards into rows by their top edge
      const rows = [];
      cards.forEach(c => {
        const r = rows.find(r => Math.abs(r[0].box.top - c.box.top) < 24);
        if (r) { r.push(c); } else { rows.push([c]); }
      });
      const columns = Math.max(...rows.map(r => r.length));
      if (columns < 2) {
        console.log(`    ----  ${w}px ${state}: one column, nothing to keep apart`);
        continue;
      }

      let worstGap = Infinity, gapWhere = '';
      let reach = [];
      for (const row of rows) {
        const sorted = [...row].sort((a, c) => a.box.left - c.box.left);
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i].box.left - sorted[i - 1].box.right;
          if (gap < worstGap) { worstGap = gap; gapWhere = `${sorted[i-1].name.trim()} to ${sorted[i].name.trim()}`; }
        }
      }
      ok(worstGap >= MIN_GAP,
         `${w}px ${state}: ${columns} columns, closest cards ${worstGap.toFixed(0)}px apart (${gapWhere}), floor ${MIN_GAP}`);

      // nothing inside one card may enter another card's box
      for (const a of cards) {
        for (const c of cards) {
          if (a.i === c.i) continue;
          for (const part of a.parts) {
            const over = part.left < c.box.right && part.right > c.box.left
                      && part.top < c.box.bottom && part.bottom > c.box.top;
            if (over) {
              reach.push(`${a.name.trim()}'s <${part.what}> "${part.text}" reaches into ${c.name.trim()}`);
            }
          }
        }
      }
      reach = [...new Set(reach)];
      ok(!reach.length, `${w}px ${state}: nothing reaches out of its card`
        + (reach.length ? '\n        ' + reach.slice(0, 6).join('\n        ') : ''));

      // the buttons in a row sit on one line
      for (const row of rows) {
        const tops = row.filter(c => c.button).map(c => c.button.top);
        if (tops.length < 2) continue;
        const spread = Math.max(...tops) - Math.min(...tops);
        ok(spread <= BTN_SLOP,
           `${w}px ${state}: the ${tops.length} Request a demo buttons in a row share a top edge (${spread.toFixed(0)}px apart)`);
      }
    }
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `\n  ${fails} CARD LAYOUT FAULT(S)` : '\n  the plan cards keep out of each other’s way at every width');
  process.exit(fails ? 1 : 0);
})();
