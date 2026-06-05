// Called by static_html-scroll.js — must return a GSAP timeline
window.initAnimation = function () {
  // Timeline is paused — scroll position drives progress (0 = start, 1 = end)
  var tl = gsap.timeline({ paused: true });

  // ---- ADD ANIMATIONS BELOW ------------------------------------------------

  // ---- ADD ANIMATIONS ABOVE ------------------------------------------------

  return tl;
};
