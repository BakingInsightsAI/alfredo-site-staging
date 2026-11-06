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
  var chips = [];
  function rnd(seed) { var x = Math.sin(seed * 999.7) * 43758.5; return x - Math.floor(x); }
  for (var i = 0; i < LABELS.length; i++) {
    chips.push({
      label: LABELS[i],
      sx: rnd(i + 1), sy: rnd(i + 7), speed: 14 + rnd(i + 3) * 22,
      tw: 0, col: 0, row: 0, group: 0, slot: 0
    });
  }

  /* Layout is measured, not guessed, so labels never collide. */
  var LAY = { font: 13, count: 36, cols: 9, colW: 0, rowH: 30, gridX: 0, gridY: 0,
              clusterRowH: 22, clusterX: [], clusterY: [], perCluster: 12 };

  function widest(n, font) {
    ctx.font = '500 ' + font + 'px Geist, sans-serif';
    var max = 0;
    for (var i = 0; i < n; i++) max = Math.max(max, ctx.measureText(chips[i].label).width);
    return max;
  }

  function measure() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var phone = W < 760;
    LAY.count = phone ? 18 : LABELS.length;
    var avail = W - 32;

    /* column width comes from the widest rendered label plus 16px;
       on a phone the font drops a step rather than letting three columns collide */
    LAY.font = 13;
    LAY.cols = phone ? 3 : 9;
    LAY.colW = widest(LAY.count, LAY.font) + 16;
    while (phone && LAY.colW * LAY.cols > avail && LAY.font > 10) {
      LAY.font -= 1;
      LAY.colW = widest(LAY.count, LAY.font) + 16;
    }
    if (!phone) {
      LAY.cols = Math.max(3, Math.min(9, Math.floor(avail / LAY.colW)));
    }
    if (LAY.colW * LAY.cols > avail) LAY.colW = avail / LAY.cols;

    LAY.rowH = Math.max(phone ? 30 : 26, LAY.font * 2);
    var rows = Math.ceil(LAY.count / LAY.cols);
    var gw = LAY.colW * LAY.cols, gh = LAY.rowH * rows;
    LAY.gridX = (W - gw) / 2;
    LAY.gridY = Math.min(Math.max(H * 0.34, H * 0.56 - gh / 2), H * 0.95 - gh);

    /* clusters: a plain stacked column each, so nothing inside one touches */
    LAY.perCluster = Math.ceil(LAY.count / 3);
    LAY.clusterRowH = Math.max(phone ? 21 : 22, LAY.font * 1.7);
    var ch = LAY.perCluster * LAY.clusterRowH;
    LAY.clusterX = []; LAY.clusterY = [];
    if (phone) {
      var bandTop = H * 0.30, bandH = H * 0.62;
      var gap = Math.max(20, (bandH - 3 * ch) / 2);
      if (3 * ch + 2 * gap > bandH) {
        LAY.clusterRowH = Math.max(16, (bandH - 2 * 20) / 3 / LAY.perCluster);
        ch = LAY.perCluster * LAY.clusterRowH;
        gap = 20;
      }
      for (var k = 0; k < 3; k++) {
        LAY.clusterX.push(W / 2);
        LAY.clusterY.push(bandTop + ch / 2 + k * (ch + gap));
      }
    } else {
      for (var k2 = 0; k2 < 3; k2++) {
        LAY.clusterX.push(W * (0.26 + 0.24 * k2));
        LAY.clusterY.push(H * 0.58);
      }
    }

    /* fixed slots, assigned once per measure so positions are deterministic */
    ctx.font = '500 ' + LAY.font + 'px Geist, sans-serif';
    for (var m = 0; m < chips.length; m++) {
      var c = chips[m];
      c.tw = ctx.measureText(c.label).width;
      c.col = m % LAY.cols;
      c.row = Math.floor(m / LAY.cols);
      c.group = m % 3;
      c.slot = Math.floor(m / 3);
    }
  }
  measure();
  addEventListener('resize', measure, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var seg = function (p, a, b) { return ease((p - a) / (b - a)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };

  /* during the hero the chips stay in a quiet band near the bottom,
     well clear of the headline */
  function bandPos(c, t) { return [((c.sx * (W + 300) + t * c.speed) % (W + 300)) - 150, H * (.78 + .16 * c.sy)]; }
  function gridPos(c) {
    return [LAY.gridX + LAY.colW * (c.col + .5), LAY.gridY + LAY.rowH * (c.row + .5)];
  }
  function clusterPos(c) {
    var cx = LAY.clusterX[c.group], cy = LAY.clusterY[c.group];
    var top = cy - (LAY.perCluster * LAY.clusterRowH) / 2;
    return [cx, top + LAY.clusterRowH * (c.slot + .5), cx, cy];
  }

  var heroH = document.getElementById('heroH');
  var caps = A.$$('.cap', story);
  var cards = A.$$('.card', story);
  var verdict = document.getElementById('verdict');
  var price = document.getElementById('trialPrice');
  var bars = A.$$('.card .bar', story);
  var glowA = story.querySelector('.glow.a'), glowB = story.querySelector('.glow.b');
  var BAR_H = [.72, .8, .42, .86];

  function progress() {
    var box = story.getBoundingClientRect();
    var total = story.offsetHeight - window.innerHeight;
    return total > 0 ? Math.max(0, Math.min(1, -box.top / total)) : 0;
  }
  /* the boxes of the labels drawn in the last frame, so the overlap rule
     can be checked from outside instead of taken on trust */
  var boxes = [];
  window.__storyLabelBoxes = function () { return boxes.slice(); };

  var running = false, rafId = 0;

  function frame(now) {
    if (!running) return;
    var t = now / 1000, p = progress();

    glowA.style.transform = 'translate(' + (Math.sin(t * .15) * 40 + p * 120) + 'px,' + (Math.cos(t * .12) * 30) + 'px)';
    glowB.style.transform = 'translate(' + (Math.cos(t * .1) * 40 - p * 100) + 'px,' + (Math.sin(t * .13) * 30) + 'px)';

    ctx.clearRect(0, 0, W, H);
    var toGrid = seg(p, .16, .32), toCluster = seg(p, .36, .52), fadeChips = seg(p, .56, .66);
    boxes.length = 0;
    if (fadeChips < 1) {
      ctx.font = '500 ' + LAY.font + 'px Geist, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = (1 - fadeChips) * (p < .1 ? .8 : 1);

      var lh = LAY.font * 1.24, pad = 4;
      for (var i = 0; i < LAY.count; i++) {
        var c = chips[i], f = bandPos(c, t), g = gridPos(c), k = clusterPos(c);
        boxes.push({
          label: c.label,
          x: mix(mix(mix(f[0], g[0], toGrid), k[0], toCluster), k[2], fadeChips) - c.tw / 2,
          y: mix(mix(mix(f[1], g[1], toGrid), k[1], toCluster), k[3], fadeChips) - lh / 2,
          w: c.tw, h: lh,
          hot: toCluster > .5 && c.group === 0
        });
      }

      /* Keep labels off each other while they are in flight between stages.
         The grid and the clusters are laid out so nothing touches, so this is
         a no op once a stage has settled. It is weighted by the transition so
         the flow band under the headline is left exactly as it was. */
      var strength = Math.min(1, toGrid * 3) * (1 - fadeChips);
      if (strength > 0.02) {
        for (var pass = 0; pass < 14; pass++) {
          var moved = false;
          for (var a = 0; a < boxes.length; a++) {
            for (var b2 = a + 1; b2 < boxes.length; b2++) {
              var A = boxes[a], B = boxes[b2];
              var ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) + pad;
              var oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) + pad;
              if (ox <= 0 || oy <= 0) continue;
              var shift = (oy / 2) * strength + 0.25;
              if (A.y < B.y) { A.y -= shift; B.y += shift; } else { A.y += shift; B.y -= shift; }
              moved = true;
            }
          }
          if (!moved) break;
        }
      }

      for (var d = 0; d < boxes.length; d++) {
        var bx = boxes[d];
        ctx.fillStyle = bx.hot ? '#D9A441' : 'rgba(245,245,247,.55)';
        ctx.fillText(bx.label, bx.x + bx.w / 2, bx.y + bx.h / 2);
      }
      ctx.globalAlpha = 1;
    }

    var heroOut = seg(p, .05, .14);
    heroH.style.opacity = 1 - heroOut;
    heroH.style.transform = 'translateY(calc(-50% - ' + (heroOut * 50) + 'px))';

    caps.forEach(function (el) {
      el.classList.toggle('on', p >= +el.dataset.a && p < +el.dataset.b);
    });

    var cardsIn = seg(p, .6, .7), focus = seg(p, .75, .81), vIn = seg(p, .88, .95);
    cards.forEach(function (el, i) {
      var d = Math.max(0, Math.min(1, cardsIn * 1.4 - i * .2));
      el.style.opacity = d * (i === 0 ? 1 : 1 - focus) * (1 - vIn);
      el.style.transform = 'translateY(' + ((1 - d) * 40) + 'px) scale(' + ((.96 + .04 * d) * (i === 0 ? 1 + focus * .1 : 1)) + ')';
      if (i === 0) el.classList.toggle('focus', focus > .3);
    });
    if (cards.length) cards[0].parentNode.style.gap = (16 * (1 - focus)) + 'px';

    if (focus > .3 && price) {
      price.textContent = '$' + (6.99 + .5 * seg(p, .77, .82)).toFixed(2);
      bars.forEach(function (b, i) {
        b.style.height = (BAR_H[i] * 100 * seg(p, .8 + i * .015, .85 + i * .015)) + '%';
      });
    }

    verdict.style.opacity = vIn;
    verdict.style.transform = 'translate(-50%,-50%) scale(' + (.9 + .1 * vIn) + ')';

    rafId = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  /* the canvas does no work while the story is off screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0 }).observe(story);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (story.getBoundingClientRect().bottom > 0) start();
  });

  /* the second hero button walks the visitor into the sequence */
  var jump = document.getElementById('storyJump');
  if (jump) {
    jump.addEventListener('click', function (e) {
      e.preventDefault();
      var target = story.offsetTop + (story.offsetHeight - window.innerHeight) * .2;
      window.scrollTo({ top: target, behavior: 'smooth' });
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
