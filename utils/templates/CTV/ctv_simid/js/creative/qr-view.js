/**
 * creative/qr-view.js — QR code rendering and click binding
 *
 * Renders the pre-built SVG into the DOM and binds a click handler.
 * No SIMID, no VPAID, no ad-payload knowledge.
 *
 * Usage:
 *   var qr = new QrCodeView(refs.svgNode, function () { window.open(url); });
 *   qr.render(model.qrCode);
 */

// eslint-disable-next-line no-unused-vars
function QrCodeView(svgNode, onClickCallback) {
    this.svgNode = svgNode;
    this.onClickCallback = onClickCallback || null;
    this._clickHandler = null;
}

QrCodeView.prototype.render = function (qrCodeModel) {
    qrCodeModel = qrCodeModel || {};

    var section = this.svgNode && this.svgNode.parentElement
        ? this.svgNode.parentElement.parentElement
        : null;

    if (section) {
        section.style.display = qrCodeModel.enabled === false ? 'none' : '';
    }

    if (!this.svgNode || !qrCodeModel.svgMarkup) return;

    this.svgNode.innerHTML = qrCodeModel.svgMarkup;

    if (this._clickHandler) {
        this.svgNode.removeEventListener('click', this._clickHandler);
        this._clickHandler = null;
    }

    if (qrCodeModel.clickable && typeof this.onClickCallback === 'function') {
        this._clickHandler = this.onClickCallback;
        this.svgNode.addEventListener('click', this._clickHandler);
    }
};
