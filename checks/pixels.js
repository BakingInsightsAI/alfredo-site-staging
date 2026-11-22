/* Contrast measured off the rendered pixels, for the runs no DOM walk can
   read: text on a photograph, and text whose colour comes from a gradient
   clipped to the glyphs. The page is captured as painted, captured again
   with every glyph transparent, and the ground under each run is read from
   the second capture.

   It lives with the site because of how it failed. Its address used to end
   in the folder name, so the moment the runner started passing the folder
   as an argument it fetched .../alfredo-site-staging/alfredo-site-staging
   index.html, which is a 404 page. goto does not throw on a 404, so the
   sweep measured the server's error page, found 78 runs of text on it, and
   reported that every one cleared its floor. It did that for weeks.

   Two changes came out of that: the address is the server root and the
   folder is a separate argument, and the sweep stops dead if any page
   answers with anything but 200. A check that cannot reach the site must
   say so, not pass.

   Usage: node checks/pixels.js [folder] [--open] [width ...]            */
const { chromium } = require('playwright');
const { stubBeacon } = require('./stub-beacon.js');
// The root the folder argument hangs off, not a folder itself. It used to
// end in alfredo-site-staging/, so the moment checks.sh started passing the
// folder name as well this fetched .../alfredo-site-staging/alfredo-site-
// stagingindex.html, which is a 404 page. goto does not throw on a 404, so
// the sweep measured the server's error page and reported that it passed.
const BASE = process.env.BASE_ROOT || 'http://127.0.0.1:8806/';
const EXE = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let SUB = process.argv[2] === undefined ? '' : process.argv[2];
if (SUB && !SUB.endsWith('/')) { SUB += '/'; }
const OPEN = process.argv.includes('--open');
const WIDTHS = process.argv.slice(3).map(Number).filter(Boolean);
const USE = WIDTHS.length ? WIDTHS : [390, 768, 1440];
const PAGES = ['index.html', 'product.html', 'honesty.html', 'pricing.html', 'pilot.html', 'faq.html'];

