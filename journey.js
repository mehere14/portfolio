// Scroll-told case studies: the card pins while scrolling steps through the story.
// Without JS, on small screens, or with reduced motion, steps simply stack.
(function () {
  var wide = matchMedia('(min-width: 900px) and (min-height: 640px)');
  var calm = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('.journey').forEach(function (sec) {
    var steps = [].slice.call(sec.querySelectorAll('.j-step'));
    var n = steps.length, cur = -1;
    var rail = sec.querySelector('.j-rail'), fill = sec.querySelector('.j-fill'), label = sec.querySelector('.j-label');
    sec.style.setProperty('--n', n);

    var dots = steps.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.dataset.label);
      b.addEventListener('click', function () { jump(i); });
      rail.appendChild(b);
      return b;
    });

    function pinned() { return sec.classList.contains('is-pinned'); }

    function show(i) {
      if (i === cur) return;
      cur = i;
      steps.forEach(function (s, j) { s.classList.toggle('is-on', j === i); });
      dots.forEach(function (d, j) {
        d.classList.toggle('done', j < i);
        if (j === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      var pct = (i / (n - 1)) * 100;
      fill.style.width = pct + '%';
      label.style.left = pct + '%';
      label.style.transform = 'translateX(-' + pct + '%)';
      label.textContent = steps[i].dataset.label;
    }

    function progress() {
      var total = sec.offsetHeight - innerHeight;
      var p = Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / total));
      return Math.min(n - 1, Math.floor(p * n));
    }

    function jump(i) {
      var total = sec.offsetHeight - innerHeight;
      var top = sec.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + ((i + 0.5) / n) * total, behavior: calm.matches ? 'auto' : 'smooth' });
    }

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !pinned()) e.target.classList.add('is-on');
      });
    }, { threshold: 0.35 });

    function mode() {
      sec.classList.toggle('is-pinned', wide.matches);
      sec.classList.toggle('anim', !calm.matches);
      cur = -1;
      if (wide.matches) {
        show(progress());
      } else {
        steps.forEach(function (s) { s.classList.toggle('is-on', calm.matches); seen.observe(s); });
      }
    }

    var queued = false;
    addEventListener('scroll', function () {
      if (!pinned() || queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; show(progress()); });
    }, { passive: true });
    wide.addEventListener('change', mode);
    calm.addEventListener('change', mode);
    mode();
  });
})();
