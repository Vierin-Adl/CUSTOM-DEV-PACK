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
    }
  };
}

// ─── Orientation ──────────────────────────────────────────────────────────────

function updateDim() {
  var dim = window.innerWidth > window.innerHeight ? "land" : "vert";
  document.body.classList.remove("land", "vert");
  document.body.classList.add(dim);
}

window.addEventListener("resize", updateDim);

// ─── Init ─────────────────────────────────────────────────────────────────────

RtbhEnabler.onDocumentReady(function () {
  updateDim();
  initClickOverlay();
  extraInit();
});
