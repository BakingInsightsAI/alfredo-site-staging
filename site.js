/* Alfredo shared behaviour, v3.1.
   No libraries. Nothing here is required for the content to be readable:
   every module exits quietly if its markup is not on the page. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* expose a tiny shared surface for the per page scripts */
  window.Alfredo = {
    reduce: reduce,
    $: $,
    $$: $$,
    /* run fn once, the first time el scrolls into view */
    onceInView: function (el, fn, threshold) {
      if (!el) return;
      if (!('IntersectionObserver' in window)) { fn(); return; }
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); fn(); }
      }, { threshold: threshold == null ? 0.25 : threshold });
      io.observe(el);
    }
  };

  /* A region that scrolls sideways has to be reachable without a mouse.
     The strip hides its scrollbar, so without this there was no way to
     reach the photographs past the first except by dragging. The focus
     stop is added only while the region actually overflows, so at the
     widths where the strip is a plain grid there is no stop that does
     nothing when you land on it. */
  function scrollRegions() {
    $$('.photos').forEach(function (el) {
      if (el.scrollWidth > el.clientWidth + 1) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'group');
        el.setAttribute('aria-label', 'Photographs, scrolls sideways');
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    });
  }
  scrollRegions();
  addEventListener('resize', scrollRegions, { passive: true });

  /* ---------------------------------------------------------- mobile nav */
  var toggle = $('#navToggle'), links = $('#navLinks');
  if (toggle && links) {
    var setOpen = function (open) {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false); toggle.focus();
      }
    });
    /* a resize back to desktop must not leave the panel in the open state */
    addEventListener('resize', function () {
      if (innerWidth > 860) setOpen(false);
    }, { passive: true });
  }

  /* -------------------------------------------------- reveal once, in view */
  var revealables = $$('.reveal');
  if (revealables.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('in'); });
    } else {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      revealables.forEach(function (el) { ro.observe(el); });
    }
  }
})();

