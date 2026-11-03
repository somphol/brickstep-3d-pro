# Reproduction book

This is the rebuild and handoff book for **BrickStep 3D Pro**. It explains what the released app is, what must stay true, how it was assembled, which numbers are deliberate, and how to verify a rebuild. Read [ARCHITECTURE](ARCHITECTURE.md) for the module-level map, [TESTING](TESTING.md) for the verified matrix, and [DEPLOYMENT](DEPLOYMENT.md) for publishing.

> **If the three source files exist and hash as listed below, they are the source of truth.** Use this book to understand, verify, extend or reconstruct — not to rewrite working code for style.

## 1. What is being reproduced

A static, English-language, single-page Three.js LEGO assembly studio.

| Area | Release behaviour |
| --- | --- |
| Presets | 13 procedural models: 1 classic 250, two 1K studies, ten mega builds from 3,300 to 3,900 pieces |
| Model loading | Lazy: metadata for all 13, generated placements and `InstancedMesh` batches for exactly one |
| Manual | Every placement is a step; contiguous sub-assembly modules; progress bar; required-brick bay; previous/next; step scrubber; module jump |
| Snapping | Glowing ghost target, click/Space/Snap button/drag-from-bay, gold ring, Web Audio cue, toast |
| Views | Guided Build, temporary Finished preview, Explode 0–100% |
| Authoring | 24×24 plate, 8 brick/plate types, colour picker, stack-aware ghost, undo, clear, 250-piece cap, JSON export |
| Persistence | `localStorage` autosave plus portable progress/custom JSON download and import |
| Rendering | Three.js r128 via CDN, one `InstancedMesh` per brick type, procedural studs/tubes, PCF soft shadows, ACES tone mapping |
| Delivery | `index.html`, `style.css`, `script.js`; no build, no package manager, no framework |
| Version | `APP.version = '2.0.0'`; repository has no release tag |

It is **not** an offline app (Three.js and OrbitControls are CDN dependencies), not a CAD or physics tool, not a multi-user service, and not localised. The opening session message named a "Vocabulary Lab"; the detailed brief covered only the brick studio, and no vocabulary feature exists.

Live: <https://somphol.github.io/brickstep-3d-pro/>
Repository: <https://github.com/somphol/brickstep-3d-pro>

## 2. Requirements matrix

| Requirement | Implementation | Where |
| --- | --- | --- |
| 250+ bricks at interactive frame rates | one `InstancedMesh` per brick type; shared physical material; merged procedural geometry | `script.js` `buildInstancesForActiveModel`, `createBrickGeometry` |
| Studs and anti-stud tubes for 2×4, 2×2, 1×4, 1×2 bricks and plates | per-stud capped cylinders + bottom tubes merged into each type's geometry | `createBrickGeometry`, `BRICK_TYPES` |
| Orbit, zoom, pan, shadows, lighting, plate grid | `THREE.OrbitControls`, PCF soft shadow map, hemisphere/key/fill/rim lights, studded baseplate | `initScene`, `setBaseplateSize` |
| Sub-assembly modules | `module()` markers on placements; `finish()` validates contiguous ranges; module buttons jump to `from` | `ModelBuilder`, `buildModuleList`, `updateModuleProgress` |
| "Step X of Y" + progress bar + active module | `updateHud`; `progressTrack`/`progressBar`/`moduleBadge` | `index.html`, `script.js` |
| Required brick bay with type/colour/dimensions | `updateBrickVisual`, `BRICK_WIDTHS`, CSS stud layout | `script.js`, `style.css` |
| Glowing ghost target with rotation | `ghostGroup` body/outline/ring/beam/beacon; `updateGhost`; `ghostRotated` | `initGhost`, `updateGhost`, `rotatePreview` |
| Raycast snapping + audio | `raycastBaseplate`, `hitsGhost`, `clickNearTarget`, `handleCanvasClick`, `handleDrop`, `AudioKit.snap` | `script.js` |
| Keyboard/UI 90° rotation | `R` / Rotate button: guided preview offset; authoring brick rotation | `rotatePreview`, `bindEvents` |
| Explode view | `state.explode`; `explodeOffset`; slider; camera re-fit on release | `explodeOffset`, `placementMatrix`, `bindEvents` |
| Authoring studio + JSON steps | `setAuthoring`, `computeAuthoringHover`, `placeAuthoringAtHover`, `exportCustomFile` | `script.js`, `index.html` |
| Persist model, step, bricks, settings | `brickstep_pro_250_v1`; 180 ms debounce; restore from model + step; custom bricks separately | `saveStateNow`, `sanitizeState`, `loadState` |
| Save/load `brickstep_pro_250.json` | `saveProgressFile`, `importFile`, `applyImportedData` | `script.js` |
| Multiple presets, only one loaded | `PRESET_MODELS` + `generate` functions; `loadPresetModel` unloads previous | `script.js` |
| 1,000–2,000-piece presets, more exciting | Aurora Shuttle (1,099), Neon Wyrm (1,336) | `buildAuroraShuttle`, `buildNeonWyrm` |
| Ten 3,000–5,000-piece showpieces | ten builds from 3,300 to 3,900 | `buildNeoMegacity` … `buildSunPyramid` |
| Toggle built ⇄ finished model | transient `previewFinished`; View Mode / `V` / eye button | `setPreview`, `updateViewModeUi` |
| Responsive studio | 3-column desktop, 2-column tablet, stacked phone; 390 px check | `style.css` media queries |
| Completion celebration | dynamic title/stats, 56 confetti pieces, completion arpeggio | `showComplete`, `buildConfetti` |
| Documentation and static checks | six required docs, one check script, one skill | `docs/`, `scripts/check.mjs`, `skills/brickstep-3d-pro/` |

