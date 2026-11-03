# Testing

Status of the release checks as of **2026-11-02**. The app source was not modified by the documentation release; the static and generator checks below were re-run against the released files. A load smoke test was also re-run in headless Chrome, but the full interaction matrix was not re-run for this documentation-only change.

## Summary

| Gate | Command | Result |
| --- | --- | --- |
| JavaScript syntax | `node --check script.js` | **Pass** (no output, exit 0) |
| Static release checks | `node scripts/check.mjs` | **Pass** — `OK 25 checks` |
| Skill validation | `node ~/.config/opencode/skills/skill-publish/scripts/check-skill.mjs skills/brickstep-3d-pro` | **Pass** — 8 files, 0.27 MB |
| Generator audit | Node `vm` harness over the model half of `script.js` | **Pass** — 13 presets, exact counts, 0 out-of-bounds, 0 overlaps, contiguous modules |
| Source/template identity | SHA-256 of three sources vs `assets/template/` | **Pass** — byte-identical |
| Live site | `curl` to `https://somphol.github.io/brickstep-3d-pro/` | **Pass** — HTTP 200; `script.js` 200, 169,881 bytes |
| Browser interaction | Headless Chrome during the build; load smoke re-check on 2026-11-02 | **Pass with gaps** — see matrix |

Environment for the 2026-11-02 checks: macOS, Node v26.13.0, no dependencies installed. The build itself used headless Chrome and a local `python3 -m http.server` on port 8765.

## What was actually run for this release

### Static check

```sh
cd ~/Projects/brickstep-3d-pro
node --check script.js
node scripts/check.mjs
```

`scripts/check.mjs` reported `OK 25 checks`: 18 required-file checks, 3 template byte-identity checks, 1 `index.html` local-reference pass, 1 Markdown-link pass, 1 JavaScript-syntax pass, and 1 JSON pass. It checks every `.js` file (the app plus the template copy) and every `.json` file.

### Generator audit

The pure generation half of `script.js` (`var APP` through `getPresetMeta`) was evaluated in a Node `vm` with no DOM or Three.js. For every preset the audit called `generate()` and checked:

- `placements.length === meta.pieceCount`;
- every brick inside `plateSize` after applying rotation;
- no duplicate `x|y|z` stud cell;
- module ranges start at 1, end at the active count, and are contiguous.

| Preset | Pieces | Modules | Max Y | Out of bounds | Overlaps |
| --- | ---: | ---: | ---: | ---: | ---: |
| Castle Workshop | 250 | 3 | 36 | 0 | 0 |
| Aurora Shuttle | 1,099 | 6 | 90 | 0 | 0 |
| Neon Wyrm | 1,336 | 6 | 102 | 0 | 0 |
| Neo Megacity | 3,317 | 5 | 149 | 0 | 0 |
| Titan Mecha | 3,900 | 6 | 198 | 0 | 0 |
| Celestial Dragon | 3,300 | 6 | 129 | 0 | 0 |
| Aurora Dreadnought | 3,700 | 6 | 105 | 0 | 0 |
| Pirate Galleon | 3,600 | 6 | 168 | 0 | 0 |
| Eiffel Tower | 3,900 | 5 | 296 | 0 | 0 |
| Grand Colosseum | 3,452 | 5 | 84 | 0 | 0 |
| Crystal Citadel | 3,808 | 6 | 126 | 0 | 0 |
| Solaris Station | 3,532 | 5 | 138 | 0 | 0 |
| Sun Pyramid | 3,643 | 5 | 90 | 0 | 0 |

