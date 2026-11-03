# Architecture

## Load order and boot

```text
index.html
  ├─ style.css
  ├─ CDN three.js r128          (unpkg fallback via document.write)
  ├─ CDN OrbitControls r128     (unpkg fallback via document.write)
  └─ script.js                  one IIFE → boot()
```

`script.js` has no exports and no module syntax. `boot()` runs immediately at the end of the IIFE. Everything below lives in that file unless a path is given.

### Boot sequence

| Stage | Call | Loading copy |
| --- | --- | --- |
| 1 | `cacheDom()` then `state = loadState()` | — |
| 2 | guard on `window.THREE` / `THREE.OrbitControls`; `showFatal()` on failure | — |
| 3 | `buildGeometryCache()` | "Moulding the brick library…" (10%) |
| 4 | `initScene()`, `initMaterial()`, `initCustomMeshes()`, `initGhost()`, `onResize()` | "Laying the studio stage…" (28%) |
| 5 | `bindEvents()`, `buildModelLibrary()` | "Wiring the instruction manual…" (46%) |
| 6 | `loadPresetModel(initialId, {immediate, silent, preserveMode, preserveState})` | "Generating the active model…" (64%) |
| 7 | `onReady` → `applyLoadedState()`, resize, module list, `updateAll()`, start `animate()`, publish `window.BrickStep` | "Opening the studio…" (96%) |
| 8 | after 320 ms: 100%, fade the loading screen; if completed, open the completion card | "Ready to build" |

`loadPresetModel` waits 70 ms before generating, so the loading copy paints. If generation throws, it keeps the current model, logs the error, shows a toast and calls `opts.onError`; the first model has no previous model, so boot passes `onError` to `showFatal`.

## Module map

### Constants and model data

| Identifier | Role |
| --- | --- |
| `APP` | `name`, `version: '2.0.0'`, `storageKey: 'brickstep_pro_250_v1'`, `defaultModelId: 'castle-workshop-250'` |
| `CELL`, `PLATE_H`, `BASE_Y` | `1`, `0.4`, `0.15` — stud pitch, plate height, brick bottom above the plate |
| `CASTLE_PLATE`, `AUTHOR_GRID`, `AUTHOR_MAX`, `BUILD_OFFSET` | `24`, `24`, `250`, `4` |
| `GRID` | mutable active board size; set by `setBaseplateSize` |
| `BRICK_TYPES` | 8 entries: `2x4b`, `2x2b`, `1x4b`, `1x2b` (h 1.2) and the same four as plates (h 0.4) |
| `COLORS` | 25 named hex colours; `getColorName` reads this table |
| `CASTLE_MODULES` | fixed ranges `1–64`, `65–166`, `167–250` |
| `PRESET_MODELS` | 13 metadata entries, each with `id`, `name`, `icon`, `category`, `description`, `accent`, `plateSize`, `pieceCount`, optional `viewDir`, `generate` |
| `getPresetMeta(id)` | registry lookup, no generation |

### Generation

`ModelBuilder(plateSize)` owns `placements`, an `occupied` hash (`x|y|z` per stud cell) and `moduleDefs`.

| Method | Contract |
| --- | --- |
| `module(id, name, icon, color)` | selects the current module; first call defines it |
| `add(type, gx, gz, y, rot, color, moduleId)` | validates bounds and every occupied cell for the brick's height, records the placement, returns it |
| `fillRect(type1, type2, gx, gz, w, d, y, colorFn, moduleId)` | even dimensions only; chooses the cheaper 2×4 or rotated 2×4 row layout and uses `type2` for a 2-wide remainder |
| `block(...)` | stacks `layers` of `fillRect` by the brick height in plates |
| `isFree(type, gx, gz, y, rot)` | occupancy probe used by plinth fill |
| `ringRect(...)` | hollow rectangular ring from four `fillRect` calls |
| `finishMega(meta, target, ...)` | adds a three-layer outer plinth until `target` is reached, then calls `finish` |
| `finish(meta)` | validates contiguous module coverage, throws on a gap, returns `{placements, modules, pieceCount}` |

Placement objects are the save/render contract:

```js
{
  step: 1,                    // 1-based, contiguous
  type: '2x4b',
  gx: 0, gz: 0,               // integer board cell
  y: 0,                       // plate layers
  rot: 0,                     // 0 | 90
  color: '#3f7fbf',
  colorName: 'Steel Blue',
  module: 'foundation'
}
```

