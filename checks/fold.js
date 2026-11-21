/* The phone first screen is 700px tall. The pill, the headline and the
   Request a demo button must all finish above it, at 360, 390 and 430,
   after the fonts have loaded and with the staging banner in place.
   A new line under the hero support text is the reason to measure again. */
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = (process.env.BASE || 'http://127.0.0.1:8806/alfredo-site-staging/') + 'index.html';
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--headless=new'] });
  let worst = 0;
  for (const w of [320, 360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    await pg.goto(BASE, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => {
      const pick = s => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect(); return { bottom: Math.round(b.bottom + scrollY), text: (e.textContent || '').trim().slice(0, 42) }; };
      return {
        pill: pick('.founding-pill'),
        head: pick('.hero-heading'),
        sub:  pick('.hero-sub'),
        who:  pick('.hero-who'),
        cta:  pick('.hero-copy .hero-actions a.btn'),
      };
    });
    console.log(`\n  ${w}px, first screen 700px tall`);
    ['pill', 'head', 'sub', 'who', 'cta'].forEach(k => {
      const x = r[k]; if (!x) { worst++; console.log(`    ${k.padEnd(5)} MISSING, so nothing was measured`); return; }
      const must = k !== 'sub' && k !== 'who' ? true : false;
      const ok = x.bottom <= 700;
      if (must && !ok) worst++;
      console.log(`    ${k.padEnd(5)} bottom ${String(x.bottom).padStart(4)}  ${ok ? 'above the fold' : 'BELOW THE FOLD'}${must ? ' (required)' : ''}  "${x.text}"`);
    });
    await ctx.close();
  }
  await b.close();
  console.log(worst ? `\n  ${worst} REQUIRED THING(S) BELOW 700` : '\n  pill, headline and Request a demo all finish above 700 at every phone width');
  process.exit(worst ? 1 : 0);
})();
