// =====================================================================
// shared.js — behavior used on every page (index, about, case studies).
//
//   1. Faces       — logo / avatar pupils follow the mouse
//   2. Back button — case study / about pages: go back, or to a fallback
//   3. Photo sliders — auto-advancing photos + hover nav (.photo-widget)
//   4. Phone mocks — scale phone prototypes to fit their frame
//   5. Local time  — <time data-timezone="America/Toronto"> shows that city's time
//   6. Logo        — [data-home] always loads a fresh index.html from the top
//   7. Nav contrast — nav text turns white while what's behind it is mostly dark
// =====================================================================

(function () {
  // -------------------------------------------------------------------
  // 1. Faces: any <svg class="face"> whose pupils (.face__pupil) sit
  //    inside glasses (.face__socket), paired by data-eye="left|right".
  // -------------------------------------------------------------------
  const PUPIL_MAX_X = 3;   // how far a pupil can move sideways (SVG units)
  const PUPIL_MAX_Y = 4;   // ...and up/down
  const INFLUENCE = 350;   // px from the eye at which the pupil moves fully
  // Logos (corner + nav) keep still eyes on iPad-sized screens and smaller;
  // the avatars always look around.
  const STILL_LOGO_QUERY = window.matchMedia('(max-width: 1024px)');

  const eyes = [];
  document.querySelectorAll('svg.face').forEach((face) => {
    const isLogo = !!face.closest('.logo, .nav-logo');
    face.querySelectorAll('.face__pupil').forEach((pupil) => {
      const socket = face.querySelector(`.face__socket[data-eye="${pupil.dataset.eye}"]`);
      if (socket) eyes.push({ pupil, socket, isLogo });
    });
  });

  function lookAt(x, y) {
    const logosStill = STILL_LOGO_QUERY.matches;
    eyes.forEach(({ pupil, socket, isLogo }) => {
      if (isLogo && logosStill) { pupil.style.transform = ''; return; }
      const rect = socket.getBoundingClientRect();
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      const strength = Math.min(Math.hypot(dx, dy) / INFLUENCE, 1);
      const angle = Math.atan2(dy, dx);
      pupil.style.transform =
        `translate(${Math.cos(angle) * PUPIL_MAX_X * strength}px, ${Math.sin(angle) * PUPIL_MAX_Y * strength}px)`;
    });
  }

  if (eyes.length) {
    document.addEventListener('mousemove', (e) => lookAt(e.clientX, e.clientY));
    document.addEventListener('mouseleave', () => {
      eyes.forEach(({ pupil }) => { pupil.style.transform = ''; });
    });
  }

  // -------------------------------------------------------------------
  // 2. Back button: <button data-back="fallback.html">. A real
  //    history.back() when we came from this site (so the page
  //    transition and index.html's scroll restore both play), otherwise
  //    a normal load of the fallback URL.
  // -------------------------------------------------------------------
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      let fromThisSite = false;
      try {
        fromThisSite = !!document.referrer && new URL(document.referrer).origin === location.origin;
      } catch (err) { /* malformed referrer */ }
      if (fromThisSite && history.length > 1) history.back();
      else location.href = btn.dataset.back || 'index.html';
    });
  });

  // -------------------------------------------------------------------
  // 3. Photo sliders (.photo-widget — about page + playground cards):
  //    each [data-slide="n"] button in the nav (icons on about, dots on
  //    playground) jumps to photo n, and on touch screens you can swipe
  //    between photos. With data-autoplay on the widget (about page),
  //    photos also slide by every PHOTO_INTERVAL ms, always forward,
  //    pausing while the mouse (or a finger) is on it.
  // -------------------------------------------------------------------
  const PHOTO_INTERVAL = 2000; // ms between photos
  const SWIPE_MIN = 50;        // px a swipe needs to change photo...
  const SWIPE_MIN_RATIO = 0.15; // ...or this share of the width, whichever is smaller
  const SWIPE_FLICK = 0.4;     // px/ms: a quick flick changes photo even if short

  document.querySelectorAll('.photo-widget').forEach((widget) => {
    const track = widget.querySelector('.photo-widget__track');
    const slides = Array.from(track.children);
    const buttons = Array.from(widget.querySelectorAll('[data-slide]'));
    const count = slides.length;
    const autoplay = widget.hasAttribute('data-autoplay');
    if (count < 2) return;

    // A copy of the first photo after the last one, so last -> first
    // still slides forward; once it lands on the copy it jumps back to
    // the real first photo without animating.
    const firstClone = slides[0].cloneNode(true);
    firstClone.setAttribute('aria-hidden', 'true');
    track.appendChild(firstClone);

    let position = 0;
    let timer = null;

    function render(animate) {
      if (!animate) track.style.transition = 'none';
      track.style.transform = `translateX(${-position * 100}%)`;
      if (!animate) {
        void track.offsetWidth; // apply the jump before re-enabling the transition
        track.style.transition = '';
      }
      const current = position % count;
      buttons.forEach((btn, i) => {
        btn.classList.toggle('is-active', i === current);
        if (i === current) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
      });
    }

    function leaveClone() {
      if (position >= count) { position = 0; render(false); }
    }

    function goTo(index) {
      leaveClone();
      position = index;
      render(true);
    }

    function next() {
      leaveClone();
      position += 1;
      render(true);
    }

    track.addEventListener('transitionend', leaveClone);

    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { stop(); timer = setInterval(next, PHOTO_INTERVAL); };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        goTo(Number(btn.dataset.slide));
        // Touch screens never "leave" the widget, so restart the timer there.
        if (autoplay && !widget.matches(':hover')) start();
      });
    });

    render(false);
    if (autoplay) {
      widget.addEventListener('mouseenter', stop);
      widget.addEventListener('mouseleave', start);
      start();
    }

    // ---- Swipe (touch / pen): the photo follows the finger, then snaps
    // to the next / previous photo or back. The copy of the first photo
    // at the end makes both directions loop seamlessly: at the first
    // photo, dragging right quietly switches to that identical copy
    // (position = count) and slides back onto the last real photo.
    let drag = null;

    function setDragOffset(dx) {
      track.style.transform = `translateX(calc(${-position * 100}% + ${dx}px))`;
    }

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      leaveClone();
      track.style.transition = 'none';
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, horizontal: null };
      stop();
    });

    track.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (drag.horizontal === null && Math.hypot(dx, dy) > 6) {
        drag.horizontal = Math.abs(dx) > Math.abs(dy);
        if (drag.horizontal) track.setPointerCapture(e.pointerId);
      }
      if (!drag.horizontal) return;
      // Swap between the first photo and its identical copy as needed.
      if (dx > 0 && position === 0) position = count;
      else if (dx < 0 && position === count) position = 0;
      drag.dx = dx;
      setDragOffset(dx);
    });

    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const { dx, t, horizontal } = drag;
      drag = null;
      track.style.transition = '';
      if (horizontal) {
        const threshold = Math.min(SWIPE_MIN, widget.clientWidth * SWIPE_MIN_RATIO);
        const flick = Math.abs(dx) / Math.max(1, e.timeStamp - t) > SWIPE_FLICK;
        if (dx <= -threshold || (flick && dx < 0)) position += 1;
        else if (dx >= threshold || (flick && dx > 0)) position -= 1;
      }
      render(true);
      if (autoplay && !widget.matches(':hover')) start();
    }

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
  });

  // -------------------------------------------------------------------
  // 4. Phone mocks
  // -------------------------------------------------------------------
  // Phone prototypes render at a real iPhone size (375x812) and are scaled
  // to fit the phone frame, so their own mobile layout applies.
  const PHONE_WIDTH = 375;
  const PHONE_HEIGHT = 812;
  const PHONE_STATUS_BAR = 24; // keeps content clear of the Dynamic Island

  document.querySelectorAll('.iphone-mock__screen').forEach((screen) => {
    const iframe = screen.querySelector('iframe');
    if (!iframe) return;

    Object.assign(iframe.style, {
      width: `${PHONE_WIDTH}px`,
      height: `${PHONE_HEIGHT}px`,
      top: `${PHONE_STATUS_BAR}px`,
      transformOrigin: 'top left',
    });

    const fit = () => { iframe.style.transform = `scale(${screen.clientWidth / PHONE_WIDTH})`; };
    new ResizeObserver(fit).observe(screen);
    fit();
  });

  // -------------------------------------------------------------------
  // 5. Local time: e.g. "3:42 PM EDT", updated every few seconds.
  // -------------------------------------------------------------------
  document.querySelectorAll('[data-timezone]').forEach((el) => {
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone: el.dataset.timezone,
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const update = () => { el.textContent = format.format(new Date()); };
    update();
    setInterval(update, 5000);
  });

  // -------------------------------------------------------------------
  // 6. Logo: always a fresh index.html, from the top — never a saved
  //    scroll position or the #back-to-work jump (script.js).
  // -------------------------------------------------------------------
  document.querySelectorAll('[data-home]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      try { sessionStorage.removeItem('caseStudyReturnY'); } catch (err) { /* no storage */ }
      window.scrollTo(0, 0);
      location.href = new URL('index.html', location.href).href;
    });
  });

  // -------------------------------------------------------------------
  // 7. Nav contrast: samples what's behind each glass nav part (points
  //    across it) and adds .is-on-dark when most of it is dark, so the
  //    text on the glass can turn white (styles.css). Knows about photos
  //    and videos (average brightness) and the same-origin prototype
  //    iframes (the element under that point inside them).
  // -------------------------------------------------------------------
  const DARK_LUMINANCE = 0.4; // 0 = black, 1 = white
  const DARK_SHARE = 0.6;     // share of sample points that must be dark
  const SKIP = '.nav-pill, .cs-nav, .logo, .back-to-top, .map-bubble';

  const navTargets = Array.from(document.querySelectorAll('.nav-pill, .cs-nav__menu'));

  if (navTargets.length) {
    const luminance = (r, g, b) => {
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const parseColor = (str) => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(',').map(Number);
      return { r, g, b, a };
    };

    // Average brightness of an image / the current video frame (8x8).
    const probe = document.createElement('canvas');
    probe.width = probe.height = 8;
    const probeCtx = probe.getContext('2d', { willReadFrequently: true });
    const imageCache = new WeakMap();
    function averageLuminance(source) {
      try {
        probeCtx.drawImage(source, 0, 0, 8, 8);
        const d = probeCtx.getImageData(0, 0, 8, 8).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += luminance(d[i], d[i + 1], d[i + 2]);
        return sum / 64;
      } catch (e) { return null; }
    }
    function mediaLuminance(el) {
      if (el.tagName === 'VIDEO') return el.readyState >= 2 ? averageLuminance(el) : null;
      if (!el.complete || !el.naturalWidth) return null;
      if (!imageCache.has(el)) imageCache.set(el, averageLuminance(el));
      return imageCache.get(el);
    }

    // First element with a (mostly) opaque background, walking up.
    function backgroundLuminance(el) {
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        const c = parseColor(getComputedStyle(node).backgroundColor);
        if (c && c.a >= 0.5) return luminance(c.r, c.g, c.b);
      }
      return 1; // nothing opaque: assume a light page
    }

    function luminanceOf(el, x, y) {
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
        const l = mediaLuminance(el);
        return l === null ? backgroundLuminance(el) : l;
      }
      if (el.tagName === 'IFRAME') {
        try {
          const doc = el.contentDocument;
          const r = el.getBoundingClientRect();
          const inner = doc.elementFromPoint((x - r.left) * (el.clientWidth / r.width), (y - r.top) * (el.clientHeight / r.height));
          if (inner) return luminanceOf(inner, 0, 0);
        } catch (e) { /* cross-origin: fall through */ }
      }
      return backgroundLuminance(el);
    }

    function isOnDark(target) {
      const r = target.getBoundingClientRect();
      if (!r.width || getComputedStyle(target).visibility === 'hidden') return false;
      let dark = 0;
      let total = 0;
      [0.33, 0.67].forEach((fy) => {
        [0.1, 0.3, 0.5, 0.7, 0.9].forEach((fx) => {
          const x = r.left + r.width * fx;
          const y = r.top + r.height * fy;
          const behind = document.elementsFromPoint(x, y).find((el) => !el.closest(SKIP));
          if (!behind) return;
          total += 1;
          if (luminanceOf(behind, x, y) < DARK_LUMINANCE) dark += 1;
        });
      });
      return total > 0 && dark / total >= DARK_SHARE;
    }

    let queued = false;
    function updateNavContrast() {
      queued = false;
      navTargets.forEach((t) => t.classList.toggle('is-on-dark', isOnDark(t)));
    }
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(updateNavContrast); } };

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    document.addEventListener('click', () => setTimeout(queue, 50)); // tabs, menus, slides
    window.addEventListener('load', queue);
    setInterval(queue, 600); // sliding photos, playing videos, the sideways row easing
    queue();
  }
})();
