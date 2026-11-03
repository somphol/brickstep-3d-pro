# Attribution

## Origin

This skill was distilled from **BrickStep 3D Pro**, a multi-model brick assembly studio built in one OpenCode session with DeepSeek V4.1 Flash.

- Live: <https://somphol.github.io/brickstep-3d-pro/>
- Source: <https://github.com/somphol/brickstep-3d-pro>
- App version at packaging: `2.0.0`
- Licence of the source app: MIT (see the repository `LICENSE`)

The original brief asked for a 250-piece Lego assembly studio with `InstancedMesh`, sub-assembly modules, ghost snapping, explode view, authoring, and local JSON persistence. Later requests added multiple presets, lazy one-at-a-time loading, a finished-model preview, and ten 3,000+ piece showpieces.

## Reused

- `assets/template/index.html`, `style.css` and `script.js` are the released application source, copied byte for byte. No screenshots, audio files, generated images or third-party assets are included.
- The application loads Three.js r128 and OrbitControls from public CDNs at runtime. Those libraries are **not** redistributed in this skill and remain under their own licences (MIT for Three.js).

## New in this skill

- `SKILL.md`, `ATTRIBUTION.md` and the three reference documents.
- The extracted build order, coordinate and step contracts, instancing recipe, failure log, verification matrix and release guidance.
- No application behaviour was changed when the template was packaged.

## Licence status

The app source and this skill documentation are MIT. The skill does not relicense Three.js or any other third-party work. There are no brand logos, proprietary brick models, credentials, transcripts or personal data in the skill.
