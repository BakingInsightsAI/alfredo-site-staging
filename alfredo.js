/* Alfredo, v4. Three small jobs: the menu, the scroll reveals, and the
   demo form. Nothing here is required for the page to make sense: with
   JavaScript off the menu is a plain list, every revealed block is already
   visible, and the form posts the normal way. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- menu --
     The button owns the open state, and aria-expanded is set from the same
     place, so the two cannot disagree. Escape closes it and returns the
     focus to the button, which is where the reader was. */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    var setOpen = function (open) {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setOpen(links.className.indexOf('open') === -1);
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
    /* a width change can take the menu back to a row, where the open class
       would otherwise linger */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  }

  /* ---------------------------------------------------------- reveals --
     Anything with .reveal or .act arrives when it is first seen, once.
     Under reduced motion the class is added immediately and the stylesheet
     has already turned the transition off, so the page is simply there. */
  var items = [].slice.call(document.querySelectorAll('.reveal, .act'));
  if (items.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('shown', 'lit'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(function () { el.classList.add('shown', 'lit'); }, delay);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      items.forEach(function (el) { io.observe(el); });
    }
  }

  /* ------------------------------------------------------------- form --
     Validation is the browser's: the fields carry the constraints, and this
     only decides when to show the message. The post is a normal fetch, and
     every ending tells the reader what happened and what to do next. */
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
