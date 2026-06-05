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

function extraInit() {}
