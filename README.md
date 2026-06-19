# Sacred Geometry Studio

Sacred Geometry Studio is a polished dark-mode creative tool for generating procedural sacred geometry artwork directly in the browser. It is built as a focused creative studio: live SVG preview, curated visual presets, deterministic randomization, layered geometry, and export-ready artwork without accounts, backend services, or external AI APIs.

**Live demo:** [ddave82.github.io/sacred-geometry-studio](https://ddave82.github.io/sacred-geometry-studio/)

![Sacred Geometry Studio preview](docs/preview.svg)

## What It Does

Sacred Geometry Studio turns procedural geometry into exportable artwork. Choose a pattern, tune the structure, layer a secondary overlay, shape the background, and export the result as SVG or high-resolution PNG.

The interface is intentionally dark, calm, and studio-like so the artwork stays visually dominant. Presets such as Ancient Gold, Cosmic Violet, Deep Space, Black Paper, and Copper Engraving are designed to look strong immediately while still being fully editable.

## Highlights

- Procedural SVG renderer with no static pattern images
- Dark premium creative-studio interface
- Live preview that updates instantly
- Main geometry layer plus secondary overlay and center symbol layer
- Mood presets with curated palettes and background styles
- Deterministic random designs from a reusable seed
- Local preset save, load, and delete via `localStorage`
- SVG export
- PNG export at `1024`, `2048`, and `4096` px
- Aspect ratios for square, portrait, landscape, and A4-style output
- Fully client-side: no backend, login, database, or API keys

## Included Patterns

- Flower of Life
- Seed of Life
- Metatron's Cube
- Vesica Piscis
- Sri Yantra inspired geometry
- Radial Mandala
- Star Polygon Grid

## Creative Controls

The editor exposes practical controls for producing finished artwork rather than technical demos:

- Pattern type
- Rings / complexity
- Radius / scale
- Rotation
- Stroke width, color, opacity, and glow
- Secondary color
- Fill and fill opacity
- Center emphasis
- Pattern-specific symmetry controls
- Independent overlay pattern, size, complexity, symmetry, rotation, and opacity
- Background presets, colors, vignette, and subtle grain

Controls that do not apply to a selected pattern are disabled instead of pretending to change the geometry. For example, Metatron's Cube has fixed six-fold symmetry, while Radial Mandala and Star Grid expose free symmetry control.

## Presets

Built-in mood presets are tuned to create export-worthy starting points:

- Ancient Gold
- Cosmic Violet
- Monk Ink
- Solar Flare
- Deep Space
- Nordic Frost
- Black Paper
- Psychedelic Aura
- White Marble
- Copper Engraving

## Tech Stack

- [Vite](https://vite.dev/)
- Vanilla JavaScript modules
- SVG rendering
- Canvas only for PNG export
- CSS-only dark interface
- `localStorage` for saved presets

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

If that port is busy, Vite will choose the next available port.

## Build

```bash
npm run build
```

The production files are written to `dist/`.

## GitHub Pages

This repository is configured for GitHub Pages at:

[https://ddave82.github.io/sacred-geometry-studio/](https://ddave82.github.io/sacred-geometry-studio/)

The included workflow builds the Vite app and deploys `dist/` to GitHub Pages whenever `main` is pushed.

## Project Structure

```text
src/
  geometry/
    patterns.js      Procedural pattern generation
  export.js          SVG and PNG export
  main.js            UI bindings and live updates
  presets.js         Mood presets and seeded randomizer
  renderer.js        SVG document rendering
  state.js           App state, validation, pattern metadata
  storage.js         localStorage preset persistence
  styles.css         Dark creative-studio UI
```

## Status

Version `0.1.0` is a browser-only creative tool focused on still artwork generation. Animation export, cloud save, accounts, marketplace features, and AI generation are intentionally out of scope for this version.
