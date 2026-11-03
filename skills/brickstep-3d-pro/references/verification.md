# Verification

## The gates

```sh
node --check script.js
node scripts/check.mjs
node ~/.config/opencode/skills/skill-publish/scripts/check-skill.mjs skills/brickstep-3d-pro
```

1. **Syntax** — one file, one parse. It catches nothing semantic, but it is instant.
2. **Static** — required files, template byte-identity, local `src`/`href`, relative Markdown links, every `.js` parse, every `.json` parse.
3. **Skill** — frontmatter, directory naming, token/email/private-key patterns, forbidden build folders.
4. **Browser** — the only proof that WebGL, raycasting, persistence and layout work.

Do not substitute 2 for 4. The static checker is intentionally dependency-free and browser-free.

## Static checks in the reference

`scripts/check.mjs` must print:

```text
OK <n> checks
```

and exit `0`. On failure it prints one `FAIL …` line per problem and exits `1`. It covers:

- `index.html`, `style.css`, `script.js`, `README.md`, `AGENTS.md`;
- `docs/ARCHITECTURE.md`, `docs/REPRODUCTION.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`;
- `scripts/check.mjs`;
- `skills/brickstep-3d-pro/SKILL.md`, `ATTRIBUTION.md`, three references, three template files;
- template copies byte-identical to the three source files;
- every local `src`/`href` in `index.html` (ignores `http(s):`, `data:`, `#`, `mailto:`);
- every relative Markdown link in README, AGENTS and `docs/*.md`, resolved from the file's directory and stripped of anchors;
- `node --check` for all `.js` files, including the template copy;
- `JSON.parse` for all `.json` files.

Expected failure examples:

```text
FAIL file exists: docs/TESTING.md: missing
FAIL index.html local src/href targets: nope.js (missing target: nope.js)
FAIL relative Markdown links: README.md → docs/missing.md (missing target: docs/missing.md)
FAIL JavaScript syntax: script.js: SyntaxError: …
FAIL JSON parsing: state.json: Unexpected token …
```

## Generator audit

The checker does not generate models. Run the pure generator half in Node:

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