## 3. Non-negotiable constraints

| Constraint | Why | Enforcement |
| --- | --- | --- |
| Three.js r128 + global OrbitControls | app uses r128 APIs and `THREE.OrbitControls` | pinned CDN URLs, no module imports |
| No build, framework or package manager | three static files, direct Pages publishing | repo has no `package.json`; `scripts/check.mjs` |
| One active preset | memory and load time for 3,900-piece builds | `loadPresetModel` + `unloadActiveModel` |
| Deterministic step order | the manual, progress save and restore all index by step | `ModelBuilder.add` pushes sequentially; `finish` checks coverage |
| No overlaps or out-of-bounds bricks | occupied-cell contract and visual correctness | `ModelBuilder.add` throws; release audit |
| Exact preset counts | HUD, scrubber and completion depend on `pieceCount` | `PRESET_MODELS` metadata + `finish`/`finishMega` |
| Pre-fill `instanceColor` before lowering `count` | r128 sizes the colour buffer from `count` | `buildInstancesForActiveModel`, `initCustomMeshes` |
| Finished preview never edits the saved step | preview is a viewer, not a mode | `previewFinished` is not in `state` |
| Authoring is a separate 24×24 board capped at 250 | keeps custom builds bounded and distinct | `AUTHOR_GRID`, `AUTHOR_MAX`, `sanitizeCustomBricks` |
| Fixed filenames and storage key | compatibility with existing saves | `APP.storageKey`, `saveProgressFile`, `exportCustomFile` |
| English only | no i18n layer was built | docs and UI; do not claim translations |
| `state.json`/`STATE.md` are historical | honest build provenance | never read at runtime |

## 4. Reference environment

| Tool | Version / note |
| --- | --- |
| macOS | Darwin, Apple Silicon (build machine) |
| Node.js | v26.13.0 used for the 2026 documentation checks; any Node with ESM and `node --check` works |
| Python | 3.x, only for `python3 -m http.server` |
| Chrome | headless Chrome used for interaction, screenshots and preset audits during the build |
| Dependencies | **none**; no `npm install`, no lockfile |
| Network | required for the three.js CDN and the OrbitControls fallbacks |

Source size at this release:

| File | Lines | SHA-256 |
| --- | ---: | --- |
| `index.html` | 363 | `4b0d66be9e6857ba697f92045d3afa32a5ad57675f287eafa1e53667b45a3b59` |
| `style.css` | 2,415 | `4191cf4fb83257e86b4747511ed0b36c0e77b0651734c983257b58215f3e1e3a` |
| `script.js` | 4,485 | `2552cefeccc371ee42db01e5df669049d0689246b2984f69ac119833daa8cc95` |

