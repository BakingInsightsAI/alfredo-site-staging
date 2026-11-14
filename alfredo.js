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
  var tabsBox = document.querySelector('[data-tabs]');
  if (tabsBox) {
    var tabs = [].slice.call(tabsBox.querySelectorAll('[data-tab]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('data-tab')); });
    if (tabs.length && panels.every(Boolean)) {
      tabsBox.setAttribute('role', 'tablist');
      tabsBox.setAttribute('aria-label', 'Stages of the walkthrough');

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
  }

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
})();
