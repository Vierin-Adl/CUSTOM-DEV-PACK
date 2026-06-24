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

// ─── Orientation ──────────────────────────────────────────────────────────────

function updateDim() {
  if (!bannerEl) bannerEl = document.querySelector('[data-area="banner"]');
  if (!bannerEl) return;
  var w = document.documentElement.clientWidth || window.innerWidth;
  var h = document.documentElement.clientHeight || window.innerHeight;

  var newClass = w > h ? "land" : "vert";
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
  initClickOverlay();
  extraInit();
});
