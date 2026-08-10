/**
 * Banner Dev Server
 * Run: npm install  (once)
 * Run: node utils/server.js   →   http://localhost:3300/
 */

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const { exec } = require("child_process");

let sass;
try { sass = require("sass"); } catch { /* will warn at startup */ }

const PORT          = 3300;
const ROOT          = path.join(__dirname, "..");
const TEMPLATES_DIR = path.join(__dirname, "templates");
const SETTINGS_PATH     = path.join(ROOT, "settings.json");
const DEV_SETTINGS_PATH = path.join(__dirname, "dev-settings.json");

// ── Banner types ──────────────────────────────────────────────────────────────
// One entry per type offered in the dev panel's TYPE dropdown. The type name is
// also the template folder (upper-cased): utils/templates/<TYPE>/<folder>/.
//
//   folder        working dir created by START — also the folder you upload to
//                 Adturbo, so it must match what the ad server expects
//   entry         where START / "/" send the browser
//   scss          SCSS entry point the server compiles on save (null = none).
//                 Output is the same path with a .css extension.
//   sizes         SIZE dropdown is backed by settings.json FLUID_CREATIVE_SIZES
//   rtbhEnabler   HTML uses rtbh_enabler.js → DEV/PROD toggle + dev stub apply
//   weightLimitMb WEIGHT toast threshold
const TYPES = {
  custom:        { folder: "0x0_responsive", entry: "/0x0_responsive/", scss: "css/style.scss", sizes: true,  rtbhEnabler: true,  weightLimitMb: 2 },
  scroll_banner: { folder: "0x0_responsive", entry: "/0x0_responsive/", scss: "css/style.scss", sizes: true,  rtbhEnabler: true,  weightLimitMb: 2 },
  commerce_ads:  { folder: "0x0_responsive", entry: "/0x0_responsive/", scss: "css/style.scss", sizes: true,  rtbhEnabler: true,  weightLimitMb: 2 },
  interstitial:  { folder: "0x0_responsive", entry: "/0x0_responsive/", scss: "css/style.scss", sizes: false, rtbhEnabler: true,  weightLimitMb: 3 },
  // CTV SIMID/VPAID creative. No fixed sizes (16:9 fullscreen, vmin/% layout),
  // no rtbh_enabler — it is driven by the video player, so it renders inside
  // the mock player at /ctv-preview instead of being opened directly.
  ctv:           { folder: "ctv_simid",      entry: "/ctv-preview",     scss: "css/style.scss", sizes: false, rtbhEnabler: false, weightLimitMb: 3 },
};
const DEFAULT_TYPE = "custom";

function typeCfg(type) {
  return TYPES[type] || TYPES[DEFAULT_TYPE];
}

function workDirFor(type) {
  return path.join(ROOT, typeCfg(type).folder);
}

function templateDirFor(type) {
  return path.join(TEMPLATES_DIR, String(type).toUpperCase(), typeCfg(type).folder);
}

// Active project = the type in dev-settings.json whose working dir exists.
// If dev-settings drifted (folder deleted or restored by hand) fall back to
// whatever working folder is actually on disk.
function detectProject() {
  const saved = (readDevSettings().CURRENT_PROJECT || {}).type;
  if (saved && fs.existsSync(workDirFor(saved))) return { type: saved };
  for (const type of Object.keys(TYPES)) {
    if (fs.existsSync(workDirFor(type))) return { type };
  }
  return null;
}

function activeWorkDir() {
  const project = detectProject();
  return project ? workDirFor(project.type) : null;
}

// ── SCSS compile ──────────────────────────────────────────────────────────────
function scssPathFor(type) {
  const entry = typeCfg(type).scss;
  return entry ? path.join(workDirFor(type), entry) : null;
}

