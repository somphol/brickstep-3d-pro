# Method

The order that works, the contracts that break silently, and the recipes that are hard to infer from the finished app.

## 1. Build order

1. **Choose the model grammar first.** Decide brick types, board sizes, and the step list shape. Every later feature indexes by step.
2. **Write the generator and its validator before the renderer.** A placement list with a broken order or overlapping cells cannot be rescued by UI work.
3. **Build the instanced renderer against one small model.** Confirm colours, shadows and counts before generating thousands of bricks.
4. **Add state and restore.** `modelId + activeStep` must survive reload before you add more models.
5. **Add the manual layer.** Ghost, snap, modules, scrubber, completion.
6. **Add views.** Finished preview and explode are read-only presentations; do not entangle them with the save state.
7. **Add authoring.** It is a second board and a second occupancy model; keep it isolated.
8. **Add file import/export and sanitize every field.**
9. **Add the static checker, docs and deploy.** The checker is part of the release, not an afterthought.

## 2. Units and coordinates

```text
CELL = 1           one stud pitch
PLATE_H = 0.4      one plate
brick h = 1.2      three plates
BASE_Y = 0.15      brick bottom above the plate top
```

A placement is `{ step, type, gx, gz, y, rot, color, colorName, module }`:

- `gx`, `gz` are integer cells from the board's minimum corner. `x` increases along one horizontal axis, `z` along the other.
- `y` is an integer plate layer, not a world coordinate.
- `rot` is `0` or `90`; `90` swaps width and depth but keeps `gx/gz` as the minimum corner.
- World placement is centred on the board:

```js
function worldX(gx, w) { return (gx + w / 2 - GRID / 2) * CELL; }
function worldZ(gz, d) { return (gz + d / 2 - GRID / 2) * CELL; }
const worldY = p.y * PLATE_H + BASE_Y;
```

Changing `GRID` after placements exist moves every brick. Set the board size before generating and before adding instances.

### Occupancy

`ModelBuilder.add` marks every cell the brick covers:

```text
for x in [gx, gx + footprint.w)
  for z in [gz, gz + footprint.d)
    for y in [p.y, p.y + round(h / PLATE_H))
      key = `${x}|${y}|${z}`
```

`y` is in plate units, so a 1.2-high brick occupies three layers. A plate occupies one. This is the only reliable overlap test; comparing bounding boxes per step is not enough when bricks interlock.

## 3. Step and module contract

- Placements are pushed in manual order and `step` is assigned as `placements.length + 1`.
- A module is a contiguous range. `finish` rejects a module that starts anywhere other than the previous end + 1, and rejects a final gap.
- The HUD, scrubber and restore all use `activeStep`. At step N, N−1 bricks are visible and the Nth is the ghost. Do not "show N bricks" at step N or the manual will appear one step ahead.
- Completion is a separate boolean. Set `completed = true` on the final snap and keep `activeStep` at the final step; `getPlacedCount()` returns the full count when complete.
- Preview is a separate transient boolean. It returns the full visible count but must not touch `activeStep` or `completed`.

## 4. Writing a generator

```js
function buildMyModel(meta) {
  const b = new ModelBuilder(48);              // board size

  b.module('base', 'Base', '▦', '#64748b');
  b.block('2x4b', '2x2b', 8, 8, 24, 16, 3, 0, (i, x, z, layer) => {
    return layer === 2 ? 'gold' : 'slate';
  }, 'base');

  b.module('tower', 'Tower', '▥', '#45d6ff');
  b.ringRect('2x4b', '2x2b', 14, 14, 12, 12, 2, 12, 9, 'steel', 'tower');
  b.fillRect('2x4p', '2x2p', 18, 18, 8, 8, 45, 'white', 'tower');

  return b.finishMega(meta, 1800, 'Display Plinth', '▦', '#64748b', (i, x, z, layer) => {
    return layer === 2 ? 'violet' : (i % 5 === 0 ? 'neonCyan' : 'navy');
  });
}
```

Rules:

- `fillRect` requires even width and depth. A `4×3` call throws `fillRect needs even dimensions: 4x3`.
- `fillRect` chooses orientation by cost (`ceil(w/4)*(d/2)` versus `(w/2)*(d/4)` when `d % 4 === 0`). A rotated 2×4 is added with `rot: 90`.
- `block` uses `fillRect` for every layer; `ringRect` builds four walls, so its inner dimensions must stay even.
- `finishMega` only fills the outer band on three layers and skips occupied cells. If the target is unreachable in that band, the count will be short; either make the plinth band larger or adjust the sculpt, then lock the real count.
- Use explicit target counts and assert them. The metadata `pieceCount` is what the UI promises.

## 5. Instancing recipe (r128)

The failure is subtle: `InstancedMesh` sizes `instanceColor` from `this.count` on the first `setColorAt`. If `count` is 0 or smaller than the number of colours, the GPU buffer is undersized and the draw call fails.

```js
// built-in batch
const list = placements.filter((p) => p.type === type);
const mesh = new THREE.InstancedMesh(geometryCache[type], brickMaterial, list.length);
mesh.count = list.length;                       // capacity while colouring
for (let i = 0; i < list.length; i++) mesh.setColorAt(i, linearColor(list[i].color));
if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
mesh.count = 0;                                 // hide until the step rises

// visible update
mesh.count = count;                             // never > list.length
for (let i = 0; i < count; i++) mesh.setMatrixAt(i, placementMatrix(list[i]));
mesh.instanceMatrix.needsUpdate = true;
```