/* =====================================================================
   Homepage scroll story.
   Exits immediately if #story is absent, or if the visitor asked for
   reduced motion, in which case the static layout in styles.css stands.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.Alfredo;
  var story = document.getElementById('story');
  if (!story || A.reduce) return;

  var canvas = document.getElementById('storyCanvas');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return;

  story.classList.add('pinned');

  var TAU = Math.PI * 2;
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;

  /* 36 items, each used once. Phones show the first 18. */
  var LABELS = [
    'Wings', 'House IPA', 'Nachos', 'Burger', 'Fries', 'Lager',
    'Mozzarella Sticks', 'Tacos', 'Stout', 'Cider', 'Pizza', 'Pilsner',
    'Caesar Salad', 'Pretzel', 'Brownie', 'Sliders', 'Margarita', 'Old Fashioned',
    'Espresso', 'Calamari', 'Quesadilla', 'Wheat Ale', 'Onion Rings', 'Cheesecake',
    'Mac and Cheese', 'Club Sandwich', 'Hazy IPA', 'Lemonade', 'Fish Tacos', 'Flatbread',
    'Sour Ale', 'Chicken Tenders', 'Porter', 'Iced Tea', 'Hummus Plate', 'Garlic Fries'
  ];

  /* three depth layers: far, mid, near. Larger reads as nearer, drifts
     faster, and parallaxes with the scroll rather than against it. */
  var DEPTH = [
    { font: 11, alpha: 0.35, blur: 1.5, drift: 0.6, par: -7 },
    { font: 13, alpha: 0.55, blur: 0,   drift: 1.0, par: 0 },
    { font: 16, alpha: 0.80, blur: 0,   drift: 1.5, par: 9 }
  ];
  var blurFar = true;   /* soft far layer; the first thing dropped if frames get tight */

  function rnd(seed) { var x = Math.sin(seed * 999.7) * 43758.5; return x - Math.floor(x); }

  var chips = [];
  for (var i = 0; i < LABELS.length; i++) {
    chips.push({
      label: LABELS[i],
      /* depth must not track the cluster, or one whole cluster ends up on a
         single layer and the gold group is always the small faint one */
      d: (Math.floor(i / 3) + i) % 3,
      /* layered sines with a different period per item, so nothing moves
         in lockstep and no two paths repeat */
      f1: 0.05 + rnd(i + 1) * 0.07, p1: rnd(i + 2) * TAU, a1: 14 + rnd(i + 3) * 16,
      f2: 0.11 + rnd(i + 4) * 0.13, p2: rnd(i + 5) * TAU, a2: 5 + rnd(i + 6) * 8,
      f3: 0.04 + rnd(i + 7) * 0.06, p3: rnd(i + 8) * TAU, a3: 9 + rnd(i + 9) * 12,
      f4: 0.09 + rnd(i + 10) * 0.12, p4: rnd(i + 11) * TAU, a4: 4 + rnd(i + 12) * 6,
      tw: 0, hx: 0, hy: 0, cx: 0, cy: 0, group: 0, slot: 0,
      /* where the label is actually drawn this frame */
      px: 0, py: 0, seeded: false,
      /* how far the collision passes moved this label away from where the
         choreography asked for it, carried between frames */
      ox: 0, oy: 0
    });
  }

  var LAY = { count: 36, perCluster: 12, clusterRowH: 22, clusterX: [], clusterY: [] };

  /* a small seeded generator so the cloud is organic but identical each load */
  function seeded(s) { return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

  /* the headline block in canvas coordinates, padded, or null before layout */
  function heroBox() {
    var el = document.getElementById('heroH');
    if (!el) return null;
    var r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var pad = 18;
    return { x: r.left - c.left - pad, y: r.top - c.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
  }

  var lastW = 0, lastH = 0, fontsReady = false;

  function measure() {
    var nw = canvas.clientWidth, nh = canvas.clientHeight;
    /* A phone address bar sliding away changes the height by about 60 to
       110px and must not relayout the whole field mid scroll. */
    if (lastW === nw && Math.abs(nh - lastH) < 120 && lastW !== 0) return;
    lastW = nw; lastH = nh;
    W = nw; H = nh;
    for (var rs = 0; rs < chips.length; rs++) { chips[rs].ox = 0; chips[rs].oy = 0; chips[rs].seeded = false; }
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var phone = W < 760;
    LAY.count = phone ? 18 : LABELS.length;

    for (var m = 0; m < chips.length; m++) {
      var c = chips[m];
      ctx.font = '500 ' + DEPTH[c.d].font + 'px Geist, sans-serif';
      c.tw = ctx.measureText(c.label).width;
      c.group = m % 3;
      c.slot = Math.floor(m / 3);
    }

    /* ---- hero: scattered across the field, but never over the words.
           The headline, lede and buttons are measured and treated as an
           obstacle, so labels sit around them instead of on top. ---- */
    var hb = heroBox();
    var r1 = seeded(7331);
    for (var h = 0; h < LAY.count; h++) {
      var ch = chips[h];
      var got = false;
      /* keep the whole word on the canvas: the seed is a centre, so the
         usable range has to be inset by half the text, not by a fixed
         margin, or the longest labels hang off the right edge */
      var hw = ch.tw / 2 + 12;
      var loX = hw, hiX = Math.max(hw + 1, W - hw);
      for (var tryN = 0; tryN < 160 && !got; tryN++) {
        var x = loX + r1() * (hiX - loX);
        var y = H * 0.16 + r1() * H * 0.80;
        var halfW = ch.tw / 2 + 10, halfH = DEPTH[ch.d].font * 0.9;
        if (hb && x + halfW > hb.x && x - halfW < hb.x + hb.w &&
                  y + halfH > hb.y && y - halfH < hb.y + hb.h) continue;
        ch.hx = x; ch.hy = y; got = true;
      }
      if (!got) { ch.hx = loX + r1() * (hiX - loX); ch.hy = H * 0.88 + r1() * H * 0.1; }
    }

    /* ---- stage two: a loose organic cloud, placed by rejection sampling
           so that no two labels can land on top of each other ---- */
    var r2 = seeded(20260211);
    var ccx = W / 2, ccy = H * 0.52;
    var rx = Math.min(W * 0.46, 540), ry = Math.max(H * 0.17, 120);
    var placed = [];
    var pad = 10;
    for (var k = 0; k < LAY.count; k++) {
      var c2 = chips[k], lh = DEPTH[c2.d].font * 1.3;
      var ok = false;
      for (var attempt = 0; attempt < 900 && !ok; attempt++) {
        var grow = 1 + Math.floor(attempt / 150) * 0.12;
        var ang = r2() * TAU, rad = Math.sqrt(r2());
        var x = ccx + Math.cos(ang) * rx * rad * grow;
        var y = ccy + Math.sin(ang) * ry * rad * grow;
        var bx = x - c2.tw / 2 - pad / 2, by = y - lh / 2 - pad / 2;
        var bw = c2.tw + pad, bh = lh + pad;
        if (bx < 16 || bx + bw > W - 16) continue;
        var clash = false;
        for (var q = 0; q < placed.length; q++) {
          var o = placed[q];
          if (bx < o.x + o.w && o.x < bx + bw && by < o.y + o.h && o.y < by + bh) { clash = true; break; }
        }
        if (!clash) { placed.push({ x: bx, y: by, w: bw, h: bh }); c2.cx = x; c2.cy = y; ok = true; }
      }
      if (!ok) { c2.cx = ccx; c2.cy = ccy; }
    }

    /* ---- stage three: three stacked clusters ---- */
    LAY.perCluster = Math.ceil(LAY.count / 3);
    LAY.clusterRowH = phone ? 21 : 24;
    var clusterH = LAY.perCluster * LAY.clusterRowH;
    LAY.clusterX = []; LAY.clusterY = [];
    if (phone) {
      var bandTop = H * 0.30, bandH = H * 0.62;
      var gap = Math.max(20, (bandH - 3 * clusterH) / 2);
      if (3 * clusterH + 2 * gap > bandH) {
        LAY.clusterRowH = Math.max(16, (bandH - 40) / 3 / LAY.perCluster);
        clusterH = LAY.perCluster * LAY.clusterRowH;
        gap = 20;
      }
      for (var p1 = 0; p1 < 3; p1++) { LAY.clusterX.push(W / 2); LAY.clusterY.push(bandTop + clusterH / 2 + p1 * (clusterH + gap)); }
    } else {
      for (var p2 = 0; p2 < 3; p2++) { LAY.clusterX.push(W * (0.26 + 0.24 * p2)); LAY.clusterY.push(H * 0.58); }
    }

    /* ---- which row each label takes in its cluster ----
       Taking rows in list order makes labels trade places on the way in: one
       starting low in the cloud is sent to the top row while its neighbour
       goes the other way, and they have to pass through each other. Handing
       out rows in the order they already stand in means nobody crosses
       anybody, which is far better than detecting the crossing afterwards
       and pushing them apart in a hurry. Grouping is untouched, so the
       clusters keep their meaning and their colour. */
    for (var gi = 0; gi < 3; gi++) {
      var mem = [];
      for (var mi = 0; mi < LAY.count; mi++) if (chips[mi].group === gi) mem.push(chips[mi]);
      mem.sort(function (a, b) { return a.cy - b.cy; });
      for (var si = 0; si < mem.length; si++) mem[si].slot = si;
    }
  }
  /* Text widths are only meaningful once the webfont is in. Until then the
     canvas draws nothing at all, rather than boxes at the wrong size that
     jump when the font lands. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fontsReady = true; lastW = 0; measure(); });
  } else {
    fontsReady = true; measure();
  }
  addEventListener('resize', measure, { passive: true });

  /* smootherstep: zero rate of change at both ends, so every gather lands
     softly instead of arriving with velocity */
  var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t * t * t * (t * (t * 6 - 15) + 10); };
  var seg = function (p, a, b) { return ease((p - a) / (b - a)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };

  function heroPos(c, t, drift) {
    var m = DEPTH[c.d].drift * drift;
    return [
      c.hx + (Math.sin(t * c.f1 + c.p1) * c.a1 + Math.sin(t * c.f2 + c.p2) * c.a2) * m,
      c.hy + (Math.cos(t * c.f3 + c.p3) * c.a3 + Math.sin(t * c.f4 + c.p4) * c.a4) * m
    ];
  }
  function cloudPos(c, t, drift) {
    var m = DEPTH[c.d].drift * drift;
    return [
      c.cx + Math.sin(t * c.f1 * 0.6 + c.p1) * 5 * m,
      c.cy + Math.cos(t * c.f3 * 0.6 + c.p3) * 4 * m
    ];
  }
  function clusterPos(c) {
    var cx = LAY.clusterX[c.group], cy = LAY.clusterY[c.group];
    var top = cy - (LAY.perCluster * LAY.clusterRowH) / 2;
    return [cx, top + LAY.clusterRowH * (c.slot + .5), cx, cy];
  }

  /* ---------------------------------------------- tilt, shared with cards */
  var tilt = { x: 0, y: 0 };
  window.__alfredoTilt = tilt;

  var heroH = document.getElementById('heroH');
  var caps = A.$$('.cap', story);
  var cards = A.$$('.card', story);
  var verdict = document.getElementById('verdict');
  var price = document.getElementById('trialPrice');
  var bars = A.$$('.card .bar', story);
  var glowA = story.querySelector('.glow.a'), glowB = story.querySelector('.glow.b');
  var BAR_H = [.72, .8, .42, .86];
  var CARD_Z = [.96, 1.0, .98];

  /* Scroll only ever writes a target. The value the stages read is eased
     toward it, so a coarse or jumpy scroll cannot move anything abruptly. */
  var smoothP = null;
  function targetProgress() {
    var box = story.getBoundingClientRect();
    var total = story.offsetHeight - window.innerHeight;
    return total > 0 ? Math.max(0, Math.min(1, -box.top / total)) : 0;
  }

  /* boxes drawn in the last frame, so the overlap rule can be checked from
     outside instead of taken on trust */
  var boxes = [];
  window.__storyLabelBoxes = function () { return boxes.slice(); };

  var running = false, rafId = 0, frames = 0, fpsT0 = 0;
  window.__storyFrames = function () { return frames; };

  var lastNow = 0;
  function frame(now) {
    if (!running) return;
    frames++;
    var dt = lastNow ? Math.min(32, now - lastNow) / 1000 : 1 / 60;
    lastNow = now;
    var t = now / 1000;
    var target = targetProgress();
    if (smoothP === null) smoothP = target;
    smoothP += (target - smoothP) * 0.12;
    var p = smoothP;

    /* ambient: the glows breathe and drift whether or not anyone scrolls */
    var sA = 1.04 + 0.04 * Math.sin(t * TAU / 9);
    var sB = 1.04 + 0.04 * Math.sin(t * TAU / 13 + 2.1);
    glowA.style.transform = 'translate(' + (Math.sin(t * .15) * 40 + p * 120) + 'px,' + (Math.cos(t * .12) * 30) + 'px) scale(' + sA.toFixed(4) + ')';
    glowB.style.transform = 'translate(' + (Math.cos(t * .1) * 40 - p * 100) + 'px,' + (Math.sin(t * .13) * 30) + 'px) scale(' + sB.toFixed(4) + ')';

    ctx.clearRect(0, 0, W, H);
    var toCloud = seg(p, .16, .32), toCluster = seg(p, .36, .52), fade = seg(p, .56, .66);

    boxes.length = 0;
    if (fade < 1 && fontsReady) {
      var scrollPar = (p - 0.3) * 40;
      /* drift fades out as the items gather, and comes back only when they
         return to the open field */
      var drift = 1 - toCloud;

      /* ---- 1. where every label wants to be this frame ----
         These are targets, not positions. Nothing is drawn from them. */
      for (var i = 0; i < LAY.count; i++) {
        var c = chips[i], D = DEPTH[c.d];
        var f = heroPos(c, t, drift), g = cloudPos(c, t, drift), k = clusterPos(c);
        var par = D.par * (scrollPar / 40) + tilt.x * D.par * 0.5;
        var parY = tilt.y * D.par * 0.3;
        var lh = D.font * 1.3;
        var tx2 = mix(mix(mix(f[0], g[0], toCloud), k[0], toCluster), k[2], fade) + par;
        var ty2 = mix(mix(mix(f[1], g[1], toCloud), k[1], toCluster), k[3], fade) + parY;
        boxes.push({
          label: c.label, d: c.d, i: i,
          /* start from last frame's answer so the passes below refine a near
             solution instead of untangling the whole field from scratch,
             which fourteen passes cannot always finish */
          x: tx2 + c.ox - c.tw / 2, y: ty2 + c.oy - lh / 2,
          w: c.tw, h: lh, rx: tx2, ry: ty2,
          hot: toCluster > .5 && c.group === 0
        });
      }

      /* ---- 2. shape the targets so they do not collide ----
         Both solvers below run on the targets alone. Correcting a drawn
         position instead would leave the spring pulling an item back into
         the thing it was just pushed out of, and the pair would trade
         pixels for as long as the story was on screen. */

      /* the headline keeps its own space while it is on screen */
      var shield = (1 - seg(p, .05, .14)) * Math.max(0, 1 - fade * 3);
      if (shield > 0.01) {
        var hbox = heroBox();
        if (hbox) {
          for (var s1 = 0; s1 < boxes.length; s1++) {
            var S = boxes[s1];
            if (S.x + S.w < hbox.x || S.x > hbox.x + hbox.w ||
                S.y + S.h < hbox.y || S.y > hbox.y + hbox.h) continue;
            var up = (S.y + S.h) - hbox.y, down = (hbox.y + hbox.h) - S.y;
            var left = (S.x + S.w) - hbox.x, right = (hbox.x + hbox.w) - S.x;
            var m = Math.min(up, down, left, right);
            if (m === up) S.y -= up * shield;
            else if (m === down) S.y += down * shield;
            else if (m === left) S.x -= left * shield;
            else S.x += right * shield;
          }
        }
      }

      /* keep labels off each other at every stage and in flight between them.
         The push is proportional to the depth of the overlap with no fixed
         floor, so it falls to nothing as the gap closes and the pass settles
         instead of hunting. */
      var padSep = 4, sepFade = Math.max(0, 1 - fade * 3);
      for (var pass = 0; pass < 14; pass++) {
        var moved = false;
        for (var a = 0; a < boxes.length; a++) {
          for (var b2 = a + 1; b2 < boxes.length; b2++) {
            var A1 = boxes[a], B1 = boxes[b2];
            var ox = Math.min(A1.x + A1.w, B1.x + B1.w) - Math.max(A1.x, B1.x) + padSep;
            var oy = Math.min(A1.y + A1.h, B1.y + B1.h) - Math.max(A1.y, B1.y) + padSep;
            if (ox <= 0 || oy <= 0) continue;
            /* As the items converge on the cluster centres they necessarily
               overlap. Pushing back then would fight the gather, so
               separation relaxes as they arrive. They are fading out at that
               point and the overlap is not visible. */
            var shift = oy * 0.5 * 0.6 * sepFade;
            /* Which way to push is decided by which label sits higher. Two
               that are level disagree about that from one frame to the next,
               and the answer swings by twice the push every time they swap:
               that flip, multiplied through fourteen passes, is what used to
               fling a label across the stage. Close to level the decision is
               handed to a fixed order instead, blended in as they converge,
               so the direction is continuous through the crossing and the
               same two labels always resolve the same way. */
            var dyc = (A1.y + A1.h / 2) - (B1.y + B1.h / 2);
            var blend = Math.min(1, Math.abs(dyc) / 8);
            var dir = (dyc >= 0 ? 1 : -1) * blend + (A1.i < B1.i ? 1 : -1) * (1 - blend);
            A1.y += dir * shift; B1.y -= dir * shift;
            moved = true;
          }
        }
        if (!moved) break;
      }

      /* ---- 3. apply the correction, rationed ----
         A label follows the choreography itself exactly, with no lag at all,
         so two of them can never drift into each other merely because one
         was given further to travel this frame. The only part held back is
         the correction above, and only when it changes abruptly: a
         relaxation pass reverses which way it pushes a pair the moment they
         draw level, and writing that straight to the screen is what used to
         fling a label across the stage.

         The ration is an absolute distance, not a speed. A frame that ran
         long must not be allowed to carry a proportionally larger step,
         because what reads as a glitch is the distance moved on screen, not
         the distance per second. Eight pixels is the point found by
         measurement: below it labels start overlapping because separation
         can no longer keep up with the gather, and above it the step
         becomes visible. */
      for (var sp = 0; sp < boxes.length; sp++) {
        var Bx = boxes[sp], c2 = chips[Bx.i];
        var wantX = (Bx.x + Bx.w / 2) - Bx.rx;
        var wantY = (Bx.y + Bx.h / 2) - Bx.ry;
        if (!c2.seeded) { c2.ox = wantX; c2.oy = wantY; c2.seeded = true; }
        var RATE = Math.min(8 * (dt * 60), 8);
        var rdx = wantX - c2.ox, rdy = wantY - c2.oy;
        var rd = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rd > RATE) { var rk = RATE / rd; c2.ox += rdx * rk; c2.oy += rdy * rk; }
        else { c2.ox = wantX; c2.oy = wantY; }
        c2.px = Bx.rx + c2.ox;
        c2.py = Bx.ry + c2.oy;
        Bx.x = c2.px - Bx.w / 2;
        Bx.y = c2.py - Bx.h / 2;
      }

      /* Draw back to front, one font change per layer.
         The far layer is softened and the gold halo is drawn by stacking a
         few cheap offset passes. Canvas filter blur and shadowBlur both look
         better, but they cost roughly twenty times the frame budget on a
         throttled phone, so the fps floor wins. */
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var HALO = [[0, 0, 3.2], [0, 0, 2.1], [1.1, 0, 1.4], [-1.1, 0, 1.4], [0, 1.1, 1.4], [0, -1.1, 1.4]];
      var SOFT = [[0, 0], [-0.9, -0.6], [0.9, 0.6], [0.9, -0.6], [-0.9, 0.6]];
      for (var layer = 0; layer < 3; layer++) {
        var D2 = DEPTH[layer];
        ctx.font = '500 ' + D2.font + 'px Geist, sans-serif';
        var soft = (layer === 0 && blurFar);
        for (var n = 0; n < boxes.length; n++) {
          var bx = boxes[n];
          if (bx.d !== layer) continue;
          var cxp = bx.x + bx.w / 2, cyp = bx.y + bx.h / 2;
          var base = D2.alpha * (1 - fade);
          if (bx.hot) {
            ctx.fillStyle = '#D9A441';
            for (var hq = 0; hq < HALO.length; hq++) {
              ctx.globalAlpha = base * 0.1;
              ctx.font = '500 ' + (D2.font + HALO[hq][2]) + 'px Geist, sans-serif';
              ctx.fillText(bx.label, cxp + HALO[hq][0], cyp + HALO[hq][1]);
            }
            ctx.font = '500 ' + D2.font + 'px Geist, sans-serif';
            ctx.globalAlpha = base;
            ctx.fillText(bx.label, cxp, cyp);
          } else if (soft) {
            ctx.fillStyle = '#F5F5F7';
            for (var sq = 0; sq < SOFT.length; sq++) {
              ctx.globalAlpha = base / 2.6;
              ctx.fillText(bx.label, cxp + SOFT[sq][0], cyp + SOFT[sq][1]);
            }
          } else {
            ctx.fillStyle = '#F5F5F7';
            ctx.globalAlpha = base;
            ctx.fillText(bx.label, cxp, cyp);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    var heroOut = seg(p, .05, .14);
    heroH.style.opacity = 1 - heroOut;
    heroH.style.transform = 'translateY(calc(-50% - ' + (heroOut * 50) + 'px))';

    caps.forEach(function (el) { el.classList.toggle('on', p >= +el.dataset.a && p < +el.dataset.b); });
    var cardsIn = seg(p, .6, .7), focus = seg(p, .75, .81), vIn = seg(p, .88, .95);
    cards.forEach(function (el, idx) {
      var d = Math.max(0, Math.min(1, cardsIn * 1.4 - idx * .2));
      var op = d * (idx === 0 ? 1 : 1 - focus) * (1 - vIn);
      /* These cards carry a backdrop filter and two gradient layers. Writing
         to them costs far more in style and paint than the whole canvas, so
         only write when the value has actually moved, and never while the
         card is invisible. */
      var z = mix(CARD_Z[idx], 1, d);
      var scale = z * (idx === 0 ? 1 + focus * .1 : 1);
      var ty2 = (1 - d) * 40;
      var key = op.toFixed(3) + '|' + scale.toFixed(3) + '|' + ty2.toFixed(1);
      if (el._k !== key) {
        el._k = key;
        el.style.opacity = op;
        el.style.transform = op === 0 ? 'none'
          : 'translateY(' + ty2.toFixed(1) + 'px) scale(' + scale.toFixed(4) + ')';
      }
      if (op > 0.6 && !el.dataset.sheen) { el.dataset.sheen = '1'; el.classList.add('sheen'); }
      if (idx === 0) el.classList.toggle('focus', focus > .3);
    });
    if (cards.length) cards[0].parentNode.style.gap = (16 * (1 - focus)) + 'px';

    if (focus > .3 && price) {
      price.textContent = '$' + (6.99 + .5 * seg(p, .77, .82)).toFixed(2);
      bars.forEach(function (bb, bi) { bb.style.height = (BAR_H[bi] * 100 * seg(p, .8 + bi * .015, .85 + bi * .015)) + '%'; });
    }

    verdict.style.opacity = vIn;
    verdict.style.transform = 'translate(-50%,-50%) scale(' + (.9 + .1 * vIn) + ')';

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true; frames = 0; lastNow = 0;
    smoothP = targetProgress();     /* no catch up sweep when coming back */
    fpsT0 = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0 }).observe(story);
  } else { start(); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (story.getBoundingClientRect().bottom > 0) start();
  });

  var jump = document.getElementById('storyJump');
  if (jump) {
    jump.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: story.offsetTop + (story.offsetHeight - window.innerHeight) * .2, behavior: 'smooth' });
    });
  }
})();

