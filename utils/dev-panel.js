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
  `;
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.id = "__dp";
  document.body.appendChild(panel);

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
    if (arr.indexOf(val) !== -1) { sizeSelect.value = val; setSize(val); return; }
    arr.push(val);
    rebuildSizeOptions();
    sizeSelect.value = val;
    setSize(val);
    addInput.value = "";
    saveSettings();
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
    function setMode(m) { RTBH_MODE = m; applyModeStyle(); saveSettings().then(function () { location.reload(); }); }
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
      setSize(sizeSelect.value);
      if (type !== "interstitial") updatePreviewUrl();
    };
    rebuildSizeOptions();
    var arr = activeArr();
    if (arr.length) {
      var saved = localStorage.getItem("__dp_size");
      var initial = (saved && arr.indexOf(saved) !== -1) ? saved : arr[0];
      sizeSelect.value = initial;
      setSize(initial);
    } else if (typeof updateDim === "function") {
      updateDim();
    }

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