The skill template in `skills/brickstep-3d-pro/assets/template/` must match these hashes byte for byte. Verify with:

```bash
shasum -a 256 index.html style.css script.js
shasum -a 256 skills/brickstep-3d-pro/assets/template/index.html \
  skills/brickstep-3d-pro/assets/template/style.css \
  skills/brickstep-3d-pro/assets/template/script.js
```

## 5. Build from scratch

If the source exists, skip to §7. Otherwise follow these stages in order. Each stage has an acceptance check; do not move on while it fails.

### Stage 0 — Scaffold

```bash
mkdir brickstep-3d-pro && cd brickstep-3d-pro
git init -b main
touch .nojekyll
```

Create `index.html`, `style.css`, `script.js`, `.nojekyll`, an MIT `LICENSE`, `.gitignore` and later `docs/`. No `package.json`.

**Accept:** `python3 -m http.server 8000` serves a page with no 404 for local files (CDN may still be absent).

### Stage 1 — HTML shell

Build the semantic shell with these stable hooks:

1. Top bar: `#fpsValue`, `#visibleValue`, `#drawValue`, `#qualityValue`, `#btnSound`, `#btnSave`, `#btnLoad`, `#btnHelp`, hidden `#fileInput`.
2. Sidebar: `#modelGrid`, `#modelName`, `#modelMeta`, `#stepLabel`, `#progressTrack`, `#progressBar`, `#moduleBadgeText`, `#brickVisual`, `#brickName`, `#brickColorName`, `#brickDims`, `#btnSnap`, `#btnPrev`, `#btnRotate`, `#btnNext`, `#stepRange`, `#moduleList`, `#explodeSlider`, `#viewModeToggle`, `#btnAuthoring`, `#authorType`, `#authorColor`, `#btnUndo`, `#btnClearCustom`, `#btnExportCustom`.
3. Viewport: `#viewport`, overlays, `#btnQuickPreview`, `#btnFullscreen`, `#btnScreenshot`, `#toast`, `#completeOverlay`, `#modelLoader`, `#loadingScreen`.
4. Modals: `#helpModal`, `#btnCloseHelp`.
5. Script tags in order: three.js CDN, `window.THREE` fallback, OrbitControls CDN, fallback, `script.js`.

**Accept:** every ID used by `cacheDom()` exists exactly once; `node --check` is not yet meaningful but the page has no duplicate IDs.

### Stage 2 — Design system and layout

Implement `style.css` from its tokens:

- Dark blue-black background, glass panels, amber accent, cyan/green/red/violet semantics.
- Desktop `.workspace` grid `348px minmax(0, 1fr)`; sidebar scrolls independently.
- `@media (max-width: 1180px)` narrows the sidebar and hides button labels.
- `@media (max-width: 900px)` stacks the viewport above a two-column sidebar.
- `@media (max-width: 620px)` makes the sidebar single-column and the viewport `54dvh`.
- `@media (max-width: 390px)` tightens brand and brick bay.
- `prefers-reduced-motion` neutralises animations.

**Accept:** at 390 px `document.documentElement.scrollWidth <= innerWidth`; no horizontal overflow.

### Stage 3 — Brick model and geometry

In `script.js`:

- Define `APP`, `CELL = 1`, `PLATE_H = 0.4`, `BASE_Y = 0.15`, `CASTLE_PLATE = 24`, `AUTHOR_GRID = 24`, `AUTHOR_MAX = 250`, `BUILD_OFFSET = 4`.
- Define `BRICK_TYPES` and `COLORS` exactly as in the release.
- Implement `footprint`, `worldX`, `worldZ`, `isHexColor`, `getColorName`, `mergeGeometries`, `createBrickGeometry`, `buildGeometryCache`.
- Implement `ModelBuilder` with `module`, `add`, `fillRect`, `block`, `isFree`, `ringRect`, `finishMega`, `finish`.

**Accept:** a one-off script can generate each preset, and every placement has `step === index + 1`, no overlapping `x|y|z` cells, and bounds inside its plate.

### Stage 4 — Thirteen generators

