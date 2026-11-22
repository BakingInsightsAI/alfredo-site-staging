/* Every copy rule, measured in a browser on the built pages.

   These are the rules in CLAUDE.md section 3: the banned words, the banned
   phrases, no contractions, no em or en dashes, no arrows, and no capitals
   except the two shapes the design calls for. They used to live in the
   scratch harness beside the contrast sweep, which meant the rules the site
   is written to could be wiped with a temporary folder. They live with the
   site now.

   Everything a reader sees is read as rendered, alt text included, so a
   rule cannot be slipped past by putting the words in an attribute or by
   setting them in capitals from the stylesheet.

   Usage: node checks/words.js [page ...]                                 */
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8806/alfredo-site-staging/';
const ARGS = process.argv.slice(2).filter(a => a.endsWith('.html'));
const ALL = ARGS.length ? ARGS
  : ['index.html', 'product.html', 'honesty.html', 'pricing.html', 'pilot.html', 'faq.html'];

let fails = 0;
const ok = (c, m) => { console.log('    ' + (c ? 'pass  ' : 'FAIL  ') + m); if (!c) fails++; };

const BANNED = ['intelligence', 'segments', 'dayparts', 'margin bleed', 'repricing queue',
  'till', 'A/B', 'upload', 'photograph', 'confidence score', 'loop', 'venue', 'operators',
  'dwell', 'avg', 'tracked revenue'];

/* Phrases, not words. These are the shapes mechanism talk takes when it
   slips back in: how long Alfredo looks at, what it treats as the point to
   measure from, and how it counts and compares. A reader is told what they
   see and what they decide; how the answer is arrived at is not this site's
   subject. Written as phrases because each word in them is innocent on its
   own. */
const BANNED_PHRASES = ['starting point', 'baseline', 'four weeks before', 'counts the'];

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--headless=new'] });
  console.log('\n  WORDS, in everything a reader sees, alt text included');
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    const found = { banned: [], phrase: [], contraction: [], dash: [], arrow: [], caps: [] };
    for (const p of ALL) {
      await pg.goto(BASE + p, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(400);
      const r = await pg.evaluate(() => {
        const alt = [...document.querySelectorAll('img[alt], [aria-label]')]
          .map(e => e.getAttribute('alt') || e.getAttribute('aria-label')).filter(Boolean).join(' . ');
        /* The v5 brief specifies an uppercase tracked eyebrow label, so a
           small label set in caps by the stylesheet is now the house style
           rather than a fault. Everything else is still caught: anything
           typed in caps, and anything set in caps at reading size. */
        const caps = [];
        document.querySelectorAll('body *').forEach(e => {
          const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim())
            .map(n => n.nodeValue.trim()).join(' ');
          if (!t) return;
          const cs = getComputedStyle(e);
          if (cs.textTransform === 'uppercase') {
            const px = parseFloat(cs.fontSize);
            const track = parseFloat(cs.letterSpacing) / px;
            // two shapes of capitals are deliberate here. A small tracked
            // eyebrow, as the brief specifies. And a display stamp: a word
            // or two set very large, which is a typographic choice and not
            // running text. Anything else set in caps is a fault.
            const isEyebrow = px <= 13.5 && track >= 0.08;
            const isStamp = px >= 32 && t.trim().split(/\s+/).length <= 3;
            if (!isEyebrow && !isStamp) caps.push('[css ' + px + 'px] ' + t.slice(0, 40));
          }
          const words = t.match(/\b[A-Z]{3,}\b/g) || [];
          words.filter(w => !['POS', 'FAQ', 'USPTO', 'IPA'].includes(w)).forEach(w => caps.push(w));
        });
        return { text: document.body.innerText, alt, caps };
      });
      const hay = (r.text + ' . ' + r.alt);
      BANNED.forEach(w => {
        const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(hay)) found.banned.push(p + ': ' + w);
      });
      BANNED_PHRASES.forEach(w => {
        const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const m = hay.match(re);
        if (m) {
          const at = hay.toLowerCase().indexOf(m[0].toLowerCase());
          found.phrase.push(p + ': "' + hay.slice(Math.max(0, at - 24), at + m[0].length + 24).replace(/\s+/g, ' ').trim() + '"');
        }
      });
      (hay.match(/\b\w+['’](?:t|re|ve|ll|m)\b/g) || []).forEach(x => found.contraction.push(p + ': ' + x));
      (hay.match(/[–—]/g) || []).forEach(() => found.dash.push(p));
      (hay.match(/[→←↓↑➤➜]/g) || []).forEach(x => found.arrow.push(p + ': ' + x));
      r.caps.forEach(x => found.caps.push(p + ': ' + x));
    }
    ok(!found.banned.length, 'no banned word on any page' + (found.banned.length ? ': ' + found.banned.join(', ') : ''));
    ok(!found.phrase.length, 'no banned phrase on any page, so no starting point, baseline, fixed number of weeks or counting'
      + (found.phrase.length ? ': ' + found.phrase.join(' | ') : ''));
    ok(!found.contraction.length, 'no contractions' + (found.contraction.length ? ': ' + found.contraction.join(', ') : ''));
    ok(!found.dash.length, 'no em or en dashes' + (found.dash.length ? ': ' + [...new Set(found.dash)].join(', ') : ''));
    ok(!found.arrow.length, 'no arrows' + (found.arrow.length ? ': ' + found.arrow.join(', ') : ''));
    ok(!found.caps.length, 'no all caps except the tracked eyebrow label the brief specifies' + (found.caps.length ? ': ' + [...new Set(found.caps)].slice(0,5).join(' | ') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `\n  ${fails} COPY RULE(S) BROKEN` : '\n  every copy rule holds on every page');
  process.exit(fails ? 1 : 0);
})();
