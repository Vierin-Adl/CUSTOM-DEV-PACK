/**
 * creative/layout.js — overlay and video DOM state
 *
 * Manages overlay fullscreen/minimized transitions and video playback.
 * No SIMID, no VPAID, no ad-payload knowledge.
 *
 * Usage:
 *   var layout = new LayoutController(refs);
 *   layout.minimize();
 *   layout.restore();
 *   layout.markFocused(node, true);
 */

// eslint-disable-next-line no-unused-vars
function LayoutController(refs) {
    this.refs = refs;
    this.isMinimized = false;
    this.lastSyncAt = 0;
};

LayoutController.prototype.setVideoSource = function (videoUrl) {
    if (videoUrl && this.refs.overlayVideo) {
        this.refs.overlayVideo.preload = 'metadata';
        this.refs.overlayVideo.src = videoUrl;
    }
};

LayoutController.prototype.show = function () {
    if (this.refs.layer)   this.refs.layer.classList.remove('hidden');
    if (this.refs.overlay) this.refs.overlay.classList.remove('hidden');
};

LayoutController.prototype.minimize = function () {
    if (!this.refs.overlay || this.isMinimized) return;
    this.isMinimized = true;
    this.refs.overlay.classList.add('is_minimize');
    if (this.refs.wrapper) this.refs.wrapper.classList.add('is_minimize');
};

LayoutController.prototype.restore = function () {
    if (!this.refs.overlay) return;
    this.refs.overlay.classList.remove('is_minimize');
    this.isMinimized = false;
    if (this.refs.wrapper) this.refs.wrapper.classList.remove('is_minimize');
};

LayoutController.prototype.markFocused = function (node, focused) {
    if (node) node.classList.toggle('is-remote-focused', focused);
};

LayoutController.prototype.play = function () {
    if (this.refs.overlayVideo && typeof this.refs.overlayVideo.play === 'function') {
        var playPromise = this.refs.overlayVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {});
        }
    }
};

LayoutController.prototype.pause = function () {
    if (this.refs.overlayVideo && typeof this.refs.overlayVideo.pause === 'function') {
        this.refs.overlayVideo.pause();
    }
};

LayoutController.prototype.syncTime = function (remoteCurrentTime, force) {
    var video = this.refs.overlayVideo;
    var diff;
    var now;

    if (!video || typeof remoteCurrentTime !== 'number' || !isFinite(remoteCurrentTime)) {
        return false;
    }

    diff = Math.abs(remoteCurrentTime - video.currentTime);
    if (force) {
        if (diff < 0.05) return false;
    } else {
        now = Date.now();
        if (diff < 0.75) return false;
        if (this.lastSyncAt && (now - this.lastSyncAt) < 1000) return false;
        this.lastSyncAt = now;
    }

    video.currentTime = remoteCurrentTime;
    return true;
};
