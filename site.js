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
  var LABELS = ['Wings', 'House IPA', 'Nachos', 'Burger', 'Fries', 'Lager',
                'Mozzarella Sticks', 'Tacos', 'Stout', 'Cider', 'Pizza', 'Pilsner'];
  var N = 36, chips = [];
  function rnd(seed) { var x = Math.sin(seed * 999.7) * 43758.5; return x - Math.floor(x); }
  for (var i = 0; i < N; i++) {
    chips.push({
      label: LABELS[i % LABELS.length],
      sx: rnd(i + 1), sy: rnd(i + 7), speed: 14 + rnd(i + 3) * 22,
      group: i % 3, ox: rnd(i + 11) - .5, oy: rnd(i + 17) - .5, w: 0
    });
  }

  function measure() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '500 13px Geist, sans-serif';
    chips.forEach(function (c) { c.w = ctx.measureText(c.label).width + 22; });
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
  function gridPos(i) {
    var cols = W < 700 ? 4 : 9, rows = Math.ceil(N / cols);
    var gw = Math.min(W * .8, 900), gh = H * .3, col = i % cols, row = Math.floor(i / cols);
    return [(W - gw) / 2 + gw * (col + .5) / cols, H * .42 + gh * (row + .5) / rows];
  }
  function clusterPos(c) {
    var cx = W < 760 ? W * .5 : W * (.26 + .24 * c.group);
    var cy = W < 760 ? H * (.4 + .16 * c.group) : H * .58;
    var R = Math.min(W, H) * .09;
    return [cx + c.ox * R * 2, cy + c.oy * R * 1.3, cx, cy];
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
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  var running = false, rafId = 0;

  function frame(now) {
    if (!running) return;
    var t = now / 1000, p = progress();

    glowA.style.transform = 'translate(' + (Math.sin(t * .15) * 40 + p * 120) + 'px,' + (Math.cos(t * .12) * 30) + 'px)';
    glowB.style.transform = 'translate(' + (Math.cos(t * .1) * 40 - p * 100) + 'px,' + (Math.sin(t * .13) * 30) + 'px)';

    ctx.clearRect(0, 0, W, H);
    var toGrid = seg(p, .16, .32), toCluster = seg(p, .36, .52), fadeChips = seg(p, .56, .66);
    if (fadeChips < 1) {
      ctx.font = '500 13px Geist, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = 0; i < N; i++) {
        var c = chips[i], f = bandPos(c, t), g = gridPos(i), k = clusterPos(c);
        var x = mix(mix(mix(f[0], g[0], toGrid), k[0], toCluster), k[2], fadeChips);
        var y = mix(mix(mix(f[1], g[1], toGrid), k[1], toCluster), k[3], fadeChips);
        var hot = toCluster > .5 && c.group === 0;
        ctx.globalAlpha = (1 - fadeChips) * (p < .1 ? .45 : mix(.45, .9, toGrid));
        roundRect(x - c.w / 2, y - 14, c.w, 28, 14);
        ctx.fillStyle = hot ? 'rgba(217,164,65,.9)' : 'rgba(255,255,255,.07)';
        ctx.fill();
        ctx.strokeStyle = hot ? 'rgba(246,223,166,.9)' : 'rgba(255,255,255,.16)';
        ctx.lineWidth = 1; ctx.stroke();
        if (fadeChips < .4) {
          ctx.fillStyle = hot ? '#1D1D1F' : 'rgba(245,245,247,.82)';
          ctx.fillText(c.label, x, y + .5);
        }
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
