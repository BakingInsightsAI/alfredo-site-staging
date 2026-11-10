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

  /* ----------------------------------------------- what is pinned on top */
  /* The bar heights are measured rather than assumed: the nav wraps at some
     widths and the staging banner is not always there. Anything that sticks
     directly below them reads --pinned-top, so there is never a strip
     between the two for the page to scroll through. */
  (function () {
    var root = document.documentElement;
    var pinned = $$('.staging-bar, .nav');
    var sticky = $('.tabbar-wrap');
    if (!pinned.length && !sticky) return;

    function update() {
      var bottom = 0;
      pinned.forEach(function (el) {
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        var r = el.getBoundingClientRect();
        /* a bar that has slid up out of the way counts for what is left */
        if (r.height && r.bottom > bottom) bottom = r.bottom;
      });
      bottom = Math.max(0, Math.round(bottom));
      root.style.setProperty('--pinned-top', bottom + 'px');
      if (sticky) root.style.setProperty('--sticky-h', Math.round(sticky.getBoundingClientRect().height) + 'px');
    }

    update();

    /* The page jumps to an anchor on load using the heights declared in the
       stylesheet, and the per page scripts land inner anchors a frame or
       two later. Both of those happen before the webfont arrives, and the
       reflow when it does moves the target out from under the bars again.
       This is the last word on where an anchor sits. */
    function reland() {
      if (location.hash.length < 2) return;
      /* A page can name what its fragment really means. The product tabs
         do, because three of the four tab words are also ids partway down
         their own panel, and landing on the id would skip the tab's
         opening. Without that, the fragment is the element it names. */
      var target = window.__alfredoLand || null;
      if (!target) { try { target = document.querySelector(location.hash); } catch (e) {} }
      if (target) target.scrollIntoView();
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        update();
        requestAnimationFrame(function () { requestAnimationFrame(reland); });
      });
    } else {
      requestAnimationFrame(function () { requestAnimationFrame(reland); });
    }

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(update);
      pinned.forEach(function (el) { ro.observe(el); });
      if (sticky) ro.observe(sticky);
    }
    addEventListener('resize', update, { passive: true });
    addEventListener('orientationchange', update);
    /* the mobile menu opening makes the bar taller */
    var navToggle = $('#navToggle');
    if (navToggle) navToggle.addEventListener('click', function () { setTimeout(update, 60); });
    /* exposed so that a bar which later learns to hide on scroll can say so */
    window.__alfredoPinned = update;
  })();

  /* ------------------------------------------------------- light and dark */
  /* The head already set data-theme if this visitor has chosen one, so by
     the time this runs the right theme is painted. All that is left is to
     describe the button and to handle the press. */
  (function () {
    var root = document.documentElement;
    var btn = document.getElementById('themeToggle');
    var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
    var animT = 0;

    function stored() {
      try { return localStorage.getItem('theme'); } catch (e) { return null; }
    }
    function showing() {
      var t = root.getAttribute('data-theme');
      if (t === 'light' || t === 'dark') return t;
      return mq && mq.matches ? 'dark' : 'light';
    }
    function describe() {
      if (!btn) return;
      var dark = showing() === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    function chrome(theme) {
      /* the browser's own bar matches whichever theme is pinned */
      var col = theme === 'dark' ? '#000000' : '#F5F5F7';
      ['themeColorLight', 'themeColorDark'].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) m.setAttribute('content', col);
      });
    }
    function choose(theme) {
      /* Colours cross fade; nothing about the layout moves, so the class
         goes on for the length of the fade and comes straight back off. */
      if (!reduce) {
        root.classList.add('theme-anim');
        clearTimeout(animT);
        animT = setTimeout(function () { root.classList.remove('theme-anim'); }, 320);
      }
      root.setAttribute('data-theme', theme);
      /* If writing fails the switch still works for this visit: the
         attribute above is what the stylesheet reads. */
      try { localStorage.setItem('theme', theme); } catch (e) {}
      chrome(theme);
      describe();
    }

    if (stored()) chrome(showing());
    describe();

    if (btn) {
      btn.addEventListener('click', function () {
        choose(showing() === 'dark' ? 'light' : 'dark');
      });
    }

    /* Someone who has never pressed it keeps following their system, so a
       change there is picked up while the page is open. */
    if (mq) {
      var onSystem = function () { if (!stored()) describe(); };
      if (mq.addEventListener) mq.addEventListener('change', onSystem);
      else if (mq.addListener) mq.addListener(onSystem);
    }
  })();

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
    /* Every way out a visitor might reach for. The toggle and the links are
       above; a phone has no Escape key, so tapping away and scrolling have to
       work or the menu is a trap. */
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.target.closest('#navLinks') || e.target.closest('#navToggle')) return;
      setOpen(false);
    });
    addEventListener('scroll', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
    }, { passive: true });
    /* a resize back to desktop must not leave the panel in the open state */
    addEventListener('resize', function () {
      if (innerWidth > 860) setOpen(false);
    }, { passive: true });
  }

  /* ------------------------------- figures count up once, when first seen */
  /* The final figure is what the page ships, so a visitor with no script,
     or one who asked for less motion, reads the number and nothing else
     happens. The count only ever runs forwards to the value already there. */
  (function () {
    var nums = $$('[data-count]');
    if (!nums.length || reduce) return;
    nums.forEach(function (el) {
      var full = el.textContent.trim();
      var m = full.match(/-?[\d,]*\.?\d+/);
      if (!m) return;
      var target = parseFloat(m[0].replace(/,/g, ''));
      if (!isFinite(target)) return;
      var before = full.slice(0, m.index), after = full.slice(m.index + m[0].length);
      var decimals = (m[0].split('.')[1] || '').length;
      var grouped = m[0].indexOf(',') !== -1;
      var fmt = function (v) {
        var s = v.toFixed(decimals);
        if (grouped) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return before + s + after;
      };
      /* the box is sized by the final value so nothing reflows while it runs */
      el.style.display = 'inline-block';
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      window.Alfredo.onceInView(el, function () {
        var t0 = 0, DUR = 900;
        var step = function (now) {
          if (!t0) t0 = now;
          var p = Math.min(1, (now - t0) / DUR);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(target * e);
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = full;
        };
        el.textContent = fmt(0);
        requestAnimationFrame(step);
      }, 0.4);
    });
  })();

  /* the small visuals on the cards, wherever they are */
  (function () {
    $$('.mini').forEach(function (m) {
      window.Alfredo.onceInView(m, function () { m.classList.add('drawn'); }, 0.35);
    });
  })();

  /* the cost bars are on pricing, so they are watched from here rather
     than from the product page module */
  (function () {
    var bars = $('#costbars');
    if (bars) window.Alfredo.onceInView(bars, function () { bars.classList.add('drawn'); }, 0.3);
  })();

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
   Homepage film: one week on a sample menu.
   It runs on a clock rather than on the scroll position, so the page
   scrolls at its own pace and the film plays at its own. Exits immediately
   if #story is absent, or if the visitor asked for reduced motion, in which
   case the finished menu in styles.css stands and there are no controls.
   ===================================================================== */
