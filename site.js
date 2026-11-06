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