/* =====================================================================
   Product page: tabs, chat demo, and the visuals that draw once in view.
   Exits quietly on every other page.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.Alfredo;
  var bar = document.querySelector('.tabbar');
  if (!bar) return;

  var tabs = A.$$('.tab', bar);
  var names = tabs.map(function (t) { return t.getAttribute('data-t'); });
  var panels = {};
  names.forEach(function (n) { panels[n] = document.getElementById('p-' + n); });

  /* an inner id deep links to the tab that contains it */
  var inner = {
    chat: 'overview', overview: 'overview',
    board: 'board', measured: 'board',
    menu: 'menu', menulab: 'menu', cost: 'menu',
    intel: 'intel', regulars: 'intel'
  };

  function apply(name, doScroll) {
    if (!panels[name]) name = names[0];
    names.forEach(function (n) {
      var on = n === name;
      panels[n].hidden = !on;
    });
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-t') === name;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    if (doScroll) bar.scrollIntoView({ block: 'start', behavior: A.reduce ? 'auto' : 'smooth' });
    refreshVisuals();
    return name;
  }

  function go(name) {
    var n = apply(name, true);
    history.pushState({ tab: n }, '', '#' + n);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { go(t.getAttribute('data-t')); });
    /* manual activation: arrows move focus only, Enter or Space activates */
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      tabs[n].focus();
    });
  });

  A.$$('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });

  window.addEventListener('popstate', function (e) {
    var name = (e.state && e.state.tab) || inner[(location.hash || '').slice(1)] || names[0];
    apply(name, false);
  });

  /* ---------------------------------------------------- chat demo */
  var chips = A.$$('#chatChips .chip-q'), body = document.getElementById('chatBody');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var q = document.createElement('p'); q.className = 'msg me'; q.textContent = c.textContent.trim();
      var a = document.createElement('p'); a.className = 'msg bot'; a.textContent = c.getAttribute('data-a');
      body.appendChild(q); body.appendChild(a);
      while (body.children.length > 5) body.removeChild(body.firstElementChild);
    });
  });

  /* ------------------------------------- heat map, built from sample data */
  var heat = document.getElementById('heat');
  if (heat && !heat.childElementCount) {
    var frag = document.createDocumentFragment();
    for (var d = 0; d < 7; d++) {
      for (var h = 0; h < 14; h++) {
        var peak = (h > 4 && h < 8) ? .55 : (h > 9 ? .85 : .25);
        var weekend = (d >= 4) ? 1.15 : .85;
        var v = Math.max(.04, Math.min(1, peak * weekend * (0.72 + ((d * 7 + h) % 5) * 0.07)));
        var cell = document.createElement('i');
        cell.style.setProperty('--v', v.toFixed(2));
        frag.appendChild(cell);
      }
    }
    heat.appendChild(frag);
  }

  /* --------------------------- visuals that draw once, when first seen */
  var drawn = [];
  function watch(el, cls) {
    if (!el || drawn.indexOf(el) !== -1) return;
    drawn.push(el);
    A.onceInView(el, function () { el.classList.add(cls); }, 0.3);
  }
  function refreshVisuals() {
    /* only observe what is currently visible; a hidden panel has no box */
    watch(document.getElementById('weekbars'), 'drawn');
    watch(document.getElementById('regularsCmp'), 'drawn');
    watch(document.getElementById('radar'), 'drawn');
  }

  /* ---------------------------------------------------- initial state */
  var frag2 = (location.hash || '').slice(1);
  var start = inner[frag2] || names[0];
  apply(start, false);
  history.replaceState({ tab: start }, '', location.hash || '#' + start);
  if (frag2 && frag2 !== start) {
    var target = document.getElementById(frag2);
    if (target) setTimeout(function () { target.scrollIntoView({ block: 'start', behavior: 'auto' }); }, 60);
  }
})();