function compileScss() {
  const project = detectProject();
  if (!sass || !project) return;
  const scssPath = scssPathFor(project.type);
  if (!scssPath || !fs.existsSync(scssPath)) return;
  const cssPath = scssPath.replace(/\.scss$/, ".css");
  try {
    const result = sass.compile(scssPath, { style: "expanded", sourceMap: true });
    fs.writeFileSync(cssPath, result.css, "utf8");
    console.log(`[scss] compiled ${path.basename(scssPath)} → ${path.basename(cssPath)}`);
  } catch (err) {
    console.error("[scss] error:", err.message);
  }
}

// ── Request size tracking (mirrors Network tab) ───────────────────────────────
const trackedFiles = new Map(); // urlPath → bytes

function trackFile(urlPath, filePath) {
  try {
    // Only the creative bundle counts toward WEIGHT. Anything served from
    // outside the working dir is dev scaffolding — for ctv that's the mock spot
    // video, which on air is streamed by the player, not shipped in the ad.
    const workDir = activeWorkDir();
    if (workDir && !filePath.startsWith(workDir)) return;
    const bytes = fs.statSync(filePath).size;
    trackedFiles.set(urlPath, bytes);
  } catch {}
}

// ── Missing-asset (404) tracking — surfaced in the dev panel ──────────────────
// The panel's client-side error listener only sees 404s on <img>/<script>/
// <link>/<source>. Assets referenced from CSS (background-image, @font-face)
// 404 silently in the DOM, so we record them here where every request is seen.
let missing404 = new Map(); // urlPath → count
// Browser/devtools probes that 404 by design — never real asset bugs.
const IGNORE_MISSING = [
  "/favicon.ico",
  "/.well-known/",            // e.g. /.well-known/appspecific/com.chrome.devtools.json
  "/apple-touch-icon",       // iOS Safari icon probes
  "/robots.txt",
];
function recordMissing(urlPath) {
  // Source maps are fetched only when DevTools is open. The RTBH SDK dev build
  // carries a sourceMappingURL comment but ships no .map — not an asset bug.
  if (urlPath.endsWith(".map")) return;
  if (IGNORE_MISSING.some(function (p) { return urlPath === p || urlPath.indexOf(p) === 0; })) return;
  missing404.set(urlPath, (missing404.get(urlPath) || 0) + 1);
}

function getBannerSizeStats() {
  let bytes = 0;
  for (const b of trackedFiles.values()) bytes += b;
  return { bytes };
}

// ── Live reload (SSE) ─────────────────────────────────────────────────────────
const lrClients = new Set();
function notifyReload() {
  for (const res of lrClients) {
    try { res.write("data: reload\n\n"); } catch {}
  }
}

// ── File watcher (dynamic — started/stopped with working dir) ─────────────────
let watcher = null;
let scssDebounce;

function startWatcher() {
  if (watcher) { try { watcher.close(); } catch {} watcher = null; }
  const workDir = activeWorkDir();
  if (!workDir) return;
  watcher = fs.watch(workDir, { recursive: true }, (event, filename) => {
    if (!filename) return;
    if (filename.endsWith(".scss")) {
      clearTimeout(scssDebounce);
      scssDebounce = setTimeout(() => { compileScss(); notifyReload(); }, 80);
    } else if (!/\.(webp|png|jpe?g|gif|bmp|avif|heic|tiff?)$/i.test(filename)) {
      notifyReload();
    }
  });
}

// ── Sync helpers ──────────────────────────────────────────────────────────────
function syncSizesToJs(settings) {
  const workDir = activeWorkDir();
  const sizes = (settings.FLUID_CREATIVE_SIZES || []).flatMap(e => e.sizes || []);
  if (!sizes.length || !workDir) return;
  const pairs = sizes.map(s => { const [w, h] = s.split("x"); return `  [${w}, ${h}]`; }).join(",\n");
  const animPath = path.join(workDir, "js/banner.js");
  if (!fs.existsSync(animPath)) return;
  const updated = fs.readFileSync(animPath, "utf8")
    .replace(/var KNOWN_SIZES = \[[\s\S]*?\];/, `var KNOWN_SIZES = [\n${pairs},\n];`);
  fs.writeFileSync(animPath, updated, "utf8");
  console.log("[synced] KNOWN_SIZES in banner.js");
}

