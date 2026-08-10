(function () {
  // Design-comparison overlay: put the mockup in the creative's own CSS as
  // `.overlay { background-image: ... }` and toggle it with `=`.
  var style = document.createElement("style");
  style.textContent =
    ".overlay{display:none;position:absolute;z-index:99999;opacity:.5;" +
    "pointer-events:none;background-repeat:no-repeat;background-size:contain;inset:0}" +
    ".overlay.show{display:block}";
  document.head.appendChild(style);

  // Containers, most specific first: web templates use .banner__wrap, CTV
  // creatives .video-content. If the creative already ships an .overlay node
  // (CTV does), leave it where the developer put it.
  var CONTAINERS = [".banner__wrap", ".banner__wrapper", ".video-content"];

  function initOverlay() {
    if (document.querySelector(".overlay")) return;
    for (var i = 0; i < CONTAINERS.length; i++) {
      var wrap = document.querySelector(CONTAINERS[i]);
      if (wrap) {
        var el = document.createElement("div");
        el.className = "overlay";
        wrap.appendChild(el);
        return;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOverlay);
  } else {
    initOverlay();
  }

  // Exposed so the dev panel can drive the toggle from the host page — with the
  // creative in an iframe (ctv), keydown never reaches this document unless the
  // frame has focus.
  window.__devOverlayToggle = function (force) {
    var overlay = document.querySelector(".overlay");
    if (!overlay) return false;
    return overlay.classList.toggle("show", force);
  };

  document.addEventListener("keydown", function (e) {
    if (e.key === "=") window.__devOverlayToggle();
  });
})();
