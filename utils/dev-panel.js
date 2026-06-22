(function () {
  var SETTINGS_URL     = "/settings.json";
  var DEV_SETTINGS_URL = "/dev-settings.json";
  var STATUS_URL       = "/api/status";
  var START_URL        = "/api/start";
  var CLEAR_URL        = "/api/clear";

  var BANNER_TYPES = [
    { label: "custom"        },
    { label: "scroll_banner" },
    { label: "commerce_ads"  },
    { label: "interstitial"  },
  ];

  var RTBH_MODE = "dev";
  var BANNER_TYPE = "";
  var sizes = [];
  var interstitialSizes = [];
  var sizeSelect, addInput;

  // ── Lock banner size detection to the dev-panel selection ──────────────
  // banner.js's updateDim() derives the <body> size class from the browser
  // window dimensions. In the preview window that's almost never the selected
  // creative size, so extraInit() (which runs once on DOMContentLoaded and
  // reads hasBodyClass()) picks the wrong layout/animation branch.
  // We override updateDim() *synchronously*, before DOMContentLoaded fires, so
  // extraInit() sees the correct class. Banner scripts are left untouched.
  var _dimLocked = false;
  (function lockUpdateDim() {
    var saved = localStorage.getItem("__dp_size");
    if (saved && /^\d+x\d+$/.test(saved) && typeof updateDim === "function") {
      window.updateDim = function () { document.body.className = "b" + saved; };
      _dimLocked = true;
      // banner.js registered its resize handler with the original updateDim
      // reference, so reassigning window.updateDim doesn't stop it from
      // clobbering the class on resize. Re-apply the locked size afterwards.
      window.addEventListener("resize", function () { window.updateDim(); });
    }
  })();

  // ── Styles ────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = `
    #__dp {
      all: initial;
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      font: 11px/1 system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(18, 20, 28, 0.92);
      border: 1px solid #2e3140;
      border-radius: 8px;
      padding: 6px 8px;
      box-sizing: border-box;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0,0,0,.4);
      min-width: 190px;
    }
    #__dp .__row { display: flex; align-items: center; gap: 6px; }
    #__dp .__label { color: #444; font-size: 10px; letter-spacing: .04em; flex-shrink: 0; }
    #__dp .__sep { width: 1px; height: 16px; background: #2a2d3a; flex-shrink: 0; }
    #__dp .__hsep { height: 1px; background: #2a2d3a; margin: 0 -2px; }
    #__dp select {
      all: unset;
      background: #1e2130;
      color: #c8ccd4;
      border: 1px solid #3a3d4a;
      border-radius: 5px;
      padding: 3px 24px 3px 8px;
      font: 11px system-ui, sans-serif;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 7px center;
      outline: none;
    }
    #__dp select:focus { border-color: #5b8dee; }
    #__dp input {
      all: unset;
      background: #1e2130;
      color: #c8ccd4;
      border: 1px solid #3a3d4a;
      border-radius: 5px;
      padding: 3px 7px;
      font: 11px system-ui, sans-serif;
      outline: none;
      box-sizing: border-box;
    }
    #__dp input:focus { border-color: #5b8dee; }
    #__dp input::placeholder { color: #444; }
    #__dp .__input-sm { width: 68px; }
    #__dp .__input-name { flex: 1; min-width: 0; }
    #__dp .__add-btn {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #1e2130;
      color: #888;
      border: 1px solid #3a3d4a;
      border-radius: 5px;
      cursor: pointer;
      font-size: 15px;
      line-height: 1;
      flex-shrink: 0;
    }
    #__dp .__add-btn:hover { background: #5b8dee; border-color: #5b8dee; color: #fff; }
    #__dp .__action-btn {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 5px;
      padding: 4px 0;
      font: 600 11px system-ui, sans-serif;
      cursor: pointer;
      letter-spacing: .06em;
      width: 100%;
      text-align: center;
      box-sizing: border-box;
    }
    #__dp .__action-btn.__start {
      background: #1a3a20; color: #4caf6e; border: 1px solid #2a5a30;
    }
    #__dp .__action-btn.__start:hover { background: #1e4a26; border-color: #4caf6e; }
    #__dp .__action-btn.__start:disabled { opacity: .45; cursor: default; }
    #__dp .__action-btn.__clear {
      background: transparent; color: #e06060; border: 1px solid #e06060;
    }
    #__dp .__action-btn.__clear:hover { background: #3a1a1a; }
    #__dp .__mode-toggle {
      all: unset;
      display: flex;
      align-items: center;
      background: #1e2130;
      border: 1px solid #3a3d4a;
      border-radius: 5px;
      overflow: hidden;
      cursor: pointer;
    }
    #__dp .__mode-btn {
      font: 10px/1 system-ui, sans-serif;
      letter-spacing: .05em;
      padding: 3px 8px;
      color: #555;
      transition: background .15s, color .15s;
      user-select: none;
    }
    #__dp .__mode-btn.__active-dev  { background: #1a3a20; color: #4caf6e; }
    #__dp .__mode-btn.__active-prod { background: #3a1a1a; color: #e06060; }
    #__dp .__preview-btn {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #1a1f30;
      color: #5b8dee;
      border: 1px solid #2e3d60;
      border-radius: 5px;
      padding: 3px 9px 3px 8px;
      font: 11px system-ui, sans-serif;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
      letter-spacing: .01em;
    }
    #__dp .__preview-btn:hover { background: #243060; border-color: #5b8dee; color: #8db0f5; }
    #__dp .__status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      background: #333;
    }
    #__dp .__status-dot.__on { background: #4caf6e; }
    #__dp .__status-text { color: #555; font-size: 10px; letter-spacing: .03em; }
    #__dp .__status-text.__on { color: #c8ccd4; }
    #__weight-toast {
      position: fixed; right: 12px; z-index: 2147483646;
      font: 11px/1 system-ui, sans-serif;
      background: rgba(18,20,28,0.92); border: 1px solid #2e3140;
      border-radius: 8px; padding: 6px 8px;
      min-width: 190px; box-sizing: border-box;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0,0,0,.4);
      display: flex; flex-direction: column; gap: 5px;
    }
    #__weight-toast.__warn { border-color: #7a3030; }
    #__weight-toast .__wt-title { color: #e0adad; font-size: 10px; letter-spacing: .04em; }
    #__weight-toast .__wt-val { font-size: 10px; font-weight: bold; }
    #__weight-toast .__wt-val.__warn { color: #e06060; }
    #__weight-toast .__wt-sep { height: 1px; background: #2a2d3a; margin: 0 -2px; }
    #__weight-toast .__wt-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    #__weight-toast .__wt-lbl { color: #e0adad; font-size: 10px; letter-spacing: .04em; }
    #__weight-toast .__wt-num { color: #c8ccd4; font-size: 10px; }
    #__weight-toast .__wt-num.__warn { color: #e06060; }
    #__weight-toast .__wt-bar-bg { height: 3px; border-radius: 2px; background: #2a2d3a; overflow: hidden; }
    #__weight-toast .__wt-bar-fill { height: 100%; border-radius: 2px; background: #4caf6e; transition: width .4s; }
    #__weight-toast .__wt-bar-fill.__warn { background: #e06060; }
    #__err-toast {
      position: fixed; right: 12px; z-index: 2147483646;
      font: 11px/1 system-ui, sans-serif;
      background: rgba(18,20,28,0.92); border: 1px solid #7a3030;
      border-radius: 8px; padding: 6px 8px;
      box-sizing: border-box;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0,0,0,.4);
      display: flex; flex-direction: column; gap: 5px;
    }
    #__err-toast .__et-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    #__err-toast .__et-title { color: #e0adad; font-size: 10px; letter-spacing: .04em; }
    #__err-toast .__et-title.__has-err { color: #e06060; }
    #__err-toast .__et-count { font-size: 10px; font-weight: bold; }
    #__err-toast .__et-count.__err { color: #e06060; }
    #__err-toast .__et-count.__warn { color: #e0a040; }
    #__err-toast .__et-sep { height: 1px; background: #2a2d3a; margin: 0 -2px; }
    #__err-toast .__et-msg { color: #c8ccd4; font-size: 10px; line-height: 1.4; word-break: break-word; white-space: pre-wrap; max-height: 60px; overflow: hidden; }
    #__err-toast .__et-clear { color: #555; font-size: 10px; cursor: pointer; flex-shrink: 0; }
    #__err-toast .__et-clear:hover { color: #c8ccd4; }
  `;
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.id = "__dp";
  document.body.appendChild(panel);

  // ── Error toast ───────────────────────────────────────
  var _entries = []; // { type: 'error'|'warn', msg: string }

  function renderErrToast() {
    var existing = document.getElementById("__err-toast");
    if (!_entries.length) { if (existing) existing.remove(); return; }
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "__err-toast";
      document.body.appendChild(existing);
    }
    var errCount  = _entries.filter(function(e) { return e.type === "error"; }).length;
    var warnCount = _entries.filter(function(e) { return e.type === "warn";  }).length;
    var last = _entries[_entries.length - 1];
    var countHtml = "";
    if (errCount)  countHtml += '<span class="__et-count __err">'  + errCount  + " err"  + '</span>';
    if (warnCount) countHtml += '<span class="__et-count __warn">' + warnCount + " warn" + '</span>';
    existing.innerHTML =
      '<div class="__et-header">' +
        '<span class="__et-title' + (errCount ? " __has-err" : "") + '">Console</span>' +
        '<div style="display:flex;gap:6px;align-items:center">' + countHtml +
          '<span class="__et-clear" title="Clear">✕</span>' +
        '</div>' +
      '</div>' +
      '<div class="__et-sep"></div>' +
      '<div class="__et-msg" style="color:' + (last.type === "error" ? "#e06060" : "#e0a040") + '">' +
        last.msg.replace(/</g, "&lt;") +
      '</div>';
    existing.querySelector(".__et-clear").onclick = function () {
      // Keep _reported404 intact so the server poll doesn't re-add the same
      // 404s a few seconds later — they reset naturally on the next page load.
      _entries = []; renderErrToast(); positionToasts();
    };
    positionToasts();
  }

  function positionToasts() {
    var panelEl = document.getElementById("__dp");
    var weightEl = document.getElementById("__weight-toast");
    var errEl = document.getElementById("__err-toast");
    if (!panelEl) return;
    var w = panelEl.getBoundingClientRect().width;
    var top = panelEl.getBoundingClientRect().bottom + 6;
    if (weightEl) {
      weightEl.style.top = top + "px";
      weightEl.style.width = w + "px";
      weightEl.style.minWidth = "unset";
      top += weightEl.getBoundingClientRect().height + 6;
    }
    if (errEl) {
      errEl.style.top = top + "px";
      errEl.style.width = w + "px";
    }
  }

  function captureEntry(type, msg) {
    _entries.push({ type: type, msg: String(msg) });
    renderErrToast();
  }

  // Dedupe 404s across the two sources: the DOM error listener (img/script/
  // link/source) and the server poll (/api/missing — catches CSS-referenced
  // assets like background-image / @font-face that fire no DOM error).
  var _reported404 = {};
  function report404(url) {
    if (!url || _reported404[url]) return;
    _reported404[url] = true;
    captureEntry("error", "404 " + url);
  }

  // Poll the server for assets that 404'd since the last page load. The server
  // resets its list on each HTML load; report404's dedupe keeps each one shown
  // only once for the life of the page.
  function pollMissing() {
    fetch("/api/missing", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        (data.items || []).forEach(function (it) { report404(it.url); });
      })
      .catch(function () {});
  }

  var _origError = console.error.bind(console);
  console.error = function () { _origError.apply(console, arguments); captureEntry("error", Array.prototype.join.call(arguments, " ")); };

  var _origWarn = console.warn.bind(console);
  console.warn = function () { _origWarn.apply(console, arguments); captureEntry("warn", Array.prototype.join.call(arguments, " ")); };

  window.addEventListener("error", function (e) {
    var t = e.target;
    if (t && (t.tagName === "IMG" || t.tagName === "SCRIPT" || t.tagName === "LINK" || t.tagName === "SOURCE")) {
      var src = t.src || t.href || (t.srcset && t.srcset.split(" ")[0]) || "?";
      report404(src.replace(location.origin, ""));
    } else {
      captureEntry("error", (e.message || "Unknown error") + (e.filename ? "\n" + e.filename.split("/").pop() + ":" + e.lineno : ""));
    }
  }, true);

  window.addEventListener("unhandledrejection", function (e) {
    captureEntry("error", "Unhandled promise: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  // ── DOM helpers ───────────────────────────────────────
  function mkRow()  { var d = document.createElement("div"); d.className = "__row";  return d; }
  function mkHsep() { var d = document.createElement("div"); d.className = "__hsep"; return d; }
  function mkLabel(t) { var s = document.createElement("span"); s.className = "__label"; s.textContent = t; return s; }

  // ── Size / settings helpers ───────────────────────────
  function setSize(size) {
    document.body.dataset.devSize = "1";
    localStorage.setItem("__dp_size", size);
    var parts = size.split("x");
    var w = parseInt(parts[0]), h = parseInt(parts[1]);

    if (BANNER_TYPE === "interstitial") {
      document.body.style.width  = w + "px";
      document.body.style.height = h + "px";
      document.body.classList.remove("land", "vert");
      document.body.classList.add(w > h ? "land" : "vert");
      var wrapper = document.querySelector(".banner__wrapper");
      if (wrapper) { wrapper.style.width = w + "px"; wrapper.style.height = h + "px"; }
      return;
    }

    var orientClass = document.body.classList.contains("land") ? "land"
                    : document.body.classList.contains("vert") ? "vert" : null;
    document.body.className = "b" + size;
    if (orientClass) document.body.classList.add(orientClass);
    var wPx = w + "px", hPx = h + "px";
    var scroller = document.querySelector('[data-item="inread-root"]');
    if (scroller) { scroller.style.width = wPx; scroller.style.height = hPx; }
    var banner = document.querySelector(".banner");
    if (banner) { banner.style.width = wPx; banner.style.height = hPx; }
  }

  function activeArr() {
    return BANNER_TYPE === "interstitial" ? interstitialSizes : sizes;
  }

  function rebuildSizeOptions() {
    while (sizeSelect.options.length) sizeSelect.remove(0);
    activeArr().forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s; opt.textContent = s;
      sizeSelect.appendChild(opt);
    });
  }

  function addSize() {
    var val = addInput.value.trim().toLowerCase();
    if (!/^\d+x\d+$/.test(val)) { addInput.style.borderColor = "#e05c5c"; return; }
    addInput.style.borderColor = "";
    var arr = activeArr();
    var reloadAfter = BANNER_TYPE !== "interstitial";
    if (arr.indexOf(val) !== -1) {
      sizeSelect.value = val;
      setSize(val);
      if (reloadAfter) location.reload();
      return;
    }
    arr.push(val);
    rebuildSizeOptions();
    sizeSelect.value = val;
    setSize(val);
    addInput.value = "";
    // setSize() already wrote __dp_size; reload only after the new size is
    // persisted to settings.json so it survives the reload.
    var saved = saveSettings();
    if (reloadAfter) {
      (saved && saved.then ? saved : Promise.resolve()).then(function () {
        location.reload();
      });
    }
  }

  function saveSettings() {
    // Save dev state (RTBH_MODE, preview sizes) to dev-settings.json
    var devPromise = fetch(DEV_SETTINGS_URL)
      .then(function (r) { return r.json(); })
      .then(function (ds) {
        ds.RTBH_MODE = RTBH_MODE;
        if (BANNER_TYPE === "interstitial") ds.INTERSTITIAL_PREVIEW_SIZES = interstitialSizes;
        return fetch(DEV_SETTINGS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ds, null, 2),
        });
      })
      .catch(function () {});

    // Save FLUID_CREATIVE_SIZES to settings.json (non-interstitial only)
    if (BANNER_TYPE !== "interstitial") {
      return fetch(SETTINGS_URL)
        .then(function (r) { return r.json(); })
        .then(function (s) {
          if (s.FLUID_CREATIVE_SIZES && s.FLUID_CREATIVE_SIZES[0]) {
            s.FLUID_CREATIVE_SIZES[0].sizes = sizes;
          }
          return fetch(SETTINGS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(s, null, 2),
          });
        })
        .catch(function () {});
    }

    return devPromise;
  }

  // ── EMPTY state ───────────────────────────────────────
  function buildEmptyPanel() {
    panel.innerHTML = "";

    // status
    var statusRow = mkRow();
    var dot = document.createElement("span"); dot.className = "__status-dot";
    var txt = document.createElement("span"); txt.className = "__status-text"; txt.textContent = "EMPTY";
    statusRow.appendChild(dot); statusRow.appendChild(txt);
    panel.appendChild(statusRow);
    panel.appendChild(mkHsep());

    // type
    var typeRow = mkRow();
    typeRow.appendChild(mkLabel("TYPE"));
    var typeSelect = document.createElement("select");
    BANNER_TYPES.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.label; opt.textContent = t.label;
      typeSelect.appendChild(opt);
    });
    var savedType = localStorage.getItem("__dp_type");
    if (savedType && BANNER_TYPES.find(function (t) { return t.label === savedType; })) {
      typeSelect.value = savedType;
    }
    typeRow.appendChild(typeSelect);
    panel.appendChild(typeRow);

    panel.appendChild(mkHsep());

    // start button
    var startRow = mkRow();
    var startBtn = document.createElement("button");
    startBtn.className = "__action-btn __start";
    startBtn.textContent = "START";
    startBtn.onclick = doStart;
    startRow.appendChild(startBtn);
    panel.appendChild(startRow);

    function doStart() {
      var type = typeSelect.value;
      localStorage.setItem("__dp_type", type);
      startBtn.textContent = "…";
      startBtn.disabled = true;
      fetch(START_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) { location.href = "/0x0_responsive/"; }
          else { startBtn.textContent = data.error || "error"; startBtn.disabled = false; }
        })
        .catch(function () { startBtn.textContent = "error"; startBtn.disabled = false; });
    }
  }

  // ── WORKING state ─────────────────────────────────────
  function buildWorkingPanel(project, loadedSizes, loadedMode, loadedInterstitialSizes) {
    panel.innerHTML = "";
    sizes = loadedSizes;
    interstitialSizes = loadedInterstitialSizes || ["768x1024", "1024x768"];
    RTBH_MODE = loadedMode || "dev";

    var type = project ? project.type : "—";
    BANNER_TYPE = type;

    // status
    var statusRow = mkRow();
    var dot = document.createElement("span"); dot.className = "__status-dot __on";
    var txt = document.createElement("span"); txt.className = "__status-text __on";
    txt.textContent = type;
    statusRow.appendChild(dot); statusRow.appendChild(txt);
    panel.appendChild(statusRow);
    panel.appendChild(mkHsep());

    // size
    var sizeRow = mkRow();
    sizeRow.appendChild(mkLabel("SIZE"));
    sizeSelect = document.createElement("select");
    sizeRow.appendChild(sizeSelect);
    var sep = document.createElement("div"); sep.className = "__sep";
    sizeRow.appendChild(sep);
    addInput = document.createElement("input");
    addInput.className = "__input-sm";
    addInput.placeholder = "WxH";
    addInput.maxLength = 12;
    addInput.onkeydown = function (e) { if (e.key === "Enter") addSize(); };
    sizeRow.appendChild(addInput);
    var addBtn = document.createElement("button");
    addBtn.className = "__add-btn"; addBtn.title = "Add size"; addBtn.textContent = "+";
    addBtn.onclick = addSize;
    sizeRow.appendChild(addBtn);
    panel.appendChild(sizeRow);
    panel.appendChild(mkHsep());

    // rtbh
    var modeRow = mkRow();
    modeRow.appendChild(mkLabel("RTBH"));
    var modeToggle = document.createElement("div"); modeToggle.className = "__mode-toggle";
    var btnDev  = document.createElement("span"); btnDev.className  = "__mode-btn"; btnDev.textContent  = "DEV";
    var btnProd = document.createElement("span"); btnProd.className = "__mode-btn"; btnProd.textContent = "PROD";
    function applyModeStyle() {
      btnDev.className  = "__mode-btn" + (RTBH_MODE === "dev"  ? " __active-dev"  : "");
      btnProd.className = "__mode-btn" + (RTBH_MODE === "prod" ? " __active-prod" : "");
    }
    applyModeStyle();
    function showWeightToast() {
      var LIMIT_MB = BANNER_TYPE === "interstitial" ? 3 : 2;
      fetch("/api/banner-size", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var bytes     = data.bytes     || 0;
          var gzipBytes = data.gzipBytes || 0;
          var mbRaw  = bytes     / (1024 * 1024);
          var mbGzip = gzipBytes / (1024 * 1024);
          var warn   = mbRaw > LIMIT_MB;
          var ratio  = Math.min(mbRaw / LIMIT_MB, 1.5);
          function fmt(mb) {
            return mb >= 1 ? mb.toFixed(2) + " MB" : (mb * 1024).toFixed(0) + " kB";
          }
          var existing = document.getElementById("__weight-toast");
          if (existing) existing.remove();
          var toast = document.createElement("div");
          toast.id = "__weight-toast";
          if (warn) toast.classList.add("__warn");
          toast.innerHTML =
            '<div class="__wt-row">' +
              '<span class="__wt-lbl">WEIGHT</span>' +
              (warn ? '<span class="__wt-val __warn">⚠ exceeded</span>' : '') +
            '</div>' +
            '<div class="__wt-sep"></div>' +
            '<div class="__wt-row">' +
              '<span class="__wt-lbl">transferred</span>' +
              '<span class="__wt-num' + (warn ? " __warn" : "") + '">' + fmt(mbGzip) + '</span>' +
            '</div>' +
            '<div class="__wt-row">' +
              '<span class="__wt-lbl">resources</span>' +
              '<span class="__wt-num">' + fmt(mbRaw) + ' / ' + LIMIT_MB + ' MB</span>' +
            '</div>' +
            '<div class="__wt-sep"></div>' +
            '<div class="__wt-bar-bg">' +
              '<div class="__wt-bar-fill' + (warn ? " __warn" : "") + '" style="width:' + Math.min(ratio * 100, 100) + '%"></div>' +
            '</div>';
          document.body.appendChild(toast);
          positionToasts();
        })
        .catch(function () {});
    }

    function setMode(m) {
      RTBH_MODE = m;
      applyModeStyle();
      showWeightToast();
      saveSettings().then(function () { location.reload(); });
    }
    btnDev.onclick  = function () { if (RTBH_MODE !== "dev")  setMode("dev"); };
    btnProd.onclick = function () { if (RTBH_MODE !== "prod") setMode("prod"); };
    modeToggle.appendChild(btnDev); modeToggle.appendChild(btnProd);
    modeRow.appendChild(modeToggle);
    panel.appendChild(modeRow);

    // preview (scroll_banner only)
    var hsepPreview = mkHsep();
    var previewRow  = mkRow();
    var previewBtn  = document.createElement("a");
    previewBtn.className = "__preview-btn";
    previewBtn.target = "_blank"; previewBtn.rel = "noopener";
    previewRow.appendChild(previewBtn);
    panel.appendChild(hsepPreview);
    panel.appendChild(previewRow);

    function updatePreviewUrl() {
      var s = (sizeSelect && sizeSelect.value) || sizes[0] || "300x600";
      previewBtn.href = "/scroll-preview?size=" + s;
      previewBtn.textContent = "↗ Preview in article";
    }
    function syncPreview() {
      var show = type === "scroll_banner";
      hsepPreview.style.display = show ? "block" : "none";
      previewRow.style.display  = show ? "flex"  : "none";
      if (show) updatePreviewUrl();
    }
    syncPreview();

    panel.appendChild(mkHsep());

    // clear
    var clearRow = mkRow();
    var clearBtn = document.createElement("button");
    clearBtn.className = "__action-btn __clear";
    clearBtn.textContent = "CLEAR";
    clearBtn.onclick = function () {
      if (!confirm("Clear working directory?")) return;
      fetch(CLEAR_URL, { method: "POST" })
        .then(function () { location.href = "/"; })
        .catch(function () { location.href = "/"; });
    };
    clearRow.appendChild(clearBtn);
    panel.appendChild(clearRow);

    // wire size
    sizeSelect.onchange = function () {
      if (type === "interstitial") {
        setSize(sizeSelect.value);
        return;
      }
      // Persist the selection and reload: extraInit() runs only once on load,
      // so a fresh load (with updateDim() locked to the new size) is what
      // re-runs the size-specific animation branch correctly.
      localStorage.setItem("__dp_size", sizeSelect.value);
      location.reload();
    };
    rebuildSizeOptions();
    var arr = activeArr();
    if (arr.length) {
      var saved = localStorage.getItem("__dp_size");
      var initial = (saved && arr.indexOf(saved) !== -1) ? saved : arr[0];
      sizeSelect.value = initial;
      setSize(initial);
      // First load with no prior selection: updateDim() wasn't locked, so
      // extraInit() already ran against the window-derived class. Reload once
      // now that __dp_size is set — the lock then feeds the right class.
      if (type !== "interstitial" && !_dimLocked) {
        location.reload();
        return;
      }
    } else if (typeof updateDim === "function") {
      updateDim();
    }

    // ── Drop-to-WebP overlay ──────────────────────────────
    var dropOverlay = document.createElement("div");
    dropOverlay.style.cssText = [
      "display:none;position:fixed;inset:0;z-index:2147483646",
      "background:rgba(10,12,20,.9);backdrop-filter:blur(6px)",
      "flex-direction:column;align-items:center;justify-content:center;gap:10px",
      "font:13px/1 system-ui,sans-serif;pointer-events:none",
    ].join(";");

    var dropTitle = document.createElement("div");
    dropTitle.style.cssText = "font-size:28px;font-weight:700;color:#fff;letter-spacing:-.02em";
    dropTitle.textContent = "Drop → WebP";

    var dropSub = document.createElement("div");
    dropSub.style.cssText = "font-size:13px;color:#5b8dee;letter-spacing:.03em;margin-top:2px";
    dropSub.textContent = "saves to images/";

    var dropStatus = document.createElement("div");
    dropStatus.style.cssText = "font-size:12px;color:#4caf6e;min-height:16px;margin-top:4px";

    dropOverlay.appendChild(dropTitle);
    dropOverlay.appendChild(dropSub);
    dropOverlay.appendChild(dropStatus);
    document.body.appendChild(dropOverlay);

    var dragDepth = 0;

    function isImageFile(f) {
      if (f.type === "image/svg+xml") return false;
      if (f.type.startsWith("image/")) return true;
      return /\.(png|jpe?g|gif|webp|bmp|tiff?|avif|heic)$/i.test(f.name);
    }

    function hasImageFiles(e) {
      return Array.prototype.some.call(e.dataTransfer.items || [], function(i) {
        return i.kind === "file" && (i.type.startsWith("image/") || i.type === "");
      });
    }

    window.addEventListener("dragenter", function(e) {
      if (!hasImageFiles(e)) return;
      dragDepth++;
      dropStatus.textContent = "";
      dropTitle.textContent = "Drop → WebP";
      dropTitle.style.color = "#fff";
      dropOverlay.style.display = "flex";
    });

    window.addEventListener("dragleave", function() {
      dragDepth--;
      if (dragDepth <= 0) { dragDepth = 0; dropOverlay.style.display = "none"; }
    });

    window.addEventListener("dragover", function(e) { e.preventDefault(); });

    window.addEventListener("drop", function(e) {
      e.preventDefault();
      dragDepth = 0;
      var files = Array.prototype.filter.call(e.dataTransfer.files, isImageFile);
      if (!files.length) { dropOverlay.style.display = "none"; return; }

      dropTitle.textContent = "Converting…";
      dropSub.textContent = "0 / " + files.length;

      function convertToWebp(file, q) {
        return new Promise(function(resolve, reject) {
          var img = new Image();
          var url = URL.createObjectURL(file);
          img.onload = function() {
            var c = document.createElement("canvas");
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            c.toBlob(function(blob) {
              c.width = 0; c.height = 0;
              blob ? resolve(blob) : reject(new Error("toBlob returned null"));
            }, "image/webp", q);
          };
          img.onerror = function() { URL.revokeObjectURL(url); reject(); };
          img.src = url;
        });
      }

      function toBase64(blob) {
        return new Promise(function(resolve) {
          var r = new FileReader();
          r.onloadend = function() { resolve(r.result.split(",")[1]); };
          r.readAsDataURL(blob);
        });
      }

      function next(i) {
        if (i >= files.length) {
          dropTitle.textContent = "Done!";
          dropTitle.style.color = "#4caf6e";
          dropSub.textContent = files.length + " file(s) saved to images/";
          setTimeout(function() { dropOverlay.style.display = "none"; }, 2000);
          return;
        }
        var file = files[i];
        var name = file.name.replace(/\.[^.]+$/, ".webp");
        dropSub.textContent = (i + 1) + " / " + files.length + "  —  " + name;
        convertToWebp(file, 0.85)
          .then(toBase64)
          .then(function(b64) {
            return fetch("/api/upload-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: name, data: b64 }),
            });
          })
          .then(function() { next(i + 1); })
          .catch(function() { next(i + 1); });
      }

      next(0);
    });

    showWeightToast();

    // Surface 404s the DOM error listener can't see (CSS background-image,
    // @font-face, etc.). Assets load async, so poll a few times after load,
    // then keep a slow heartbeat for late/lazy requests.
    pollMissing();
    setTimeout(pollMissing, 400);
    setTimeout(pollMissing, 1500);
    setInterval(pollMissing, 3000);

    document.dispatchEvent(new CustomEvent("devpanel:ready"));
  }

  // ── Init ──────────────────────────────────────────────
  fetch(STATUS_URL, { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (status) {
      if (status.state === "working") {
        Promise.all([
          fetch(SETTINGS_URL,     { cache: "no-store" }).then(function (r) { return r.json(); }),
          fetch(DEV_SETTINGS_URL, { cache: "no-store" }).then(function (r) { return r.json(); }),
        ])
          .then(function (results) {
            var s = results[0], ds = results[1];
            buildWorkingPanel(
              status.project,
              (s.FLUID_CREATIVE_SIZES && s.FLUID_CREATIVE_SIZES[0] && s.FLUID_CREATIVE_SIZES[0].sizes) || [],
              ds.RTBH_MODE || "dev",
              ds.INTERSTITIAL_PREVIEW_SIZES || ["768x1024", "1024x768"]
            );
          })
          .catch(function () { buildWorkingPanel(status.project, ["300x600", "300x250"], "dev", ["768x1024", "1024x768"]); });
      } else {
        buildEmptyPanel();
      }
    })
    .catch(function () { buildEmptyPanel(); });
})();
