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


  /* The v9 blocks below keep their own scope. This file is one function,
     every name in it is a var, and a var declared later in the file
     reassigns the same binding: the demonstration further down declares
     its own `panel`, which left this one holding null by the time anyone
     pressed Try this. Names like show, step, at and cases collide the same
     way. A closure of their own is cheaper than renaming twenty things. */
  (function () {
  /* ------------------------------------------------ the product window --
     The weekly list on the home page, as the product shows it. Four
     suggestions, one open at a time, and a decision the reader makes: try
     it, pick a date, then see an illustrative answer.

     Every word comes from the markup, which comes from the approved weekly
     records. Choosing a row swaps text inside boxes that already exist, so
     the window keeps its height and nothing below it moves. */
  var week = document.querySelector('.week-list');
  if (week) {
    var wRows = [].slice.call(week.querySelectorAll('.week-row'));
    var wCases = [].slice.call(document.querySelectorAll('.week-script > i')).map(function (el) {
      var d = {};
      ['kind', 'name', 'why', 'effort', 'risk', 'how', 'verdict', 'phase', 'body']
        .forEach(function (k) { d[k] = el.getAttribute('data-' + k); });
      return d;
    });
    var wOut = {
      overline: document.getElementById('detailOverline'),
      name: document.getElementById('detailName'),
      why: document.getElementById('detailWhy'),
      effort: document.getElementById('detailEffort'),
      risk: document.getElementById('detailRisk'),
      how: document.getElementById('detailHow')
    };
    var panel = document.getElementById('decisionPanel');
    var feedback = document.getElementById('decisionFeedback');
    var feedCopy = document.getElementById('feedbackCopy');
    var statusPill = document.getElementById('decisionStatus');
    var previewBtn = document.getElementById('previewResult');
    var resultLine = document.getElementById('decisionResult');
    var dateField = document.getElementById('reviewDate');
    var tryBtn = document.getElementById('tryButton');
    var skipBtn = document.getElementById('dismissButton');
    var setBtn = document.getElementById('setDateButton');

    if (wRows.length && wCases.length && wOut.name && panel) {
      var overlineWord = (wOut.overline.textContent || '').split(' ')[0];
      var sayMissing = panel.getAttribute('data-missing') || '';
      var sayScheduled = panel.getAttribute('data-scheduled') || '';
      var sayPending = panel.getAttribute('data-pending') || '';
      var sayTail = panel.getAttribute('data-tail') || '';
      var chosen = 0, settle = null;

      var clearDecision = function () {
        if (settle) { clearTimeout(settle); settle = null; }
        panel.setAttribute('data-open', 'false');
        feedback.setAttribute('data-show', 'false');
        previewBtn.setAttribute('data-show', 'false');
        resultLine.setAttribute('data-show', 'false');
        resultLine.textContent = '';
        statusPill.textContent = sayPending;
        statusPill.setAttribute('data-phase', 'pending');
        statusPill.classList.remove('is-changing');
        if (dateField) { dateField.value = ''; dateField.setCustomValidity(''); }
      };

      var openRow = function (i) {
        chosen = i;
        var c = wCases[i];
        wOut.overline.textContent = overlineWord + ' ' + (i < 9 ? '0' : '') + (i + 1) + ' / ' + c.kind;
        wOut.name.textContent = c.name;
        wOut.why.textContent = c.why;
        wOut.effort.textContent = c.effort;
        wOut.risk.textContent = c.risk;
        wOut.how.textContent = c.how;
        wRows.forEach(function (r, n) { r.setAttribute('aria-pressed', String(n === i)); });
        clearDecision();
      };

      wRows.forEach(function (r, i) {
        r.addEventListener('click', function () { openRow(i); });
      });
      if (tryBtn) {
        tryBtn.addEventListener('click', function () {
          panel.setAttribute('data-open', 'true');
          feedback.setAttribute('data-show', 'false');
          previewBtn.setAttribute('data-show', 'false');
          resultLine.setAttribute('data-show', 'false');
          if (dateField && dateField.focus) { dateField.focus({ preventScroll: true }); }
        });
      }
      if (skipBtn) {
        skipBtn.addEventListener('click', function () {
          clearDecision();
          if (tryBtn) { tryBtn.focus({ preventScroll: true }); }
        });
      }
      if (setBtn && dateField) {
        setBtn.addEventListener('click', function () {
          if (!dateField.value) {
            dateField.setCustomValidity(sayMissing);
            if (dateField.reportValidity) { dateField.reportValidity(); }
            dateField.focus();
            return;
          }
          dateField.setCustomValidity('');
          var when = new Date(dateField.value + 'T12:00:00');
          var shown = isNaN(when.getTime()) ? dateField.value
            : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          feedCopy.textContent = sayScheduled + ' ' + shown;
          feedback.setAttribute('data-show', 'true');
          statusPill.setAttribute('data-phase', 'pending');
          statusPill.textContent = sayPending;
          previewBtn.setAttribute('data-show', 'true');
          resultLine.setAttribute('data-show', 'false');
        });
        dateField.addEventListener('input', function () { dateField.setCustomValidity(''); });
      }
      if (previewBtn) {
        previewBtn.addEventListener('click', function () {
          var c = wCases[chosen];
          previewBtn.setAttribute('data-show', 'false');
          statusPill.classList.add('is-changing');
          settle = setTimeout(function () {
            statusPill.setAttribute('data-phase', c.phase);
            statusPill.textContent = c.verdict;
            statusPill.classList.remove('is-changing');
            resultLine.textContent = c.body + ' ' + sayTail;
            resultLine.setAttribute('data-show', 'true');
          }, reduce ? 0 : 350);
        });
      }
      openRow(0);
    }
  }

  /* ---------------------------------------------------------- the film --
     Fifteen seconds. One row of the same list goes from suggested, to
     trying, to a review date the owner picked, to a verdict, and into the
     track record. The script changes one attribute, one word and one
     progress bar; everything else is the stylesheet.

     It plays only while it is on screen and only once on its own. A reader
     who asked for less motion never reaches here: the stylesheet shows the
     five steps as a list instead. */
  var filmFrame = document.getElementById('filmFrame');
  var stage = document.getElementById('filmStage');
  if (filmFrame && stage) {
    var area = document.getElementById('filmArea');
    var stepLine = document.getElementById('filmStepLine');
    var waitFill = document.getElementById('filmWaitFill');
    var bar = document.getElementById('filmProgress');
    var clock = document.getElementById('filmClock');
    var track = document.getElementById('filmTrack');
    var rowState = document.getElementById('filmRowState');
    var script = filmFrame.querySelector('.film-script');
    var scenes = [].slice.call(filmFrame.querySelectorAll('.film-script > i')).map(function (el) {
      return { at: parseInt(el.getAttribute('data-at'), 10), step: el.getAttribute('data-step') };
    });
    var words = script ? {
      0: script.getAttribute('data-suggested'),
      1: script.getAttribute('data-trying'),
      2: script.getAttribute('data-trying'),
      3: script.getAttribute('data-worked'),
      4: script.getAttribute('data-worked')
    } : null;
    var RUN = 15000;

    if (scenes.length === 5 && stepLine && bar && clock && words) {
      var at = 0, shownScene = -1, playing = false, onScreen = false;
      var started = false, done = false, raf = 0, last = null;

      var show = function (i) {
        if (shownScene === i) { return; }
        shownScene = i;
        stage.setAttribute('data-scene', String(i));
        stepLine.textContent = scenes[i].step;
        if (rowState) { rowState.textContent = words[i]; }
      };
      var paint = function (ms) {
        at = Math.min(RUN, Math.max(0, ms));
        var i = scenes.length - 1;
        while (i > 0 && at < scenes[i].at) { i--; }
        show(i);
        var between = Math.max(0, Math.min(1, (at - scenes[2].at) / (scenes[3].at - scenes[2].at)));
        if (waitFill) { waitFill.style.transform = 'scaleX(' + between + ')'; }
        bar.style.transform = 'scaleX(' + (at / RUN) + ')';
        var s = Math.floor(at / 1000);
        clock.textContent = '00:' + (s < 10 ? '0' : '') + s + ' / 00:15';
        if (track) { track.setAttribute('aria-valuenow', String(Math.round(at / 1000))); }
      };
      var stop = function () {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        playing = false; last = null;
        filmFrame.setAttribute('data-playing', 'false');
      };
      var step = function (now) {
        if (!playing) { return; }
        if (!onScreen || document.hidden) { stop(); return; }
        if (last !== null) { paint(at + (now - last)); }
        last = now;
        if (at >= RUN) { stop(); done = true; return; }
        raf = requestAnimationFrame(step);
      };
      var play = function () {
        if (reduce || !onScreen || document.hidden || playing) { return; }
        if (done) { paint(0); done = false; }
        playing = true; last = null;
        filmFrame.setAttribute('data-playing', 'true');
        raf = requestAnimationFrame(step);
      };

      var playBtn = document.getElementById('filmPlay');
      var pauseBtn = document.getElementById('filmPause');
      var replayBtn = document.getElementById('filmReplay');
      if (playBtn) { playBtn.addEventListener('click', play); }
      if (pauseBtn) { pauseBtn.addEventListener('click', stop); }
      if (replayBtn) {
        replayBtn.addEventListener('click', function () { stop(); done = false; paint(0); play(); });
      }

      if ('IntersectionObserver' in window && area) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            onScreen = e.isIntersecting;
            if (!onScreen) { stop(); }
            else if (!started && !reduce) { started = true; play(); }
          });
        }, { threshold: 0.35 }).observe(area);
      } else {
        onScreen = true; started = true; play();
      }
      document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); } });
      paint(0);
    }
  }

  /* ------------------------------------------- the glow, and the arrivals
     The ember and the photograph animate only while their own section is on
     screen, and stop when the tab is hidden. The list and the ledger arrive
     once each. Under reduced motion none of this runs: the stylesheet has
     already put everything in its final place. */
  var glowing = [].slice.call(document.querySelectorAll('.hero-surface, .photo-band, .founding-block, .closing-band'));
  if ('IntersectionObserver' in window) {
    if (glowing.length && !reduce) {
      var ambient = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle('is-glowing', e.isIntersecting && !document.hidden);
        });
      }, { threshold: 0.03 });
      glowing.forEach(function (el) { ambient.observe(el); });
      document.addEventListener('visibilitychange', function () {
        glowing.forEach(function (el) {
          if (document.hidden) { el.classList.remove('is-glowing'); return; }
          var r = el.getBoundingClientRect();
          el.classList.toggle('is-glowing', r.bottom > 0 && r.top < window.innerHeight);
        });
      });
    }

    var arrive = function (holder, childSel, markVerdicts) {
      if (!holder) { return; }
      var once = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) { return; }
          e.target.querySelectorAll(childSel).forEach(function (c) { c.classList.add('arrived'); });
          if (markVerdicts) {
            e.target.querySelectorAll('.ledger-verdict').forEach(function (v, i) {
              setTimeout(function () { v.classList.add('resolved'); }, reduce ? 0 : 420 + i * 105);
            });
          }
          once.unobserve(e.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px 60px 0px' });
      once.observe(holder);
    };
    arrive(document.querySelector('.app-window'), '.week-row', false);
    arrive(document.getElementById('ledger'), '.ledger-row-v9', true);
  } else {
    document.querySelectorAll('.week-row, .ledger-row-v9').forEach(function (e) { e.classList.add('arrived'); });
    document.querySelectorAll('.ledger-verdict').forEach(function (e) { e.classList.add('resolved'); });
    glowing.forEach(function (el) { el.classList.add('is-glowing'); });
  }
  }());

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
