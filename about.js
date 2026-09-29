// =====================================================================
// about.js — about.html only.
//
// Map bubbles: the hovered (desktop) or tapped (tablet / phone) emoji's
// data-tip shows as a caption along the bottom edge of the map.
// (The photo widget is shared with index: see shared.js "3. Photo sliders".)
// =====================================================================

(function () {
  const TAP_QUERY = '(max-width: 1024px)'; // tap (not hover) opens bubbles; matches styles.css

  document.querySelectorAll('.about-widget--map').forEach((widget) => {
    // One caption-style bubble per map, along its bottom edge (styles.css).
    const bubble = document.createElement('div');
    bubble.className = 'map-bubble';
    bubble.setAttribute('role', 'tooltip');
    widget.appendChild(bubble);

    let current = null;

    function open(emoji) {
      bubble.textContent = emoji.dataset.tip;
      bubble.classList.add('is-visible');
      current = emoji;
    }

    function hide() {
      bubble.classList.remove('is-visible');
      current = null;
    }

    // Tablets and phones (and any narrow window): tap an emoji to open its
    // bubble, tap it again or anywhere else to close. Wider: hover.
    const tapMode = window.matchMedia(TAP_QUERY);

    widget.querySelectorAll('.map-emoji[data-tip]').forEach((emoji) => {
      emoji.addEventListener('mouseenter', () => { if (!tapMode.matches) open(emoji); });
      emoji.addEventListener('mouseleave', () => {
        if (!tapMode.matches && document.activeElement !== emoji) hide();
      });
      // Keyboard focus opens it in either mode; a tap's focus is handled by click.
      emoji.addEventListener('focus', () => {
        if (!tapMode.matches || emoji.matches(':focus-visible')) open(emoji);
      });
      emoji.addEventListener('blur', () => { if (current === emoji) hide(); });
      emoji.addEventListener('click', () => {
        if (!tapMode.matches) return;
        if (current === emoji) { hide(); emoji.blur(); }
        else open(emoji);
      });
    });
  });
})();
