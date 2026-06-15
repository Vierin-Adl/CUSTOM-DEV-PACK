(function () {
  var style = document.createElement("style");
  style.textContent =
    ".overlay{display:none;position:absolute;z-index:99;opacity:.5;" +
    "background-repeat:no-repeat;background-size:contain;inset:0}" +
    ".overlay.show{display:block}";
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", function () {
    var wrap = document.querySelector(".banner__wrap");
    if (wrap && !document.querySelector(".overlay")) {
      var el = document.createElement("div");
      el.className = "overlay";
      wrap.appendChild(el);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "=") {
      var overlay = document.querySelector(".overlay");
      if (overlay) overlay.classList.toggle("show");
    }
  });
})();
