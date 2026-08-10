/**
 * creative/slider.js — horizontal slide carousel with dot indicators
 *
 * No SIMID, no VPAID, no ad-payload knowledge.
 *
 * Usage:
 *   var slider = new Slider(document.getElementById('sideSlider'));
 *   slider.next();
 *   slider.prev();
 *   slider.goTo(2);
 *
 * Expected HTML structure inside containerNode:
 *   <div class="slider-track">
 *     <div class="slide">...</div>
 *     <div class="slide">...</div>
 *   </div>
 *
 * Page dots are optional: any .banner__page-item elements found are kept in
 * sync, and the slider works the same when the creative ships without them.
 */

// eslint-disable-next-line no-unused-vars
function Slider(containerNode) {
  this.container     = containerNode;
  this.track         = containerNode ? containerNode.querySelector('.slider-track') : null;
  this.page          = Array.prototype.slice.call(document.querySelectorAll('.banner__page-item'));
  this.slides        = containerNode
    ? Array.prototype.slice.call(containerNode.querySelectorAll('.slide'))
    : [];
  this.current       = 0;
  this._update();
}

Slider.prototype._update = function () {
  if (!this.track) return;

  this.track.style.transform = 'translateX(-' + (this.current * 100) + '%)';

  this.page.forEach(function (dot, index) {
    dot.classList.toggle('show', index === this.current);
  }, this);
};

Slider.prototype.next = function () {
  if (!this.slides.length) return;
  this.current = (this.current + 1) % this.slides.length;
  this._update();
};

Slider.prototype.prev = function () {
  if (!this.slides.length) return;
  this.current = (this.current - 1 + this.slides.length) % this.slides.length;
  this._update();
};

Slider.prototype.goTo = function (index) {
  this.current = Math.max(0, Math.min(index, this.slides.length - 1));
  this._update();
};