The thirteen builders are `buildCastlePreset` (which calls `buildCastleModel`), `buildAuroraShuttle`, `buildNeonWyrm`, `buildNeoMegacity`, `buildTitanMecha`, `buildCelestialDragon`, `buildAuroraDreadnought`, `buildPirateGalleon`, `buildEiffelTower`, `buildColosseum`, `buildCrystalCitadel`, `buildSolarisStation`, `buildSunPyramid`.

### State and persistence

| Identifier | Role |
| --- | --- |
| `state` | current studio state, shape below |
| `cloneDefaultState()` | fresh defaults |
| `sanitizeState(raw)` | clamps the model, step, explode, mode and authoring fields; rebuilds `modelProgress` |
| `sanitizeCustomBricks(raw)` | import guard: valid type, finite integers, inside 24×24, below y 120, no overlap, cap 250 |
| `loadState()` | reads `localStorage`, parses, sanitizes; any throw returns defaults |
| `saveStateNow()` | writes the full snapshot; `scheduleSave()` debounces 180 ms |
| `rememberActiveProgress()` | copies the active step/completion into `state.modelProgress` |

Default state:

```js
{
  version: '2.0.0',
  modelId: 'castle-workshop-250',
  activeStep: 1,
  completed: false,
  mode: 'guided',             // 'guided' | 'authoring'
  customBricks: [],
  modelProgress: {},          // { [modelId]: { activeStep, completed } }
  explode: 0,                 // 0–100
  sound: true,
  authorType: '2x4b',
  authorColor: '#3f7fbf',
  authorRot: 0                // 0 | 90
}
```

`localStorage` key `brickstep_pro_250_v1` stores the same fields plus:

```js
{
  placedCount: 399,
  placedMatrix: [['2x4b', 8, 8, 0, 0, '#3f7fbf'], ...],
  savedAt: '2026-11-01T05:25:56.156Z'
}
```

`placedMatrix` is a compact record of visible bricks (`[type, gx, gz, y, rot, color]`). Restore intentionally ignores it: the deterministic generator plus `activeStep` is the source of truth. Imported progress files (`type: 'brickstep-progress'`) follow the same rule. Custom imports (`type: 'brickstep-custom-model'` or a bare array) are routed through `sanitizeCustomBricks`.

### Three.js runtime

| Identifier | Role |
| --- | --- |
| `scene`, `camera`, `renderer`, `controls`, `clock` | one scene; perspective camera FOV 38; `WebGLRenderer` with antialias, PCF soft shadows, sRGB output, ACES tone mapping, exposure 1.02, `preserveDrawingBuffer` for screenshots |
| `initScene()` | background/fog `0x070d18`; camera at `(28, 25, 40)` looking at `(0, 5.5, 0)`; OrbitControls damping 0.055, distance 6–320, polar limit `0.495π`; six lights plus ground and grid |
| `initMaterial()` | one shared `MeshPhysicalMaterial` for all bricks and the ghost base colour |
| `buildGeometryCache()` | one merged `BufferGeometry` per type (body + studs + anti-stud tubes), disposed after merge |
| `placementMatrix(p)` | position + Y rotation + explode offset; reuses a single `Object3D` |
| `buildInstancesForActiveModel()` | one `InstancedMesh` per type present, capacity = that type's count |
| `updateBuiltinInstances()` | shows placements with `step <= getRenderCount()` and writes matrices |
| `initCustomMeshes()` / `updateCustomInstances()` | pre-allocated 250-slot batches for the authoring board |
| `initGhost()` | ghost body, outline, ring, beam and beacon; animated in `animate()` |
| `setBaseplateSize(size)` | rebuilds the plate box, `size²` stud instances and contact ring; updates `GRID` |
| `computeModelBounds` / `fitCameraToModel` | camera fit from the actual placement bounds |
| `animate(now)` | `requestAnimationFrame` loop: camera tween or controls, ghost pulse, effects, render, FPS sample every 520 ms |

## Coordinate and geometry contracts

```text
CELL = 1
PLATE_H = 0.4
BASE_Y = 0.15

worldX(gx, w) = (gx + w/2 − GRID/2) · CELL
worldZ(gz, d) = (gz + d/2 − GRID/2) · CELL
worldY(y)     = y · PLATE_H + BASE_Y

footprint(type, rot):
  rot === 90 → { w: def.d, d: def.w }
  otherwise  → { w: def.w, d: def.d }
```

