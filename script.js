// =====================================================================
// script.js — index.html only.
//
//   1. Overlay           — back-to-top / nav / logo fade in past the hero
//   2. Horizontal scroll — desktop: cards slide sideways while you scroll
//   3. Work / Playground — nav tabs
//   4. Layout switch     — sideways row vs vertical stack (≤1024px), live on resize
//   5. Case-study return — remember/restore scroll across the case study
//   6. Device mocks      — hover shake, video play (phone scaling: shared.js)
//
// Desktop (>1024px): .projects-viewport is position:sticky (styles.css),
// so it stays pinned in the middle of the screen while you scroll through
// .projects-scroll's extra height; that scroll progress slides the track.
// If all the cards fit on screen, they're simply centered (.is-fit).
// iPad and smaller (≤1024px): the same markup just stacks vertically.
// =====================================================================

// ---- Tunable values ---------------------------------------------------
const STACK_QUERY = '(max-width: 1024px)';  // cards stack from iPad down; must match styles.css
const STICKY_TOP_OFFSET = 20;                // px below true vertical center
const OVERLAY_SHOW_BEFORE_HERO_END = 120;    // px before the hero's bottom
const SCROLL_EASING = 0.18;                  // 0-1, higher = snappier slide
const RETURN_SCROLL_KEY = 'caseStudyReturnY';
const RETURN_HASH = '#back-to-work';
const PLAYGROUND_HASH = '#to-playground';    // about page's Playground link         // case study back buttons link to index.html#back-to-work
                                             // (not #work: the browser would jump to that element itself)

// ---- Elements ---------------------------------------------------------
const navPill = document.getElementById('navPill');
const logoMark = document.getElementById('logoMark');
const backToTop = document.getElementById('backToTop');
const overlayEls = [navPill, logoMark, backToTop];
const hero = document.getElementById('hero');

const sections = {
  work: {
    scroll: document.getElementById('projectsScroll'),
    viewport: document.getElementById('work'),
    track: document.getElementById('track'),
  },
  playground: {
    scroll: document.getElementById('projectsScrollPlayground'),
    viewport: document.getElementById('playground'),
    track: document.getElementById('trackPlayground'),
  },
};

let current = sections.work;
let activeTab = 'work';
let navPinned = false; // keeps the nav visible while scrolling to a section

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function setVisible(els, visible) {
  els.forEach((el) => el && el.classList.toggle('is-visible', visible));
}

// =====================================================================
// 1. Overlay
// =====================================================================

function updateOverlay() {
  const heroBottom = hero.offsetTop + hero.offsetHeight;
  const pastHero = window.scrollY > heroBottom - OVERLAY_SHOW_BEFORE_HERO_END;
  setVisible([logoMark, backToTop], pastHero);
  // On the Playground tab the nav stays put, even back up at the hero,
  // so there's always a way back to Work.
  setVisible([navPill], pastHero || activeTab === 'playground' || navPinned);
  // Up at the hero, nothing in the nav is shown as selected.
  navPill.classList.toggle('is-idle', !pastHero);
}

window.addEventListener('scroll', updateOverlay, { passive: true });

backToTop.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// =====================================================================
// 2. Horizontal scroll (desktop)
// =====================================================================

let desktopActive = false;
let currentX = 0;   // where the track is drawn now
let targetX = 0;    // where scroll position says it should be
let maxX = 0;       // how far the track can slide
let rafId = null;

// How far the row can slide. If every card fits on screen, there's
// nothing to slide: .is-fit centers the row and shortens the section
// (styles.css). Measured without .is-fit, i.e. at the row's natural width.
function computeMaxX() {
  current.scroll.classList.remove('is-fit');
  maxX = Math.max(0, current.track.scrollWidth - current.viewport.clientWidth);
  current.scroll.classList.toggle('is-fit', maxX === 0);
  targetX = Math.min(targetX, maxX);
}

// Sticky `top`: vertically centers the viewport, but never more than the
// hero's height, so it can't stick (and overlap the hero) too early.
function getStickyTop() {
  const center = (window.innerHeight - current.viewport.offsetHeight) / 2 + STICKY_TOP_OFFSET;
  return Math.min(center, hero.offsetHeight);
}

function updateStickyTop() {
  current.viewport.style.top = `${getStickyTop()}px`;
}

// Scroll position at which the viewport sticks = start of the section.
function getSectionStartY() {
  return current.scroll.getBoundingClientRect().top + window.scrollY - getStickyTop();
}

