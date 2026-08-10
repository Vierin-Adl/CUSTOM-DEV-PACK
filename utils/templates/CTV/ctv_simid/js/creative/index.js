/**
 * creative/index.js — creative entry point
 *
 * This is the file a creative developer should open first.
 * Safe to change here:
 * - panel focus behavior
 * - slider behavior
 * - CTA behavior
 * - view composition
 *
 * Must stay free of:
 * - RtbhVideoInteractiveSdk
 * - SIMID/VPAID transport handling
 * - postMessage plumbing
 *
 * Those responsibilities live in js/sdk/transport.js.
 */

// eslint-disable-next-line no-unused-vars
var InteractiveHandler = (function () {
   'use strict';

   var layout     = null;
   var keys       = null;
   var refs       = null;
   var slider     = null;
   var focusItems = [];
   var focusIndex = 0;
   var actions    = {};

   // ─────────────────────────────────────────────────────────────
   // DOM references
   // ─────────────────────────────────────────────────────────────

   function getRefs() {
      return {
         layer: document.querySelector('body > .body-inner'),
         wrapper: document.querySelector('.video-content'),
         overlay: document.getElementById('videoOverlay'),
         overlayVideo: document.getElementById('overlayVideo'),
         svgNode: document.getElementById('qrcode'),
         sidePanel: document.querySelector('.side-panel'),
         ctaPanel: document.querySelector('.cta-panel')
      };
   }

   // ─────────────────────────────────────────────────────────────
   // init — called by js/sdk/transport.js with (model, actions)
   //
   // model.overlayVideoUrl    — video to play in the overlay
   // model.qrCode             — { enabled, clickable, svgMarkup }
   // model.autoMinimizeDelayMs — ms before overlay shrinks
   // actions.onQrClick        — called when QR code is clicked
   // actions.requestMuteMainVideo / requestUnmuteMainVideo
   //                          — explicit host-video mute controls from transport
   // ─────────────────────────────────────────────────────────────

   function init(model, actionsArg) {
      model   = model      || {};
      actions = actionsArg || {};

      refs = getRefs();

      // ── Layout ──────────────────────────────────────────────
      layout = new LayoutController(refs);
      layout.setVideoSource(model.overlayVideoUrl || null);
      layout.show();

      setTimeout(function () {
         layout.minimize();
           document.querySelector('.banner__wrapper').classList.remove('hidden');
      }, model.autoMinimizeDelayMs || 2000);

      // ── Slider ──────────────────────────────────────────────
      // Assign to the module-level `slider`, not a local one — initRemoteKeys()
      // and the arrow handlers below all read that reference.
      slider = new Slider(document.querySelector('.banner__img'));

      bindClick('.banner__arrow-prev', function () { slider.prev(); });
      bindClick('.banner__arrow-next', function () { slider.next(); });

      // On-screen twins of the remote's left/right keys — same action, so the
      // creative is testable with a mouse.
      bindClick('.banner__remote-arrow--prev', function () { slider.prev(); });
      bindClick('.banner__remote-arrow--next', function () { slider.next(); });

      initRemoteKeys();
   }

   function bindClick(selector, handler) {
      var node = document.querySelector(selector);
      if (node) node.addEventListener('click', handler);
   }

   function getFocusablePanels() {
      return [refs.sidePanel, refs.ctaPanel].filter(function (node) {
         return Boolean(node) && node.style.display !== 'none';
      });
   }

   function applyFocus() {
      if (!layout) return;

      focusItems.forEach(function (node, index) {
         layout.markFocused(node, index === focusIndex);
      });
   }

   function moveFocus(direction) {
      if (!focusItems.length) return false;

      var nextIndex = focusIndex + direction;
      if (nextIndex < 0 || nextIndex >= focusItems.length) {
         return false;
      }

      focusIndex = nextIndex;
      applyFocus();
      return true;
   }

   function getFocusedPanel() {
      return focusItems[focusIndex] || null;
   }


   function initRemoteKeys() {
      keys = new RemoteKeys();

      // Left / Right — navigate slides. The slider is the only interactive
      // region in this creative, so the keys drive it directly instead of
      // going through panel focus.
      keys.mapKey('left', function () {
         if (slider) slider.prev();
      });

      keys.mapKey('right', function () {
         if (slider) slider.next();
      });

      // Up / Down — move focus between the side panel and the QR CTA panel
      keys.mapKey('up', function () {
         moveFocus(-1);
      });

      keys.mapKey('down', function () {
         moveFocus(1);
      });

      // OK — open the QR destination
      keys.mapKey('ok', function () {
         if (getFocusedPanel() === refs.ctaPanel && typeof actions.onQrClick === 'function') {
            actions.onQrClick();
         }
      });
   }

   // ─────────────────────────────────────────────────────────────
   // Public API — called by js/sdk/transport.js, do not rename
   // ─────────────────────────────────────────────────────────────

   function handleInput(payload) {
      return keys ? keys.handle(payload) : false;
   }

   function restoreOverlay() {
      if (layout) layout.restore();
   }

   function syncVideoTimestamp(remoteCurrentTime, force) {
      return layout ? layout.syncTime(remoteCurrentTime, force) : false;
   }

   function playVideo() {
      if (layout) layout.play();
   }

   function pauseVideo() {
      if (layout) layout.pause();
   }

   // Update the overlay video source after init — used when the real player
   // size arrives late (e.g. SIMID Player:resize) and a better-fit media
   // file is selected.
   function setOverlayVideoUrl(url) {
      if (layout && url) layout.setVideoSource(url);
   }

   return {
      init: init,
      playVideo: playVideo,
      pauseVideo: pauseVideo,
      setOverlayVideoUrl: setOverlayVideoUrl,
      syncVideoTimestamp: syncVideoTimestamp,
      restoreOverlay: restoreOverlay,
      handleInput: handleInput
   };
})();