Build in order, checking each before adding the next:

1. `buildCastleModel` / `buildCastlePreset` — 250 pieces on 24×24, modules Foundation / Walls & Towers / Keep & Crown.
2. `buildAuroraShuttle` — 1,099 on 48×48.
3. `buildNeonWyrm` — 1,336 on 48×48.
4. `buildNeoMegacity` — 3,317 on 48×48.
5. `buildTitanMecha` — 3,900 on 64×64.
6. `buildCelestialDragon` — 3,300 on 64×64, `viewDir: [0.85, 0.38, 0.36]`.
7. `buildAuroraDreadnought` — 3,700.
8. `buildPirateGalleon` — 3,600.
9. `buildEiffelTower` — 3,900.
10. `buildColosseum` — 3,452.
11. `buildCrystalCitadel` — 3,808.
12. `buildSolarisStation` — 3,532.
13. `buildSunPyramid` — 3,643.

Each of the nine later mega builders uses `finishMega` with a plinth module to reach the exact target; Neo Megacity and the two 1K studies end with `finish` after their sculpt is complete. Lock the count that the generator actually produces. Register all metadata in `PRESET_MODELS`.

**Accept:** the audit in §7 prints the exact count, zero out-of-bounds, zero overlaps and contiguous module coverage for all thirteen.

### Stage 5 — Scene and instancing

- `initScene`: renderer, fog, camera FOV 38 at `(28, 25, 40)`, controls target `(0, 5.5, 0)`, six lights, ground, grid, baseplate materials.
- `buildInstancesForActiveModel`: one mesh per type, **full-capacity colour fill, then `count = 0`**.
- `updateBuiltinInstances`: raise count to the visible step and write matrices.
- `initCustomMeshes`: 250-slot batches, pre-coloured, hidden until authoring.
- `setBaseplateSize`: plate, `size²` studs, contact ring, `GRID`.

**Accept:** step 1 shows zero bricks and a ghost; step 2 shows one brick; Chrome prints no `GL_INVALID_OPERATION`; switching models does not leak batches.

### Stage 6 — State, persistence and restore

Implement `cloneDefaultState`, `sanitizeCustomBricks`, `sanitizeState`, `loadState`, `rememberActiveProgress`, `scheduleSave`, `saveStateNow`; then `applyLoadedState`.

**Accept:** reload during a build restores the same `modelId`, `activeStep`, per-model progress, explode, sound and authoring state; corrupt JSON falls back to the castle at step 1.

### Stage 7 — Manual, HUD, ghost and snapping

- `getActivePieceCount`, `getPlacedCount`, `getRenderCount`, `getCurrentPlacement`, `countVisibleStuds`, `getModuleForStep`.
- `snapCurrent`, `prevStep`, `jumpToStep`, `resetBuild`, `rotatePreview`.
- `updateGhost`, `spawnSnapEffect`, `updateEffects`, `updateHud`, `updateModuleProgress`, `buildModuleList`.
- Click, drag, Space and buttons wired in `bindEvents`.

**Accept:** at step N exactly N−1 bricks render, the ghost is the Nth placement, snap advances exactly one step, and the final snap sets `completed` without exceeding the count.

### Stage 8 — Authoring studio

- `getTopAtFootprint`, `customPlacementFits`, `computeAuthoringHover`, `placeAuthoringAtHover`, `undoCustom`, `clearCustom`.
- `setAuthoring` switches the plate/camera/batches and rebuilds the module list.
- `exportCustomFile` writes `brickstep_custom_250.json`.
- `applyImportedData` sanitizes custom steps or progress.

**Accept:** a brick stacks on the previous one, overlapping placement is refused, the 251st piece is refused, undo removes the last piece, export → import preserves count and colours.

### Stage 9 — Camera, views, audio, completion

- `computeModelBounds`, `fitCameraToModel`, `fitAuthoringView`, `setView`, `tweenCamera`, `resetView`, `focusCurrent`.
- `setPreview`, `updateViewModeUi`, `previewFinished`.
- `AudioKit`, `spawnSnapEffect`, `showComplete`, `buildConfetti`, `takeScreenshot`, `toggleFullscreen`.
- `window.BrickStep` debug API.