// 0 -> 1 progress through the pinned range, mapped to 0 -> maxX.
// The range is capped to the page's real max scroll (nothing follows
// this section), so progress reaches exactly 1 at the bottom.
function updateTargetXFromScroll() {
  const wrapperRect = current.scroll.getBoundingClientRect();
  const stuckTop = getStickyTop();
  const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
  const pinRange = Math.min(
    wrapperRect.height - current.viewport.offsetHeight,
    maxScrollY - getSectionStartY()
  );
  const progress = pinRange > 0 ? clamp((stuckTop - wrapperRect.top) / pinRange, 0, 1) : 0;
  targetX = progress * maxX;
}

// One wheel tick down from the hero jumps straight to the start of the
// section.
let wheelJumping = false;

function onWheel(e) {
  if (e.deltaY === 0) return;
  const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
  let target;

  if (e.deltaY < 0) return;
  target = Math.min(getSectionStartY(), maxScrollY);
  if (window.scrollY >= target - 1) return;

  e.preventDefault();
  if (wheelJumping) return;
  wheelJumping = true;
  window.scrollTo({ top: target, behavior: 'smooth' });
  window.setTimeout(() => { wheelJumping = false; }, 700);
}

// Eases the track toward targetX every frame.
function tick() {
  currentX += (targetX - currentX) * SCROLL_EASING;
  if (Math.abs(targetX - currentX) < 0.05) currentX = targetX;
  current.track.style.transform = `translate3d(${-currentX}px, 0, 0)`;
  rafId = requestAnimationFrame(tick);
}

function refreshDesktopLayout() {
  updateStickyTop();
  computeMaxX();
  updateTargetXFromScroll();
}

function onDesktopScroll() {
  updateTargetXFromScroll();
}

function enableDesktop() {
  if (desktopActive) return;
  desktopActive = true;
  refreshDesktopLayout();
  window.addEventListener('scroll', onDesktopScroll, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: false });
  rafId = requestAnimationFrame(tick);
}

// Undo every inline style the desktop mode set, so the mobile CSS
// (a plain vertical stack) applies cleanly.
function disableDesktop() {
  if (!desktopActive) return;
  desktopActive = false;
  window.removeEventListener('scroll', onDesktopScroll, { passive: true });
  window.removeEventListener('wheel', onWheel, { passive: false });
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  currentX = targetX = 0;
  current.scroll.classList.remove('is-fit');
  current.track.style.transform = '';
  current.viewport.style.top = '';
}

window.addEventListener('resize', () => {
  if (desktopActive) refreshDesktopLayout();
});

// =====================================================================
// 3. Work / Playground tabs
// =====================================================================

function switchTab(tab) {
  if (tab === activeTab || !sections[tab]) return;
  activeTab = tab;

  navPill.querySelectorAll('.nav-pill__item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.navTarget === tab);
  });
  placeNavIndicator();
  document.querySelectorAll('[data-tab]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.tab === tab);
  });

  // Tear down the old track before `current` changes, then set up the new one.
  const wasDesktop = desktopActive;
  disableDesktop();
  current = sections[tab];
  if (wasDesktop) enableDesktop();
  updateOverlay();
}

// Where the current tab's section starts (desktop: where the row sticks).
function getSectionTopY() {
  return desktopActive ? getSectionStartY() : current.scroll.offsetTop - 20;
}

// Clicking Work / Playground scrolls (up or down) to the start of that
// section; the nav stays visible on the way instead of blinking out.
function scrollToCurrentSection() {
  const target = Math.max(0, getSectionTopY());
  if (Math.abs(window.scrollY - target) <= 1) return;
  navPinned = true;
  updateOverlay();
  window.scrollTo({ top: target, behavior: 'smooth' });

  // Unpin when the scroll ends — with a timeout as a fallback, so the nav
  // can never get stuck visible (e.g. if the scroll is interrupted).
  let done = false;
  const unpin = () => {
    if (done) return;
    done = true;
    navPinned = false;
    updateOverlay();
  };
  window.addEventListener('scrollend', unpin, { once: true });
  window.setTimeout(unpin, 1200);
}

// The white "selected" pill: one element that slides under the active
// item and resizes with it (styles.css .nav-pill__indicator).
const navIndicator = document.createElement('span');
navIndicator.className = 'nav-pill__indicator no-anim';
navIndicator.setAttribute('aria-hidden', 'true');
navPill.appendChild(navIndicator);

