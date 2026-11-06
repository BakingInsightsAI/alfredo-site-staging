/* Alfredo v3 homepage behaviour. No libraries, no third party scripts.
   Every animation is gated on prefers-reduced-motion. Nothing here is
   required for the content to be readable. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var chatRunning = false;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement, tgl = $('#themeToggle');
  function syncToggle() {
    var light = root.getAttribute('data-theme') === 'light';
    tgl.setAttribute('aria-pressed', String(light));
    tgl.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  if (tgl) {
    syncToggle();
    tgl.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('alfredo-theme', next); } catch (e) {}
      var mc = document.querySelector('meta[name="theme-color"]');
      if (mc) mc.setAttribute('content', next === 'light' ? '#fbf6ef' : '#000000');
      syncToggle();
    });
  }

  /* ---------- Motion control (WCAG 2.2.2 pause, stop, hide) ---------- */
  function motionOff() { return reduce || root.getAttribute('data-motion') === 'paused'; }
  var mt = $('#motionToggle');
  function syncMotion() {
    var paused = root.getAttribute('data-motion') === 'paused';
    mt.setAttribute('aria-pressed', String(paused));
    mt.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
  }
  if (mt) {
    syncMotion();
    mt.addEventListener('click', function () {
      var wasPaused = root.getAttribute('data-motion') === 'paused';
      if (wasPaused) root.removeAttribute('data-motion');
      else root.setAttribute('data-motion', 'paused');
      try { localStorage.setItem('alfredo-motion', wasPaused ? 'running' : 'paused'); } catch (e) {}
      syncMotion();
      if (wasPaused) { chatRunning = false; runChat(); }
    });
  }

  /* ---------- Nav state + scroll progress ---------- */
  var nav = $('#nav'), prog = $('#progress');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
    if (prog) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Word by word headings ---------- */
  $$('.split-words').forEach(function (el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w, i) {
      return '<span class="w" style="transition-delay:' + (i * 35) + 'ms">' + w + '</span>';
    }).join(' ');
  });

  /* ---------- Reveal on scroll (with a no-IntersectionObserver fallback) ---------- */
  var revealables = $$('.reveal, .split-words');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealables.forEach(function (el, i) {
      if (el.classList.contains('reveal')) el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }
  function whenSeen(el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { fn(); o.disconnect(); }
    }, { threshold: .4 });
    o.observe(el);
  }

  /* ---------- Hero rotating word ---------- */
  var rot = $$('#rot > span'), ri = 0;
  if (!reduce && rot.length) setInterval(function () {
    if (motionOff()) return;
    var cur = rot[ri];
    cur.classList.remove('on'); cur.classList.add('out');
    setTimeout(function () { cur.classList.remove('out'); }, 500);
    ri = (ri + 1) % rot.length; rot[ri].classList.add('on');
  }, 2400);

  /* ---------- Sample weekly board ---------- */
  var icons = {
    p: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    pos: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    c: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    o: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };
  var items = [
    { t: 'p', title: 'Mozzarella Sticks $6.99 to $7.49', meta: 'PRICING · 290/wk', v: 98 },
    { t: 'pos', title: 'Loaded Nachos with House IPA', meta: 'POSITIONING · 3.1x lift', v: 64 },
    { t: 'c', title: 'Copper Pint wings signal', meta: 'COMPETITIVE · 31 of 44', v: 0, obs: true },
    { t: 'o', title: 'Tuesday early dinner staffing', meta: 'OPERATIONS · sample', v: 41 }
  ];
  var tagCls = { p: 't-p', pos: 't-pos', c: 't-c', o: 't-o' };
  var list = $('#lbList');
  if (list) {
    items.forEach(function (it) {
      var li = document.createElement('li'); li.className = 'lb-item';
      li.innerHTML = '<span class="tag ' + tagCls[it.t] + '" aria-hidden="true">' + icons[it.t] +
        '</span><div><div class="lb-title">' + it.title + '</div><div class="lb-meta">' + it.meta +
        '</div></div><div class="lb-val"></div>';
      it.el = li; list.appendChild(li);
    });
    var renderBoard = function () {
      var ranked = items.slice().sort(function (a, b) { return (b.obs ? -1 : b.v) - (a.obs ? -1 : a.v); });
      ranked.forEach(function (it, i) {
        it.el.style.transform = 'translateY(' + (i * 80) + 'px)';
        it.el.classList.toggle('top', i === 0);
        it.el.querySelector('.lb-val').innerHTML = it.obs
          ? '<span class="obs">signal</span><small>observation</small>'
          : '+$' + it.v + '<small>/wk if holds</small>';
      });
    };
    renderBoard();
    var wk = 14;
    if (!reduce) setInterval(function () {
      if (motionOff()) return;
      items.forEach(function (it) { if (!it.obs) { it.base = it.base || it.v; it.v = Math.round(it.base * (0.6 + Math.random() * 0.8)); } });
      wk++; $('#lbWeek').textContent = 'WEEK ' + wk + ' · SAMPLE';
      renderBoard();
    }, 3200);
  }

  /* ---------- Ticker ---------- */
  var ticks = [
    '<span class="lbl">Sample data</span>',
    '<b>Mozzarella Sticks</b> +50 cents <span class="up">+$98.41/wk if holds</span>',
    '<b>Nachos with IPA</b> 3.1x lift <span class="flag">⚠ unproven</span>',
    '<b>Copper Pint</b> wings · 31 of 44 reviews',
    '<b>Wings price test</b> <span class="up">worked · kept</span>',
    '<b>Dessert upsell</b> no effect · reverted',
    '<b>Trial</b> reversible in under 15 minutes',
    '<b>Board</b> 4 recommendation types · 1 ranked list',
    '<b>Data gap</b> number withheld, not estimated'
  ];
  var tickHTML = ticks.map(function (t) {
    return '<span class="tick">' + t + '</span><span class="tick"><span class="sep"></span></span>';
  }).join('');
  if ($('#ticker')) $('#ticker').innerHTML = tickHTML + tickHTML;

  /* ---------- Sample chat ---------- */
  var convo = [
    { q: 'Why is Tuesday slow?', a: 'Tuesday covers are down <b>18%</b> against your 8 week average, mostly 5 to 7pm. Want a 4 week trial to test a fix?' },
    { q: 'What should I try first this week?', a: 'Top of the board: <b>Mozzarella Sticks to $7.49</b>. Low risk, reversible in under 15 minutes.' },
    { q: 'Did the wings price test work?', a: 'Yes. Measured over 4 weeks, it <b>held up</b>. I have kept it and moved on.' }
  ];
  var chat = $('#chat'), typed = $('#typed'), send = $('#send');
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function runChat() {
    if (chatRunning || !chat) return;
    if (motionOff()) {
      chat.innerHTML = '<div class="bubble me">' + convo[0].q + '</div><div class="bubble al">' + convo[0].a + '</div>';
      typed.textContent = 'Ask Alfredo about your week';
      return;
    }
    chatRunning = true;
    var i = 0;
    (function next() {
      var c = convo[i % convo.length];
      typed.textContent = '';
      var chars = c.q.split(''), k = 0;
      (function type() {
        if (k < chars.length) { typed.textContent += chars[k++]; setTimeout(type, 45); return; }
        sleep(350).then(function () {
          send.classList.add('hit'); return sleep(150);
        }).then(function () {
          send.classList.remove('hit');
          typed.textContent = '';
          chat.insertAdjacentHTML('beforeend', '<div class="bubble me">' + c.q + '</div>');
          return sleep(400);
        }).then(function () {
          chat.insertAdjacentHTML('beforeend', '<div class="bubble al typing" id="tp"><i></i><i></i><i></i></div>');
          return sleep(1200);
        }).then(function () {
          $('#tp').outerHTML = '<div class="bubble al">' + c.a + '</div>';
          while (chat.children.length > 4) chat.firstElementChild.remove();
          return sleep(2600);
        }).then(function () { i++; next(); });
      })();
    })();
  }
  whenSeen(chat, runChat);

  /* ---------- Trial bars ---------- */
  whenSeen($('#trials'), function () {
    $$('#trials .bar > i').forEach(function (b, i) {
      if (reduce) { b.style.width = b.dataset.w + '%'; return; }
      setTimeout(function () { b.style.width = b.dataset.w + '%'; }, i * 180);
    });
  });

  /* ---------- Carousel ---------- */
  var car = $('#carousel');
  if (car) {
    var cards = $$('.rec', car), dots = $('#carDots');
    cards.forEach(function () { dots.appendChild(document.createElement('i')); });
    var carState = function () {
      var w = cards[0].offsetWidth + 16;
      var idx = Math.min(cards.length - 1, Math.round(car.scrollLeft / w));
      $$('i', dots).forEach(function (d, j) { d.classList.toggle('on', j === idx); });
      $('#carPrev').disabled = car.scrollLeft < 8;
      $('#carNext').disabled = car.scrollLeft > car.scrollWidth - car.clientWidth - 8;
    };
    car.addEventListener('scroll', carState, { passive: true }); carState();
    $('#carPrev').onclick = function () { car.scrollBy({ left: -(cards[0].offsetWidth + 16), behavior: reduce ? 'auto' : 'smooth' }); };
    $('#carNext').onclick = function () { car.scrollBy({ left: cards[0].offsetWidth + 16, behavior: reduce ? 'auto' : 'smooth' }); };
    car.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); $('#carNext').click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); $('#carPrev').click(); }
    });
    var down = false, sx = 0, sl = 0, moved = false;
    car.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = car.scrollLeft;
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 5) { moved = true; car.classList.add('drag'); }
      car.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', function () {
      if (!down) return;
      down = false; car.classList.remove('drag');
      if (moved) {
        var w = cards[0].offsetWidth + 16;
        car.scrollTo({ left: Math.round(car.scrollLeft / w) * w, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

  /* ---------- Bento spotlight ---------- */
  $$('.bcard').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Competitive map: each pin lights as the sweep passes ---------- */
  var radar = $('.radar');
  if (radar) {
    var setDelays = function () {
      var w = radar.clientWidth, h = radar.clientHeight;
      $$('.pin:not(.you)', radar).forEach(function (p) {
        var dx = (parseFloat(p.style.left) - 50) / 100 * w, dy = (parseFloat(p.style.top) - 50) / 100 * h;
        var ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        p.style.setProperty('--d', (ang / 360 * 5 - 5).toFixed(2) + 's');
      });
    };
    setDelays(); addEventListener('resize', setDelays, { passive: true });
  }

  /* ---------- Difference tabs ---------- */
  var tabs = $$('.diff-tab'), panels = $$('.diff-panel'), ti = 0, tTimer = null, userPicked = false;
  function selectTab(i, focus) {
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
    panels.forEach(function (p, j) { p.hidden = j !== i; });
    var t = tabs[i];
    t.classList.add('paused'); void t.offsetWidth; t.classList.remove('paused');
    if (userPicked) t.classList.add('paused');
    if (focus) t.focus();
    ti = i;
  }
  function autoTabs() {
    clearInterval(tTimer);
    if (motionOff() || userPicked) return;
    tTimer = setInterval(function () { if (motionOff()) return; selectTab((ti + 1) % tabs.length); }, 5000);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { userPicked = true; clearInterval(tTimer); selectTab(i); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); userPicked = true; clearInterval(tTimer);
        selectTab((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
      }
    });
  });
  whenSeen($('.diff-wrap'), function () { selectTab(0); autoTabs(); });

  /* ---------- Icon marquee ---------- */
  var ic = function (p) {
    return '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };
  var T = {
    rest: ic('<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M15 3c-1.5 2-1.5 7 0 9v9"/>'),
    bar: ic('<path d="M5 4h11v4a5.5 5.5 0 0 1-11 0V4ZM10.5 13.5V20M7 20h7M16 6h2a2 2 0 0 1 0 4h-2"/>'),
    cafe: ic('<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9ZM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>'),
    bake: ic('<path d="M3 20h18M5 20v-6a7 7 0 0 1 14 0v6M12 4v3"/>'),
    truck: ic('<path d="M2 16V7h12v9M14 10h4l4 4v2h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>'),
    multi: ic('<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/>'),
    menu: ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>'),
    sales: ic('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'),
    guests: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'),
    chat: ic('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>')
  };
  var tile = function (cls, inner) { return '<div class="tile ' + cls + '">' + inner + '</div>'; };
  var lab = function (svg, l) { return '<div class="in">' + svg + '<span class="lbl">' + l + '</span></div>'; };
  var row1 = [
    tile('', lab(T.rest, 'Restaurants')),
    tile('cream', '<div class="in"><span class="pos">Your</span><span class="lbl">POS</span></div>'),
    tile('', lab(T.bar, 'Bars and brewpubs')),
    tile('gold brand', 'a·'),
    tile('', lab(T.cafe, 'Cafes')),
    tile('cream', '<div class="in"><span class="pos">No</span><span class="lbl">Install</span></div>'),
    tile('wine', lab(T.bake, 'Bakeries')),
    tile('', lab(T.truck, 'Food trucks'))
  ].join('');
  var row2 = [
    tile('', lab(T.multi, 'Multi location')),
    tile('', lab(T.menu, 'Your menu')),
    tile('gold', lab(T.chat, 'Ask Alfredo')),
    tile('', lab(T.sales, 'Your sales')),
    tile('', lab(T.guests, 'Your guests')),
    tile('wine', lab(T.rest, 'Nearby venues')),
    tile('cream brand', 'a·'),
    tile('', lab(T.menu, 'Recipe costs'))
  ].join('');
  if ($('#mq1')) $('#mq1').innerHTML = row1 + row1;
  if ($('#mq2')) $('#mq2').innerHTML = row2 + row2;

  /* ---------- Counters: markup already holds the real numbers ---------- */
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, end = +el.dataset.count;
        if (reduce || end === 0) { el.textContent = end; return; }
        var t0 = performance.now(), d = 1400;
        (function f(t) {
          var k = Math.min(1, (t - t0) / d);
          el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(f);
        })(t0);
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }
})();
