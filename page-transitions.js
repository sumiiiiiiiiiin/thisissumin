// =====================================================================
// page-transitions.js — loaded in every page's <head> (it has to run
// before the page's first frame to catch the transition).
//
// Cross-page transitions (the fade / arrow rotation, see styles.css
// "2. Page transitions") cover the new page with an overlay for about
// half a second. Two fixes for navigating again during that time:
//
//   1. Clicks aren't lost — a click on the overlay ends the transition
//      and is passed on to the link / button actually under the pointer
//      (e.g. clicking the avatar back and forth between index and about).
//   2. No console error — leaving a page mid-transition aborts it, which
//      the browser reports as an error; that's expected, so it's ignored.
// =====================================================================

(function () {
  let active = null; // the transition currently playing on this page

  function quiet(vt) {
    [vt.ready, vt.finished, vt.updateCallbackDone].forEach((p) => p && p.catch(() => {}));
  }

  window.addEventListener('pagereveal', (e) => {
    const vt = e.viewTransition;
    if (!vt) return;
    quiet(vt);
    active = vt;
    vt.finished.finally(() => { if (active === vt) active = null; });
  });

  window.addEventListener('pageswap', (e) => {
    if (e.viewTransition) quiet(e.viewTransition);
  });

  // During a transition every click lands on <html> (the overlay). End
  // the transition, then click whatever is really under the pointer.
  document.addEventListener('click', (e) => {
    if (!active || e.target !== document.documentElement) return;
    const vt = active;
    const { clientX: x, clientY: y } = e;
    vt.skipTransition();
    vt.finished.finally(() => requestAnimationFrame(() => {
      const el = document.elementFromPoint(x, y);
      const target = el && el.closest('a[href], button, [role="button"]');
      if (target) target.click();
    }));
  }, true);
})();
