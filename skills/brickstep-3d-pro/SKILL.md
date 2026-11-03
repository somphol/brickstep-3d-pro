---
name: BrickStep 3D Pro
description: Build a static Three.js LEGO assembly studio with procedural models, instanced bricks, step manuals, ghost snapping, finished preview, JSON authoring and a GitHub Pages release.
version: 2.0.0
---

# BrickStep 3D Pro

Build a single-page, CDN-backed Three.js studio that turns procedural brick placement lists into an interactive instruction manual: step HUD, required-brick bay, sub-assemblies, glowing ghost target, snap feedback, explode view, temporary finished preview, and a bounded authoring studio with JSON export/import.

The reference implementation is the 13-model **BrickStep 3D Pro** app in `assets/template/`. It is a working app, not a blank starter.

## When to use

- The user wants a 3D brick/LEGO assembly toy, a step-by-step model manual, or a procedural model viewer with snapping.
- The result must be three static files (`index.html`, `style.css`, `script.js`) with no build step, framework or bundler.
- Models can be expressed as ordered brick placements (`type`, grid cell, layer, rotation, colour) and need not be imported meshes.
- Progress should persist locally and move between devices as JSON.
- You need a repeatable release with a static checker and GitHub Pages.

**Not for:** physics simulation, structural/stability analysis, CAD accuracy, multiplayer, server-side accounts, models loaded from GLTF/OBJ, or a fully offline app. This pattern depends on the Three.js CDN and a WebGL browser. It is English-only in the reference; add an i18n layer before claiming translations.

## What it produces

```text
<project>/
├── index.html                  studio shell, panels, modals
├── style.css                   dark glass design system + responsive layout
├── script.js                   generators, Three runtime, state, UI, audio
├── .nojekyll
├── scripts/check.mjs           static release checks
├── docs/                       architecture, reproduction, testing, deployment
└── skills/<id>/                optional packaged skill
```

The app renders one active model at a time. All other presets exist as metadata plus a generator function, so a 3,900-piece build does not force every model into memory.

## Quick start

From the repository that contains this skill:

```sh
mkdir -p ~/Projects/my-brick-studio
cp -R skills/brickstep-3d-pro/assets/template/. ~/Projects/my-brick-studio/
mkdir -p ~/Projects/my-brick-studio/scripts
cp scripts/check.mjs ~/Projects/my-brick-studio/scripts/check.mjs
cd ~/Projects/my-brick-studio
python3 -m http.server 8000       # http://localhost:8000
node --check script.js
node scripts/check.mjs
```

Then rebrand the constants and metadata:

- `APP.name`, `APP.version`, `APP.storageKey`, `APP.defaultModelId` in `script.js`.
- `<title>`, description, canonical, OG/Twitter URLs and visible brand copy in `index.html`.
- The `localStorage` key must change when the state schema changes; do not silently reuse another app's key.
- Replace the preset roster and generators; keep `PRESET_MODELS` metadata and `pieceCount` in sync.

## Module map

| Area | Key identifiers | Responsibility |
| --- | --- | --- |
| Constants | `APP`, `CELL`, `PLATE_H`, `BASE_Y`, `GRID`, `AUTHOR_GRID`, `AUTHOR_MAX`, `BRICK_TYPES`, `COLORS` | units, board sizes, brick dimensions, palette |
| Builder | `ModelBuilder.module/add/fillRect/block/isFree/ringRect/finishMega/finish` | occupancy-checked, ordered placements and contiguous modules |
| Registry | `PRESET_MODELS`, `getPresetMeta` | metadata + lazy `generate()` per model |
| State | `cloneDefaultState`, `sanitizeState`, `loadState`, `saveStateNow`, `scheduleSave` | defaults, clamping, 180 ms autosave |
| Scene | `initScene`, `initMaterial`, `buildGeometryCache`, `setBaseplateSize`, `initGhost` | renderer, lights, merged geometry, plate, ghost |
| Instancing | `buildInstancesForActiveModel`, `updateBuiltinInstances`, `initCustomMeshes`, `updateCustomInstances` | one batch per brick type; pre-colour then show |
| Manual | `snapCurrent`, `prevStep`, `jumpToStep`, `updateHud`, `buildModuleList` | step contract, progress, modules |
| Modes | `setPreview`, `setAuthoring`, `placeAuthoringAtHover`, `applyImportedData` | finished viewer, authoring board, file import |
| Camera | `computeModelBounds`, `fitCameraToModel`, `explodeOffset`, `focusCurrent` | fit, explode, focus |
| Output | `saveProgressFile`, `exportCustomFile`, `takeScreenshot`, `AudioKit` | JSON downloads, PNG, synthesized sound |
| Boot | `cacheDom`, `boot`, `window.BrickStep` | DOM wiring, fatal states, debug API |

