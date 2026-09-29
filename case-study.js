// =====================================================================
// case-study.js — behavior for case study pages (toast-pos.html, and
// any future case study built from the same markup).
//
//   1. Case-study menu — tap/keyboard toggle (hover is pure CSS)
//   2. Cover tabs      — switch the cover image
//   3. Count-up stats  — numbers count from 0 when scrolled into view
//   4. SMG gallery     — category + project tabs, prev/next arrows
// =====================================================================

(function () {
  // -------------------------------------------------------------------
  // 1. Case-study menu (.cs-nav). Hover opens it via CSS; this adds
  //    tap/click toggling for touch screens, and closes it on an
  //    outside tap or Escape.
  // -------------------------------------------------------------------
  const nav = document.getElementById('csNav');
  const toggle = document.getElementById('csNavToggle');

  if (nav && toggle) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // -------------------------------------------------------------------
  // 2. Cover tabs: each button's data-cover is the image it shows.
  // -------------------------------------------------------------------
  const cover = document.getElementById('csCover');
  const tabs = document.querySelectorAll('.case-study__cover-tabs button');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      if (cover && tab.dataset.cover) cover.src = tab.dataset.cover;
    });
  });

  // -------------------------------------------------------------------
  // 3. Count-up: <span class="count-up" data-target="75">75</span>
  //    counts 0 -> 75 the first time it scrolls into view. The number
  //    written in the HTML is what shows if JS or motion is off.
  // -------------------------------------------------------------------
  const COUNT_DURATION = 1500; // ms
  const counters = document.querySelectorAll('.count-up');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    counters.forEach((el) => { el.textContent = '0'; });

    const run = (el) => {
      const target = Number(el.dataset.target);
      let start = null;
      const frame = (now) => {
        if (start === null) start = now;
        const t = Math.min((now - start) / COUNT_DURATION, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach((el) => observer.observe(el));
  }

  // -------------------------------------------------------------------
  // 4. SMG gallery (smg.html). Top tabs show one category panel; inside
  //    it, project tabs (and the arrows) swap the screenshot, the skill
  //    chips and the "Go to Website" link.
  // -------------------------------------------------------------------
  const gallery = document.querySelector('.smg-gallery');

  if (gallery) {
    const selectTab = (tabs, active) => {
      tabs.forEach((t) => {
        t.classList.toggle('is-active', t === active);
        t.setAttribute('aria-selected', String(t === active));
      });
    };

    const categoryTabs = [...gallery.querySelectorAll(':scope > .smg-gallery__tabs button')];
    categoryTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        selectTab(categoryTabs, tab);
        categoryTabs.forEach((t) => {
          document.getElementById(t.getAttribute('aria-controls')).hidden = t !== tab;
        });
      });
    });

    gallery.querySelectorAll('.smg-gallery__panel').forEach((panel) => {
      const tabs = [...panel.querySelectorAll('.smg-gallery__tabs--sub button')];
      const frame = panel.querySelector('.smg-gallery__frame');
      const img = panel.querySelector('.smg-gallery__img');
      const link = panel.querySelector('.smg-gallery__chip--link');
      const meta = panel.querySelector('.smg-gallery__meta');
      const category = document.querySelector(`[aria-controls="${panel.id}"]`).textContent;

      const show = (tab) => {
        selectTab(tabs, tab);
        img.src = tab.dataset.src;
        img.alt = `${tab.textContent} ${category} design`;
        frame.scrollTop = 0;
        meta.querySelectorAll('span.smg-gallery__chip').forEach((chip) => chip.remove());
        (tab.dataset.skills || '').split('|').filter(Boolean).forEach((skill) => {
          const chip = document.createElement('span');
          chip.className = 'smg-gallery__chip';
          chip.textContent = skill.trim();
          link.before(chip);
        });
        link.hidden = !tab.dataset.href;
        if (tab.dataset.href) link.href = tab.dataset.href;
      };

      const step = (dir) => {
        const i = tabs.findIndex((t) => t.classList.contains('is-active'));
        show(tabs[(i + dir + tabs.length) % tabs.length]);
      };

      tabs.forEach((tab) => tab.addEventListener('click', () => show(tab)));
      panel.querySelector('.smg-gallery__arrow--prev').addEventListener('click', () => step(-1));
      panel.querySelector('.smg-gallery__arrow--next').addEventListener('click', () => step(1));
      show(tabs[0]);
    });
  }
})();