function syncSizesToScss(settings) {
  const workDir = activeWorkDir();
  const sizes = (settings.FLUID_CREATIVE_SIZES || []).flatMap(e => e.sizes || []);
  if (!sizes.length || !workDir) return;
  const scssPath = path.join(workDir, "css/style.scss");
  if (!fs.existsSync(scssPath)) return;
  const sizeList = sizes.map(s => `  "${s}"`).join(",\n");
  const updated = fs.readFileSync(scssPath, "utf8")
    .replace(/\$sizes:\s*\([^)]*\);/s, `$sizes: (\n${sizeList}\n);`);
  fs.writeFileSync(scssPath, updated, "utf8");
  console.log("[synced] $sizes in style.scss");
}

// The panel's DELAY field only reaches the mock player; the real SIMID/VPAID
// player reads autoMinimizeDelayMs from the creative's own transport.js. Write
// it through on save so the two can't drift — same idea as the size sync above.
function syncCtvDelayToTransport(devSettings) {
  const project = detectProject();
  if (!project || project.type !== "ctv") return;

  const ms = parseInt(devSettings.CTV_MINIMIZE_DELAY_MS, 10);
  if (!(ms > 0)) return;

  const file = path.join(workDirFor(project.type), "js/sdk/transport.js");
  if (!fs.existsSync(file)) return;

  const src = fs.readFileSync(file, "utf8");
  const updated = src.replace(/(autoMinimizeDelayMs:\s*)\d+/, `$1${ms}`);
  if (updated === src) {
    if (!/autoMinimizeDelayMs:\s*\d+/.test(src)) {
      console.warn("[sync] autoMinimizeDelayMs not found in transport.js — on-air delay left as is");
    }
    return;
  }
  fs.writeFileSync(file, updated, "utf8");
  console.log(`[synced] autoMinimizeDelayMs = ${ms} in transport.js`);
}

// ── Dir copy ──────────────────────────────────────────────────────────────────
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDirSync(s, d) : fs.copyFileSync(s, d);
  }
}

// ── Settings helpers ──────────────────────────────────────────────────────────
function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")); } catch { return {}; }
}
function writeSettings(obj) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj, null, 2), "utf8");
}

function readDevSettings() {
  try { return JSON.parse(fs.readFileSync(DEV_SETTINGS_PATH, "utf8")); } catch { return {}; }
}
function writeDevSettings(obj) {
  fs.writeFileSync(DEV_SETTINGS_PATH, JSON.stringify(obj, null, 2), "utf8");
}

// ── HTML injection tags ───────────────────────────────────────────────────────
const DEV_PANEL_JS  = fs.readFileSync(path.join(__dirname, "dev-panel.js"), "utf8");
const DEV_PANEL_TAG = "\n<script>\n" + DEV_PANEL_JS + "\n</script>\n";

const DEV_OVERLAY_JS  = fs.readFileSync(path.join(__dirname, "dev-overlay.js"), "utf8");
const DEV_OVERLAY_TAG = "\n<script>\n" + DEV_OVERLAY_JS + "\n</script>\n";

const LIVE_RELOAD_SCRIPT = `
<script>
(function(){
  var es = new EventSource('/livereload');
  es.onmessage = function(e){ if(e.data==='reload') location.reload(); };
  es.onerror   = function(){ setTimeout(function(){ location.reload(); }, 2000); };
})();
</script>`;

const RTBH_POLYFILL_TAG = `
<script>
if (typeof RtbhEnabler === 'undefined') {
    window.RtbhEnabler = {
        onDocumentReady: function(fn) {
            document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn);
        },
        open: function(url) { if (url && url !== '#') window.open(url, '_blank'); },
        addClickEvent: function(el, fn) { el.addEventListener('click', fn); },
        canAccessTopWindow: function() {
            try { return !!(window.parent && window.parent !== window && window.parent.document); }
            catch(e) { return false; }
        },
        getTopWindow: function() {
            try { return (window.parent !== window) ? window.parent : null; }
            catch(e) { return null; }
        },
        getTopAdContainer: function() { return window.frameElement || null; }
    };
}
</script>`;

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".mp4":  "video/mp4",
  ".ogg":  "audio/ogg",
  ".mp3":  "audio/mpeg",
  ".wav":  "audio/wav",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
};

