/* Alfredo, v5. Four small jobs: the menu, the scroll reveals, the product
   demonstration, and the demo form.

   None of it is required for the page to make sense. With scripting off the
   menu is a plain list, nothing is hidden waiting to be revealed, all three
   stages of the demonstration are on the page at once, and the form posts
   the ordinary way. Every tab role and every hidden attribute below is added
   here rather than written into the markup, which is why that is true. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- menu --
     The button owns the open state and aria-expanded is set in the same
     place, so the two cannot disagree. Escape closes it and gives the focus
     back to the button, which is where the reader was. */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    var setOpen = function (open) {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setOpen(!links.classList.contains('open'));
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000) setOpen(false);
    });
  }

  /* ---------------------------------------------------------- reveals --
     Only the things carrying .reveal, which is the heading that opens each
     editorial moment, the product demonstration and the ledger. Not every
     paragraph, and not every row. Under reduced motion they are simply in. */
  var items = [].slice.call(document.querySelectorAll('.reveal'));
  if (items.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
      items.forEach(function (el) { io.observe(el); });
    }
  }

  /* ------------------------------------------- the product walkthrough --
     A real tablist: arrow keys and Home and End move between the stages,
     one tab is in the tab order at a time, and the panel each one owns is
     named by it. Nothing rotates on its own. */
  [].slice.call(document.querySelectorAll('[data-tabs]')).forEach(function (tabsBox) {
    var tabs = [].slice.call(tabsBox.querySelectorAll('[data-tab]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('data-tab')); });
    if (tabs.length && panels.every(Boolean)) {
      tabsBox.setAttribute('role', 'tablist');
      if (!tabsBox.getAttribute('aria-labelledby')) {
        tabsBox.setAttribute('aria-label', tabsBox.getAttribute('data-tabs') || 'Tabs');
      }

      var select = function (i, moveFocus) {
        tabs.forEach(function (tab, n) {
          var on = n === i;
          tab.setAttribute('aria-selected', String(on));
          tab.setAttribute('tabindex', on ? '0' : '-1');
          panels[n].hidden = !on;
        });
        if (moveFocus) tabs[i].focus();
      };

      tabs.forEach(function (tab, i) {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('id', 'tab-' + tab.getAttribute('data-tab'));
        tab.setAttribute('aria-controls', tab.getAttribute('data-tab'));
        panels[i].setAttribute('role', 'tabpanel');
        panels[i].setAttribute('aria-labelledby', 'tab-' + tab.getAttribute('data-tab'));
        panels[i].setAttribute('tabindex', '0');

        tab.addEventListener('click', function () { select(i, false); });
        tab.addEventListener('keydown', function (e) {
          var to = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % tabs.length;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + tabs.length) % tabs.length;
          if (e.key === 'Home') to = 0;
          if (e.key === 'End') to = tabs.length - 1;
          if (to === null) return;
          e.preventDefault();
          select(to, true);
        });
      });

      select(0, false);
    }
  });

  /* ------------------------------------------------------------- form --
     Unchanged from v4: same endpoint, same field names, same messages.
     Validation is the browser's, and this only decides when to show it. */
  var form = document.getElementById('demoForm');
  if (form) {
    var status = document.getElementById('formStatus');
    var submit = form.querySelector('[type="submit"]');
    var showError = function (field) {
      var msg = document.getElementById(field.name + 'Error');
      if (!msg) return;
      msg.textContent = field.validity.valueMissing
        ? msg.getAttribute('data-missing')
        : msg.getAttribute('data-invalid');
      msg.hidden = false;
      field.setAttribute('aria-invalid', 'true');
    };
    var clearError = function (field) {
      var msg = document.getElementById(field.name + 'Error');
      if (msg) msg.hidden = true;
      field.removeAttribute('aria-invalid');
    };
    [].forEach.call(form.elements, function (field) {
      if (!field.name || field.type === 'hidden') return;
      field.addEventListener('invalid', function (e) { e.preventDefault(); showError(field); });
      field.addEventListener('input', function () { if (field.checkValidity()) clearError(field); });
      field.addEventListener('change', function () { if (field.checkValidity()) clearError(field); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        var first = form.querySelector('[aria-invalid="true"], :invalid');
        if (first && first.focus) first.focus();
        return;
      }
      status.className = 'form-status working';
      status.textContent = 'Sending your request.';
      submit.disabled = true;
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok && data.success, data: data }; });
      }).then(function (out) {
        if (!out.ok) throw new Error('rejected');
        form.hidden = true;
        status.className = 'form-status good';
        status.innerHTML = 'Thank you. Your request is with us, and we will reply within one business day.';
      }).catch(function () {
        status.className = 'form-status bad';
        status.innerHTML = 'That did not go through. Please email ' +
          '<a class="textlink" href="mailto:contact@bakinginsightsai.com">contact@bakinginsightsai.com</a>' +
          ' and we will pick it up from there.';
      }).then(function () {
        submit.disabled = false;
      });
    });
  }

  /* ------------------------------------------------------------- film --
     Fifteen seconds of a weekly list, on the home page.

     Three rules it keeps. It plays only while it is on screen, so nothing
     animates behind a reader who has scrolled past it. It never changes
     anything that affects layout: the only things that move are a class on
     three rows, two lines of text inside boxes with a reserved height, and
     three overlays that were laid out at load and only change opacity. And
     a reader who asked for less motion never gets here at all, because the
     stylesheet hides the scene and shows the stages instead.

     Every word and every time comes from the markup, which comes from the
     data. There is no copy in this file. */
  var filmFrame = document.getElementById('filmFrame');
  var scene = document.getElementById('filmScene');
  if (filmFrame && scene && !reduce) {
    var toggle2 = document.getElementById('filmToggle');
    var replay = document.getElementById('filmReplay');
    var fill = document.getElementById('filmFill');
    var clock = document.getElementById('filmTime');
    var kicker = document.getElementById('filmKicker');
    var line = document.getElementById('filmLine');
    var price = document.getElementById('filmPrice');
    var rows = [0, 1, 2].map(function (i) { return document.getElementById('filmRow' + i); });
    var marks = [].slice.call(scene.querySelectorAll('.film-script > i')).map(function (el) {
      return {
        at: parseFloat(el.getAttribute('data-at')),
        row: el.getAttribute('data-row'),
        price: el.getAttribute('data-price'),
        kicker: el.getAttribute('data-kicker'),
        line: el.getAttribute('data-line')
      };
    });
    var priceBefore = scene.getAttribute('data-price-before');
    var priceAfter = scene.getAttribute('data-price-after');
    var sayPlay = scene.getAttribute('data-play');
    var sayPause = scene.getAttribute('data-pause');
    var RUN = 15;

    if (marks.length && toggle2 && replay && fill && clock && kicker && line) {
      var head = 0, running = false, onScreen = false, held = false, frame = 0, prev = 0, shown = -1;

      var two = function (n) { return (n < 10 ? '0' : '') + n; };

      var paint = function (t) {
        var step = 0;
        for (var i = 0; i < marks.length; i++) { if (t >= marks[i].at) { step = i; } }
        if (step !== shown) {
          shown = step;
          var m = marks[step];
          scene.setAttribute('data-step', String(step));
          kicker.textContent = m.kicker;
          line.textContent = m.line;
          if (price) { price.textContent = m.price === 'after' ? priceAfter : priceBefore; }
          rows.forEach(function (el, i) {
            if (el) { el.classList.toggle('is-on', String(i) === m.row); }
          });
        }
        fill.style.width = ((t / RUN) * 100).toFixed(2) + '%';
        clock.textContent = '00:' + two(Math.floor(t)) + ' / 00:' + RUN;
      };

      var halt = function () {
        running = false; prev = 0;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        toggle2.textContent = sayPlay;
        toggle2.setAttribute('aria-pressed', 'false');
      };

      var tick = function (now) {
        if (!running || !onScreen) { halt(); return; }
        if (prev) { head += (now - prev) / 1000; }
        prev = now;
        if (head >= RUN) { head = 0; shown = -1; }
        paint(head);
        frame = requestAnimationFrame(tick);
      };

      var run = function (byHand) {
        if (!onScreen) { return; }
        if (byHand) { held = false; }
        if (running) { return; }
        running = true; prev = 0;
        toggle2.textContent = sayPause;
        toggle2.setAttribute('aria-pressed', 'true');
        frame = requestAnimationFrame(tick);
      };

      toggle2.addEventListener('click', function () {
        if (running) { held = true; halt(); } else { run(true); }
      });
      replay.addEventListener('click', function () {
        head = 0; shown = -1; paint(0); run(true);
      });

      /* on screen means a fifth of it is showing, which is enough of the
         frame to be worth playing and little enough that a phone starts it
         as the section arrives rather than after it has gone by */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            onScreen = e.isIntersecting && e.intersectionRatio >= 0.2;
            if (!onScreen) { halt(); } else if (!held) { run(false); }
          });
        }, { threshold: [0, 0.2, 0.4] }).observe(filmFrame);
      } else {
        onScreen = true;
        run(false);
      }

      /* a reader who turns reduced motion on while the page is open gets the
         stages from the stylesheet; this stops the clock behind them */
      if (window.matchMedia) {
        var less = window.matchMedia('(prefers-reduced-motion: reduce)');
        var onLess = function () { if (less.matches) { held = true; halt(); } };
        if (less.addEventListener) { less.addEventListener('change', onLess); }
        else if (less.addListener) { less.addListener(onLess); }
      }

      paint(0);
    }
  }

  /* ----------------------------------------------- the demonstration --
     What it does. Four kinds of change, one shown at a time, and a reader
     who decides. The four cases are in the markup as data, so there is no
     copy in this file and the page and the script cannot disagree.

     Arrow keys move between the tabs, which is what a tablist is expected
     to do. Choosing a tab puts the panel back to its first state, because
     a verdict left over from the last case would be a verdict for the
     wrong suggestion. */
  var panel = document.getElementById('demoPanel');
  if (panel) {
    var tabs = [].slice.call(document.querySelectorAll('.tabstrip-btn'));
    var cases = [].slice.call(panel.querySelectorAll('.demo-script > i')).map(function (el) {
      var d = {};
      ['kind', 'name', 'why', 'how', 'effort', 'risk', 'back', 'verdict', 'result', 'tone']
        .forEach(function (k) { d[k] = el.getAttribute('data-' + k); });
      return d;
    });
    var out = {
      kind: document.getElementById('demoKind'),
      name: document.getElementById('demoHead'),
      why: document.getElementById('demoWhy'),
      how: document.getElementById('demoHow'),
      effort: document.getElementById('demoEffort'),
      risk: document.getElementById('demoRisk'),
      back: document.getElementById('demoBack'),
      verdict: document.getElementById('demoVerdict'),
      result: document.getElementById('demoResultText')
    };
    var steps = {
      ready: document.getElementById('demoReady'),
      review: document.getElementById('demoReview'),
      result: document.getElementById('demoResult'),
      declined: document.getElementById('demoDeclined')
    };
    var acts = document.getElementById('demoActions');
    var date = document.getElementById('demoDate');
    var tryIt = document.getElementById('demoTry');
    var skip = document.getElementById('demoSkip');
    var show = document.getElementById('demoShow');
    var again = document.getElementById('demoAgain');
    var back = document.getElementById('demoReconsider');
    var missing = panel.getAttribute('data-missing') || '';

    if (tabs.length && cases.length && out.name && steps.ready && acts) {
      var at = 0;

      var step = function (which) {
        Object.keys(steps).forEach(function (k) {
          if (steps[k]) { steps[k].hidden = k !== which; }
        });
        acts.hidden = which !== 'ready';
      };

      var pick = function (i, moveFocus) {
        at = i;
        var c = cases[i];
        out.kind.textContent = c.kind;
        out.name.textContent = c.name;
        out.why.textContent = c.why;
        out.how.textContent = c.how;
        if (out.effort) { out.effort.textContent = c.effort; }
        if (out.risk) { out.risk.textContent = c.risk; }
        if (out.back) { out.back.textContent = c.back; }
        if (out.verdict) {
          out.verdict.textContent = c.verdict;
          out.verdict.className = 'demo-verdict ledger-' + c.tone;
        }
        if (out.result) { out.result.textContent = c.result; }
        tabs.forEach(function (b, n) {
          var on = n === i;
          b.setAttribute('aria-selected', String(on));
          b.tabIndex = on ? 0 : -1;
          if (on) {
            panel.setAttribute('aria-labelledby', b.id);
            if (moveFocus) { b.focus(); }
          }
        });
        if (date) { date.value = ''; date.setCustomValidity(''); }
        step('ready');
      };

      tabs.forEach(function (b, i) {
        b.addEventListener('click', function () { pick(i, false); });
        b.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight') { next = (i + 1) % tabs.length; }
          if (e.key === 'ArrowLeft') { next = (i + tabs.length - 1) % tabs.length; }
          if (e.key === 'Home') { next = 0; }
          if (e.key === 'End') { next = tabs.length - 1; }
          if (next !== null) { e.preventDefault(); pick(next, true); }
        });
      });

      if (tryIt) {
        tryIt.addEventListener('click', function () {
          step('review');
          if (date) { date.focus(); }
        });
      }
      if (skip) { skip.addEventListener('click', function () { step('declined'); }); }
      if (back) {
        back.addEventListener('click', function () {
          step('ready');
          if (tryIt) { tryIt.focus(); }
        });
      }
      if (show && date) {
        show.addEventListener('click', function () {
          if (!date.value) {
            date.setCustomValidity(missing);
            if (date.reportValidity) { date.reportValidity(); }
            date.focus();
            return;
          }
          date.setCustomValidity('');
          step('result');
        });
        date.addEventListener('input', function () { date.setCustomValidity(''); });
      }
      if (again) {
        again.addEventListener('click', function () {
          step('ready');
          tabs[at].focus();
        });
      }

      pick(0, false);
    }
  }
})();
