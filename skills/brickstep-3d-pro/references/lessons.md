# Lessons

Every row below is a failure that actually happened while building the reference app, or a trap that the finished code is deliberately shaped to avoid. Check new work against this list.

## Generation and counts

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Overlap at 23\|66\|12 for 2x2b step 1336` | Neon Wyrm tail bricks were placed at odd `z` offsets, colliding with the body | Move the tail sequence onto the free even cells (`[0,2,4,6,8,10]`) |
| `Overlap at 2\|1\|2 for 1x2b step 265` | Neo Megacity street lights ran into the board-edge blocks | Start street loops farther in and step by 4 (`bx = 4; bx < 43`) |
| `Overlap at 17\|109\|20 for 2x4p step 2028` | A skybridge crossed an occupied tower layer | Change the bridge footprint/position after checking occupancy |
| `Overlap at 24\|1\|32 …` / `24\|1\|29` / `32\|1\|28` | Street-light coordinates duplicated another footprint | Move the offending light to a free cell (`36,27` was one step) |
| `fillRect needs even dimensions: 4x3` | `fillRect` was called with an odd depth | Use an even rectangle (`4×2`) or place the odd row with `add` |
| Generator returns fewer pieces than `pieceCount` | Target sculpt does not fill enough volume, or plinth band is too small | Adjust the sculpt or the plinth fill, then set metadata to the real verified count |
| Neo Megacity expected 3,500, produced 3,317 | The 3,500 target was arbitrary; the sculpt stabilised at 3,317 | Lock metadata to the verified generation count, not the wish |
| Titan Mecha / Eiffel Tower "Could not generate … Keeping the current model" | An early generator threw during construction, so `loadPresetModel` correctly retained the previous model | Fix the generator; do not swallow the error or leave a half-loaded board |
| Module starts at the wrong step | A module was opened after placements from another module | Keep `b.module(...)` calls in placement order; `finish` asserts coverage |
| A model loads but the last step is missing | `completed` was set without matching the real count, or the final snap advanced past the end | Use `wasFinal = activeStep >= pieceCount` and keep `completed` separate |

**Rule:** add a preset only with a fresh audit — exact count, zero out-of-bounds, zero duplicate `x|y|z` cells, contiguous modules. A visually plausible model with an overlap is not done.

## Instancing and WebGL

| Symptom | Cause | Fix |
| --- | --- | --- |
| `GL_INVALID_OPERATION: glDrawArraysInstanced: Vertex buffer is not big enough` | `setColorAt` sized `instanceColor` from a smaller `count`, then more instances were shown | Allocate the mesh at full capacity, colour every instance, then set `count = 0`; raise count only within capacity |
| First render is black or colours are wrong | Colours were written after `count` was reduced | Colour while `count === list.length`; set `instanceColor.needsUpdate = true` |
| Model disappears when the camera moves | Instanced bounding sphere is stale because instances change | `mesh.frustumCulled = false` |
| Old model still visible after a switch | Old batches were not removed/disposed | `unloadActiveModel` → remove from scene, `count = 0`, dispose, clear registry |
| Authoring colours bleed into preset bricks | Shared material or an undersized authoring colour buffer | Separate batches and the same full-capacity colour ordering; authoring meshes are hidden outside authoring |
| Screenshot is blank | Renderer created without `preserveDrawingBuffer` | Create with `preserveDrawingBuffer: true`, render once before `toDataURL` |

## Step, preview and restore

| Symptom | Cause | Fix |
| --- | --- | --- |
| The manual shows one brick too many at step N | The step was treated as a visible count | Visible = `activeStep − 1`; the Nth placement is the ghost |
| Finished preview changes the saved step | Preview was written into `activeStep` | Keep `previewFinished` transient and never persist it |
| Preview allows snapping or stepping | Buttons/ranges were not disabled in preview | Gate snap, prev/next, scrubber and rotate on `previewFinished` |
| Completion card shows the wrong number | Completion copy was hardcoded for the 250 castle | Read `activeModel.pieceCount`, `activeModel.modules.length` and `meta.name` |
| Reload restores the wrong model or step | State was trusted before clamping, or `modelProgress` was not updated on switch | `rememberActiveProgress()` before switch; clamp to the target model's count |
| Imported progress does not match the visible bricks | The file's matrix was treated as authoritative | Restore the model + step; regenerate deterministically |
| A custom file opens as guided progress | Detection accepted any object with `activeStep` | Custom detection: array, or `type === 'brickstep-custom-model'`, or `steps` with no `activeStep` |
| 251st custom brick appears | Cap checked after insertion, or an import bypassed the guard | Check `customBricks.length >= AUTHOR_MAX` before push and inside import sanitization |
| Custom import drops everything | One bad item threw out the whole import | Skip invalid items; keep the valid prefix up to the cap |

## Camera and layout

| Symptom | Cause | Fix |
| --- | --- | --- |
| Authoring screenshot opens on the old preset view | Authoring/exit used a tween instead of an immediate fit | `fitAuthoringView(true)` and `fitCameraToModel(..., {immediate: true})` on mode changes |
| Exploded top layer leaves the frame | Camera fit used pre-explode bounds | Re-fit on slider `change` with `includeExplode: true` |
| Tall models are cropped | Only width was fitted | Use both vertical and horizontal FOV distances; add margin and pull-back |
| Model looks flat or back-facing | One default view direction for every sculpt | Allow a per-model `viewDir` |
| Mobile page scrolls sideways | Fixed widths in the top bar or sidebar | Breakpoints at 1180 / 900 / 620 / 390; verify `scrollWidth <= innerWidth` at 390 |
| Buttons are unclickable behind the canvas | Overlay layer ordering/pointer events | Keep overlays above the canvas and check `pointer-events` |

## Release and tooling

| Symptom | Cause | Fix |
| --- | --- | --- |
| A model import test reports `Cannot read properties of null (reading 'click')` | The test harness clicked an element that did not exist | Fix the harness; test the real file input or `window.BrickStep.importJSON` |
| Static check passes but the page is broken | The checker does not run WebGL or interactions | Run the browser matrix; do not treat static green as release proof |
| Pages shows the old JS | CDN/browser cache after a push | Wait, hard-reload, compare file size/version |
| `state.json` measurements change in a docs commit | Treating the build record as live data | Leave it historical; annotate instead of rewriting |
| Local links pass on the author's machine but 404 on Pages | Case-sensitive paths or absolute local paths | Use relative, case-exact paths; the checker resolves from the repo root |
| CDN is unavailable | No bundled Three.js | Keep both CDN fallbacks and show a fatal loading message; document the network requirement |

## Process traps

- Do not set a metadata count before the generator proves it.
- Do not "fix" an overlap by deleting the audit or catching the exception.
- Do not generate all presets at boot because it makes switching feel instant.
- Do not make finished preview a persisted mode.
- Do not use a visual rotation as a substitute for the instruction rotation in saved data.
- Do not claim an offline app while loading Three.js from a CDN.
- Do not claim 60 FPS without a measured run on named hardware.
- Do not copy the reference model set unchanged into a new brief; replace the sculpts and re-audit.
