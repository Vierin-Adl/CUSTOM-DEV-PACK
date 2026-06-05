# Custom Banner Dev Pack

## Getting started

```bash
npm install
npm start
```

Opens `http://localhost:3300/` automatically.

---

## Dev panel

The panel in the top-right corner of the browser controls the working project.

### EMPTY state (no active project)

| Control   | Description                                          |
| --------- | ---------------------------------------------------- |
| **TYPE**  | Select a banner type                                 |
| **START** | Copy the template into `0x0_responsive/` and open it |

### WORKING state (active project)

| Control                  | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **SIZE**                 | Switch between sizes; changes `body` class to `b{W}x{H}` _(custom / scroll_banner / commerce_ads only)_ |
| **RTBH**                 | Toggle between **DEV** (stub injected by server) and **PROD** (real `rtbh_enabler.js` loaded)           |
| **↗ Preview in article** | Open scroll preview page _(scroll_banner only)_                                                         |
| **CLEAR**                | Delete `0x0_responsive/` and return to empty state                                                      |

---

## Banner types

### `custom`

Standard fixed-size banner. Body gets a `b{W}x{H}` class (e.g. `b300x600`).  
Sizes are defined in `settings.json` → `FLUID_CREATIVE_SIZES[0].sizes` and synced automatically to `$sizes` in `style.scss` and `KNOWN_SIZES` in `banner.js`.

### `scroll_banner`

Scroll-driven banner displayed inside an article preview.  
Use the **↗ Preview in article** button to test scroll behavior.

### `commerce_ads`

Commerce-focused banner. Same size system as `custom`.

### `interstitial`

Responsive full-viewport banner. Body gets `land` or `vert` depending on device orientation — **no fixed sizes**.  
The SIZE selector is hidden for this type. Layout is controlled via `.vert` and `.land` selectors in `style.scss`.

---

## SCSS compilation

SCSS is compiled automatically by the server whenever a `.scss` file changes in `0x0_responsive/`. No editor plugin required.

---

## Sizes (custom / scroll_banner / commerce_ads)

Sizes can be changed in two ways:

- **Panel** — add or switch sizes live during development; changes are saved to `settings.json` automatically.
- **Directly in `settings.json`** — edit `FLUID_CREATIVE_SIZES[0].sizes` and restart the server.

Either way, the server syncs the list to `$sizes` in `style.scss` and `KNOWN_SIZES` in `banner.js` on every save.

---

## RtbhEnabler

In **DEV mode** the server strips `rtbh_enabler.js` from the HTML and injects a lightweight stub that polyfills `onDocumentReady`, `open`, `addClickEvent`, etc. No manual commenting-out needed.

In **PROD mode** the real `rtbh_enabler.js` is loaded as-is.

---

## Deploy to Adturbo

Upload the contents of **`settings.json`** and **`0x0_responsive/`** directly into `public_html` in Adturbo.
