(function () {
  'use strict';
  // Script enxuto das páginas de serviço: progresso, menu móvel, revelar ao rolar e vídeos com miniatura.
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // ---------- Barra de progresso ----------
  var bar = document.getElementById('progress'), ticking = false;
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- Menu móvel ----------
  var btn = document.getElementById('menu-btn'), mnav = document.getElementById('mnav');
  function setMenu(open) {
    mnav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  btn.addEventListener('click', function () { setMenu(!mnav.classList.contains('open')); });
  Array.prototype.forEach.call(mnav.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // ---------- Revelar ao rolar ----------
  var rv = document.querySelectorAll('.rv');
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    Array.prototype.forEach.call(rv, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(rv, function (el) { el.classList.add('in'); });
  }

  // ---------- Miniaturas do Vimeo ----------
  function getThumb(id, hash, cb) {
    var key = 'vt:' + id + ':' + hash, url = null;
    try { url = sessionStorage.getItem(key); } catch (e) {}
    if (url) return cb(url);
    var page = 'https://vimeo.com/' + id + (hash ? '/' + hash : '');
    fetch('https://vimeo.com/api/oembed.json?width=1280&url=' + encodeURIComponent(page))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (!j.thumbnail_url) return;
        try { sessionStorage.setItem(key, j.thumbnail_url); } catch (e) {}
        cb(j.thumbnail_url);
      })
      .catch(function () { console.warn('Vimeo: não consegui a miniatura do vídeo ' + id + '.'); });
  }
  function showImg(img, u) { img.onload = function () { img.classList.add('loaded'); }; img.src = u; }

  // ---------- Player com miniatura: o iframe só carrega no clique ----------
  var PLAY = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
  var thumbIO = hasIO ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      thumbIO.unobserve(e.target);
      var el = e.target, img = el.querySelector('img');
      if (img) getThumb(el.dataset.vimeo, el.dataset.hash || '', function (u) { showImg(img, u); });
    });
  }, { rootMargin: '400px 0px' }) : null;

  function buildFacade(el) {
    var id = el.dataset.vimeo, hash = el.dataset.hash || '', title = el.dataset.title || 'vídeo', started = false;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('aria-label', 'Reproduzir: ' + title);
    el.innerHTML = '<img alt="" decoding="async"><span class="vf-play">' + PLAY + '</span>';
    function start() {
      if (started) return;
      started = true;
      var f = document.createElement('iframe');
      f.src = 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?' + (hash ? 'h=' + encodeURIComponent(hash) + '&' : '') + 'autoplay=1&dnt=1&title=0&byline=0&portrait=0';
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.allowFullscreen = true;
      f.title = title;
      el.innerHTML = '';
      el.appendChild(f);
      el.classList.add('playing');
      el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label');
      f.focus();
    }
    el.addEventListener('click', start);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
    if (thumbIO) thumbIO.observe(el);
    else getThumb(id, hash, function (u) { showImg(el.querySelector('img'), u); });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.vf[data-vimeo]'), buildFacade);
})();