- Bricks are 1.2 units tall = 3 plates; plates are 0.4 = 1 plate.
- `y` is an integer plate layer. The occupancy key is `x|y|z` for every stud cell the brick's footprint and height cover.
- A rotated brick swaps width and depth but not the anchor; `gx`/`gz` stay the minimum corner.
- The 2×4 body is inset by `0.045` on each horizontal side; studs are radius `0.235`, height `0.155`; anti-stud tubes are radius `0.255`, height `min(0.24, bodyH · 0.7)`. A 2×4 body gets two tubes along its local x at `−0.55` and `+0.55`; other types get one centred tube.
- `BASE_Y` lifts the brick bottom just above the plate studs at `y = 0.06`. The plate box is `0.34` tall centred at `y = −0.17`; the contact ring sits at `−0.355`.
- `placementMatrix` uses `dummy.position.set(worldX, y·PLATE_H + BASE_Y + explode, worldZ)` and `rotation.y = rot === 90 ? π/2 : 0`.

## Step engine

- `getActivePieceCount()` reads the active model, else the metadata registry.
- `getPlacedCount()` returns `customBricks.length` in authoring; in guided mode it returns the full count when `completed`, otherwise `activeStep − 1`.
- `getRenderCount()` returns all placements when `completed` or `previewFinished`; otherwise `activeStep − 1`. This is why the current brick exists only as the ghost.
- `getCurrentPlacement()` indexes `activeModel.placements[activeStep − 1]`.
- `snapCurrent()` refuses in finished preview, explode view or a complete build; in authoring it places at the hover. Guided snap calls `spawnSnapEffect`, `audio.snap()`, then either sets `completed = true` on the final step or increments `activeStep`. It never mutates the placement list.
- `prevStep()` undoes completion (`activeStep = pieceCount`) or decrements; `jumpToStep()` clamps and clears completion; `resetBuild()` returns to step 1, clears completion and explode.
- `updateBuiltinInstances()` assumes placements are sorted by step. `ModelBuilder` guarantees that order.
- `setPreview(true)` sets the transient `previewFinished`; `getRenderCount()` returns the full count and the HUD reports 100%, while `activeStep` and `completed` are untouched. `updateViewModeUi()` disables Build/Finished during authoring or after completion.

## Rendering pipeline

1. **Static geometry** — `createBrickGeometry` merges `BoxGeometry` body, one capped cylinder per stud, and the anti-stud tubes into one geometry per type. `mergeGeometries` re-indexes positions/normals/UVs and disposes the parts.
2. **Instancing** — `buildInstancesForActiveModel` creates one `InstancedMesh` per brick type with capacity equal to the number of placements of that type. `mesh.frustumCulled = false` because the visible subset changes without rebuilding the bounding volume.
3. **Colour caveat** — r128 sizes `instanceColor` from `mesh.count` on the first `setColorAt`. The code therefore creates at full capacity, writes every colour, then sets `count = 0`. `updateBuiltinInstances` raises `count` only up to the allocated list length and writes matrices in step order.
4. **Per-frame state** — `updateAll()` = `updateBuiltinInstances` + `updateCustomInstances` + `updateGhost` + `updateHud`. It runs on snap, step change, model load, mode change, explode input (throttled to one `requestAnimationFrame`), reset and resize-driven updates.
5. **Ghost** — one `ghostGroup` reused for guided and authoring targets. Guided ghost geometry is swapped to `geometryCache[p.type]`, colour follows the brick, and a rotation offset (`ghostRotated`) tilts the preview 90° without changing the step data; snapping auto-aligns to the instruction orientation. The authoring ghost follows `authoringHover` and snaps to the top of the stack at that footprint.
6. **Camera** — `fitCameraToModel` computes bounds from placements (optionally including explode), then:

```text
vFov = fov · π / 180
hFov = 2 · atan(tan(vFov/2) · max(0.35, aspect))
fitHeight = (size.y/2) / tan(vFov/2)
fitWidth  = (max(size.x, size.z)/2) / tan(hFov/2)
distance  = max(fitHeight, fitWidth) · 1.28 + 5
target    = center + (0, size.y · 0.025, 0)
position  = target + normalize(viewDir) · distance
```

