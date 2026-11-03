# AGENTS.md — BrickStep 3D Pro

> **Start here for handoff:** [docs/REPRODUCTION.md](docs/REPRODUCTION.md) is the rebuild and verification book. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the technical map. [docs/TESTING.md](docs/TESTING.md) records what was actually run and what was not.

## 1. What this is

A static Three.js assembly studio for **LEGO-style brick models**: one page, three source files, no build step and no package manager. It generates thirteen procedural models — ten of them 3,300–3,900 pieces — renders them with one `InstancedMesh` batch per brick type, and turns each placement list into a numbered manual with a glowing ghost target, snapping, sub-assembly modules, rotation, an explode view, a temporary finished preview, and a 24 × 24 authoring studio with JSON export/import. Progress and per-model steps live in `localStorage`; progress files can move between devices.

It is **not** a CAD tool, a physics sandbox, a multiplayer service, or an offline app. Three.js r128 and OrbitControls load from public CDNs, so the first load needs network access. The UI is English only. Current app version: **2.0.0**.

Live copy: <https://somphol.github.io/brickstep-3d-pro/>
Local master: `~/Projects/brickstep-3d-pro`

## 2. Commands

There is no install and no build.

```bash
cd ~/Projects/brickstep-3d-pro

# run — HTTP is the reliable origin for localStorage and relative assets
python3 -m http.server 8000
# open http://localhost:8000
# opening index.html directly also works when the CDN is reachable

# verification (Node >= 18, no dependencies)
node --check script.js
node scripts/check.mjs        # prints "OK <n> checks"; exit 1 on failure

# deploy = push to main; GitHub Pages serves the repository root
git push origin main
```

`scripts/check.mjs` verifies required files, every local `src`/`href` in `index.html`, relative Markdown links, `node --check` for each `.js` file, and JSON parsing. It does not launch a browser.

## 3. Architecture

Load order is `index.html` → `style.css` → CDN Three.js (with an unpkg fallback) → CDN OrbitControls (with an unpkg fallback) → `script.js`. `script.js` is one IIFE and calls `boot()` at the end.

1. **Model layer** — `APP`, `BRICK_TYPES` (8 types), `COLORS` (25), `ModelBuilder`, thirteen preset builders (`buildCastlePreset` plus twelve mega/study generators), `PRESET_MODELS` (13 entries), `getPresetMeta`. A generator returns `{ placements, modules, pieceCount }`; placement order *is* step order, and `ModelBuilder.finish` rejects module gaps or out-of-order starts.
2. **State** — `cloneDefaultState`, `sanitizeState`, `sanitizeCustomBricks`, `loadState`, `saveStateNow`, `scheduleSave` (180 ms debounce). `state` holds the active model id, step, completion, mode, authoring bricks/selection, per-model progress, explode value and sound.
3. **Runtime** — `buildGeometryCache`, `initScene`, `initMaterial`, `initCustomMeshes`, `initGhost`, `setBaseplateSize`, `buildInstancesForActiveModel`, `updateBuiltinInstances`, `updateCustomInstances`, `updateGhost`.
4. **Flow** — `snapCurrent`, `prevStep`, `jumpToStep`, `resetBuild`, `setPreview`, `setAuthoring`, `placeAuthoringAtHover`, `applyImportedData`, `fitCameraToModel`.
5. **UI/persistence** — `updateAll` → instances + ghost + `updateHud`; `toast`, `showComplete`, `AudioKit`, `bindEvents`, `window.BrickStep` debug API.

Coordinates are integer stud cells (`gx`, `gz`) plus a layer `y` in plate units. World position and size use:

```text
CELL = 1, PLATE_H = 0.4, BASE_Y = 0.15
worldX = (gx + w/2 − GRID/2) · CELL
worldZ = (gz + d/2 − GRID/2) · CELL
worldY = y · PLATE_H + BASE_Y + explodeOffset(p)
footprint(type, rot) swaps w/d when rot = 90
```

A brick is 1.2 units tall (3 plates) and a plate is 0.4 (1 plate). `getRenderCount()` returns `activeStep − 1`, so the current brick exists only as the ghost; a completed build or a finished preview returns the full count. Explode adds `(percent/100) · (1.4 + y·0.17 + (step % 9)·0.11)` on Y.

Persistence key: `brickstep_pro_250_v1`. Saved shape includes `version`, `modelId`, `activeStep`, `completed`, `mode`, `customBricks`, `modelProgress`, `explode`, `sound`, authoring selection, `placedCount`, `placedMatrix` and `savedAt`. On restore, `sanitizeState` rebuilds from `modelId` + `activeStep` and **ignores `placedMatrix`**; the matrix is informational. Download filenames are `brickstep_pro_250.json` and `brickstep_custom_250.json`.

## 4. Decisions and constraints