function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function L(r, g, b) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
function cr(a, b) { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); }

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--headless=new'] });
  const reader = await (await b.newContext()).newPage();
  let total = 0, worst = 99;
  const fails = [];

  for (const W of USE) {
    for (const p of PAGES) {
      const ctx = await b.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
      const pg = await ctx.newPage(); await stubBeacon(pg);
      const res = await pg.goto(BASE + SUB + p, { waitUntil: 'networkidle' });
      if (!res || res.status() !== 200) {
        console.log(`  CANNOT READ ${BASE + SUB + p}: status ${res ? res.status() : 'no response'}`);
        process.exit(1);
      }
      // with --open, every disclosure is opened first, so the text a reader
      // sees after pressing one is measured too
      if (OPEN) { await pg.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); }
      // walk the page so lazy images and reveal animations have all settled
      await pg.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await pg.waitForTimeout(900);

      // page coordinates, so they line up with a full page capture
      const runs = await pg.evaluate(() => {
        const out = [];
        document.querySelectorAll('body *').forEach(e => {
          // .skip is parked off screen and .sr-only is clipped to 1px: both
          // are read aloud, neither is painted, so neither has a contrast.
          if (e.closest('[hidden], .skip, .sr-only, script, style')) return;
          if (e.closest('details:not([open]) > *:not(summary), details:not([open]) *:not(summary)')) return;
          const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) return;
          [...e.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).forEach(node => {
            const range = document.createRange();
            range.selectNodeContents(node);
            [...range.getClientRects()].forEach(r => {
              if (r.width < 4 || r.height < 4) return;
              out.push({
                t: node.nodeValue.trim().slice(0, 32),
                cls: (e.className || '').toString().split(' ')[0] || e.tagName.toLowerCase(),
                px: parseFloat(cs.fontSize), weight: parseFloat(cs.fontWeight), color: cs.color,
                x: Math.max(0, Math.round(r.x + window.scrollX)),
                y: Math.max(0, Math.round(r.y + window.scrollY)),
                w: Math.round(r.width), h: Math.round(r.height),
              });
            });
          });
        });
        return out;
      });

      // The page as a reader sees it, before anything is hidden. Comparing
      // the two captures answers two questions the document cannot: whether
      // a run is painted at all, and, for text filled by a gradient rather
      // than by a colour, what colour it is actually painted in.
      const litShot = (await pg.screenshot({ fullPage: true })).toString('base64');

      // Hide every glyph, then capture what is underneath. Three things make
      // that harder than one rule:
      //   a rule that sets colour on a class beats `* { color: ... }` even
      //   with !important, because the class is more specific;
      //   text painted through background-clip is filled by its background
      //   image, not by colour at all;
      //   and -webkit-text-fill-color wins over colour wherever it is set.
      // So: kill the fill as well as the colour, and drop the background
      // image on anything clipping its background to the text.
      await pg.evaluate(() => {
        document.querySelectorAll('*').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') {
            el.style.setProperty('background-image', 'none', 'important');
          }
        });
      });
      await pg.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }' });
      await pg.waitForTimeout(300);
      const shot = (await pg.screenshot({ fullPage: true })).toString('base64');

      const grounds = await reader.evaluate(async ({ b64, runs }) => {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx2 = c.getContext('2d', { willReadFrequently: true });
        ctx2.drawImage(img, 0, 0);
        const px = ctx2.getImageData(0, 0, img.width, img.height).data;
        const lum = (r, g, bb) => {
          const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb);
        };
        const pad = 2;
        return runs.map(r => {
          let hi = -1, lo = 2, hiC = [0, 0, 0], loC = [0, 0, 0];
          const y1 = Math.min(img.height, r.y + r.h - pad), x1 = Math.min(img.width, r.x + r.w - pad);
          for (let y = r.y + pad; y < y1; y++)
            for (let x = r.x + pad; x < x1; x++) {
              const i = (img.width * y + x) << 2;
              const l = lum(px[i], px[i + 1], px[i + 2]);
              if (l > hi) { hi = l; hiC = [px[i], px[i + 1], px[i + 2]]; }
              if (l < lo) { lo = l; loC = [px[i], px[i + 1], px[i + 2]]; }
            }
          return hi < 0 ? null : { hiC, loC };
        });
      }, { b64: shot, runs });

      // What each run looks like painted: the pixel that differs most from
      // the hidden capture is a glyph pixel, and if nothing differs then
      // nothing was painted there. A closed disclosure still has layout
      // boxes in Chrome but paints nothing, and measuring those invented a
      // failure on every plan feature list.
      const painted = await reader.evaluate(async ({ a64, b64, runs }) => {
        const load = async (d) => {
          const im = new Image();
          await new Promise(res => { im.onload = res; im.src = 'data:image/png;base64,' + d; });
          const c = document.createElement('canvas');
          c.width = im.width; c.height = im.height;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(im, 0, 0);
          return { w: im.width, h: im.height, px: g.getImageData(0, 0, im.width, im.height).data };
        };
        const A = await load(a64), B = await load(b64);
        return runs.map(r => {
          let best = 0, col = null;
          const y1 = Math.min(A.h, r.y + r.h), x1 = Math.min(A.w, r.x + r.w);
          for (let y = r.y; y < y1; y++)
            for (let x = r.x; x < x1; x++) {
              const i = (A.w * y + x) << 2;
              const d = Math.abs(A.px[i] - B.px[i]) + Math.abs(A.px[i+1] - B.px[i+1]) + Math.abs(A.px[i+2] - B.px[i+2]);
              if (d > best) { best = d; col = [A.px[i], A.px[i+1], A.px[i+2]]; }
            }
          return { diff: best, col: col };
        });
      }, { a64: litShot, b64: shot, runs });

      runs.forEach((r, i) => {
        const g = grounds[i];
        if (!g) return;
        const seen = painted[i];
        // not painted: a closed disclosure, a clipped box, or text the same
        // colour as what is over it. There is no contrast to measure.
        if (!seen || seen.diff <= 12) return;
        total++;
        let fg = r.color.match(/[\d.]+/g).map(Number);
        // text filled by a gradient reports no colour of its own, so take
        // the colour it is actually painted in
        if (fg.length > 3 && fg[3] === 0 && seen.col) { fg = seen.col.concat([1]); }
        const a = fg.length > 3 ? fg[3] : 1;
        const fgL = L(fg[0], fg[1], fg[2]);
        // the worse ground is whichever is closer in luminance to the text
        const cand = [g.hiC, g.loC].map(gc => {
          const fR = a * fg[0] + (1 - a) * gc[0], fG = a * fg[1] + (1 - a) * gc[1], fB = a * fg[2] + (1 - a) * gc[2];
          return cr(L(fR, fG, fB), L(gc[0], gc[1], gc[2]));
        });
        const ratio = Math.min(cand[0], cand[1]);
        const large = r.px >= 24 || (r.px >= 18.66 && r.weight >= 700);
        const floor = large ? 3 : 4.5;
        if (ratio < worst) worst = ratio;
        if (ratio < floor) fails.push(`${W}px ${p} .${r.cls} "${r.t}" ${r.px}px ratio ${ratio.toFixed(2)} needs ${floor}`);
      });
      await ctx.close();
    }
  }

  console.log(`  ${total} runs of text measured off the rendered pixels, ${USE.length} widths x ${PAGES.length} pages`);
  console.log(`  worst ratio ${worst.toFixed(2)}`);
  if (fails.length) {
    const uniq = [...new Set(fails)];
    console.log(`  BELOW THE FLOOR: ${fails.length} (${uniq.length} distinct)`);
    uniq.slice(0, 40).forEach(f => console.log('    ' + f));
  } else {
    console.log('  every run clears its floor');
  }
  await b.close();
})();