function getRtbhMode() {
  return readDevSettings().RTBH_MODE === "prod" ? "prod" : "dev";
}

function serveHtml(filePath, isPreview) {
  let html = fs.readFileSync(filePath, "utf8");
  const project = detectProject();
  // CTV creatives carry no rtbh_enabler — nothing to strip or stub for them.
  const useRtbhStub = typeCfg(project && project.type).rtbhEnabler;
  if (useRtbhStub && getRtbhMode() === "dev") {
    html = html.replace(/<script\s[^>]*rtbh_enabler\.js[^>]*><\/script>\n?/g, "");
    html = html.replace("</head>", RTBH_POLYFILL_TAG + "\n</head>");
  }
  // The design-comparison overlay is dev tooling of its own — every type gets
  // it, in both RTBH modes and inside previews (ctv renders as a preview).
  html = html.replace("</body>", DEV_OVERLAY_TAG + "\n</body>");
  if (!isPreview) {
    html = html.replace("</body>", DEV_PANEL_TAG + LIVE_RELOAD_SCRIPT + "\n</body>");
  } else {
    html = html.replace("</body>", LIVE_RELOAD_SCRIPT + "\n</body>");
  }
  return html;
}

// ── Empty state page (no working dir) ────────────────────────────────────────
function buildEmptyPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Banner Dev</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0e1018; min-height: 100vh; }
  </style>
</head>
<body>
${DEV_PANEL_TAG}
${LIVE_RELOAD_SCRIPT}
</body>
</html>`;
}

// ── CTV mock player page ──────────────────────────────────────────────────────
// A CTV creative never renders on its own: the SDK opens a SIMID/VPAID session
// from <head> and js/sdk/transport.js only calls InteractiveHandler.init() once
// the player sends Player:init. With no player, .body-inner stays hidden.
//
// This page is that player. It hosts the creative in an iframe at a real device
// resolution (scaled to fit the window) and exposes window.__ctvStage; the dev
// panel drives the creative through its public API — init / playVideo /
// pauseVideo / handleInput / restoreOverlay. The creative itself is served
// untouched (?preview → no panel injected inside the frame).
function buildCtvPreview(folder) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CTV Preview</title>
  <style>
    /* --bar must match the dev panel's bar height (#__dp.__bar in dev-panel.js). */
    :root { --bar: 44px; }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #0e1018; overflow: hidden; }
    #__ctv-stage {
      position: absolute; inset: var(--bar) 0 0 0;
      display: flex; align-items: center; justify-content: center;
    }
    /* Largest 16:9 box that fits the stage. CTV creatives are laid out in % and
       vmin, so aspect ratio is the only thing that has to be right — the frame
       then scales with the window exactly like it does on the TV. */
    #__ctv-frame {
      width: min(100%, calc((100vh - var(--bar)) * 16 / 9));
      aspect-ratio: 16 / 9;
      border: 0; display: block; background: #000;
      box-shadow: 0 0 0 1px #2b2f38, 0 20px 60px rgba(0,0,0,.6);
    }
    #__ctv-res {
      position: fixed; left: 12px; bottom: 10px;
      font: 10px/1 system-ui, sans-serif; color: #4a4f5c; letter-spacing: .06em;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="__ctv-stage">
    <iframe id="__ctv-frame" src="/${folder}/?preview" allow="autoplay"></iframe>
  </div>
  <div id="__ctv-res"></div>

  <script>
  (function () {
    var frame  = document.getElementById("__ctv-frame");
    var resTag = document.getElementById("__ctv-res");
    var loadHandlers = [];

    // Read-out only — the size follows the window, there is nothing to pick.
    function fit() {
      var rect = frame.getBoundingClientRect();
      resTag.textContent = Math.round(rect.width) + " × " + Math.round(rect.height);
    }

    window.addEventListener("resize", fit);

    frame.addEventListener("load", function () {
      loadHandlers.forEach(function (fn) {
        try { fn(frame.contentWindow); } catch (e) {}
      });
    });

    // Driven by the dev panel (utils/dev-panel.js).
    window.__ctvStage = {
      frame: function () { return frame; },
      win: function () { try { return frame.contentWindow; } catch (e) { return null; } },
      api: function () {
        var w = this.win();
        return w && w.InteractiveHandler ? w.InteractiveHandler : null;
      },
      reload: function () { frame.src = "/${folder}/?preview&t=" + Date.now(); },
      onFrameLoad: function (fn) { loadHandlers.push(fn); },
    };

    fit();
  })();
  </script>
${DEV_PANEL_TAG}
</body>
</html>`;
}

