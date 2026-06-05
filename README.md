# Custom Banner Dev Pack

## Run locally

```
node server.js
```

Opens `http://localhost:3300/0x0_responsive/` automatically. No npm install needed.

> `server.js` runs the live server only. To compile SCSS, enable the **Watch Sass** plugin in your editor (VS Code: [Live Sass Compiler](https://marketplace.visualstudio.com/items?itemName=glenn2223.live-sass)).

## Local development notes

`RtbhEnabler.onDocumentReady` in `extra.js` is an Adturbo listener and won't fire locally. Comment it out and call `extraInit()` directly while developing.

## Deploy to Adturbo

Upload the contents of **`settings.json`** and **`0x0_responsive/`** directly into `public_html` in Adturbo.

## Sizes

Sizes can be changed in two ways:

- **Panel** (top bar in the browser) — update sizes live during development; changes are saved to `settings.json` automatically.
- **Directly in `settings.json`** — edit `FLUID_CREATIVE_SIZES` → `sizes` and restart the server.

Either way, the server syncs the list to `$sizes` in `style.scss` on every save.
# CUSTOM-DEV-PACK