The script for this audit is reproduced in [REPRODUCTION](REPRODUCTION.md#7-verification-procedure) and in the skill's `references/verification.md`. The audit is not committed to the repository.

### Live deployment

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/brickstep-3d-pro/
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' https://somphol.github.io/brickstep-3d-pro/script.js
```

Returned `200` for `/` and `200 169881` for `script.js`. The HTML served was the same 19,901-byte `index.html` present locally.

### Browser smoke re-check

A basic load was re-run for this documentation release with headless Chrome against `python3 -m http.server 8931`, at 1440 × 1000 with a 30 s virtual-time budget. Observed DOM state:

- `<title>` = "BrickStep 3D Pro — Multi-Model Assembly Studio";
- `#loadingText` = "Ready to build"; `#loadingScreen` carried `loaded hidden`;
- `#loadingError` remained `hidden`;
- `#libraryStatus` = "13 MODELS · 1 ACTIVE"; `#modelName` = "Castle Workshop";
- `#stepLabel` = "STEP 1 OF 250"; `#visibleValue` = "0"; `#drawValue` = "0".

This proves the page, CSS, CDN libraries and default generation work in a real browser at that size. It does **not** re-run the full interaction matrix below.

## What was run during the original build

These results are recorded in the build session transcript. They are not re-executed by `scripts/check.mjs`, and the documentation-only commit does not change their subject matter.

| Check | Method | Observed result |
| --- | --- | --- |
| All 13 presets generate | Headless Chrome test page calling each `PRESET_MODELS[i].generate()` and auditing placements | 13/13 exact counts; `outOfBoundsCount 0`; `overlapCount 0`; modules 3–6; no JS errors |
| Model switch / lazy load | Load each preset in sequence, inspect state and memory | Only the selected model's placements and batches retained; memory reported ~23.7 MB used at the end of the preset run |
| Finished preview | Steps 1 and 400 on Titan Mecha | `visible 3,900`, label `FINISHED PREVIEW · ALL 3,900 PIECES`, saved step unchanged, snap/range disabled; return at step 400 showed 399 bricks |
| Explode view | Slider 0/70%; camera release | Bricks separate; camera re-fits the exploded bounds; snapping blocked above 0 |
| Completion | Snap the 250th castle piece | Completion overlay visible, `BUILD COMPLETE · 250 OF 250`, dynamic count/modules, confetti |
| Reset build | Completion → Start Over | Back to step 1, no completion overlay |
| Custom import/export | Authoring JSON round trip | 3-step custom file restored as `mode: authoring`, count 3 |
| Progress import | JSON with `activeStep: 100`, `explode: 20`, `sound: false` | Restored step, explode and sound |
| Authoring on a 3,900-piece preset | Enter authoring, place bricks, exit | 24×24 board, preset hidden, clean return to the preset |
| Responsive layout | Headless Chrome at 390 px | `innerWidth 390`, `scrollWidth 375`, no overflow; library 178 px tall, scrollable |
| Screenshots | Headless Chrome captures | Hero, instructions, authoring and explode images regenerated and reviewed |
| Console | All model loads | No uncaught app errors; only Chrome headless display/GPU warnings |

The initial build also hit generator overlaps and an instanced-buffer error; those failures and fixes are recorded in [the skill lessons](../skills/brickstep-3d-pro/references/lessons.md) and in [REPRODUCTION](REPRODUCTION.md#8-what-was-tried-and-rejected).

## Manual test matrix

Status legend:

- **Verified (build)** — exercised during the original headless Chrome session and recorded in the transcript.
- **Verified (static)** — proved by source review / the static check in this release.
- **Manual only** — a human should run it; no automation exists.
- **Not verified** — no evidence.

| Area | Test | Status |
| --- | --- | --- |
| Desktop load | Loading screen → studio; no fatal error | Verified (build), headless Chrome |
| Desktop load | 13 model cards; active model card highlighted | Verified (build) |
| Guided build | Snap via ghost click, Space, button and drag | Verified (build); source-reviewed |
| Guided build | Prev/next, scrubber, module jump | Verified (build) for completion/reset; step arithmetic verified (static) |
| Guided build | Rotate preview then snap | Source-reviewed; the visual rotation does not alter placement (static) |
| Completion | Final piece → overlay, dynamic count | Verified (build) |
| Preview | All pieces shown, saved step unchanged | Verified (build), steps 1 and 400 |
| Explode | 0 → 60 → 0, camera fit, snap blocked | Verified (build) |
| Model switch | Castle → Titan → castle, per-model step | Verified (build) |
| Model switch | Double-click during load does not half-apply | Source-reviewed (token guard), not automated |
| Persistence | Reload restores step/model/settings | Verified (build) |
| Persistence | Corrupt storage falls back to defaults | Source-reviewed (`try/catch` → defaults), not automated |
| Persistence | `localStorage` blocked/private mode | Source-reviewed (writes are swallowed); not tested in a real private window |
| Files | Save Progress download and re-import | Verified (build) for progress/custom JSON |
| Authoring | Place, stack, rotate, undo, clear, export | Verified (build) for place/export; undo/clear source-reviewed |
| Keyboard | `→ ← N P Space R E F V ? Esc` | Source-reviewed in `bindEvents`; not automated |
| Mobile layout | 390 px no horizontal overflow | Verified (build), headless Chrome |
| Mobile touch | Tap ghost, pinch/pan, drag from bay | **Not verified** on a physical device |
| Audio | Snap/click/completion audible | **Not verified** audibly; only code paths reviewed |
| Browsers | Safari, Firefox | **Not verified** |
| Performance | Sustained 60 FPS on hardware | **Not verified**; headless software rendering is not a benchmark |
| Accessibility | Screen reader, keyboard camera, per-brick focus | **Not verified**; the canvas is labelled `role="img"` but has no per-brick focus model |
| Screenshot PNG | Download a PNG of the viewport | Source-reviewed; not asserted in a test |
| Fullscreen | Enter/exit fullscreen | Source-reviewed; not asserted |
| Custom domain | n/a — no CNAME | Verified (static) |

## Static-only checks that do not prove behaviour

`scripts/check.mjs` proves file presence, link resolution, parseability and template identity. It does **not** prove:

- that WebGL creates a context;
- that Three.js or OrbitControls loaded from the CDN;
- that a click hits the ghost;
- that state restores correctly;
- that audio is audible;
- that the layout fits a device;
- that frame rate is acceptable.

Those are the browser matrix's job. Do not report a green static run as a full release verification.

## Known testing gaps

1. **Safari/Firefox and real mobile devices** — no automated or recorded run. The code uses standard WebGL, Canvas, DOM and Web Audio APIs, but that is an expectation, not evidence.
2. **Audio** — browsers require a user gesture; headless runs cannot confirm audible output.
3. **FPS** — the app shows a live counter, but no named-hardware measurement exists. The 60 FPS line in the READMEs is a target, not a benchmark.
4. **Persistence edge cases** — quota errors, private windows and cross-origin `file://` storage are handled by `try/catch`, but not exercised in a real restricted browser.
5. **Import fuzzing** — sanitization is bounded by `sanitizeCustomBricks` and `sanitizeState`, but there is no property-based fuzz test.
6. **Accessibility** — no screen-reader, contrast or focus-order audit. The canvas is not a per-brick accessible tree.
7. **Long sessions** — no multi-hour memory/GPU leak test.
8. **Pages settings** — the live site was verified by URL, not by reading the repository's Pages settings through an authenticated API (the unauthenticated endpoint returned `404`).

## Re-running the release checks

```sh
cd ~/Projects/brickstep-3d-pro
node --check script.js
node scripts/check.mjs
node ~/.config/opencode/skills/skill-publish/scripts/check-skill.mjs skills/brickstep-3d-pro
shasum -a 256 index.html style.css script.js
```

Expected: no syntax output; `OK 25 checks`; skill `OK`; hashes matching [REPRODUCTION](REPRODUCTION.md#4-reference-environment). If a source file changes, the template copies and the source hashes in the docs must change in the same commit.