**Accept:** Finished preview shows all pieces and returns to the same step; explode re-fits on slider release; completion card reports the active model's real count; no browser console errors.

### Stage 10 — Documentation, checks, deploy

Create the documentation set, `scripts/check.mjs`, and the skill. Run the gates. Push `main`; enable Pages from `main` / root.

**Accept:** check script exits 0, skill checker exits 0, live URL returns 200.

## 6. Where the numbers came from

| Number | Value | Why / consequence |
| --- | --- | --- |
| Stud pitch | `CELL = 1` | one world unit per stud; all brick sizes are integers |
| Plate height | `PLATE_H = 0.4` | three plates per brick; brick `h = 1.2` |
| Brick base | `BASE_Y = 0.15` | clears the plate studs at `y = 0.06`; keeps the brick bottom above the plate |
| Plate box | `0.34` tall at `y = −0.17` | top surface at 0, bottom at −0.34 |
| Body inset | `0.045` per side | visible seam between adjacent bricks and less z-fighting |
| Stud size | radius `0.235`, height `0.155`, 12 sides | readable at model scale without exploding vertex count |
| Anti-stud tube | radius `0.255`, height `min(0.24, bodyH·0.7)` | visible from below; 2×4 gets two tubes at ±0.55 |
| Board sizes | 24 / 48 / 64 | 24 for the 250 castle and authoring; 48 for the two 1K studies and Neo Megacity; 64 for the rest |
| Castle placement | `BUILD_OFFSET = 4` on a 24 board | centres the 16×16 castle footprint |
| Authoring grid | 24 × 24 | matches the original 250-piece studio; 250 cap |
| Camera FOV | `38°` | narrow enough for a toy-photography look |
| Camera fit | `max(fitHeight, fitWidth) · 1.28 + 5` | 28% margin plus a fixed 5-unit pull-back so tall and wide models both clear the frame |
| Camera target | `center.y + size.y · 0.025` | slightly above centre so the baseplate is not clipped |
| Default view direction | `[0.62, 0.52, 0.78]` | three-quarter view; dragon overrides to a side-biased `[0.85, 0.38, 0.36]` |
| Orbit limits | distance 6–320, polar `0.495π` | prevents going under the plate or inside the model |
| Key light | `0xfff1d4`, intensity 1.18, at `(26, 42, 20)` | warm studio key from front-right-above |
| Fill light | `0x63c8ff`, 0.38, at `(−18, 13, −12)` | cool fill from the opposite side |
| Rim lights | orange point `(−14, 10, −18)`, cool point `(18, 7, −12)` | separates dark models from the dark background |
| Shadow map | 2048², camera `−62…62` x, `−42…92` y, far 260 | covers 64×64 plates and tall builds; soft PCF radius 3 |
| Tone mapping | ACES Filmic, exposure 1.02 | rescues bright neon and gold highlights |
| Explode formula | `e · (1.4 + y·0.17 + (step % 9)·0.11)` | higher layers travel further; the step term breaks up identical heights |
| Explode key | `E` toggles 0 / 60 | enough separation to read layers without losing the silhouette |
| Save debounce | 180 ms | coalesces slider/step churn; `beforeunload` and `visibilitychange` flush |
| Model load delay | 70 ms | lets the loader paint before synchronous generation |
| Snap ring | 0.52 s | short enough to overlap repeated snaps |
| Camera tween | 760 ms (focus 720 ms) | readable motion without blocking input |
| FPS sample | 520 ms | stable readout without a per-frame DOM write |
| Completion delay | 460 ms after final snap | lets the ring and audio land before the card |
| Palette | 25 named hex values | warm/cool pairs for every sculpt; authoring also accepts any `#rrggbb` |
| Piece counts | 250; 1,099; 1,336; 3,317; 3,900; 3,300; 3,700; 3,600; 3,900; 3,452; 3,808; 3,532; 3,643 | fixed targets produced by the generator and then locked in metadata |

## 7. Verification procedure

### Static gates

```bash
node --check script.js
node scripts/check.mjs
node ~/.config/opencode/skills/skill-publish/scripts/check-skill.mjs skills/brickstep-3d-pro
```

Expected:

