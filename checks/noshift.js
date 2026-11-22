/* Does anything move while the page loads?

   The fonts are self hosted and metric matched, so in ordinary conditions
   nothing shifts and a quick check sees zero. On a genuinely slow phone the
   real font arrives well after first paint, and a line that fits in one
   font and wraps in the other moves everything under it. That happened to
   the hero's audience line between about 386 and 395 wide, which contains
   390: the buttons and the product window jumped 21px, and no check noticed
   because the harness that would have caught it was reading a stale copy of
   the production build.

   So: load every page at 390 on a slow connection with a slow processor,
   with the observer installed before navigation, and fail on any shift the
   reader did not cause, naming the elements the browser blames and how far
   they moved. Zero is the bar, not 0.1.

   Usage: node checks/noshift.js [page ...]                               */
const { chromium } = require('playwright');
const { stubBeacon } = require('./stub-beacon.js');
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8817/alfredo-prod/';
const PAGES = process.argv.slice(2).filter(a => a.endsWith('.html'));
const USE = PAGES.length ? PAGES : ['index.html', 'product.html', 'honesty.html', 'pilot.html', 'pricing.html', 'faq.html'];

/* What each page is allowed. Zero everywhere except two pages that already
   shifted before any of this week's work, both around the moment the fonts
   land, both small and both intermittent: roughly one load in four moves the
   heading on What it does down 9px, and About us moves a step in Getting
   started. They are written down rather than hidden under one round number,
   so a new shift anywhere, or either of these growing, fails. Every shift is
   printed whether or not it is allowed. They are not explained yet. */
const ALLOWED = { 'product.html': 0.004, 'pilot.html': 0.005 };

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--headless=new'] });
  let bad = 0;
  for (const p of USE) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    const cdp = await ctx.newCDPSession(pg);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400,
      downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await stubBeacon(pg);          // opt in, one host, see stub-beacon.js
    await pg.addInitScript(() => {
      window.__shifts = [];
      try {
        new PerformanceObserver(l => l.getEntries().forEach(e => {
          if (e.hadRecentInput) return;
          window.__shifts.push({ v: +e.value.toFixed(5), t: Math.round(e.startTime),
            sources: (e.sources || []).map(s => {
              const n = s.node;
              const box = r => `x ${Math.round(r.x)} y ${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
              if (!n || n.nodeType !== 1) return `an element the browser could not name, ${box(s.previousRect)} became ${box(s.currentRect)}`;
              const cls = n.className ? '.' + String(n.className).trim().split(/\s+/)[0] : '';
              return `${n.tagName.toLowerCase()}${cls} moved from y ${Math.round(s.previousRect.y)} to ${Math.round(s.currentRect.y)}`;
            }) });
        })).observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
    });
    await pg.goto(BASE + p, { waitUntil: 'load', timeout: 180000 });
    await pg.waitForTimeout(4500);                 // long enough for the font to land
    const sh = await pg.evaluate(() => window.__shifts);
    const total = sh.reduce((a, s) => a + s.v, 0);
    const allow = ALLOWED[p] || 0;
    const over = total > allow;
    if (over) bad++;
    console.log(`  ${p.padEnd(13)} CLS ${total.toFixed(5)} over ${sh.length} shift(s)${allow ? `, allowed up to ${allow}` : ''}${over ? '   OVER WHAT IS ALLOWED' : ''}`);
    sh.forEach(s => { console.log(`      shift ${s.v} at ${s.t}ms`); s.sources.forEach(x => console.log(`          ${x}`)); });
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `\n  ${bad} PAGE(S) MOVED MORE THAN THEY ARE ALLOWED TO`
                  : '\n  no page moved more than it is allowed to while loading');
  process.exit(bad ? 1 : 0);
})();