// ── Scroll preview page ───────────────────────────────────────────────────────
function buildScrollPreview(size, sizes) {
  const parts = size.split("x");
  const w = parseInt(parts[0]) || 300;
  const h = parseInt(parts[1]) || 600;
  const sizeOptions = sizes.map(s =>
    `<option value="${s}"${s === size ? " selected" : ""}>${s}</option>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scroll Preview — ${size}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font: 17px/1.75 Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #f8f7f4; }
    .site-header {
      background: #fff; border-bottom: 1px solid #e0ddd8; padding: 0 32px;
      height: 52px; display: flex; align-items: center; gap: 28px;
      position: sticky; top: 0; z-index: 100;
    }
    .site-header__logo { font: 700 17px/1 system-ui, sans-serif; letter-spacing: -.02em; color: #111; text-decoration: none; }
    .size-select {
      font: 600 11px/1 system-ui, sans-serif; color: #fff; background: #2a2d3a;
      border: none; padding: 7px 28px 7px 10px; border-radius: 20px; letter-spacing: .04em;
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
    }
    .size-select:hover { background-color: #3a3d4a; }
    .record-btn {
      margin-left: auto; font: 600 11px/1 system-ui, sans-serif; color: #fff;
      background: #c0392b; border: none; padding: 7px 14px; border-radius: 20px;
      letter-spacing: .04em; text-transform: uppercase; cursor: pointer;
      transition: background .15s, opacity .15s;
    }
    .record-btn:hover { background: #a93226; }
    .record-btn:disabled { opacity: .5; cursor: default; }
    .article-wrap { max-width: 720px; margin: 0 auto; padding: 52px 24px 0; }
    .article-kicker { font: 600 11px/1 system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #c0392b; margin-bottom: 16px; }
    h1 { font: 700 38px/1.18 Georgia, serif; color: #111; margin-bottom: 18px; }
    .article-deck { font: 400 20px/1.5 Georgia, serif; color: #444; margin-bottom: 24px; }
    .article-byline { font: 13px/1 system-ui, sans-serif; color: #888; padding-bottom: 24px; border-bottom: 1px solid #e0ddd8; margin-bottom: 32px; }
    .article-byline strong { color: #444; }
    p { margin-bottom: 24px; }
    h2 { font: 700 24px/1.3 Georgia, serif; color: #111; margin: 42px 0 18px; }
    .banner-slot { margin: 44px auto; width: ${w}px; }
    .banner-slot__label { font: 10px/1 system-ui, sans-serif; color: #bbb; text-transform: uppercase; letter-spacing: .1em; text-align: center; padding: 7px 0; border-top: 1px solid #e8e5e0; margin-top: 6px; }
    .banner-slot iframe { display: block; border: none; }
  </style>
</head>
<body>
  <header class="site-header">
    <a class="site-header__logo" href="#">Adlook</a>
    <select class="size-select" onchange="location.replace('/scroll-preview?size='+this.value)">${sizeOptions}</select>
    <button id="record-btn" class="record-btn" onclick="makeMP4()">Make .mp4</button>
  </header>
  <main class="article-wrap">
    <div class="article-kicker">Technology &nbsp;·&nbsp; Advertising</div>
    <h1>Scroll-Driven Advertising:<br>The Next Chapter for Digital Creative</h1>
    <p class="article-deck">As attention becomes the scarcest currency on the internet, a new generation of interactive formats is changing how brands connect with audiences.</p>
    <div class="article-byline">By <strong>Editorial Team</strong> &nbsp;·&nbsp; May 29, 2026 &nbsp;·&nbsp; 6 min read</div>
    <p>As mobile usage continues to dominate screen time, advertisers face an increasingly fragmented landscape where capturing attention requires more than just presence — it demands relevance, timing, and creative execution that resonates with audiences on a deeply personal level.</p>
    <p>The shift toward scroll-driven advertising formats represents one of the most significant transformations the industry has seen in years. Unlike traditional static banners, these interactive units respond to user behavior in real time, creating a fluid dialogue between content and commerce that feels natural rather than intrusive.</p>
    <div class="banner-slot">
      <iframe src="/0x0_responsive/?preview" width="${w}" height="${h}" scrolling="no" frameborder="0"></iframe>
      <div class="banner-slot__label">Advertisement</div>
    </div>
    <p>Data from multiple independent studies suggests that scroll-activated creative units achieve superior viewability metrics compared to standard IAB formats. When a user actively engages with content — scrolling deliberately through an article — their cognitive engagement is measurably higher, meaning that advertising encountered in this context benefits from heightened attention.</p>
    <h2>Technical Innovation Meets Creative Craft</h2>
    <p>The most effective scroll-driven campaigns combine technical precision with genuine creative ambition. Animation timing, parallax depth, and the choreography of element reveals must feel earned rather than arbitrary — each motion serving the narrative rather than distracting from it.</p>
    <p>Development frameworks like GSAP have become the industry standard for this type of work, offering the performance characteristics necessary for smooth 60fps animation even on mid-range mobile devices. The challenge for creative teams is learning to think in terms of scroll progress rather than elapsed time — a fundamentally different relationship with motion.</p>
  </main>
  <script>
    async function makeMP4() {
      const btn = document.getElementById('record-btn');
      btn.disabled = true; btn.textContent = 'Select tab…';
      window.scrollTo({ top: 0, behavior: 'instant' });
      const articleEl = document.querySelector('.article-wrap');
      const articleRect = articleEl.getBoundingClientRect();
      let stream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 60, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false, preferCurrentTab: true
        });
      } catch { btn.textContent = 'Make .mp4'; btn.disabled = false; return; }
      window.scrollTo({ top: 0, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 600));
      const srcVideo = document.createElement('video');
      srcVideo.srcObject = stream; srcVideo.muted = true; srcVideo.playsInline = true;
      await srcVideo.play();
      const scaleX = srcVideo.videoWidth  / window.innerWidth;
      const scaleY = srcVideo.videoHeight / window.innerHeight;
      const cropX  = Math.round(articleRect.left  * scaleX);
      const cropW  = Math.round(articleRect.width  * scaleX);
      const cropH  = Math.round(window.innerHeight * scaleY);
      const outW   = Math.round(articleRect.width);
      const outH   = window.innerHeight;
      const canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      let rafId;
      function drawFrame() {
        if (srcVideo.readyState >= 2) ctx.drawImage(srcVideo, cropX, 0, cropW, cropH, 0, 0, outW, outH);
        rafId = requestAnimationFrame(drawFrame);
      }
      drawFrame();
      const canvasStream = canvas.captureStream(60);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        cancelAnimationFrame(rafId);
        stream.getTracks().forEach(t => t.stop());
        srcVideo.srcObject = null;
        const blob = new Blob(chunks, { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = '${size}.' + ext; a.click();
        btn.textContent = 'Make .mp4'; btn.disabled = false;
      };
      recorder.start(200); btn.textContent = 'Recording…';
      await new Promise(r => setTimeout(r, 800));
      const slot = document.querySelector('.banner-slot');
      const endY = slot ? slot.offsetTop + slot.offsetHeight + 200 : document.body.scrollHeight;
      const DURATION = 6500, TICK = 16, steps = DURATION / TICK;
      let step = 0;
      await new Promise(resolve => {
        const timer = setInterval(() => {
          step++;
          const t = Math.min(step / steps, 1);
          window.scrollTo(0, t * endY);
          if (t >= 1) { clearInterval(timer); resolve(); }
        }, TICK);
      });
      recorder.stop();
    }
  </script>
  ${LIVE_RELOAD_SCRIPT}
</body>
</html>`;
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const urlObj  = new URL(req.url, `http://localhost:${PORT}`);
  const urlPath = decodeURIComponent(urlObj.pathname);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  // SSE live reload
  if (req.method === "GET" && urlPath === "/livereload") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(":\n\n");
    lrClients.add(res);
    req.on("close", () => lrClients.delete(res));
    return;
  }

  // GET /api/status
  if (req.method === "GET" && urlPath === "/api/status") {
    const project = detectProject();
    const cfg = project ? typeCfg(project.type) : null;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      state: project ? "working" : "empty",
      project,
      // The panel renders itself from this — no type list duplicated client-side.
      types: Object.keys(TYPES),
      config: cfg && {
        folder: cfg.folder,
        entry: cfg.entry,
        sizes: cfg.sizes,
        rtbhEnabler: cfg.rtbhEnabler,
        weightLimitMb: cfg.weightLimitMb,
      },
    }));
    return;
  }

  // POST /api/start
  if (req.method === "POST" && urlPath === "/api/start") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { type } = JSON.parse(body);
        if (!TYPES[type]) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "unknown type" }));
          return;
        }
        if (detectProject()) {
          res.writeHead(409, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "exists" }));
          return;
        }
        const templateDir = templateDirFor(type);
        if (!fs.existsSync(templateDir)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "template not found" }));
          return;
        }
        copyDirSync(templateDir, workDirFor(type));
        const devSettings = readDevSettings();
        devSettings.CURRENT_PROJECT = { type };
        writeDevSettings(devSettings);
        startWatcher();
        compileScss();
        console.log(`[start] ${type} → ${typeCfg(type).folder}/`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, entry: typeCfg(type).entry }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/banner-size
  if (req.method === "GET" && urlPath === "/api/banner-size") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getBannerSizeStats()));
    return;
  }

  // GET /api/missing — 404'd assets since the last page load (incl. CSS-referenced)
  if (req.method === "GET" && urlPath === "/api/missing") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      items: Array.from(missing404, ([url, count]) => ({ url, count })),
    }));
    return;
  }

  // POST /api/upload-image
  if (req.method === "POST" && urlPath === "/api/upload-image") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { name, data } = JSON.parse(body);
        if (!name || /[/\\]/.test(name)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid filename" }));
          return;
        }
        const workDir = activeWorkDir();
        if (!workDir) {
          res.writeHead(409, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "no active project" }));
          return;
        }
        // CTV creatives keep assets in img/, the web templates in images/.
        const assetsDirName = fs.existsSync(path.join(workDir, "img")) ? "img" : "images";
        const imagesDir = path.join(workDir, assetsDirName);
        fs.mkdirSync(imagesDir, { recursive: true });
        const dest = path.join(imagesDir, name);
        fs.writeFileSync(dest, Buffer.from(data, "base64"));
        console.log(`[upload] ${assetsDirName}/${name}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // POST /api/clear
  if (req.method === "POST" && urlPath === "/api/clear") {
    try {
      const workDir = activeWorkDir();
      if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
      const devSettings = readDevSettings();
      delete devSettings.CURRENT_PROJECT;
      writeDevSettings(devSettings);
      if (watcher) { try { watcher.close(); } catch {} watcher = null; }
      console.log(`[clear] ${workDir ? path.basename(workDir) + "/ removed" : "nothing to remove"}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /dev-settings.json
  if (req.method === "GET" && urlPath === "/dev-settings.json") {
    res.writeHead(200, { "Content-Type": MIME[".json"] });
    res.end(JSON.stringify(readDevSettings()));
    return;
  }

  // POST /dev-settings.json
  if (req.method === "POST" && urlPath === "/dev-settings.json") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFileSync(DEV_SETTINGS_PATH, body, "utf8");
        syncCtvDelayToTransport(parsed);
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end('{"ok":true}');
        console.log("[saved] dev-settings.json");
      } catch {
        res.writeHead(400);
        res.end('{"error":"invalid json"}');
      }
    });
    return;
  }

  // POST /settings.json
  if (req.method === "POST" && urlPath === "/settings.json") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFileSync(SETTINGS_PATH, body, "utf8");
        syncSizesToScss(parsed);
        syncSizesToJs(parsed);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
        console.log("[saved] settings.json");
      } catch {
        res.writeHead(400);
        res.end('{"error":"invalid json"}');
      }
    });
    return;
  }

  // GET /scroll-preview
  if (req.method === "GET" && urlPath === "/scroll-preview") {
    const size = urlObj.searchParams.get("size") || "300x600";
    let sizes = ["300x600"];
    try {
      const s = readSettings();
      sizes = (s.FLUID_CREATIVE_SIZES || []).flatMap(e => e.sizes || []);
      if (!sizes.length) sizes = ["300x600"];
    } catch {}
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(buildScrollPreview(size, sizes));
    return;
  }

  // GET /ctv-preview — mock CTV player hosting the creative (ctv type only)
  if (req.method === "GET" && urlPath === "/ctv-preview") {
    const project = detectProject();
    if (!project || project.type !== "ctv") {
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(buildCtvPreview(typeCfg("ctv").folder));
    return;
  }

  // Root → empty state page or redirect to the active type's entry point
  if (urlPath === "/") {
    const project = detectProject();
    if (!project) {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(buildEmptyPage());
      return;
    }
    res.writeHead(302, { Location: typeCfg(project.type).entry });
    res.end();
    return;
  }

  // Static files
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath)) {
    if (req.method === "GET") recordMissing(urlPath);
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, "index.html");
    if (!fs.existsSync(indexPath)) { if (req.method === "GET") recordMissing(urlPath); res.writeHead(404); res.end("Not found"); return; }
    if (!urlPath.endsWith("/")) { res.writeHead(301, { Location: urlPath + "/" }); res.end(); return; }
    const isPreview = urlObj.searchParams.has("preview");
    // A CTV creative opened on its own shows nothing — it stays hidden until a
    // player calls init(). Send it to the mock player instead.
    const project = detectProject();
    if (!isPreview && project && project.type === "ctv" &&
        urlPath.replace(/\//g, "") === typeCfg("ctv").folder) {
      res.writeHead(302, { Location: "/ctv-preview" });
      res.end();
      return;
    }
    trackedFiles.clear();
    missing404.clear();
    trackFile(urlPath, indexPath);
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(serveHtml(indexPath, isPreview));
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const ct  = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": ct });
  if (ext === ".html") {
    trackedFiles.clear();
    missing404.clear();
    trackFile(urlPath, filePath);
    res.end(serveHtml(filePath, urlObj.searchParams.has("preview")));
  } else {
    trackFile(urlPath, filePath);
    fs.createReadStream(filePath).pipe(res);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  startWatcher();
  compileScss();
  const url = `http://localhost:${PORT}/`;
  const project = detectProject();
  console.log(`\n  Banner Dev   http://localhost:${PORT}/${project ? "   (" + project.type + " → " + typeCfg(project.type).folder + "/)" : ""}`);
  console.log(`  Scroll Prev  http://localhost:${PORT}/scroll-preview`);
  console.log(`  CTV Player   http://localhost:${PORT}/ctv-preview\n`);
  exec(`open "${url}"`);
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") console.error(`Port ${PORT} busy — change PORT in utils/server.js`);
  else console.error(err);
  process.exit(1);
});
