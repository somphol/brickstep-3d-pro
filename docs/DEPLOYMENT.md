# Deployment

## Hosting shape

| Item | Value |
| --- | --- |
| Repository | <https://github.com/somphol/brickstep-3d-pro> |
| Visibility | Public, MIT |
| Default branch | `main` |
| Pages branch / folder | `main` / `/` (repository root) |
| Build type | Classic Pages build from the branch; there is no Pages GitHub Actions workflow |
| Published artefact | the repository files themselves — no build output, no `dist/` |
| Custom domain | none (no `CNAME` file) |
| Canonical URL | <https://somphol.github.io/brickstep-3d-pro/> |
| `.nojekyll` | present at the root (empty file) |

There is no `package.json`, bundler, asset pipeline or deploy script. Pushing `main` is the deployment.

## What is published

- `index.html`, `style.css`, `script.js` — the entire app.
- `docs/`, `skills/`, README, AGENTS and policy files — documentation, publicly readable.
- Screenshots (`screenshot*.png`, `docs/social-card.png`) — README and social-preview assets.
- `robots.txt`, `sitemap.xml`, `LICENSE`, `.nojekyll`, `state.json`, `STATE.md`.

The app still fetches Three.js r128 and OrbitControls from CDNs at runtime. Those libraries are **not** vendored into the repository and are not served by Pages.

## Publish

```bash
cd ~/Projects/brickstep-3d-pro
node scripts/check.mjs
git status --short          # review before staging; do not commit unrelated work
git add -A
git commit -m "docs: add release documentation, reproduction book and skill"
git push origin main
```

Do not force-push. Pages rebuilds automatically after the push.

If Pages is ever disabled, enable it in **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`, then save. No workflow file is required or present.

## Verify the deployment

Wait 30–60 seconds after the push, then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/brickstep-3d-pro/
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/brickstep-3d-pro/style.css
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/brickstep-3d-pro/script.js
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/brickstep-3d-pro/docs/social-card.png
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/brickstep-3d-pro/sitemap.xml
```

All should return `200`. The release check from 2026-11-02 returned `200` for `/` and `script.js`; `script.js` body size was 169,881 bytes.

Load the page and confirm:

1. The loading screen reaches "Ready to build".
2. No `showFatal()` message ("Three.js could not be loaded…").
3. The HUD reports 13 models and the castle at step 1.
4. The browser console has no uncaught exception.

## Caching and propagation

- GitHub Pages serves files through its CDN. This project sets no cache headers, has no service worker and no cache-busting query strings.
- After a deploy, a stale page is usually CDN propagation or a browser cache. Retry after a minute, then hard-reload.
- Because the source is served directly, there is no content-hash filename to invalidate. If users must see a change immediately, changing a query string on the asset is possible but is not used by the release.
- `localStorage` is per-origin and survives deploys. It is not part of the published artefact.

## Rollback

Preferred, history-preserving rollback:

```bash
cd ~/Projects/brickstep-3d-pro
git log --oneline -5
git revert <bad-commit-sha>
git push origin main
```

Pages rebuilds from the revert commit. Do not rewrite `main` or force-push. If the bad change is only in `script.js`, a revert is still preferred over hand-editing the deployed copy, because Pages has no separate release artefact.

Emergency check: the previous commit can be served locally with `git switch --detach <sha>` and `python3 -m http.server 8000`; do not leave the working tree detached.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Loading screen shows "Three.js could not be loaded" | CDN blocked, offline, or both Three.js URLs failed | Check the network; the app has no bundled Three.js |
| "OrbitControls could not be loaded" | Three.js loaded but both OrbitControls URLs failed | Check the jsDelivr/unpkg fallback, then reload |
| Blank viewport after a model switch | WebGL context lost or generation threw | Open the console; the toast should name the model that failed and keep the previous one |
| `GL_INVALID_OPERATION: … Vertex buffer is not big enough` | instance colour buffer was created below capacity | See [ARCHITECTURE](ARCHITECTURE.md#rendering-pipeline); allocate at full capacity before setting `count` |
| 404 on `/` or assets | Pages not built yet, wrong branch/folder, or repository renamed | Wait, check Settings → Pages, then confirm the URLs above |
| Old version still visible | CDN/browser cache | Hard-reload after a minute; verify `script.js` byte size matches the release |
| Progress missing after deploy | Different origin (localhost vs Pages) or storage blocked | Use the same origin; check private mode/content blockers; use Save Progress JSON |
| Social preview image 404 | `docs/social-card.png` missing or renamed | Restore the file; OG/Twitter tags point at the absolute Pages URL |
| Custom domain added later | no `CNAME` today | Add the domain in Pages settings, commit `CNAME`, and update the canonical/OG URLs, sitemap and robots |

## Renaming or moving

If the repository is renamed or moved, update every absolute URL:

- `index.html` — `<link rel="canonical">`, `og:url`, `og:image`, Twitter image.
- `sitemap.xml` and `robots.txt`.
- `README.md`, `AGENTS.md`, `docs/*.md` live links.
- `state.json`, `STATE.md` (historical records — annotate rather than rewriting the measurement).
- GitHub repository homepage field, if it points at the old Pages URL.

Then rerun `node scripts/check.mjs`; it validates local links but cannot validate the live URL.