## Core recipes

### 1. Add a preset

1. Write `buildMyModel()` using a `ModelBuilder` sized to the board.
2. Open modules with `b.module('id','Name','icon','#hex')` in step order.
3. Add bricks with `add`, `fillRect`, `block`, `ringRect`; every call validates bounds and occupied cells.
4. Finish with `b.finish(meta)` or `b.finishMega(meta, target, plinthName, plinthIcon, plinthColor, colorFn)`.
5. Register an entry in `PRESET_MODELS` with the exact `pieceCount` and `plateSize`.
6. Audit: `placements.length === pieceCount`, zero out-of-bounds, zero duplicate `x|y|z`, module ranges contiguous from 1 to N.

`finish` is the contract:

```js
ModelBuilder.prototype.finish = function (meta) {
  // modules must start at the previous end + 1, and cover every placement
  // returns { placements, modules, pieceCount }
};
```

### 2. Add a brick type

1. Add `{ w, d, h, kind, label }` to `BRICK_TYPES` (`h: 1.2` brick, `0.4` plate).
2. Add an `<option value="...">` to `#authorType` if authoring should offer it.
3. Add a display width to `BRICK_WIDTHS` for the bay illustration.
4. Verify `createBrickGeometry` produces the right studs and tubes; `buildGeometryCache` and both instancing paths pick up the type automatically.
5. Test rotation: `footprint(type, 90)` swaps width and depth, and `add` checks the swapped footprint.

### 3. Keep instancing correct on Three.js r128

The colour buffer is sized from `mesh.count` the first time `setColorAt` runs. Do this:

```js
var mesh = new THREE.InstancedMesh(geometryCache[type], brickMaterial, list.length);
for (var i = 0; i < list.length; i++) mesh.setColorAt(i, linearColor(list[i].color));
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
mesh.count = 0;                    // now safe to hide everything
// later: raise count only up to list.length, then write matrices
```

Do **not** create a small mesh, colour it, and then raise `count` above the allocation. That produces `GL_INVALID_OPERATION: glDrawArraysInstanced: Vertex buffer is not big enough`. Pre-allocate authoring batches at the cap (`AUTHOR_MAX`) for the same reason.

### 4. Persist a step, not a brick matrix

Store `modelId`, `activeStep`, `completed`, `mode`, per-model progress, custom bricks and settings. On load, regenerate the model and show `activeStep − 1` bricks. The deterministic generator is the source of truth; a stored matrix is only an audit trail. If you later allow arbitrary brick edits, you need a real replay path and a migration, not a matrix-shaped field.

## Failure boundaries

- **No offline mode.** Three.js and OrbitControls come from CDNs. If the network is blocked, `boot()` cannot create the scene.
- **No structural validation.** Overlap and bounds are checked; clutch strength, balance and real LEGO connectivity are not.
- **No model import.** Presets are code. GLTF/OBJ import is a different architecture.
- **No physics or collision.** Snapping is target-step based; dragging is a gesture over a raycast plane.
- **No i18n.** All copy is English in the reference. Do not advertise a language switcher.
- **One active model by design.** Keep the lazy loader; generating all presets defeats the memory goal.
- **The finished preview is temporary.** Do not persist it or let it advance the step.
- **The check script is static.** It proves files, links, syntax and JSON; it does not prove WebGL rendering or interaction.
- **Do not claim 60 FPS** without measuring on named hardware. The app displays a live FPS counter, which is not a benchmark.

## Verification

```sh
node --check script.js
node scripts/check.mjs
# expected: OK <n> checks, exit 0
```

Then run the browser matrix in `references/verification.md`: load, snap, reload, switch models, preview, explode, authoring import/export, completion, and 390 px overflow. The reference release's exact results and known gaps are in its `docs/TESTING.md`.

## Reference files

- `references/method.md` — coordinate/step/instancing recipes and build order.
- `references/lessons.md` — bugs that actually occurred and what regresses.
- `references/verification.md` — static and browser checks with expected output.
- `ATTRIBUTION.md` — origin, licence and what is new in this skill.
- `assets/template/` — the release app source, byte-identical to the repository.
