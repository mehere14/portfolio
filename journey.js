// Scroll-told case studies: the card pins while scrolling steps through the story.
// Without JS, on small screens, or with reduced motion, steps simply stack.
(function () {
  var wide = matchMedia('(min-width: 900px) and (min-height: 640px)');
  var calm = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('.journey').forEach(function (sec) {
    var steps = [].slice.call(sec.querySelectorAll('.j-step'));
    var n = steps.length, cur = -1;
    var rail = sec.querySelector('.j-rail'), fill = sec.querySelector('.j-fill');
    sec.style.setProperty('--n', n);

    var dots = steps.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.dataset.label);
      // Every checkpoint is labelled; labels alternate above and below the line so they never collide.
      b.innerHTML = '<i class="j-dot"></i><span class="j-tag ' + (i % 2 ? 'down' : 'up') + '" aria-hidden="true"></span>';
      b.lastChild.textContent = s.dataset.label;
      b.addEventListener('click', function () { jump(i); });
      rail.appendChild(b);
      return b;
    });

    function pinned() { return sec.classList.contains('is-pinned'); }

    // A step can hold a muted video clip; it loads only while that step is showing.
    function clip(step, on) {
      var box = step.querySelector('[data-yt]');
      if (!box) return;
      var frame = box.querySelector('iframe');
      if (on && !frame && !calm.matches) {
        frame = document.createElement('iframe');
        frame.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt +
          '?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&start=' + box.dataset.start + '&end=' + box.dataset.end;
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.title = box.querySelector('a').getAttribute('aria-label');
        box.appendChild(frame);
      } else if (!on && frame) {
        frame.remove();
      }
    }

    function show(i) {
      if (i === cur) return;
      cur = i;
      steps.forEach(function (s, j) { s.classList.toggle('is-on', j === i); clip(s, j === i); });
      dots.forEach(function (d, j) {
        d.classList.toggle('done', j < i);
        if (j === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      fill.style.width = (i / (n - 1)) * 100 + '%';
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
        if (pinned()) return;
        if (e.isIntersecting) e.target.classList.add('is-on');
        clip(e.target, e.isIntersecting);
      });
    }, { threshold: 0.35 });

    function mode() {
      sec.classList.toggle('is-pinned', wide.matches);
      sec.classList.toggle('anim', !calm.matches);
      cur = -1;
      steps.forEach(function (s) { clip(s, false); });
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
