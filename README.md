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
| **CLEAR**                | Delete the working folder and return to empty state                                                     |

`ctv` replaces SIZE / RTBH with its own controls — see [Banner types → `ctv`](#ctv).

### Working folders

Each type declares the folder it is developed in (`TYPES` in `utils/server.js`) — it
is also the folder you upload to Adturbo, so it matches what the ad server expects:

| Type                                                 | Folder            | Opens              |
| ---------------------------------------------------- | ----------------- | ------------------ |
| custom / scroll_banner / commerce_ads / interstitial | `0x0_responsive/` | `/0x0_responsive/` |
| ctv                                                  | `ctv_simid/`      | `/ctv-preview`     |

---

## Banner types

### `custom`

Standard fixed-size banner. Body gets a `b{W}x{H}` class (e.g. `b300x600`).  
Sizes are defined in `settings.json` → `FLUID_CREATIVE_SIZES[0].sizes` and synced automatically to `$sizes` in `style.scss` and `KNOWN_SIZES` in `banner.js`.

### `scroll_banner`

Scroll-driven banner displayed inside an article preview.  
Use the **↗ Preview in article** button to test scroll behavior.

### `commerce_ads`

Fill in the special offer IDs in `index.html`'s `<head>` — that's all:

```html
var clickTag = ''; var clickSpecialOffer1Tag = ''; var clickSpecialOffer2Tag =
''; var clickSpecialOffer3Tag = '';
```

`CLICK_MAP` in `extra.js` wires up all click events automatically — no other changes needed.

### `interstitial`

Responsive full-viewport banner. Body gets `land` or `vert` depending on device orientation — **no fixed sizes**.  
The SIZE dropdown lets you preview the two default orientations (`768x1024` portrait, `1024x768` landscape) during development — it sets `body` width/height and the `land`/`vert` class. These sizes are dev-only and never written to `settings.json`. Layout is controlled via `.vert` and `.land` selectors in `style.scss`.

### `ctv`

Interactive CTV creative (SIMID / VPAID), developed in `ctv_simid/`.

Opening `/ctv_simid/` directly redirects to `/ctv-preview`.

The panel becomes a bar across the top of the player:

| Control      | Description                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **STATE**    | **VIDEO** = spot fullscreen · **BANNER** = minimized + banner. Follows the auto-minimize timer                                                                                  |
| **SPOT**     | Video the overlay plays — defaults to `/video.mp4` in the pack root                                                                                                             |
| **DELAY**    | `autoMinimizeDelayMs` — ms from `init()` until the banner animates in. Written through to `autoMinimizeDelayMs` in `js/sdk/transport.js`, so the on-air value follows the panel |
| **⟳ Replay** | Reload the creative and re-run the intro animation from the top                                                                                                                 |
| **REMOTE**   | `← → ↑ ↓` and `Enter` are forwarded as remote-control input                                                                                                                     |

Console output and runtime errors from inside the creative are forwarded to the
Console toast — including anything `init()` throws, which would otherwise fail
silently. WEIGHT counts only files inside `ctv_simid/`; the mock spot is excluded,
since on air the video is streamed by the player and is not part of the ad.

---

## SCSS compilation

SCSS is compiled automatically by the server whenever a `.scss` file changes in the working folder. No editor plugin required.

Every type uses the same pair: `css/base.css` (hand-edited reset / scaffolding, loaded first) and `css/style.scss` → `css/style.css` (compiled — never edit the `.css`).

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

Upload the contents of **`settings.json`** and the working folder — **`0x0_responsive/`**,
or **`ctv_simid/`** for `ctv` — directly into `public_html` in Adturbo.

---

## Adding a banner type

1. Add an entry to `TYPES` in `utils/server.js` (folder, entry point, whether it
   uses SCSS / settings.json sizes / `rtbh_enabler.js`, weight limit).
2. Drop the template into `utils/templates/<TYPE>/<folder>/`.

The panel's TYPE dropdown is built from `/api/status`, so the new type shows up
without touching `utils/dev-panel.js` — only add code there if the type needs its
own controls (as `ctv` does).
