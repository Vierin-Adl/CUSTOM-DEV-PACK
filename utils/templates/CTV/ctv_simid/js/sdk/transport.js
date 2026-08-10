/**
 * sdk/transport.js — SDK + transport orchestration
 *
 * This is the only interactive-layer file allowed to touch:
 * - RtbhVideoInteractiveSdk
 * - SIMID player/media messages
 * - VPAID postMessage transport
 *
 * Folder contract:
 * - js/vendor/   third-party libraries only
 * - js/creative/ DOM, visuals, focus, slider, QR, view state
 * - js/sdk/      transport, normalization, SDK integration
 */

var InteractiveApp = (function () {
    'use strict';

    // ═════════════════════════════════════════════════════════════
    // Shared state
    // ═════════════════════════════════════════════════════════════

    var adParams      = null;
    var creativeModel = null;
    var isInitialized = false;
    var isVpaidMode   = window.RtbhVideoInteractiveSdk && window.RtbhVideoInteractiveSdk.isVpaidMode;
    var transport     = window.RtbhVideoInteractiveSdk && window.RtbhVideoInteractiveSdk.transport;

    // Current player size in CSS px — updated by init env and resize events.
    // Kept locally so pickBestMedia() can use it for media file selection.
    var playerSize = null;

    // Tagged logger gated by the shared SDK debug toggle.
    function debugLog(context, data) {
        var sdk = window.RtbhVideoInteractiveSdk;
        if (!sdk || !sdk.debug || typeof sdk.debug.isEnabled !== 'function' || !sdk.debug.isEnabled()) return;
        if (data !== undefined) {
            console.log('[TRANSPORT]', '[' + context + ']', data);
        } else {
            console.log('[TRANSPORT]', '[' + context + ']');
        }
    }

    // ═════════════════════════════════════════════════════════════
    // Player-size tracking
    // ═════════════════════════════════════════════════════════════

    function setPlayerSize(width, height) {
        var w = parseInt(width, 10) || 0;
        var h = parseInt(height, 10) || 0;
        if (w <= 0 || h <= 0) return;
        if (playerSize && playerSize.width === w && playerSize.height === h) return;

        playerSize = { width: w, height: h };
        debugLog('setPlayerSize', playerSize);

        // If the creative model was already built with no / stale size,
        // re-select the overlay video now that we know the real player size.
        if (creativeModel && adParams) {
            var url = getOverlayVideoUrl(adParams);
            if (url && url !== creativeModel.overlayVideoUrl) {
                creativeModel.overlayVideoUrl = url;
                if (InteractiveHandler && typeof InteractiveHandler.setOverlayVideoUrl === 'function') {
                    InteractiveHandler.setOverlayVideoUrl(url);
                }
            }
        }
    }

    // ═════════════════════════════════════════════════════════════
    // Shared helpers
    // ═════════════════════════════════════════════════════════════

    function getClickUrl(params) {
        if (!params) return null;
        return (isVpaidMode ? params.defaultUrlVpaid : params.defaultUrlSimid)
            || params.clickTag || null;
    }

    function getOverlayConfig(params) {
        return params && params.overlayJsonConfig ? params.overlayJsonConfig : {};
    }

    function mediaScore(mediaItem) {
        var bitrate = parseInt(mediaItem.bitrate, 10) || 0;
        var width   = parseInt(mediaItem.width,   10) || 0;
        var height  = parseInt(mediaItem.height,  10) || 0;
        return bitrate || (width * height);
    }

    function pickBestMedia(mediaFiles) {
        if (!mediaFiles || !mediaFiles.length) return null;
        var enabled = mediaFiles.filter(function (mediaItem) {
            return mediaItem.enabled !== 'No';
        });
        var candidates = enabled.length ? enabled : mediaFiles;

        var sdk = window.RtbhVideoInteractiveSdk;
        if (sdk && typeof sdk.pickBestMediaItem === 'function') {
            var opts = (playerSize && playerSize.width > 0 && playerSize.height > 0) ? playerSize : {};
            return sdk.pickBestMediaItem(candidates, opts);
        }
        return candidates.reduce(function (best, mediaItem) {
            return mediaScore(mediaItem) > mediaScore(best) ? mediaItem : best;
        });
    }

    function resolveMediaUrl(params, file) {
        if (!file) return null;
        if (file.indexOf('https://') === 0) return file;
        if (!params || !params.basePathMain) return file;
        return params.basePathMain + 'media/' + file;
    }

    function getOverlayVideoUrl(params) {
        var overlayConfig = getOverlayConfig(params);

        // 1. Explicit override from the creative config always wins.
        var override = resolveMediaUrl(params, overlayConfig.videoUrl);
        if (override) return override;

        // 2. Pick from mediaFiles using the current (tracked) player size.
        //    This is re-run by setPlayerSize() once the real size is known.
        if (params.mediaFiles && params.mediaFiles.length) {
            var bestMedia = pickBestMedia(params.mediaFiles);
            if (bestMedia && bestMedia.file) return resolveMediaUrl(params, bestMedia.file);
        }

        return null;
    }

    function generateQrCodeSvg(clickUrl, overlayConfig) {
        if (!clickUrl || typeof qrcode !== 'function') return null;

        var errorCorrection = overlayConfig.qrCodeErrorCorrection || 'L';
        var margin = overlayConfig.qrCodeMargin !== undefined ? parseInt(overlayConfig.qrCodeMargin, 10) : 2;

        var qr = qrcode(0, errorCorrection);
        qr.addData(clickUrl);
        qr.make();

        return qr.createSvgTag({ cellSize: 6, margin: margin, scalable: true });
    }

    function buildCreativeModel(params) {
        var overlayConfig = getOverlayConfig(params);
        var clickUrl      = getClickUrl(params);
        var qrEnabled     = overlayConfig.qrCodeEnabled !== false;

        return {
            overlayVideoUrl:     getOverlayVideoUrl(params),
            // Fullscreen hold before the overlay shrinks and the banner animates
            // in. Kept in sync by the dev server: changing DELAY in the panel
            // rewrites the number below, so tune it there.
            autoMinimizeDelayMs: 1000,
            qrCode: {
                enabled:   qrEnabled,
                clickable: Boolean(clickUrl),
                svgMarkup: qrEnabled ? generateQrCodeSvg(clickUrl, overlayConfig) : null
            }
        };
    }

    function buildCreativeActions(params) {
        var clickUrl = getClickUrl(params);

        return {
            onQrClick: clickUrl ? function () {
                window.open(clickUrl, '_blank');
            } : null,
            requestMuteMainVideo: function () {
                if (transport) transport.requestMute();
            },
            requestUnmuteMainVideo: function () {
                if (transport) transport.requestUnmute();
            }
        };
    }

    function dispatchRemoteInput(payload) {
        if (!InteractiveHandler || typeof InteractiveHandler.handleInput !== 'function') return;
        InteractiveHandler.handleInput(payload || {});
    }

    // ═════════════════════════════════════════════════════════════
    // Entry point
    // ═════════════════════════════════════════════════════════════

    function initiate(params) {
        if (isInitialized) return;
        isInitialized = true;

        adParams      = params || {};
        creativeModel = buildCreativeModel(adParams);

        if (transport) transport.requestUnmute();

        InteractiveHandler.init(creativeModel, buildCreativeActions(adParams));

        if (typeof initAdTracker === 'function') initAdTracker(params);
    }

    // ═════════════════════════════════════════════════════════════
    // Boot
    // ═════════════════════════════════════════════════════════════

    if (transport) {
        transport.on('init', function (data) {
            debugLog('event:init', data.adParams);
            var size = transport.getPlayerSize();
            if (size) setPlayerSize(size.width, size.height);
            initiate(data.adParams);
        }, true);

        transport.on('resize', function (d) {
            debugLog('event:resize', d);
            setPlayerSize(d.width, d.height);
        });

        // replayIfFired (3rd arg) is essential. This file loads at the bottom of
        // <body>, but the SDK opens the SIMID session from <head>, so the player's
        // one-shot Player:startCreative (→ 'play') fires and is buffered BEFORE we
        // subscribe here. Without replay the buffered 'play' is never delivered and
        // playVideo() never runs. Pre-SDK-transport this worked because the creative
        // called simid.addListener(START_CREATIVE, cb, true) directly, using SIMID's
        // own already-fired replay; the rewrite kept `true` on 'init' but dropped it
        // here. Applies to VPAID (START_CREATIVE/PLAY/PLAYING) identically.
        transport.on('play', function () {
            debugLog('event:play');
            if (!isInitialized) {
                var params = transport.getAdParams();
                if (params) initiate(params);
            }
            InteractiveHandler.playVideo();
        }, true);

        transport.on('pause', function () { InteractiveHandler.pauseVideo(); });
        transport.on('stop',  function () { InteractiveHandler.pauseVideo(); });

        transport.on('timeupdate', function (d) {
            InteractiveHandler.syncVideoTimestamp(d.currentTime, false);
        });

        transport.on('seeked', function (d) {
            InteractiveHandler.syncVideoTimestamp(d.currentTime, true);
        });

        transport.on('input', function (d) {
            dispatchRemoteInput({ key: d.key, mapped: d.mapped });
        });
    }

    return {};

})();