`viewDir` defaults to `[0.62, 0.52, 0.78]`; only `celestial-dragon` overrides it (`[0.85, 0.38, 0.36]`). `setView` applies immediately or through `tweenCamera` (760 ms, ease-in-out, controls disabled during the tween). `focusCurrent()` zooms to 58% of the current distance, clamped 10–55.

7. **Explode** — `state.explode` is 0–100. `explodeOffset(p) = (percent/100) · (1.4 + p.y·0.17 + (p.step % 9)·0.11)`. The slider's `input` handler rebuilds matrices; its `change` handler re-fits the camera with the exploded bounds included. Ghost and snapping are disabled while `explode > 0`.
8. **Effects and loop** — snap rings are 0.52 s expanding gold rings; the ghost pulses with sine terms. `animate()` runs continuously (no idle throttle) and reports FPS from a 520 ms sample.

## Authoring pipeline

- `setAuthoring(true)` snapshots the guided progress through `rememberActiveProgress()`, hides preset batches, switches the plate to 24×24, fits `fitAuthoringView`, clears preview and (when entering from guided mode) explode, and rebuilds the module list as a single "Custom Build" item.
- `computeAuthoringHover(event)` raycasts the baseplate, floors the hit to a cell, clamps the footprint into the 24×24 board, and computes `y = getTopAtFootprint(...)`.
- `customPlacementFits(candidate)` checks the full 3D occupancy against every `customBrick` (not just the visible top), then `placeAuthoringAtHover` pushes, plays audio, spawns the ring, updates instances/ghost/HUD and saves.
- `undoCustom`, `clearCustom`, `exportCustomFile` and `applyImportedData` are the other authoring entry points. `clearCustom` uses a native confirm.
- The authoring view is independent of the preset camera; exiting restores the active model's plate and fits its bounds immediately.

## Persistence and import flow

```text
user action
  → mutate state / customBricks
  → updateAll()
  → scheduleSave()  (180 ms)
  → saveStateNow()  → rememberActiveProgress() → localStorage.setItem

page load
  → loadState() → sanitizeState() → state
  → loadPresetModel(state.modelId) → generate
  → state.activeStep / completed from sanitized state
  → build instances, HUD, camera
  → applyLoadedState() → setAuthoring if needed → saveStateNow()
```

Files:

- **Save Progress** (`saveProgressFile`) serializes `brickstep-progress`, including `modelProgress` and the visible `placedBricks`, downloads `brickstep_pro_250.json`.
- **JSON** in authoring (`exportCustomFile`) serializes `brickstep-custom-model` with `steps`, downloads `brickstep_custom_250.json`.
- **Load** (`importFile` → `applyImportedData`) detects arrays and `steps` payloads as custom; any payload with `activeStep` is progress; anything else gets an error toast.

## Audio

`AudioKit` owns one lazily created `AudioContext` and master gain. `ensure()` runs on pointer down, control clicks and any audio cue; it resumes a suspended context. `tone(freq, duration, type, volume, slideTo, delay)` schedules oscillator and exponential gain envelopes. Named cues: `click`, `snap` (165→62 Hz triangle plus two high clicks), `place`, `error`, `complete` (C5–E6 arpeggio). No audio files are loaded.

## Extension points

| Change | Files and functions |
| --- | --- |
| Add a preset | Add metadata + `generate` to `PRESET_MODELS`; write a builder ending in `finish`/`finishMega`; add an integration test for exact count, bounds, overlap and module coverage |
| Add a brick type | Add `BRICK_TYPES`; add an `<option>` in `#authorType`; add a width to `BRICK_WIDTHS`; verify merged geometry stud/tube layout; `buildGeometryCache` and both instancing paths pick it up automatically |
| Add a colour | Add to `COLORS`; authoring accepts any `#rrggbb` through `isHexColor` |
| Change camera framing | `fitCameraToModel`, `computeModelBounds`, optional `viewDir`; re-test authoring and exploded fits |
| Change storage schema | `cloneDefaultState`, `sanitizeState`, `saveStateNow`, `applyImportedData`; bump the key only with a migration or an explicit reset |
| Change the authoring cap | `AUTHOR_MAX`, `AUTHOR_GRID`, the 24×24 board and every allocation/fit assumption |
| Change UI copy | Static text in `index.html`; dynamic strings in `toast()`/HUD functions; there is no i18n layer |