(function () {
  'use strict';
  var A = window.Alfredo;
  if (!A) return;

  var story = document.getElementById('story');
  if (!story || A.reduce) return;

  var $ = function (id) { return document.getElementById(id); };
  var menu = $('menu'), scene = $('scene');
  if (!menu || !scene) return;

  /* The class comes first and stays first. It is the layout contract for
     this section: it gives the caption box its fixed height and hides the
     week row. Holding it back until the film was near the window let all
     five captions stack at load and then collapse, which is a 0.106 layout
     shift on the one page that has to win the first five seconds. */
  story.classList.add('film');

  /* The work, though, waits. site.js is deferred already, so this is about
     measuring the card, wiring the controls and taking the first frame,
     which all happen while the visitor is still reading the hero. The
     margin is generous, so the film is ready before it is reached. */
  if ('IntersectionObserver' in window) {
    var startObs = new IntersectionObserver(function (es) {
      if (!es[es.length - 1].isIntersecting) return;
      startObs.disconnect();
      build();
    }, { rootMargin: '400px 0px' });
    startObs.observe(scene);
  } else {
    build();
  }
  function build() {

  var caps = A.$$('.cap', story);
  var cts = A.$$('.ct', menu);
  var flashes = A.$$('.flash', menu);
  var wks = A.$$('.wk', menu);
  var scan = $('scan'), mover = $('mover'), slot = $('slot');
  var stamp = $('stamp'), ring = $('ring'), weeks = $('weeks');
  var srcRow = $('row-nachos'), calRow = $('row-cal'), hhRow = $('row-hh');
  var sMozz = $('strike-mozz'), nMozz = $('new-mozz');
  var sHH = $('strike-hh'), nHH = $('new-hh'), noteCal = $('note-cal');
  var glowA = story.querySelector('.glow.a'), glowB = story.querySelector('.glow.b');
  var slotRow = slot ? slot.firstElementChild : null;

  var playBtn = $('playBtn'), replayBtn = $('replayBtn');
  var chaps = A.$$('.chap', story);
  var fills = chaps.map(function (b) { return b.querySelector('.fill'); });

  /* the counts are rendered finished, so the unit comes from the markup
     rather than being spelled a second time here */
  var unit = cts.length ? cts[0].textContent.replace(/^[\d,]+\s*/, '') : 'a wk';

  /* Writing a property that already holds the value still dirties the card,
     and the card sits behind a backdrop filter, so the blur behind it would
     be recomputed for nothing. Every write in this file goes through these. */
  function put(el, prop, val) {
    if (!el) return;
    var c = el.__v || (el.__v = {});
    if (c[prop] === val) return;
    c[prop] = val;
    el.style.setProperty(prop, val);
  }
  function txt(el, val) {
    if (!el || el.__t === val) return;
    el.__t = val; el.textContent = val;
  }
  function cls(el, name, on) {
    if (!el) return;
    var k = '__c_' + name;
    if (el[k] === on) return;
    el[k] = on; el.classList.toggle(name, on);
  }

  /* smootherstep: zero rate of change at both ends, so every stage lands
     softly instead of arriving with velocity */
  var ease = function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * t * (t * (t * 6 - 15) + 10); };
  var seg = function (p, a, b) { return ease((p - a) / (b - a)); };
  var mix = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------------------------------------------------- measuring */
  var RH = 38, scanSpan = 0, lastW = 0, lastH = 0;

  function measure(force) {
    var w = window.innerWidth, h = window.innerHeight;
    /* A phone address bar sliding away changes the height by about 60 to
       110px and must not relayout the card in the middle of a scene. */
    if (!force && w === lastW && Math.abs(h - lastH) < 120 && lastW !== 0) return;
    lastW = w; lastH = h;
    RH = parseFloat(getComputedStyle(menu).getPropertyValue('--rh')) || 38;
    scanSpan = Math.max(0, menu.offsetHeight - 46);
  }

  /* ------------------------------------------------------------ the film */
  function apply(p) {
    for (var i = 0; i < caps.length; i++) {
      cls(caps[i], 'on', p >= +caps[i].dataset.a && p < +caps[i].dataset.b);
    }

    /* every order you ring: the week's counts arrive, row by row */
    var c = seg(p, .15, .29);
    var co = Math.min(1, c * 3).toFixed(3);
    for (var j = 0; j < cts.length; j++) {
      put(cts[j], 'opacity', co);
      txt(cts[j], Math.round(+cts[j].dataset.n * c) + ' ' + unit);
    }
    for (var f = 0; f < flashes.length; f++) {
      var k = (p - .15 - f * .014) / .03;
      put(flashes[f], 'opacity', (k > 0 && k < 1 ? (1 - Math.abs(k * 2 - 1)) * .9 : 0).toFixed(3));
    }

    /* Alfredo reads all of it: one soft light passes down the card */
    var r = (p - .31) / .13;
    put(scan, 'opacity', (r > 0 && r < 1 ? Math.sin(r * Math.PI) : 0).toFixed(3));
    put(scan, 'transform', 'translateY(' + ((r < 0 ? 0 : r > 1 ? 1 : r) * scanSpan).toFixed(1) + 'px)');

    /* then marks up what is worth trying, one kind of change at a time */
    put(sMozz, 'transform', 'scaleX(' + seg(p, .48, .51).toFixed(3) + ')');
    var nm = seg(p, .505, .53);
    put(nMozz, 'opacity', nm.toFixed(3));
    put(nMozz, 'transform', 'translateY(' + (4 - 4 * nm).toFixed(1) + 'px)');

    var dim = seg(p, .535, .56);
    put(calRow, 'opacity', (1 - dim * .6).toFixed(3));
    put(noteCal, 'opacity', dim.toFixed(3));

    /* the nachos leave the starters and arrive beside the taps: the source
       row closes as the destination opens, and the row itself travels */
    var mv = seg(p, .565, .62);
    put(slot, 'height', (RH * mv).toFixed(1) + 'px');
    put(srcRow, 'height', (RH * (1 - mv)).toFixed(1) + 'px');
    put(srcRow, 'opacity', mv > 0 ? '0' : '1');
    put(srcRow, 'overflow', 'hidden');
    if (mv > 0 && mv < 1) {
      /* The one place this file reads a position back. Both ends of the
         journey are moving as the rows above and below it close and open,
         so where the row has got to cannot be worked out in advance. */
      var mr = menu.getBoundingClientRect(),
          from = srcRow.getBoundingClientRect(),
          to = slot.getBoundingClientRect();
      put(mover, 'top', (mix(from.top, to.top, mv) - mr.top).toFixed(1) + 'px');
      put(mover, 'opacity', '1');
      put(mover, 'transform', 'scale(' + (1 + Math.sin(mv * Math.PI) * .04).toFixed(4) + ')');
      put(slotRow, 'opacity', '0');
    } else {
      put(mover, 'opacity', '0');
      put(slotRow, 'opacity', '1');
    }

    put(sHH, 'transform', 'scaleX(' + seg(p, .63, .66).toFixed(3) + ')');
    var nh = seg(p, .655, .68);
    put(nHH, 'opacity', nh.toFixed(3));
    put(nHH, 'transform', 'translateY(' + (4 - 4 * nh).toFixed(1) + 'px)');

    /* you pick one: the others step back and four weeks run */
    var pick = seg(p, .71, .75);
    var back = 'opacity(' + (1 - pick * .6).toFixed(3) + ')';
    put(calRow, 'filter', back);
    put(hhRow, 'filter', back);
    put(slot, 'opacity', (1 - pick * .6).toFixed(3));
    put(ring, 'opacity', pick.toFixed(3));

    var wv = seg(p, .74, .76);
    put(weeks, 'height', (wv * 14).toFixed(1) + 'px');
    put(weeks, 'opacity', wv.toFixed(3));
    for (var w = 0; w < wks.length; w++) cls(wks[w], 'f', p > .76 + w * .02);

    /* and an honest answer */
    var v = seg(p, .86, .92);
    put(stamp, 'opacity', v.toFixed(3));
    put(stamp, 'transform', 'translate(-50%, -50%) rotate(-6deg) scale(' + (1.3 - .3 * v).toFixed(4) + ')');
  }

  /* --------------------------------------------------------- the playhead */
  var P0 = 0.12, DUR = 14000;              /* 0.12 to 1 over fourteen seconds */
  var CH = [0.12, 0.30, 0.46, 0.70, 0.85, 1];
  var elapsed = 0, playing = false, userPaused = false, ended = false;
  var onScreen = false, rafId = 0, lastNow = 0, frames = 0;
  var L = playBtn ? {
    play: playBtn.getAttribute('data-play') || 'Play',
    pause: playBtn.getAttribute('data-pause') || 'Pause',
    replay: playBtn.getAttribute('data-replay') || 'Play again'
  } : null;

  window.__storyFrames = function () { return frames; };

  function progress() { return P0 + (1 - P0) * (elapsed / DUR); }

  function paintChapters(p) {
    for (var i = 0; i < fills.length; i++) {
      var a = CH[i], b = CH[i + 1];
      var f = (p - a) / (b - a);
      put(fills[i], 'transform', 'scaleX(' + (f < 0 ? 0 : f > 1 ? 1 : f).toFixed(3) + ')');
      cls(chaps[i], 'now', p >= a && p < b);
    }
  }

  function paint() {
    var p = progress();
    apply(p);
    paintChapters(p);
  }

  function label() {
    if (!playBtn || !L) return;
    cls(playBtn, 'is-playing', playing);
    var want = playing ? L.pause : (ended ? L.replay : L.play);
    if (playBtn.getAttribute('aria-label') !== want) playBtn.setAttribute('aria-label', want);
  }

  function tick() {
    if (!rafId && onScreen) { lastNow = 0; rafId = requestAnimationFrame(frame); }
  }

  function play() {
    if (playing) return;
    playing = true; lastNow = 0; label(); tick();
  }
  function pause() {
    if (!playing) return;
    playing = false; label();
  }

  function restart() { elapsed = 0; ended = false; userPaused = false; play(); paint(); tick(); }

  function frame(now) {
    rafId = 0;
    if (!onScreen) return;                 /* nothing is drawn off screen */
    frames++;
    var dt = lastNow ? Math.min(100, now - lastNow) : 16.7;
    lastNow = now;

    if (playing) {
      elapsed += dt;
      if (elapsed >= DUR) { elapsed = DUR; playing = false; ended = true; label(); }
    }

    var t = now / 1000;
    var sA = 1.04 + 0.04 * Math.sin(t * 0.698);
    var sB = 1.04 + 0.04 * Math.cos(t * 0.483);
    put(glowA, 'transform', 'translate(' + (Math.sin(t * .15) * 40).toFixed(1) + 'px,' +
        (Math.cos(t * .12) * 30).toFixed(1) + 'px) scale(' + sA.toFixed(4) + ')');
    put(glowB, 'transform', 'translate(' + (Math.cos(t * .1) * 40).toFixed(1) + 'px,' +
        (Math.sin(t * .13) * 30).toFixed(1) + 'px) scale(' + sB.toFixed(4) + ')');

    paint();
    rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ controls */
  if (playBtn) {
    playBtn.addEventListener('click', function () {
      if (ended) { restart(); return; }
      if (playing) { userPaused = true; pause(); }
      else { userPaused = false; play(); }
      tick();
    });
  }
  if (replayBtn) replayBtn.addEventListener('click', restart);

  chaps.forEach(function (b) {
    b.addEventListener('click', function () {
      var p = +b.getAttribute('data-p');
      elapsed = Math.max(0, Math.min(DUR, (p - P0) / (1 - P0) * DUR));
      ended = false; userPaused = false;
      play(); paint(); tick();
    });
  });

  /* ------------------------------------- it starts when it is worth watching */
  measure(true);
  paint();
  label();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      var vis = e.isIntersecting && e.intersectionRatio >= 0.55;
      if (vis === onScreen) return;
      onScreen = vis;
      if (onScreen) {
        measure();
        tick();
        if (!userPaused && !ended) play();
      } else {
        /* it waits rather than runs on behind the reader, and whether the
           reader had paused it is remembered for when it comes back */
        playing = false; label();
      }
    }, { threshold: [0, 0.25, 0.55, 0.8, 1] }).observe(scene);
  } else {
    onScreen = true; play(); tick();
  }

  addEventListener('resize', function () { measure(); }, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(true); paint(); });
  }

  /* the button goes to the film and starts it from the top */
  var jump = document.getElementById('storyJump');
  if (jump) {
    jump.addEventListener('click', function (e) {
      e.preventDefault();
      elapsed = 0; ended = false; userPaused = false;
      scene.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (onScreen) play();
      paint(); tick();
    });
  }
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

  /* The panel, not the bar. Scrolling the sticky bar into view left the
     page wherever it already was, so opening a tab from the foot of a long
     one dropped the visitor into the middle of the new one. Every element
     with an id already carries scroll-margin-top for the pinned bars, so
     the panel lands just under the tab bar rather than behind it. */
  function toTop(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: A.reduce ? 'auto' : 'smooth' });
  }

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
    if (doScroll) toTop(panels[name]);
    /* On a phone the bar is one scrolling row, so the tab that is now on has
       to be brought into it. scrollLeft rather than scrollIntoView, which
       would take the whole page with it. */
    var onTab = tabs.filter(function (t) { return t.getAttribute('data-t') === name; })[0];
    if (onTab && bar.scrollWidth > bar.clientWidth + 1) {
      bar.scrollLeft = Math.max(0, onTab.offsetLeft - (bar.clientWidth - onTab.offsetWidth) / 2);
    }
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

  /* The fragment can also change without a page load and without a history
     move: a link to #menu from elsewhere on this same page, or a pasted
     fragment in the address bar. The tabs' own pushState does not fire
     this, so there is no double handling. */
  window.addEventListener('hashchange', function () {
    var frag = (location.hash || '').slice(1);
    var name = inner[frag];
    if (!name) return;
    apply(name, false);
    var target = frag !== name ? document.getElementById(frag) : null;
    toTop(target || panels[name]);
  });

  window.addEventListener('popstate', function (e) {
    var frag = (location.hash || '').slice(1);
    var name = (e.state && e.state.tab) || inner[frag] || names[0];
    apply(name, false);
    /* back to a deep link lands on the thing it names; back to a tab lands
       on the top of that tab */
    var target = (frag && frag !== name) ? document.getElementById(frag) : null;
    toTop(target || panels[name]);
  });

  /* ------------------------------------------- try it on the sample */
  /* Both outcomes are the two samples printed either side of this card, so
     pressing a button shows the visitor a result that is already on the
     page rather than inventing one. With no script the choices are not
     rendered as anything a visitor can press and the cards above still
     carry both results. */
  (function () {
    var card = document.getElementById('tryit');
    if (!card) return;
    var choices = document.getElementById('tryitChoices');
    var out = document.getElementById('tryitOut');
    var bars = document.getElementById('tryitBars');
    var newPrice = document.getElementById('tryitNew');
    var oldPrice = document.getElementById('tryitPrice');
    var line = document.getElementById('tryitLine');
    var verdicts = document.getElementById('tryitVerdicts');
    var say = document.getElementById('tryitSay');
    var again = document.getElementById('tryitAgain');

    /* Every play is numbered. The verdict lands on a timer and the bars
       grow on the next frame, so without this a second choice pressed while
       the first was still playing would have the first one's verdict land
       on top of it a moment later. */
    var play = 0, timer = null;

    function reset() {
      play++;
      if (timer) { clearTimeout(timer); timer = null; }
      out.hidden = true;
      bars.innerHTML = ''; bars.classList.remove('drawn');
      newPrice.hidden = true; newPrice.textContent = '';
      oldPrice.classList.remove('struck');
      line.textContent = ''; line.classList.remove('bad');
      say.textContent = '';
      A.$$('.vd', verdicts).forEach(function (v) { v.classList.remove('on'); });
      A.$$('.tryit-btn', choices).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    }

    function run(btn) {
      reset();
      var mine = play;
      var weeks = btn.getAttribute('data-weeks').split(',');
      var kinds = (btn.getAttribute('data-kinds') || '').split(',');
      var verdict = btn.getAttribute('data-verdict');
      var text = btn.getAttribute('data-line');
      btn.setAttribute('aria-pressed', 'true');
      oldPrice.classList.add('struck');
      newPrice.textContent = btn.getAttribute('data-new');
      newPrice.hidden = false;
      out.hidden = false;

      weeks.forEach(function (h, i) {
        var s = document.createElement('span');
        var v = parseInt(h, 10);
        s.className = 'wb ' + (kinds[i] || 'ok');
        s.style.setProperty('--h', v + '%');
        s.style.transitionDelay = (i * 90) + 'ms';
        bars.appendChild(s);
      });
      /* the bars already know how to grow: .weekbars.drawn is the same rule
         the measured card uses, and it is already inert under reduced
         motion, so there is no second mechanism to keep in step */
      requestAnimationFrame(function () { if (mine === play) bars.classList.add('drawn'); });

      var land = function () {
        A.$$('.vd', verdicts).forEach(function (v) {
          v.classList.toggle('on', v.textContent.trim() === verdict);
        });
        line.textContent = text;
        line.classList.toggle('bad', verdict === 'Backfired');
        say.textContent = verdict + '. ' + text;
      };
      if (A.reduce) land(); else timer = setTimeout(function () { if (mine === play) land(); }, 640);
    }

    A.$$('.tryit-btn', choices).forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { run(b); });
    });
    if (again) again.addEventListener('click', function () {
      reset();
      var first = choices.querySelector('.tryit-btn');
      if (first) first.focus();
    });
  })();

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
        /* the hour is the column, so the week arrives left to right */
        cell.style.setProperty('--col', h);
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
    watch(document.getElementById('heat'), 'drawn');
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
  } else if (frag2 && document.getElementById(frag2) && panels[start]) {
    /* The fragment names a tab, and the same word is also an id inside that
       panel: product.html#intel is the guests tab, and also the neighbors
       section halfway down it, which is where the browser jumps before any
       of this runs. A tab opens at its own headline however it was reached,
       including from a shared link. The bars module lands anchors again
       once the webfont is in, so it is told what this fragment means. */
    window.__alfredoLand = panels[start];
    setTimeout(function () { panels[start].scrollIntoView({ block: 'start', behavior: 'auto' }); }, 60);
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

  /* The browser's own bubble is the fallback for a visitor with no script.
     With script, the page says what is missing in the region it already
     has, which a screen reader hears and a bubble does not. */
  form.setAttribute('novalidate', '');

  function nameOf(el) {
    var set = el.closest('fieldset');
    if (set && set.querySelector('legend')) return set.querySelector('legend').textContent.trim();
    var lab = el.closest('label');
    if (lab && lab.childNodes[0] && lab.childNodes[0].nodeValue) return lab.childNodes[0].nodeValue.trim();
    return el.name;
  }
  function clearErrors() {
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'),
      function (el) { el.removeAttribute('aria-invalid'); });
  }
  function showErrors() {
    clearErrors();
    var missing = [], seen = {};
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
      if (el.type === 'hidden' || el.willValidate === false || el.checkValidity()) return;
      el.setAttribute('aria-invalid', 'true');
      var label = nameOf(el);
      /* the label is left as the form writes it, so POS system does not
         come back as pos system */
      if (!seen[label]) { seen[label] = 1; missing.push(label); }
    });
    if (!missing.length) return false;
    status.className = 'bad';
    status.textContent = missing.length === 1
      ? 'One thing is still missing: ' + missing[0] + '.'
      : 'A few things are still missing: ' + missing.join(', ') + '.';
    var first = form.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
    return true;
  }
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('aria-invalid') && t.checkValidity()) {
      t.removeAttribute('aria-invalid');
    }
  });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.name === 'locations') {
      Array.prototype.forEach.call(form.querySelectorAll('[name="locations"]'),
        function (el) { el.removeAttribute('aria-invalid'); });
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (showErrors()) return;
    clearErrors();
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
        status.textContent = 'That did not go through. Please try again, or ';
        var mail = document.createElement('a');
        mail.href = 'mailto:contact@bakinginsightsai.com';
        mail.textContent = 'email us at contact@bakinginsightsai.com';
        status.appendChild(mail);
        status.appendChild(document.createTextNode(' and we will pick it up from there.'));
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

  /* ------------------------------------- every card answers the finger */
  /* The glass cards below take the tilt and the sheen, which are not cheap.
     Everything else on the site that looks like a card gets the cheap half:
     it moves under a finger and comes back. A transform and a border, so a
     press costs a composite and nothing else. */
  (function () {
    var plain = A.$$('.tile, .vizcard, .quotecard, .faq details');
    if (!plain.length) return;
    plain.forEach(function (card) {
      var press = function () { card.classList.add('press'); };
      var release = function () { card.classList.remove('press'); };
      card.addEventListener('pointerdown', press, { passive: true });
      ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(function (ev) {
        card.addEventListener(ev, release, { passive: true });
      });
    });
  })();

  /* ------------------------------------- every card answers the finger */
  /* The glass cards below take the tilt and the sheen, which are not cheap.
     Everything else on the site that looks like a card gets the cheap half:
     it moves under a finger and comes back. A transform and a border, so a
     press costs a composite and nothing else. */
  (function () {
    var plain = A.$$('.tile, .vizcard, .quotecard, .faq details');
    if (!plain.length) return;
    plain.forEach(function (card) {
      var press = function () { card.classList.add('press'); };
      var release = function () { card.classList.remove('press'); };
      card.addEventListener('pointerdown', press, { passive: true });
      ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(function (ev) {
        card.addEventListener(ev, release, { passive: true });
      });
    });
  })();

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
    /* The menu card in the story takes the tilt as well. It is one card
       rather than three, and every write it gets is event driven, so the
       blur behind it is not redone on a timer. */
    var outside = cards.filter(function (c) {
      return !c.classList.contains('nav') && (!c.closest('.story') || c.id === 'menu');
    });
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
