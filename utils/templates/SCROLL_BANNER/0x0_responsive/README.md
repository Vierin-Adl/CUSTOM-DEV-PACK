# Scrollbanner Responsive

## Project structure

```
0x0_responsive/
├── index.html              ← Creative config + HTML markup
├── css/
│   ├── base.css            ← Framework reset — do not edit
│   ├── style.scss          ← Your styles (source)
│   └── style.css           ← Compiled CSS (edit this if not using SCSS)
├── js/
│   ├── rtbh_enabler.js     ← Ad platform SDK — do not edit
│   ├── app.js              ← Scroll controller — do not edit
│   ├── static_html-scroll.js ← Framework init — do not edit
│   ├── gsap.min.js         ← GSAP animation library — do not edit
│   └── animation.js        ← Your animation timeline ← EDIT THIS
├── images/                 ← Banner assets
└── fonts/                  ← Custom fonts (optional)
```

---

## Quick start

### 1. Build the HTML

Add your banner elements inside `.banner__wrapper` in `index.html`:

### 4. Style the elements

In `style.scss`

### 5. Write the animation

Edit `js/animation.js`. All GSAP tweens go inside `window.initAnimation`:

```js
window.initAnimation = function () {
  var tl = gsap.timeline({ paused: true });

  tl.from(".banner__bg", 0.3, { scale: 1.1 }, 0);
  tl.from(".banner__logo", 0.2, { opacity: 0, y: -20 }, 0.1);
  tl.to(".banner__curtain", 0.2, { yPercent: -100 }, 0.05);
  tl.from(".banner__cta", 0.1, { opacity: 0, scale: 0.8 }, 0.3);

  return tl; // required
};
```

**Insert time** (3rd argument) is a value between 0 and 1 representing scroll progress — not real seconds. 0 = banner enters viewport, 1 = banner exits.

---

## Scroll trigger settings

In `index.html`, `window.creativeSettings`:

| Property                    | Default | Effect                                                                               |
| --------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `viewportScrollOffsetRatio` | `0.5`   | Where on the banner scroll is measured: `0` = top edge, `0.5` = center, `1` = bottom |
| `enableViewportScroll`      | `true`  | Must stay `true` for scroll animation to work                                        |
| `enableClip`                | `false` | Clip feature for expanded banners — leave `false` unless needed                      |

---

## Animation thresholds

The animation maps scroll percentage to timeline progress:

- `animationStartThreshold` (default `100`) — scroll % at which animation begins (banner fully below viewport)
- `animationEndThreshold` (default `-50`) — scroll % at which animation completes (banner fully above viewport)

To override per creative, add to the size config in `index.html`:

```js
{ key: "300x600", width: 300, height: 600, animationStartThreshold: 90, animationEndThreshold: 10 }
```

---

## Framework files (do not edit)

| File                    | Purpose                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `rtbh_enabler.js`       | Ad platform SDK — handles clicks, MRAID, postMessage                                |
| `app.js`                | Scroll controller — listens to viewport scroll, calls animation callbacks           |
| `static_html-scroll.js` | Glue — reads `creativeConfig`, calls `initAnimation()`, connects timeline to scroll |
| `base.css`              | Framework CSS reset for banner wrapper elements                                     |

---

## Notes

- **Script load order in `index.html` matters**: `gsap.min.js` → `animation.js` → `static_html-scroll.js`. Do not rearrange.
- `animation.js` **must** export `window.initAnimation` and **must** return the timeline.
- When not inside an ad platform (e.g., opened directly in a browser), `enableViewportScroll` may not activate — the animation will play automatically instead.
- The `.banner__inner` div has `hide` class by default; the framework removes it on init. Do not remove the class from the HTML.