- `frustumCulled = false` avoids a stale bounding sphere hiding the model when instances move.
- One mesh per brick type keeps draw calls small. Do not create one mesh per brick.
- Geometry is merged once per type; do not merge or dispose it during a step change.
- On model switch, set `count = 0`, remove and dispose the old meshes, then clear the registry. Do not leave empty batches in the scene.

## 6. Ghost and snapping

- Reuse one ghost group: body mesh, outline box, floor ring, beam, beacon. Swap only geometry and material colour.
- Guided ghost position is the current placement; authoring ghost position is the hovered stack top.
- Raycast the baseplate plane for target proximity; a direct ghost raycast is convenient but misses near-target clicks. The reference accepts both: `hitsGhost(event) || clickNearTarget(event)`.
- Snap is idempotent in intent: it advances one step and never edits the placement list. If the build is complete, preview is on, or explode is above 0, refuse with a toast.
- A 90° preview rotation is visual only. The instruction orientation is authoritative; snapping resets the visual offset.

## 7. Lazy model loading

```text
click card
  → guard: same model? loading?
  → token = ++modelLoadToken; pendingModelId = id; show loader
  → setTimeout(70 ms)
      → token stale? return
      → data = meta.generate()            // may throw
      → unloadActiveModel()               // dispose old batches
      → replace activeModel + metadata count
      → restore per-model activeStep/completed
      → setBaseplateSize(meta.plateSize)
      → buildInstancesForActiveModel(); buildModuleList(); updateAll()
      → fitCameraToModel(); save
```

The token prevents a fast double-click from applying an older generation after a newer one. On generation error, keep the previous model and show a toast; never half-apply a new board.

## 8. Camera and explode

```text
vFov = fov·π/180
hFov = 2·atan(tan(vFov/2)·max(0.35, aspect))
fitH = (size.y/2)/tan(vFov/2)
fitW = (max(size.x, size.z)/2)/tan(hFov/2)
distance = max(fitH, fitW)·1.28 + 5
```

- Compute bounds from placements, not from the plate; tall towers and long ships need different distances.
- Include the explode offset when the explode slider is released, otherwise the top layer leaves the frame.
- A per-model `viewDir` is useful when the default three-quarter view hides the subject's face or wings.
- A camera tween must disable controls, interpolate position and target together, and re-enable controls at the end.
- Explode offset should grow with height and vary per step so coincident layers separate visually: `(percent/100)·(1.4 + y·0.17 + (step % 9)·0.11)`.

## 9. State and restore

Persist:

```json
{
  "version": "2.0.0",
  "modelId": "titan-mecha",
  "activeStep": 400,
  "completed": false,
  "mode": "guided",
  "customBricks": [],
  "modelProgress": { "titan-mecha": { "activeStep": 400, "completed": false } },
  "explode": 0,
  "sound": true,
  "authorType": "2x4b",
  "authorColor": "#3f7fbf",
  "authorRot": 0
}
```

- Debounce writes (180 ms) and flush on `visibilitychange` / `beforeunload`.
- Clamp every numeric field during load. A corrupt or unknown model id falls back to the default.
- Rebuild `modelProgress` only for known model ids; drop unknown keys.
- Store custom bricks separately and sanitize before use.
- The save file may carry a human-readable matrix, but restore should use the deterministic generator + step. If the product later allows arbitrary edits, add a real replay format.

## 10. Authoring isolation

- Use a fixed board (`24×24`) and a fixed cap (`250`), regardless of the active preset.
- Hide preset batches while authoring; show custom batches only in authoring.
- `getTopAtFootprint` returns the highest occupied plate layer under the footprint; placement sits on top of it.
- `customPlacementFits` must test the whole 3D cell set, not just the top layer.
- Clear both `authoringHover` and the ghost when leaving authoring.
- On exit, rebuild the preset plate size, fit its camera, and restore the saved guided step.
- Import sanitization: valid type, finite integer cell, inside the grid, `y + height <= 120`, no overlap, cap 250. Skip bad entries; do not throw away the whole file.

## 11. Performance and memory

- One generated model at a time is the main memory control. Metadata and generator functions are cheap; placement arrays and instance matrices are not.
- Cap pixel ratio at 2.
- Throttle explode-driven matrix rebuilds through `requestAnimationFrame`.
- The render loop is continuous because the ghost and FPS counter animate; keep per-frame work to controls, ghost uniforms, effects and one render.
- When unloading, dispose instance buffers if the Three.js version supports it; always remove from the scene and clear the registry.
- Headless software WebGL is much slower than a hardware browser. Do not use headless screenshots as an FPS benchmark.

## 12. UI and accessibility minimums

- Every action available by canvas gesture also needs a button or keyboard shortcut.
- `Space` must not double-fire when a button or link has focus.
- Ignore shortcuts while a text field or select is focused; always allow `Escape` to close dialogs.
- Announce transient status in an `aria-live` toast.
- Give the canvas an `aria-label` and `role="img"` at minimum; document that per-brick focus is not implemented.
- Test at 390 px wide; the viewport should precede the controls and the page must not scroll horizontally.
