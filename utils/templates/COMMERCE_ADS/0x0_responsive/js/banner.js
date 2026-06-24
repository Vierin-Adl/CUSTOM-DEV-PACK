// Local dev stub — replaced by the real RtbhEnabler in production
if (typeof RtbhEnabler === "undefined") {
  window.RtbhEnabler = {
    onDocumentReady: function (fn) {
      document.addEventListener("DOMContentLoaded", fn);
    },
    addClickEvent: function (el, fn) {
      el.addEventListener("click", fn);
    },
    open: function (url) {
      if (url) window.open(url, "_blank");
    },
  };
}

// ─── Size ─────────────────────────────────────────────────────────────────────

// must match $sizes in style.scss
var KNOWN_SIZES = [
  [300, 600],
  [320, 480],
  [160, 600],
  [336, 280],
  [300, 250],
  [970, 250],
  [970, 90],
  [728, 90],
  [320, 100],
  [300, 100],
  [320, 50],
  [300, 50],
];

// snap to nearest known size to survive browser zoom (skews innerWidth by ±1–2px)
function snapSize(w, h) {
  var best = KNOWN_SIZES[0];
  var bestDist = Infinity;
  for (var i = 0; i < KNOWN_SIZES.length; i++) {
    var dist =
      Math.abs(w - KNOWN_SIZES[i][0]) + Math.abs(h - KNOWN_SIZES[i][1]);
    if (dist < bestDist) {
      bestDist = dist;
      best = KNOWN_SIZES[i];
    }
  }
  return best;
}

var bannerEl = null;

function updateDim() {
  if (!bannerEl) bannerEl = document.querySelector('[data-area="banner"]');
  if (!bannerEl) return;
  var w = document.documentElement.clientWidth || window.innerWidth;
  var h = document.documentElement.clientHeight || window.innerHeight;
  var size = snapSize(w, h);
  var newClass = "b" + size[0] + "x" + size[1];
  var kept = bannerEl.className.split(/\s+/).filter(function (c) {
    return c && !/^b\d+x\d+$/.test(c);
  });
  kept.push(newClass);
  bannerEl.className = kept.join(" ");
}

window.addEventListener("resize", updateDim);

// ─── Init ─────────────────────────────────────────────────────────────────────

RtbhEnabler.onDocumentReady(function () {
  updateDim();
  extraInit();
  initClicks();
});
