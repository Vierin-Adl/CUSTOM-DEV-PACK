// ─── Clicks ──────────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call initClickOverlay() manually.

function initClickOverlay() {
  var clickAreas = document.querySelectorAll('[data-action="click"]');

  for (var i = 0; i < clickAreas.length; i++) {
    RtbhEnabler.addClickEvent(clickAreas[i], function () {
      RtbhEnabler.open(window.clickTag, "defaultClickTag");
    });
  }
}

// ─── Animation ───────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call extraInit() manually.

function extraInit() {
  const tl = gsap.timeline({
    defaults: {
      ease: "power2.inOut",
      duration: 0.6,
    },
  });
}

function hasBodyClass(className) {
  return document.body.classList.contains(className);
}