- `node --check` prints nothing and exits 0.
- `scripts/check.mjs` prints `OK <n> checks` and exits 0.
- the skill checker prints `OK brickstep-3d-pro — "BrickStep 3D Pro", … files, … MB`.

The check script covers required files, local `src`/`href` targets, relative Markdown links, JavaScript syntax and JSON parsing. It does **not** run the generator or a browser.

### Generator audit

The release audit loads the pure model half of `script.js` in a Node `vm`, calls each `generate()`, and checks every placement. It is a one-off harness, not committed. A robust extraction is:

```js
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const s = readFileSync('script.js', 'utf8');
const start = s.indexOf('  var APP = {');
const marker = s.indexOf('  var state = cloneDefaultState();');
const body = s.slice(start, marker);
const ctx = { console, document: {}, window: {} };
vm.createContext(ctx);
vm.runInContext(
  `(function(){${body}\nglobalThis.M = PRESET_MODELS; globalThis.B = BRICK_TYPES; globalThis.F = footprint; globalThis.P = PLATE_H;})()`,
  ctx
);

for (const meta of ctx.M) {
  const out = meta.generate();
  const seen = new Set();
  let outOfBounds = 0, overlap = 0;
  for (const p of out.placements) {
    const f = ctx.F(p.type, p.rot);
    const h = Math.round(ctx.B[p.type].h / ctx.P);
    if (p.gx < 0 || p.gz < 0 || p.gx + f.w > meta.plateSize || p.gz + f.d > meta.plateSize) outOfBounds++;
    for (let x = p.gx; x < p.gx + f.w; x++)
      for (let z = p.gz; z < p.gz + f.d; z++)
        for (let y = p.y; y < p.y + h; y++) {
          const k = `${x}|${y}|${z}`;
          if (seen.has(k)) overlap++; else seen.add(k);
        }
  }
  console.log(meta.id, out.pieceCount, meta.pieceCount, out.modules.length, outOfBounds, overlap);
}
```

Expected output — every line must show `actual === expected`, `oob 0`, `overlap 0`, and a contiguous module list:

| Preset | Pieces | Modules | Max Y (plates) |
| --- | ---: | ---: | ---: |
| Castle Workshop | 250 | 3 | 36 |
| Aurora Shuttle | 1,099 | 6 | 90 |
| Neon Wyrm | 1,336 | 6 | 102 |
| Neo Megacity | 3,317 | 5 | 149 |
| Titan Mecha | 3,900 | 6 | 198 |
| Celestial Dragon | 3,300 | 6 | 129 |
| Aurora Dreadnought | 3,700 | 6 | 105 |
| Pirate Galleon | 3,600 | 6 | 168 |
| Eiffel Tower | 3,900 | 5 | 296 |
| Grand Colosseum | 3,452 | 5 | 84 |
| Crystal Citadel | 3,808 | 6 | 126 |
| Solaris Station | 3,532 | 5 | 138 |
| Sun Pyramid | 3,643 | 5 | 90 |

The audit was run for this release and produced exactly this table with zero errors. The browser-side equivalent is `window.BrickStep.getModels()` for counts and `window.BrickStep.getPlacements()` for the active model.

### Browser checks

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Minimum manual sequence:

1. Let the castle load; confirm "STEP 1 OF 250", zero visible bricks, ghost present.
2. Snap four bricks; reload; confirm step 5 and four bricks.
3. Switch to Titan Mecha; confirm 3,900 and the loader; switch back and confirm the castle step is preserved.
4. Toggle Finished preview; confirm all pieces and unchanged step; toggle back.
5. Explode to 60%; confirm layers separate and snapping is blocked; return to 0.
6. Enter authoring; stack a brick, rotate, undo, export; reload and import the custom file.
7. Solve the last step of the 250 castle; confirm the completion card and confetti.
8. At 390 px wide, confirm no horizontal overflow and the viewport sits above the controls.

The exact results for this release, including what was only reasoned rather than run, are in [TESTING](TESTING.md).

## 8. What was tried and rejected

