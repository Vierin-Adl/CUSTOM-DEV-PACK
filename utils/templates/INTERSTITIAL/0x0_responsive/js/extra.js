// ─── Clicks ───────────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call initClickOverlay() manually.
function initClickOverlay() {
  var clickAreas = document.querySelectorAll('[data-action="click"]');
  for (var i = 0; i < clickAreas.length; i++) {
    RtbhEnabler.addClickEvent(clickAreas[i], function () {
      RtbhEnabler.open(window.clickTag, "defaultClickTag");
    });
  }
}

let wrapper = null;
let area = null;

// Initialize banner frame elements
function initFrame() {
  wrapper = document.querySelector(".banner__wrapper");
  area = document.querySelector('[data-area="banner"]');
}

// // Return X movement based on area width
// function areaX(percent) {
//   return area ? area.clientWidth * percent / 100 : 0;
// }

// // Return Y movement based on area height
// function areaY(percent) {
//   return area ? area.clientHeight * percent / 100 : 0;
// }

// // Return X position outside the right edge of the area
// function outRight(el, gap = 0) {
//   return areaX(100) + el.offsetWidth + gap;
// }

// // Return X position outside the left edge of the area
// function outLeft(el, gap = 0) {
//   return -areaX(100) - el.offsetWidth - gap;
// }

// // Return Y position outside the bottom edge of the area
// function outBottom(el, gap = 0) {
//   return areaY(100) + el.offsetHeight + gap;
// }

// // Return Y position outside the top edge of the area
// function outTop(el, gap = 0) {
//   return -areaY(100) - el.offsetHeight - gap;
// }

// ─── Animation ────────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call extraInit() manually.

function extraInit() {
  initFrame();
}