let failed = 0;
for (const meta of ctx.M) {
  const out = meta.generate();
  const seen = new Set();
  let oob = 0, overlap = 0;
  for (const p of out.placements) {
    const f = ctx.F(p.type, p.rot);
    const h = Math.round(ctx.B[p.type].h / ctx.P);
    if (p.gx < 0 || p.gz < 0 || p.gx + f.w > meta.plateSize || p.gz + f.d > meta.plateSize) oob++;
    for (let x = p.gx; x < p.gx + f.w; x++)
      for (let z = p.gz; z < p.gz + f.d; z++)
        for (let y = p.y; y < p.y + h; y++) {
          const k = `${x}|${y}|${z}`;
          if (seen.has(k)) overlap++; else seen.add(k);
        }
  }
  const contiguous = out.modules.length > 0 &&
    out.modules[0].from === 1 &&
    out.modules[out.modules.length - 1].to === out.placements.length;
  if (out.pieceCount !== meta.pieceCount || oob || overlap || !contiguous) failed++;
  console.log(meta.id, out.pieceCount, meta.pieceCount, out.modules.length, oob, overlap, contiguous);
}
process.exit(failed ? 1 : 0);
```

Reference output — every row must match, with `oob 0`, `overlap 0`, `true`:

```text
castle-workshop-250    250   250   3  0 0 true
aurora-shuttle        1099  1099   6  0 0 true
neon-wyrm             1336  1336   6  0 0 true
neo-megacity          3317  3317   5  0 0 true
titan-mecha           3900  3900   6  0 0 true
celestial-dragon      3300  3300   6  0 0 true
aurora-dreadnought    3700  3700   6  0 0 true
pirate-galleon        3600  3600   6  0 0 true
eiffel-tower          3900  3900   5  0 0 true
colosseum             3452  3452   5  0 0 true
crystal-citadel       3808  3808   6  0 0 true
solaris-station       3532  3532   5  0 0 true
sun-pyramid           3643  3643   5  0 0 true
```

For a new preset, extend this audit first. Do not start browser work with a failing count.

## Browser matrix

Serve over HTTP so `localStorage` and relative assets behave like production:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

| # | Action | Pass condition |
| --- | --- | --- |
| 1 | Load the default castle | Loading reaches "Ready to build"; no fatal message; `STEP 1 OF 250`; zero visible bricks; ghost visible |
| 2 | Click the ghost / press Space four times | Step 5; four bricks; brick bay shows the fifth brick; progress 1–4% |
| 3 | Reload | Same model, step 5, four bricks; sound and explode settings intact |
| 4 | Click a model card (Titan Mecha) | Loader appears; then 3,900 pieces and step 1 (or saved step); previous castle step preserved on return |
| 5 | Click a second card during loading | Only one model applies; no half-loaded board; no console error |
| 6 | View Mode → Finished | All active pieces visible; HUD says 100%/PREVIEW; saved step unchanged; snap/step controls disabled |
| 7 | Return to Build | Same saved step and visible brick count |
| 8 | Explode 60% | Layers separate; ghost/snap blocked; return to 0 restores assembly and snapping |
| 9 | Rotate preview `R`, then snap | Ghost visually rotates; snapped brick lands at the instruction orientation; step advances once |
| 10 | Jump via scrubber and a module button | Step clamps to 1…count; module start is correct; completion clears |
| 11 | Authoring mode | 24×24 board; preset hidden; ghost follows cursor; click stacks; `R` rotates |
| 12 | Authoring overlap | Placing into an occupied cell is refused with a toast; count does not rise |
| 13 | Authoring undo / clear | Last brick removed; clear asks for confirmation and empties the board |
| 14 | Authoring JSON export | `brickstep_custom_250.json` downloads; reload and import restores count and colours |
| 15 | Save Progress | `brickstep_pro_250.json` downloads with the active model and step; import on a fresh profile restores them |
| 16 | Completion on the 250 castle | Final snap shows the completion card, real count/modules, confetti; reset returns to step 1 |
| 17 | Keyboard | `→/N` snap, `←/P` back, `Space` snap, `R` rotate, `E` explode 0/60, `F` focus, `V` preview, `?` help, `Esc` close |
| 18 | 390 px wide | Viewport above controls; no horizontal overflow; model library scrolls; controls reachable |
| 19 | Console | No uncaught exceptions; no `GL_INVALID_OPERATION` |

### Headless method

The reference build used headless Chrome with temporary profiles and `--dump-dom` pages that seeded `localStorage`, called `window.BrickStep`, and printed JSON into a `<pre>`. Those harness pages were **not committed** and are not part of the release. A minimal command shape:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-first-run --no-default-browser-check \
  --user-data-dir=/tmp/brickstep-profile \
  --window-size=390,900 \
  --virtual-time-budget=20000 \
  --dump-dom "http://127.0.0.1:8000/?v=$(date +%s)"
```

Results observed for the reference release:

- all 13 presets generated with exact counts;
- 390 px layout: `scrollWidth 375` inside a `390` viewport, no overflow;
- preview at step 1 and step 400: visible `3,900`, saved step unchanged, snap/range disabled;
- return from preview at step 400: 399 visible;
- 13 models rendered in headless Chrome without JavaScript errors;
- completion card, custom import/export and per-model progress tested;
- the only Chrome GPU warnings were headless display-link and an early instance-buffer error that was fixed (see `references/lessons.md`).

## What this proves and does not prove

**Proved by the static repo:** files and links exist, JS parses, JSON parses, the skill is well formed, template copies match.

**Proved by the reference audit:** generator counts, bounds, overlaps and module coverage.

**Proved by the reference browser run:** the 19-row matrix above in headless Chrome at desktop and 390 px, with the caveats recorded in the source `docs/TESTING.md`.

**Not proved:** Safari/Firefox, physical phones or touch, audible audio, screen-reader navigation, sustained hardware FPS, WebGL on low-end GPUs, or long-running multi-hour sessions. State those as unverified rather than implying coverage.

## Release gate

```sh
node --check script.js
node scripts/check.mjs
git status --short
git add -A
git commit -m "docs: add release documentation, reproduction book and skill"
git push origin main
```

After the push, wait for Pages and confirm the live root plus `style.css` and `script.js` return `200`. A static check is not a deployment check.
