/* Is anything invisible that should not be?

   This is the check that was missing. Every sweep so far either skipped
   elements at low opacity (the contrast walk), or skipped runs whose
   pixels did not change when text was hidden (the pixel sweep, which I
   taught to ignore unpainted text and so taught to ignore this). A block
   stuck at opacity 0 passed all of them while being invisible on the page.

   So: with motion ON, scroll each page the way a visitor does, a screen at
   a time. At each stop, wait two seconds, then look at every element that
   holds real text and is inside the viewport, and compute its effective
   opacity by multiplying all the way up its ancestors. Anything still at
   zero is a failure, named with its text so it can be found.

   Two seconds is the first reading, not the verdict. The home page carries a
   fifteen second sequence whose later steps are deliberately waiting their
   turn, and they are not the bug this looks for: the bug is text that never
   arrives. So anything invisible at two seconds is given up to WAIT_CAP more
   and read again, and only what is still invisible then fails. A block stuck
   at opacity zero is stuck however long you wait, so nothing is let through.

   Things that are meant to be invisible are excluded by the only honest
   test: they are hidden by display, by visibility or by the hidden
   attribute, not merely faded to nothing.

   Usage: node visible.js [--shots] [width ...]                          */
const { chromium } = require('playwright');
const fs = require('fs');
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8806/alfredo-site-staging/';
const OUT = process.env.OUT || 'out/scroll';
const PAGES = (process.env.PAGES || 'index.html,product.html,honesty.html,pilot.html,pricing.html,faq.html').split(',');
const SHOTS = process.argv.includes('--shots');
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean);
const USE = WIDTHS.length ? WIDTHS : [320, 360, 390, 430, 768, 1366, 1440];
const SETTLE = 2000;
const WAIT_CAP = 20000;      // long enough for the longest timed sequence on the site

const look = `() => {
  const out = [];
  const seen = new Set();
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('[hidden], .skip, .sr-only, script, style, noscript')) return;
    // real text of its own, not just text in a child
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim())
      .map(n => n.nodeValue.trim()).join(' ');
    if (!own) return;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    // only what is on screen right now
    if (box.bottom <= 0 || box.top >= innerHeight) return;
    // effective opacity, all the way up
    let o = 1, n = el, hiddenAnother = false;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.contentVisibility === 'hidden') { hiddenAnother = true; break; }
      o *= parseFloat(cs.opacity);
      n = n.parentElement;
    }
    if (hiddenAnother) return;           // hidden on purpose, by another means
    if (o > 0.01) return;
    const key = el.tagName + '|' + (el.className || '') + '|' + own.slice(0, 40);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().trim().split(/\\s+/).slice(0, 3).join('.'),
      text: own.slice(0, 48), opacity: +o.toFixed(3),
      top: Math.round(box.top + scrollY)
    });
  });
  return out;
}`;

(async () => {
  if (SHOTS) { fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true }); }
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--headless=new'] });
  const faults = [];
  let stops = 0, shots = 0, patient = 0;

  for (const w of USE) {
    const h = w <= 430 ? 700 : 900;
    const ctx = await b.newContext({
      viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900,
      deviceScaleFactor: 1, reducedMotion: 'no-preference',   // motion ON, on purpose
    });
    const pg = await ctx.newPage();
    for (const p of PAGES) {
      await pg.goto(BASE + p, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(400);
      const total = await pg.evaluate(() => document.body.scrollHeight);
      let screen = 0;
      for (let y = 0; y < total; y += h) {
        await pg.evaluate(to => window.scrollTo(0, to), y);
        await pg.waitForTimeout(SETTLE);
        stops++;
        let bad = await pg.evaluate(eval('(' + look + ')'));
        let waited = SETTLE;
        // give anything invisible the rest of its sequence before calling it
        while (bad.length && waited < SETTLE + WAIT_CAP) {
          await pg.waitForTimeout(2000);
          waited += 2000;
          const still = await pg.evaluate(eval('(' + look + ')'));
          const keys = new Set(still.map(x => x.tag + '|' + x.cls + '|' + x.text));
          bad = bad.filter(x => keys.has(x.tag + '|' + x.cls + '|' + x.text));
        }
        if (waited > SETTLE) { patient++; }
        bad.forEach(x => faults.push(`${String(w).padStart(4)}px ${p.padEnd(13)} screen ${String(screen + 1).padStart(2)}  <${x.tag}${x.cls ? '.' + x.cls : ''}> opacity ${x.opacity} after ${Math.round(waited / 1000)}s on screen  "${x.text}"`));
        if (SHOTS && w === 390) {
          await pg.screenshot({ path: `${OUT}/${p.replace('.html', '')}-390-screen-${String(screen + 1).padStart(2, '0')}.png` });
          shots++;
        }
        screen++;
      }
    }
    await ctx.close();
  }
  await b.close();

  console.log(`\n  ${stops} screens looked at, two seconds each, motion on, ${USE.length} widths x ${PAGES.length} pages`);
  if (patient) { console.log(`  ${patient} of them held longer, for text that was still arriving`); }
  if (SHOTS) { console.log(`  ${shots} screenshots at 390 in ${OUT}`); }
  if (!faults.length) {
    console.log('\n  nothing with text is invisible anywhere');
  } else {
    console.log(`\n  ${faults.length} THING(S) WITH TEXT STILL AT OPACITY 0 AFTER TWO SECONDS ON SCREEN:`);
    [...new Set(faults)].forEach(f => console.log('    ' + f));
  }
  process.exit(faults.length ? 1 : 0);
})();