/* =====================================================================
   Demo request form. The form works as plain HTML with no JavaScript at
   all; this only upgrades it to submit in place and report the outcome.
   ===================================================================== */
(function () {
  'use strict';
  var form = document.getElementById('demo-form');
  if (!form || !window.fetch) return;
  var status = document.getElementById('form-status');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = '';
    status.textContent = 'Sending your request';
    button.disabled = true;

    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(function (res) { return res.json().catch(function () { return { success: res.ok }; }); })
      .then(function (data) {
        if (data && data.success) {
          status.className = 'ok';
          status.textContent = 'Thank you. Your request is in, and we will come back to you shortly.';
          form.reset();
        } else {
          throw new Error('rejected');
        }
      })
      .catch(function () {
        status.className = 'bad';
        status.textContent = 'That did not go through. Please try again, or email us and we will pick it up from there.';
      })
      .then(function () { button.disabled = false; });
  });
})();

/* =====================================================================
   v3.1b  Tilt, tactile glass, the headline reveal and the fact dividers.
   Every piece exits quietly if its markup is absent or the visitor asked
   for reduced motion.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.Alfredo;
  if (!A) return;

  /* ---------------------------------------------------------- tilt source */
  var tilt = window.__alfredoTilt || (window.__alfredoTilt = { x: 0, y: 0 });
  var MAX = 3;                       /* degrees */
  var interacted = false;
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(function (ev) {
    addEventListener(ev, function once() {
      interacted = true;
      removeEventListener(ev, once);
    }, { passive: true, once: true });
  });

  if (!A.reduce) {
    /* desktop: lean toward the pointer */
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tilt.x = (e.clientX / innerWidth - .5) * 2;
      tilt.y = (e.clientY / innerHeight - .5) * 2;
    }, { passive: true });

    /* phones: follow device orientation once the visitor has touched the
       page. No permission is requested; where it is required and absent,
       the event simply never fires and this stays at zero. */
    if (window.DeviceOrientationEvent) {
      addEventListener('deviceorientation', function (e) {
        if (!interacted || e.gamma == null || e.beta == null) return;
        tilt.x = Math.max(-1, Math.min(1, e.gamma / 30));
        tilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      }, { passive: true });
    }
  }

  /* ------------------------------------------------------- tactile glass */
  var cards = A.$$('.tactile');
  if (cards.length && !A.reduce) {
    cards.forEach(function (card) {
      if (card.classList.contains('nav')) return;

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '0%');
      }, { passive: true });

      var press = function () { card.classList.add('pressed'); };
      var release = function () { card.classList.remove('pressed'); };
      card.addEventListener('pointerdown', press, { passive: true });
      ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(function (ev) {
        card.addEventListener(ev, release, { passive: true });
      });

      /* one sheen, the first time the card is seen. The story cards get
         theirs from the story itself, when they fade in. */
      if (!card.closest('.story')) {
        A.onceInView(card, function () { card.classList.add('sheen'); }, 0.25);
      }
    });

    /* Tilt is event driven, never per frame. These cards carry a backdrop
       filter, and writing to them every frame forces the blur to be redone
       every frame, which costs more than everything else on the page put
       together. */
    var outside = cards.filter(function (c) { return !c.closest('.story') && !c.classList.contains('nav'); });
    outside.forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = c.getBoundingClientRect();
        c.style.setProperty('--tx', (((e.clientX - r.left) / r.width - .5) * 2 * MAX).toFixed(2) + 'deg');
        c.style.setProperty('--ty', (((e.clientY - r.top) / r.height - .5) * -2 * MAX).toFixed(2) + 'deg');
      }, { passive: true });
      c.addEventListener('pointerleave', function () {
        c.style.setProperty('--tx', '0deg');
        c.style.setProperty('--ty', '0deg');
      }, { passive: true });
    });
    if (window.DeviceOrientationEvent && outside.length) {
      var lastT = 0;
      addEventListener('deviceorientation', function () {
        var now = performance.now();
        if (now - lastT < 100) return;          /* at most ten writes a second */
        lastT = now;
        outside.forEach(function (c) {
          c.style.setProperty('--tx', (tilt.x * MAX).toFixed(2) + 'deg');
          c.style.setProperty('--ty', (tilt.y * -MAX).toFixed(2) + 'deg');
        });
      }, { passive: true });
    }
  }

  /* ------------------------------------------ the headline, on first paint */
  var hero = document.querySelector('.hero-h');
  var h1 = document.querySelector('.story-h1');
  if (h1 && hero && !A.reduce) {
    var source = h1.textContent.trim();

    function splitIntoLines() {
      h1.innerHTML = source.split(/\s+/).map(function (w) {
        return '<span class="probe">' + w + '</span>';
      }).join(' ');
      var probes = A.$$('.probe', h1), lines = [], top = null, cur = [];
      probes.forEach(function (sp) {
        var y = sp.offsetTop;
        if (top === null || Math.abs(y - top) < 4) { cur.push(sp.textContent); top = top === null ? y : top; }
        else { lines.push(cur); cur = [sp.textContent]; top = y; }
      });
      if (cur.length) lines.push(cur);
      h1.innerHTML = lines.map(function (words, i) {
        return '<span class="line"><span class="line-in" style="transition-delay:' + (i * 90) + 'ms">' +
               words.join(' ') + '</span></span>';
      }).join(' ');
    }

    splitIntoLines();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        h1.classList.add('revealed');
        hero.classList.add('revealed');
      });
    });

    var rt;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var was = h1.classList.contains('revealed');
        splitIntoLines();
        if (was) { h1.classList.add('revealed'); }
      }, 180);
    }, { passive: true });
  }

  /* --------------------------------- the numbers rule dividers, one sweep */
  var facts = document.querySelector('.facts');
  if (facts) {
    if (A.reduce) {
      facts.classList.add('drawn');
    } else {
      A.$$('div', facts).forEach(function (row, i) {
        row.style.setProperty('--d', (i * 80) + 'ms');
      });
      A.onceInView(facts, function () { facts.classList.add('drawn'); }, 0.2);
    }
  }
})();