function placeNavIndicator() {
  const active = navPill.querySelector('.nav-pill__item.is-active');
  if (!active) return;
  Object.assign(navIndicator.style, {
    left: `${active.offsetLeft}px`,
    top: `${active.offsetTop}px`,
    width: `${active.offsetWidth}px`,
    height: `${active.offsetHeight}px`,
  });
}

placeNavIndicator();
requestAnimationFrame(() => navIndicator.classList.remove('no-anim'));
// Follows the items as they resize (the dot growing in, breakpoints).
const navItemObserver = new ResizeObserver(placeNavIndicator);
navPill.querySelectorAll('.nav-pill__item').forEach((item) => navItemObserver.observe(item));

navPill.querySelectorAll('.nav-pill__item').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.navTarget);
    // Always go to the start of that section. Pins the nav only if it
    // actually scrolls (same task as switchTab, so the nav never gets
    // painted hidden in between).
    scrollToCurrentSection();
  });
});

// =====================================================================
// 4. Layout switch
// =====================================================================

const stackQuery = window.matchMedia(STACK_QUERY);

function applyLayout() {
  if (stackQuery.matches) disableDesktop();
  else enableDesktop();
  updateOverlay();
}

applyLayout();
stackQuery.addEventListener('change', applyLayout);

// =====================================================================
// 5. Case-study return
// history.scrollRestoration is 'manual' (see index.html <head>), so a
// return would land on the hero. The scroll position is saved when a
// case-study button is clicked and restored here before the first paint
// (index.html holds the paint with <link rel="expect">), so the page
// transition can rotate the back arrow into back-to-top. Case study
// back buttons link to index.html#back-to-work; with no saved position (e.g.
// the case study was opened directly) that lands at the start of Work.
// =====================================================================

document.querySelectorAll('a.project-card__case-study').forEach((link) => {
  link.addEventListener('click', () => {
    try { sessionStorage.setItem(RETURN_SCROLL_KEY, String(window.scrollY)); } catch (e) { /* no storage */ }
    // Make sure back-to-top is fully visible in the outgoing snapshot,
    // or there's no arrow for the transition to rotate.
    if (desktopActive) {
      document.documentElement.classList.add('is-restoring');
      setVisible(overlayEls, true);
    }
  });
});

function restoreCaseStudyReturn() {
  let savedY = null;
  try {
    savedY = sessionStorage.getItem(RETURN_SCROLL_KEY);
    sessionStorage.removeItem(RETURN_SCROLL_KEY);
  } catch (e) { /* no storage */ }

  const nav = performance.getEntriesByType('navigation')[0];
  const isBackForward = nav && nav.type === 'back_forward';

  const cameFromCaseStudy = isBackForward || location.hash === RETURN_HASH;

  let y = null;
  if (location.hash === PLAYGROUND_HASH) {
    switchTab('playground');
    y = getSectionTopY();
  } else if (savedY !== null && cameFromCaseStudy) y = Number(savedY);
  else if (location.hash === RETURN_HASH) y = getSectionTopY();
  if (y === null || Number.isNaN(y)) return;

  // Skip the overlay fade: it must already be visible in the first frame.
  document.documentElement.classList.add('is-restoring');
  window.scrollTo({ top: y, behavior: 'instant' });
  if (desktopActive) {
    updateTargetXFromScroll();
    currentX = targetX; // no slide-in animation
  }
  updateOverlay();
  clearRestoringSoon();
}

function clearRestoringSoon() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove('is-restoring');
  }));
}

restoreCaseStudyReturn();

// Back from the back/forward cache: this script doesn't re-run, so just
// clear what the case-study click left behind.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  try { sessionStorage.removeItem(RETURN_SCROLL_KEY); } catch (err) { /* no storage */ }
  clearRestoringSoon();
});

// =====================================================================
// 6. Device mocks
// =====================================================================

document.querySelectorAll('.project-card--has-prototype').forEach((card) => {
  // A one-shot shake when the pointer enters the card, hinting that the
  // device is a live prototype (not for video cards).
  const device = card.querySelector('.iphone-mock:not(.iphone-mock--video), .tablet-mock');
  if (device) {
    card.addEventListener('mouseenter', () => {
      device.classList.remove('is-buzzing');
      void device.offsetWidth; // restart the animation
      device.classList.add('is-buzzing');
    });
    device.addEventListener('animationend', () => device.classList.remove('is-buzzing'));
  }

  // Video cards (Koki, Coocup): play from the start on hover, reset on leave.
  const video = card.querySelector('.iphone-mock__video');
  if (video) {
    card.addEventListener('mouseenter', () => { video.currentTime = 0; video.play(); });
    card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
  }
});