| Attempt | Outcome / resolution |
| --- | --- |
| 250-piece castle only | Shipped first, then extended; the 250 build and its three modules remain the default preset |
| Presets generated eagerly at boot | Rejected; a 3,900-piece placement array plus meshes for every model wastes memory. `loadPresetModel` generates one at a time |
| 1,000–2,000-piece request | Delivered as Aurora Shuttle (1,099) and Neon Wyrm (1,336), plus the larger mega set |
| 3,000–5,000-piece request | Delivered 3,300–3,900. The top was not pushed to 5,000; the verified set stops at 3,900 |
| Neo Megacity at 3,500 pieces | Generator repeatedly threw `Overlap at …`; the sculpt was reworked (tail, street lights, bridge) and the verified count settled at 3,317 |
| `fillRect('2x4p','2x2p', 20, 15, 4, 3, …)` | Threw `fillRect needs even dimensions: 4x3`; changed to `4×2` |
| Generators that missed their target | `finishMega` adds a plinth ring only where cells are free, so it reaches the target without overlapping; `finish` then asserts module coverage |
| Raising `InstancedMesh.count` after colouring | Produced `GL_INVALID_OPERATION: glDrawArraysInstanced: Vertex buffer is not big enough`; fixed by allocating at full capacity, colouring every instance, then setting `count = 0` |
| Re-fitting the authoring camera only after a tween | Screenshots and first paint caught the wrong view; authoring/exit now fit immediately (`fitAuthoringView(true)`, `fitCameraToModel(..., {immediate: true})`) |
| Import harness clicking a missing test element | The harness reported `Cannot read properties of null (reading 'click')`; it was a test-page bug, not an app path. Import was re-verified through the file input and the `window.BrickStep.importJSON` API |
| `placedMatrix` as the restore source | Rejected in practice; restore uses the deterministic generator + `activeStep`, while the matrix remains a human-readable audit of visible bricks |
| A module/tag release | Not done. The repository has no tag; `APP.version = '2.0.0'` is the app version and `CHANGELOG.md` is the history |

## 9. Honest deviations and unfinished parts

| Item | State |
| --- | --- |
| 5,000-piece models | Not built; largest is 3,900 |
| Offline use | Not supported; Three.js and OrbitControls come from CDNs |
| Localisation | English only; the opening brief's "Vocabulary Lab" name has no corresponding feature |
| Browser coverage | Headless Chrome only; Safari, Firefox, real phones, touch and screen readers are expected but not formally verified |
| Hardware FPS | Live counter exists; no sustained 60 FPS benchmark on a named GPU |
| Audio | Synthesized and gesture-gated; no audible or spectral test |
| Save fidelity | `placedMatrix`/`placedBricks` are not replayed; a save restores a step, not arbitrary brick edits |
| Import validation | Custom bricks are sanitized; progress files are clamped to a known model and step, not signature-checked |
| Accessibility | Labelled canvas and buttons, but no per-brick focus model or camera keyboard control |
| Git release | No tag or GitHub Release; Pages serves `main` directly |
| Custom domain | None; canonical URL is the `github.io` project page |

## 10. Where to change what

| Change | Files |
| --- | --- |
| Preset shape, modules, counts | `script.js` `ModelBuilder`, the matching `build*` function, `PRESET_MODELS` |
| Brick dimensions, studs, tubes | `BRICK_TYPES`, `createBrickGeometry`, `HUD` `BRICK_WIDTHS` |
| Palette | `COLORS`, CSS tokens in `style.css` |
| Camera framing and explode | `computeModelBounds`, `fitCameraToModel`, `explodeOffset` |
| Step/snap/ghost behaviour | `snapCurrent`, `prevStep`, `updateGhost`, `updateBuiltinInstances` |
| Authoring | `setAuthoring`, `computeAuthoringHover`, `placeAuthoringAtHover`, `sanitizeCustomBricks` |
| Persistence and imports | `cloneDefaultState`, `sanitizeState`, `saveStateNow`, `applyImportedData` |
| Layout/responsive | `style.css` media queries |
| Verification | `scripts/check.mjs` |
| Documentation | this file, [ARCHITECTURE](ARCHITECTURE.md), [TESTING](TESTING.md), [DEPLOYMENT](DEPLOYMENT.md), [AGENTS](../AGENTS.md) |