- **Pin Three.js r128 and the global OrbitControls build.** The code uses r128 APIs (`outputEncoding`, `PCFSoftShadowMap`, `InstancedMesh.setColorAt`) and `THREE.OrbitControls` as a global. Do not swap in a module build or a newer major without porting the renderer.
- **Instanced colour buffers must be filled before lowering `count`.** In r128, the first `setColorAt` sizes `instanceColor` from `mesh.count`. `buildInstancesForActiveModel` creates the mesh at full capacity, colours every instance, then sets `count = 0`. `initCustomMeshes` pre-colours all 250 authoring slots for the same reason. Changing that order reintroduces `GL_INVALID_OPERATION: glDrawArraysInstanced: Vertex buffer is not big enough`.
- **The generator order is the manual.** Every preset must produce steps `1…pieceCount` with no gaps, every module range must be contiguous, and every brick must be inside the plate with no overlapping stud cells. `ModelBuilder.add` and `finish` throw on violations. Do not "fill" a missing count by appending arbitrary bricks without checking occupancy.
- **The counts are locked.** 250, 1,099, 1,336, 3,317, 3,900, 3,300, 3,700, 3,600, 3,900, 3,452, 3,808, 3,532, 3,643. The HUD, step scrubber, completion card and saved progress all take the count from the active model; changing a generator without changing `pieceCount` breaks the step contract.
- **Only one preset is in memory.** `loadPresetModel` guards on `modelLoading`, uses `modelLoadToken` for stale requests, calls `unloadActiveModel` (disposing the previous batches), then generates the new model after a 70 ms timeout. Do not pre-generate all presets.
- **Finished preview is transient.** `previewFinished` is a module variable, not part of `state`; it shows all pieces but never changes `activeStep` and is not saved. Snap and step changes are blocked while it is on.
- **Authoring is a separate board.** It uses `AUTHOR_GRID = 24` and `AUTHOR_MAX = 250`, hides preset batches, and exports a `brickstep-custom-model` payload. Imports are sanitized: unknown types, out-of-bounds cells, overlaps and the 250 cap are rejected or skipped.
- **No build, framework, bundler, analytics or runtime network calls beyond the Three.js CDNs.** Keep the app a static three-file site. The CDN dependency is deliberate and documented; it is not an offline app.
- **`state.json` and `STATE.md` are historical build records.** Do not wire them into runtime logic or rewrite their measurements to look current.
- **Documentation is part of the release.** `README.md` is the index; every guide lives in `docs/`; `scripts/check.mjs` fails when a required document or relative link is missing.

## 5. Known issues

- **Network required on first load.** If both Three.js CDNs and both OrbitControls fallbacks are blocked, `boot()` shows a fatal loading message. There is no bundled copy.
- **Browser coverage is narrow.** Interaction was verified in headless Chrome. Safari, Firefox, physical phones, touch gestures and screen readers were not formally automated. The responsive layout was checked at 390 px wide.
- **FPS is reported live but not benchmarked on hardware.** The 60 FPS target is a design goal; headless software rendering is much slower. No frame-time budget test exists.
- **The largest builds are 3,900 pieces, not 5,000.** The late request mentioned 3,000–5,000; the shipped mega presets stop at 3,900 by design and by the verified counts.
- **Restore trusts `activeStep`, not a brick matrix.** `placedMatrix` in the save file is not replayed. Imported `placedBricks` are informational. A hand-edited save can only restore a step boundary, not an arbitrary brick set.
- **`localStorage` is best effort.** Private mode or a blocked storage origin makes `saveStateNow` silently do nothing; the studio continues in memory.
- **Audio is gesture-gated and untested audibly.** `AudioKit.ensure()` resumes the context on the first click; success is not asserted by any automated check.
- **The 3D canvas is not a fully accessible grid.** It has an ARIA label and role, and every action has a button or shortcut, but camera control is pointer-only and individual bricks are not focusable.
- **Generators prove occupancy, not structural realism.** Zero overlaps and zero out-of-bounds cells were verified; clutch strength, stability and real LEGO connectivity were not modelled.

## 6. Continuity

- **Deployed copy:** GitHub Pages at <https://somphol.github.io/brickstep-3d-pro/>, repository `somphol/brickstep-3d-pro`, branch `main`, folder `/`. No custom domain.
- **Local master:** `~/Projects/brickstep-3d-pro`.
- **Release history:** `CHANGELOG.md`. App version `2.0.0` is defined once in `APP.version` and copied into save payloads.
- **Documentation map:** [README.md](README.md) is the human entry point; [docs/REPRODUCTION.md](docs/REPRODUCTION.md) the rebuild book; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) the module and formula map; [docs/TESTING.md](docs/TESTING.md) the verified matrix and gaps; [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) Pages operations; [skills/brickstep-3d-pro/SKILL.md](skills/brickstep-3d-pro/SKILL.md) the reusable build skill.
- **Policies and records:** [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md), [LICENSE](LICENSE), [STATE.md](STATE.md), [state.json](state.json).
- **Publishing rules:** push `main` and let Pages rebuild. Never force-push. If the repository is renamed, update the canonical/OG URLs in `index.html`, the sitemap, `robots.txt`, README/AGENTS links and the live URL references in this docs set.
