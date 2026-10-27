// Case studies: each story is a horizontal row of step cards that snaps to whole cards,
// so vertical scrolling passes straight through. A card animates (and plays its clip)
// only while it is fully in view and its section is on screen.
(function () {
  var calm = matchMedia('(prefers-reduced-motion: reduce)');

  function send(frame, msg) {
    if (frame.contentWindow) frame.contentWindow.postMessage(JSON.stringify(msg), '*');
  }

  // When a clip reaches its end time, jump back to its start and keep playing.
  addEventListener('message', function (e) {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    var data;
    try { data = JSON.parse(e.data); } catch (err) { return; }
    var state = data.event === 'onStateChange' ? data.info : data.info && data.info.playerState;
    if (state !== 0) return;
    document.querySelectorAll('[data-yt] iframe').forEach(function (frame) {
      if (frame.contentWindow !== e.source) return;
      send(frame, { event: 'command', func: 'seekTo', args: [+frame.parentNode.dataset.start, true] });
      send(frame, { event: 'command', func: 'playVideo', args: [] });
    });
  });

  // A step can hold a muted video clip; it loads only while that step is showing,
  // and loops between data-start and data-end instead of reaching YouTube's end screen.
  function clip(step, on) {
    var box = step.querySelector('[data-yt]');
    if (!box) return;
    var frame = box.querySelector('iframe');
    if (on && !frame && !calm.matches) {
      frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt +
        '?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&iv_load_policy=3&fs=0&disablekb=1&enablejsapi=1' +
        '&start=' + box.dataset.start + '&end=' + box.dataset.end + '&origin=' + encodeURIComponent(location.origin);
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.title = box.querySelector('a').getAttribute('aria-label');
      frame.tabIndex = -1;
      frame.addEventListener('load', function () { send(frame, { event: 'listening' }); });
      box.appendChild(frame);
      box.classList.add('is-playing');
    } else if (!on && frame) {
      box.classList.remove('is-playing');
      frame.remove();
    }
  }

  document.querySelectorAll('.journey').forEach(function (sec) {
    var list = sec.querySelector('.j-steps');
    var steps = [].slice.call(list.querySelectorAll('.j-step'));
    var n = steps.length, cur = 0, onScreen = false;
    var rail = sec.querySelector('.j-rail'), fill = sec.querySelector('.j-fill');

    list.tabIndex = 0;
    list.setAttribute('aria-label', sec.getAttribute('aria-label') + ', scroll sideways for each step');
    sec.classList.toggle('anim', !calm.matches);

    var dots = steps.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.dataset.label);
      // Every checkpoint is labelled; labels alternate above and below the line so they never collide.
      b.innerHTML = '<i class="j-dot"></i><span class="j-tag ' + (i % 2 ? 'down' : 'up') + '" aria-hidden="true"></span>';
      b.lastChild.textContent = s.dataset.label;
      b.addEventListener('click', function () { go(i); });
      rail.appendChild(b);
      return b;
    });

    // Arrows sit on the edges of the live card, next to the neighbours peeking in from the margins.
    var view = document.createElement('div');
    view.className = 'j-view';
    list.before(view);
    view.appendChild(list);
    function arrow(dir, label, glyph) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'j-arrow ' + dir;
      b.setAttribute('aria-label', label);
      b.textContent = glyph;
      view.appendChild(b);
      return b;
    }
    var prev = arrow('prev', 'Previous step', '←'), next = arrow('next', 'Next step', '→');
    prev.addEventListener('click', function () { go(cur - 1); });
    next.addEventListener('click', function () { go(cur + 1); });

    // Matches the snap alignment: every card centres in the column.
    function go(i) {
      var card = steps[Math.max(0, Math.min(n - 1, i))];
      var left = card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2;
      list.scrollTo({ left: left, behavior: calm.matches ? 'auto' : 'smooth' });
    }

    // Steps restart their animation each time they come back into view.
    function render() {
      steps.forEach(function (s, j) {
        var on = onScreen && j === cur;
        s.classList.toggle('is-on', on);
        clip(s, on);
      });
      dots.forEach(function (d, j) {
        d.classList.toggle('done', j < cur);
        if (j === cur) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      fill.style.width = (cur / (n - 1)) * 100 + '%';
      prev.classList.toggle('is-off', cur === 0);
      next.classList.toggle('is-off', cur === n - 1);
      prev.tabIndex = cur === 0 ? -1 : 0;
      next.tabIndex = cur === n - 1 ? -1 : 0;
    }

    var full = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { cur = steps.indexOf(e.target); render(); }
      });
    }, { root: list, threshold: 0.9 });
    steps.forEach(function (s) { full.observe(s); });

    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      render();
    }, { threshold: 0.35 }).observe(list);

    calm.addEventListener('change', function () { sec.classList.toggle('anim', !calm.matches); render(); });
    render();
  });
})();
