/* ═══════════════════════════════════════════════════════════════════════════
   BRICKSTEP 3D PRO · 250-Piece Lego Assembly Studio
   Vanilla ES6 · Three.js r128 · InstancedMesh renderer · procedural bricks
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────────
     APP CONSTANTS
     ───────────────────────────────────────────────────────────────────────── */

  var APP = {
    name: 'BrickStep 3D Pro',
    version: '1.0.0',
    storageKey: 'brickstep_pro_250_v1',
    modelId: 'castle-workshop-250',
    modelName: 'Castle Workshop',
    totalSteps: 250
  };

  var CELL = 1;             // one stud pitch in world units
  var PLATE_H = 0.4;        // one plate height
  var BASE_Y = 0.15;        // brick bottom sits above the baseplate studs
  var GRID = 24;            // baseplate is 24 × 24 studs
  var BUILD_OFFSET = 4;     // built-in castle is 16 × 16, centred on the 24 × 24 plate

  var BRICK_TYPES = {
    '2x4b': { w: 4, d: 2, h: 1.2, kind: 'brick', label: '2×4 Brick' },
    '2x2b': { w: 2, d: 2, h: 1.2, kind: 'brick', label: '2×2 Brick' },
    '1x4b': { w: 4, d: 1, h: 1.2, kind: 'brick', label: '1×4 Brick' },
    '1x2b': { w: 2, d: 1, h: 1.2, kind: 'brick', label: '1×2 Brick' },
    '2x4p': { w: 4, d: 2, h: 0.4, kind: 'plate', label: '2×4 Plate' },
    '2x2p': { w: 2, d: 2, h: 0.4, kind: 'plate', label: '2×2 Plate' },
    '1x4p': { w: 4, d: 1, h: 0.4, kind: 'plate', label: '1×4 Plate' },
    '1x2p': { w: 2, d: 1, h: 0.4, kind: 'plate', label: '1×2 Plate' }
  };

  var COLORS = {
    charcoal: { name: 'Charcoal', hex: '#343a46' },
    slate: { name: 'Slate', hex: '#5a6b82' },
    steel: { name: 'Steel Blue', hex: '#3f7fbf' },
    sky: { name: 'Sky Blue', hex: '#57b8e8' },
    navy: { name: 'Deep Navy', hex: '#24446b' },
    sand: { name: 'Sandstone', hex: '#d9a066' },
    tan: { name: 'Warm Tan', hex: '#c18445' },
    cream: { name: 'Cream', hex: '#f0d6ad' },
    red: { name: 'Brick Red', hex: '#c0392b' },
    coral: { name: 'Coral', hex: '#e05a47' },
    gold: { name: 'Gold', hex: '#f1c40f' },
    orange: { name: 'Orange', hex: '#e67e22' },
    white: { name: 'Off White', hex: '#e8eef2' },
    green: { name: 'Leaf Green', hex: '#27ae60' },
    violet: { name: 'Royal Violet', hex: '#8e6bd8' },
    black: { name: 'Black', hex: '#22262e' }
  };

  var MODULES = [
    { id: 'foundation', name: 'Foundation', icon: '▦', from: 1, to: 64, color: '#64748b' },
    { id: 'walls', name: 'Walls & Towers', icon: '▥', from: 65, to: 166, color: '#3f7fbf' },
    { id: 'crown', name: 'Keep & Crown', icon: '♛', from: 167, to: 250, color: '#f1c40f' }
  ];

  var BUILTIN_PLACEMENTS = buildCastleModel();

  /* ─────────────────────────────────────────────────────────────────────────
     DOM CACHE
     ───────────────────────────────────────────────────────────────────────── */

  var els = {};

  function cacheDom() {
    var ids = [
      'app', 'viewportShell', 'viewport', 'modelName', 'modelMeta', 'stepLabel',
      'progressPct', 'progressTrack', 'progressBar', 'progressGlow', 'moduleBadge',
      'moduleBadgeText', 'stepNumberChip', 'brickVisual', 'brickName', 'brickColorName',
      'brickDims', 'bayHint', 'btnSnap', 'btnPrev', 'btnRotate', 'btnNext', 'stepRange',
      'scrubberStep', 'moduleList', 'moduleCount', 'explodeSlider', 'explodeValue',
      'btnResetView', 'btnFocus', 'authoringState', 'btnAuthoring', 'authoringTools',
      'authorType', 'authorColor', 'btnUndo', 'btnClearCustom', 'btnExportCustom',
      'authoringCount', 'btnSound', 'soundIcon', 'btnSave', 'btnLoad', 'btnHelp',
      'btnFullscreen', 'btnScreenshot', 'dropHint', 'toast', 'completeOverlay',
      'confettiLayer', 'btnCelebrate', 'btnResetBuild', 'loadingScreen', 'loadingText',
      'loadingBar', 'loadingError', 'fileInput', 'helpModal', 'btnCloseHelp',
      'fpsValue', 'visibleValue', 'drawValue', 'qualityValue', 'orientationHint',
      'modelCredit'
    ];

    ids.forEach(function (id) {
      els[id] = document.getElementById(id);
    });

    els.modelIcon = document.querySelector('.model-icon');
    els.moduleBadgeDot = document.querySelector('.module-badge-dot');
    els.studs = Array.prototype.slice.call(document.querySelectorAll('.brick-visual .stud'));
    els.audio = null;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     SMALL UTILITIES
     ───────────────────────────────────────────────────────────────────────── */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pad3(value) {
    var n = String(value);
    while (n.length < 3) n = '0' + n;
    return n;
  }

  function cloneDefaultState() {
    return {
      version: APP.version,
      modelId: APP.modelId,
      activeStep: 1,
      completed: false,
      mode: 'guided',
      customBricks: [],
      explode: 0,
      sound: true,
      authorType: '2x4b',
      authorColor: '#3f7fbf',
      authorRot: 0
    };
  }

  function getColorName(hex) {
    var target = String(hex || '').toLowerCase();
    var keys = Object.keys(COLORS);
    for (var i = 0; i < keys.length; i++) {
      if (COLORS[keys[i]].hex.toLowerCase() === target) return COLORS[keys[i]].name;
    }
    return 'Custom ' + target.toUpperCase();
  }

  function worldX(gx, w) {
    return (gx + w / 2 - GRID / 2) * CELL;
  }

  function worldZ(gz, d) {
    return (gz + d / 2 - GRID / 2) * CELL;
  }

  function footprint(type, rot) {
    var def = BRICK_TYPES[type];
    return {
      w: rot === 90 ? def.d : def.w,
      d: rot === 90 ? def.w : def.d
    };
  }

  function typeLabel(type) {
    return BRICK_TYPES[type] ? BRICK_TYPES[type].label : type;
  }

  function isHexColor(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  }

  function linearColor(hex) {
    return new THREE.Color(hex).convertSRGBToLinear();
  }

  function setLinearColor(target, hex) {
    target.set(hex).convertSRGBToLinear();
    return target;
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
  }

  function downloadDataUrl(filename, dataUrl) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     250-PIECE CASTLE GENERATOR
     Foundation → Walls & Towers → Keep, Roof & Crown
     ───────────────────────────────────────────────────────────────────────── */

  function buildCastleModel() {
    var list = [];
    var O = BUILD_OFFSET;

    function add(type, gx, gz, y, rot, colorKey) {
      var def = BRICK_TYPES[type];
      if (!def) throw new Error('Unknown brick type: ' + type);

      var fp = footprint(type, rot);
      if (gx < 0 || gz < 0 || gx + fp.w > GRID || gz + fp.d > GRID) {
        throw new Error('Brick out of bounds: ' + type + ' @ ' + gx + ',' + gz);
      }

      var color = COLORS[colorKey] || COLORS.steel;
      list.push({
        step: list.length + 1,
        type: type,
        gx: gx,
        gz: gz,
        y: y,
        rot: rot,
        color: color.hex,
        colorName: color.name,
        module: 'foundation'
      });
    }

    /* ── Module 1 · Foundation · steps 1–64 ──────────────────────────────── */
    var foundationPalette = ['slate', 'steel', 'charcoal', 'navy'];

    // Layer 1 — 2×4 bricks, long edge along X. 32 pieces.
    // Start at the near edge of the plate so step 1 is immediately visible.
    var fi = 0;
    for (var z = O + 14; z >= O; z -= 2) {
      for (var x = O; x < O + 16; x += 4) {
        add('2x4b', x, z, 0, 0, foundationPalette[fi % foundationPalette.length]);
        fi++;
      }
    }

    // Layer 2 — rotate 90° so the vertical seams are bonded. 32 pieces.
    fi = 0;
    for (x = O; x < O + 16; x += 2) {
      for (z = O + 12; z >= O; z -= 4) {
        add('2x4b', x, z, 3, 90, foundationPalette[(fi + 1) % foundationPalette.length]);
        fi++;
      }
    }

    /* ── Walls · steps 65–134 · 5 courses × 14 bricks = 70 ───────────────── */
    var wallPalette = ['sand', 'cream', 'tan', 'sand', 'coral'];
    for (var layer = 0; layer < 5; layer++) {
      var wy = 6 + layer * 3;
      var wallColor = wallPalette[layer % wallPalette.length];

      // South + north walls (16 studs long, 2 studs thick)
      for (var i = 0; i < 4; i++) {
        add('2x4b', O + i * 4, O + 14, wy, 0, i === 3 ? 'cream' : wallColor);
        add('2x4b', O + i * 4, O, wy, 0, wallColor);
      }

      // West + east walls (12 studs between corner posts, 2 studs thick)
      for (i = 0; i < 3; i++) {
        add('2x4b', O, O + 2 + i * 4, wy, 90, i === 1 ? 'tan' : wallColor);
        add('2x4b', O + 14, O + 2 + i * 4, wy, 90, i === 1 ? 'tan' : wallColor);
      }
    }

    /* ── Corner towers · steps 135–166 · 4 towers × 4 courses × 2 = 32 ───── */
    var towerOrigins = [
      [O + 12, O + 12], [O, O + 12], [O + 12, O], [O, O]
    ];
    var towerPalette = ['red', 'coral', 'gold', 'red'];

    towerOrigins.forEach(function (t, towerIndex) {
      for (var l = 0; l < 4; l++) {
        var ty = 21 + l * 3;
        var tc = towerPalette[(l + (towerIndex % 2)) % towerPalette.length];
        add('2x4b', t[0], t[1], ty, 0, tc);
        add('2x4b', t[0], t[1] + 2, ty, 0, l === 2 ? 'gold' : tc);
      }
    });

    /* ── Central keep · steps 167–198 · 8 × 8 × 4 courses = 32 ──────────── */
    var keepPalette = ['steel', 'sky', 'white', 'steel'];
    for (var kl = 0; kl < 4; kl++) {
      var ky = 21 + kl * 3;
      var kc = keepPalette[kl % keepPalette.length];

      if (kl % 2 === 0) {
        for (z = O + 4; z < O + 12; z += 2) {
          for (x = O + 4; x < O + 12; x += 4) {
            add('2x4b', x, z, ky, 0, (x === O + 4 && z === O + 4) ? 'white' : kc);
          }
        }
      } else {
        for (x = O + 4; x < O + 12; x += 2) {
          for (z = O + 4; z < O + 12; z += 4) {
            add('2x4b', x, z, ky, 90, kc);
          }
        }
      }
    }

    /* ── Roof · steps 199–207 · 9 plates ────────────────────────────────── */
    var roofY = 33;
    for (z = O + 5; z < O + 11; z += 2) {
      add('2x4p', O + 5, z, roofY, 0, 'red');
      add('2x2p', O + 9, z, roofY, 0, 'orange');
    }
    add('2x4p', O + 6, O + 6, roofY + 1, 0, 'red');
    add('2x4p', O + 6, O + 8, roofY + 1, 0, 'orange');
    add('2x2p', O + 7, O + 7, roofY + 2, 0, 'gold');

    /* ── Battlements & crown · steps 208–250 · 43 pieces ────────────────── */

    // Wall-top crenellations between the towers: 4 per side = 16.
    [O + 4, O + 6, O + 8, O + 10].forEach(function (cx) {
      add('1x2b', cx, O, 21, 90, cx % 4 === 0 ? 'gold' : 'white');
      add('1x2b', cx, O + 14, 21, 90, cx % 4 === 0 ? 'white' : 'gold');
    });
    [O + 4, O + 6, O + 8, O + 10].forEach(function (cz) {
      add('1x2b', O, cz, 21, 0, cz % 4 === 0 ? 'gold' : 'white');
      add('1x2b', O + 14, cz, 21, 0, cz % 4 === 0 ? 'white' : 'gold');
    });

    // Tower-top merlons: 4 per tower = 16.
    towerOrigins.forEach(function (t, ti) {
      var c = ti % 2 === 0 ? 'gold' : 'white';
      add('1x2b', t[0] + 1, t[1], 33, 0, c);
      add('1x2b', t[0] + 1, t[1] + 3, 33, 0, c);
      add('1x2b', t[0], t[1] + 1, 33, 90, c);
      add('1x2b', t[0] + 3, t[1] + 1, 33, 90, c);
    });

    // Keep crown ring around the roof: 3 + 3 + 3 + 2 = 11.
    [O + 5, O + 7, O + 9].forEach(function (cx) {
      add('1x2b', cx, O + 4, 33, 0, 'gold');
      add('1x2b', cx, O + 11, 33, 0, 'white');
    });
    [O + 5, O + 7, O + 9].forEach(function (cz) {
      add('1x2b', O + 4, cz, 33, 90, 'gold');
    });
    [O + 5, O + 7].forEach(function (cz) {
      add('1x2b', O + 11, cz, 33, 90, 'white');
    });

    if (list.length !== APP.totalSteps) {
      throw new Error('Castle generator produced ' + list.length + ' pieces, expected 250.');
    }

    list.forEach(function (p, index) {
      p.step = index + 1;
      p.module = p.step <= 64 ? 'foundation' : (p.step <= 166 ? 'walls' : 'crown');
    });

    return list;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     STATE
     ───────────────────────────────────────────────────────────────────────── */

  var state = cloneDefaultState();
  var saveTimer = null;

  function sanitizeCustomBricks(raw) {
    if (!Array.isArray(raw)) return [];
    var output = [];
    var occupancy = Object.create(null);

    function cellKey(x, y, z) {
      return x + '|' + y + '|' + z;
    }

    function fits(candidate) {
      var def = BRICK_TYPES[candidate.type];
      var fp = footprint(candidate.type, candidate.rot);
      var height = Math.round(def.h / PLATE_H);
      for (var xx = candidate.gx; xx < candidate.gx + fp.w; xx++) {
        for (var zz = candidate.gz; zz < candidate.gz + fp.d; zz++) {
          for (var yy = candidate.y; yy < candidate.y + height; yy++) {
            if (occupancy[cellKey(xx, yy, zz)]) return false;
          }
        }
      }
      return true;
    }

    function reserve(candidate) {
      var def = BRICK_TYPES[candidate.type];
      var fp = footprint(candidate.type, candidate.rot);
      var height = Math.round(def.h / PLATE_H);
      for (var xx = candidate.gx; xx < candidate.gx + fp.w; xx++) {
        for (var zz = candidate.gz; zz < candidate.gz + fp.d; zz++) {
          for (var yy = candidate.y; yy < candidate.y + height; yy++) {
            occupancy[cellKey(xx, yy, zz)] = true;
          }
        }
      }
    }

    for (var i = 0; i < raw.length && output.length < APP.totalSteps; i++) {
      var item = raw[i];
      if (!item || typeof item !== 'object') continue;
      if (!BRICK_TYPES[item.type]) continue;

      var rot = Number(item.rot) === 90 ? 90 : 0;
      var gx = Number(item.x !== undefined ? item.x : item.gx);
      var gz = Number(item.z !== undefined ? item.z : item.gz);
      var y = Number(item.y);
      if (!isFinite(gx) || !isFinite(gz) || !isFinite(y)) continue;

      var def = BRICK_TYPES[item.type];
      var fp = footprint(item.type, rot);
      gx = Math.floor(gx);
      gz = Math.floor(gz);
      y = Math.max(0, Math.floor(y));

      if (gx < 0 || gz < 0 || gx + fp.w > GRID || gz + fp.d > GRID) continue;
      if (y + Math.round(def.h / PLATE_H) > 120) continue;

      var color = isHexColor(item.color) ? item.color : '#3f7fbf';
      var candidate = {
        step: output.length + 1,
        type: item.type,
        gx: gx,
        gz: gz,
        y: y,
        rot: rot,
        color: color,
        colorName: typeof item.colorName === 'string' && item.colorName
          ? item.colorName
          : getColorName(color),
        module: 'custom'
      };

      if (!fits(candidate)) continue;
      reserve(candidate);
      output.push(candidate);
    }

    return output;
  }

  function sanitizeState(raw) {
    var clean = cloneDefaultState();
    if (!raw || typeof raw !== 'object') return clean;

    clean.activeStep = clamp(Math.round(Number(raw.activeStep) || 1), 1, APP.totalSteps);
    clean.completed = !!raw.completed;
    if (clean.completed) clean.activeStep = APP.totalSteps;
    clean.mode = raw.mode === 'authoring' ? 'authoring' : 'guided';
    clean.explode = clamp(Math.round(Number(raw.explode) || 0), 0, 100);
    clean.sound = raw.sound !== false;
    clean.authorType = BRICK_TYPES[raw.authorType] ? raw.authorType : '2x4b';
    clean.authorColor = isHexColor(raw.authorColor) ? raw.authorColor : '#3f7fbf';
    clean.authorRot = Number(raw.authorRot) === 90 ? 90 : 0;
    clean.customBricks = sanitizeCustomBricks(raw.customBricks);
    return clean;
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(APP.storageKey);
      if (!raw) return cloneDefaultState();
      return sanitizeState(JSON.parse(raw));
    } catch (e) {
      return cloneDefaultState();
    }
  }

  function getPlacedCount() {
    if (state.mode === 'authoring') return state.customBricks.length;
    return state.completed ? APP.totalSteps : Math.max(0, state.activeStep - 1);
  }

  function getCurrentPlacement() {
    var index = clamp(state.activeStep, 1, APP.totalSteps) - 1;
    return BUILTIN_PLACEMENTS[index];
  }

  function countVisibleStuds() {
    var total = 0;
    if (state.mode === 'authoring') {
      state.customBricks.forEach(function (p) {
        var def = BRICK_TYPES[p.type];
        total += def.w * def.d;
      });
      return total;
    }

    var placed = getPlacedCount();
    for (var i = 0; i < placed; i++) {
      var def = BRICK_TYPES[BUILTIN_PLACEMENTS[i].type];
      total += def.w * def.d;
    }
    return total;
  }

  function getModuleForStep(step) {
    for (var i = 0; i < MODULES.length; i++) {
      if (step >= MODULES[i].from && step <= MODULES[i].to) return MODULES[i];
    }
    return MODULES[MODULES.length - 1];
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveStateNow, 180);
  }

  function saveStateNow() {
    try {
      var placed = getPlacedCount();
      var compact = [];
      if (state.mode !== 'authoring') {
        for (var i = 0; i < placed; i++) {
          var p = BUILTIN_PLACEMENTS[i];
          compact.push([p.type, p.gx, p.gz, p.y, p.rot, p.color]);
        }
      }

      window.localStorage.setItem(APP.storageKey, JSON.stringify({
        version: APP.version,
        modelId: state.modelId,
        activeStep: state.activeStep,
        completed: state.completed,
        mode: state.mode,
        customBricks: state.customBricks,
        explode: state.explode,
        sound: state.sound,
        authorType: state.authorType,
        authorColor: state.authorColor,
        authorRot: state.authorRot,
        placedCount: placed,
        placedMatrix: compact,
        savedAt: new Date().toISOString()
      }));
    } catch (e) {
      /* Storage can fail in private mode. The studio still works in memory. */
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     THREE.JS RUNTIME
     ───────────────────────────────────────────────────────────────────────── */

  var scene = null;
  var camera = null;
  var renderer = null;
  var controls = null;
  var clock = null;
  var raycaster = null;
  var pointer = null;
  var dummy = null;

  var geometryCache = {};
  var brickMaterial = null;
  var builtinMeshes = {};
  var customMeshes = {};

  var ghostGroup = null;
  var ghostMesh = null;
  var ghostOutline = null;
  var ghostRing = null;
  var ghostBeam = null;
  var ghostBeacon = null;
  var ghostMaterial = null;
  var ghostTarget = null;
  var ghostRotated = false;

  var baseplateMesh = null;
  var baseplateStuds = null;

  var effects = [];
  var cameraTween = null;
  var completeTimer = null;
  var toastTimer = null;

  var authoringHover = null;
  var lastPointer = null;
  var pointerDown = null;
  var isDraggingBrick = false;

  var statFrames = 0;
  var statLast = 0;

  /* ─────────────────────────────────────────────────────────────────────────
     GEOMETRY HELPERS
     ───────────────────────────────────────────────────────────────────────── */

  function mergeGeometries(geometries) {
    var positions = [];
    var normals = [];
    var uvs = [];

    geometries.forEach(function (geometry) {
      var pos = geometry.attributes.position;
      var nor = geometry.attributes.normal;
      var uv = geometry.attributes.uv;
      var index = geometry.index ? geometry.index.array : null;
      var total = index ? index.length : pos.count;

      for (var i = 0; i < total; i++) {
        var vertex = index ? index[i] : i;
        positions.push(pos.getX(vertex), pos.getY(vertex), pos.getZ(vertex));
        if (nor) normals.push(nor.getX(vertex), nor.getY(vertex), nor.getZ(vertex));
        if (uv) uvs.push(uv.getX(vertex), uv.getY(vertex));
      }
    });

    var merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length) {
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      merged.computeVertexNormals();
    }
    if (uvs.length) {
      merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
    merged.computeBoundingBox();
    merged.computeBoundingSphere();

    geometries.forEach(function (geometry) {
      try { geometry.dispose(); } catch (e) {}
    });

    return merged;
  }

  function createBrickGeometry(def) {
    var parts = [];
    var bodyW = def.w * CELL - 0.045;
    var bodyD = def.d * CELL - 0.045;
    var bodyH = def.h;

    var body = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
    body.translate(0, bodyH / 2, 0);
    parts.push(body);

    // Real top studs: one per stud cell, smoothly capped cylinders.
    var studRadius = 0.235;
    var studHeight = 0.155;
    for (var ix = 0; ix < def.w; ix++) {
      for (var iz = 0; iz < def.d; iz++) {
        var stud = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 12, 1, false);
        stud.translate(
          (ix - (def.w - 1) / 2) * CELL,
          bodyH + studHeight / 2,
          (iz - (def.d - 1) / 2) * CELL
        );
        parts.push(stud);
      }
    }

    // Bottom anti-stud receiving tubes. They protrude slightly below the
    // body, exactly like the moulded tubes under a real LEGO brick.
    var tubeHeight = Math.min(0.24, bodyH * 0.7);
    var tubeRadius = 0.255;
    var tubePositions = (def.w >= 4 && def.d === 2)
      ? [[-0.55, 0], [0.55, 0]]
      : [[0, 0]];

    tubePositions.forEach(function (tp) {
      var tube = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeHeight, 10, 1, true);
      tube.translate(tp[0], -0.035, tp[1]);
      parts.push(tube);
    });

    return mergeGeometries(parts);
  }

  function buildGeometryCache() {
    Object.keys(BRICK_TYPES).forEach(function (type) {
      geometryCache[type] = createBrickGeometry(BRICK_TYPES[type]);
    });
  }

  function placementMatrix(p) {
    var def = BRICK_TYPES[p.type];
    var fp = footprint(p.type, p.rot);
    var explode = explodeOffset(p);
    dummy.position.set(
      worldX(p.gx, fp.w),
      p.y * PLATE_H + BASE_Y + explode,
      worldZ(p.gz, fp.d)
    );
    dummy.rotation.set(0, p.rot === 90 ? Math.PI / 2 : 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    return dummy.matrix;
  }

  function explodeOffset(p) {
    if (!state || !state.explode) return 0;
    var e = state.explode / 100;
    return e * (1.4 + p.y * 0.17 + (p.step % 9) * 0.11);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     SCENE
     ───────────────────────────────────────────────────────────────────────── */

  function initScene() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });

    var viewportW = Math.max(320, els.viewport.clientWidth);
    var viewportH = Math.max(320, els.viewport.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(viewportW, viewportH, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D LEGO assembly studio');
    renderer.domElement.setAttribute('role', 'img');
    els.viewport.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d18);
    scene.fog = new THREE.FogExp2(0x070d18, 0.0115);

    camera = new THREE.PerspectiveCamera(38, viewportW / viewportH, 0.1, 240);
    camera.position.set(28, 25, 40);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.7;
    controls.minDistance = 8;
    controls.maxDistance = 64;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.screenSpacePanning = true;
    controls.update();

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    dummy = new THREE.Object3D();

    /* Lights */
    var hemi = new THREE.HemisphereLight(0xc9e2ff, 0x111827, 0.68);
    scene.add(hemi);

    var ambient = new THREE.AmbientLight(0xffffff, 0.09);
    scene.add(ambient);

    var key = new THREE.DirectionalLight(0xfff1d4, 1.18);
    key.position.set(14, 26, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -23;
    key.shadow.camera.right = 23;
    key.shadow.camera.top = 27;
    key.shadow.camera.bottom = -14;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 80;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    scene.add(key);
    scene.add(key.target);

    var fill = new THREE.DirectionalLight(0x63c8ff, 0.38);
    fill.position.set(-18, 13, -12);
    scene.add(fill);

    var rim = new THREE.PointLight(0xffa53c, 0.7, 70, 2);
    rim.position.set(-14, 10, -18);
    scene.add(rim);

    var coolRim = new THREE.PointLight(0x45d6ff, 0.45, 55, 2);
    coolRim.position.set(18, 7, -12);
    scene.add(coolRim);

    /* Ground */
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({
        color: linearColor(0x05080f),
        roughness: 0.98,
        metalness: 0.0
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.36;
    ground.receiveShadow = true;
    scene.add(ground);

    var grid = new THREE.GridHelper(90, 90, 0x1c3150, 0x101c30);
    grid.position.y = -0.35;
    grid.material.transparent = true;
    grid.material.opacity = 0.23;
    grid.material.depthWrite = false;
    scene.add(grid);

    /* Baseplate */
    baseplateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(GRID, 0.34, GRID),
      new THREE.MeshStandardMaterial({
        color: linearColor(0x102b22),
        roughness: 0.76,
        metalness: 0.04
      })
    );
    baseplateMesh.position.y = -0.17;
    baseplateMesh.receiveShadow = true;
    baseplateMesh.castShadow = true;
    scene.add(baseplateMesh);

    var studGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10, 1, false);
    var studMaterial = new THREE.MeshStandardMaterial({
      color: linearColor(0x1d4a3c),
      roughness: 0.7,
      metalness: 0.05
    });
    baseplateStuds = new THREE.InstancedMesh(studGeometry, studMaterial, GRID * GRID);
    var plateDummy = new THREE.Object3D();
    var plateIndex = 0;
    for (var px = 0; px < GRID; px++) {
      for (var pz = 0; pz < GRID; pz++) {
        plateDummy.position.set(
          px - GRID / 2 + 0.5,
          0.06,
          pz - GRID / 2 + 0.5
        );
        plateDummy.updateMatrix();
        baseplateStuds.setMatrixAt(plateIndex, plateDummy.matrix);
        plateIndex++;
      }
    }
    baseplateStuds.instanceMatrix.needsUpdate = true;
    baseplateStuds.receiveShadow = true;
    baseplateStuds.frustumCulled = false;
    scene.add(baseplateStuds);

    /* Soft contact ring under the plate */
    var contact = new THREE.Mesh(
      new THREE.CircleGeometry(22, 64),
      new THREE.MeshBasicMaterial({
        color: linearColor(0x0c1728),
        transparent: true,
        opacity: 0.4,
        depthWrite: false
      })
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -0.355;
    scene.add(contact);
  }

  function initInstances() {
    brickMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.02,
      clearcoat: 0.36,
      clearcoatRoughness: 0.32,
      reflectivity: 0.35,
      dithering: true
    });

    /* Built-in model: one InstancedMesh per brick type. */
    Object.keys(BRICK_TYPES).forEach(function (type) {
      var list = BUILTIN_PLACEMENTS.filter(function (p) { return p.type === type; });
      if (!list.length) return;

      var mesh = new THREE.InstancedMesh(geometryCache[type], brickMaterial, list.length);
      mesh.count = list.length;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // NOTE: Three r128 sizes the instanceColor buffer from mesh.count at the
      // moment setColorAt() is first called. Keep count at capacity while
      // allocating colours, then collapse to zero for the empty build.
      for (var i = 0; i < list.length; i++) {
        mesh.setColorAt(i, linearColor(list[i].color));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.count = 0;

      builtinMeshes[type] = { mesh: mesh, list: list };
    });

    /* Authoring meshes: capacity 250 for each type, created once. */
    Object.keys(BRICK_TYPES).forEach(function (type) {
      var mesh = new THREE.InstancedMesh(geometryCache[type], brickMaterial, APP.totalSteps);
      mesh.count = APP.totalSteps;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // Pre-allocate the 250-instance colour buffer while count is at capacity.
      var defaultColor = linearColor('#3f7fbf');
      for (var i = 0; i < APP.totalSteps; i++) {
        mesh.setColorAt(i, defaultColor);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      mesh.count = 0;
      mesh.visible = false;
      customMeshes[type] = { mesh: mesh, list: [] };
    });
  }

  function initGhost() {
    ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.45,
      transparent: true,
      opacity: 0.38,
      roughness: 0.24,
      metalness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    ghostMesh = new THREE.Mesh(geometryCache['2x4b'], ghostMaterial);
    ghostMesh.castShadow = false;
    ghostMesh.receiveShadow = false;
    ghostMesh.renderOrder = 8;

    ghostOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({
        color: linearColor(0x45d6ff),
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      })
    );
    ghostOutline.renderOrder = 9;

    ghostRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.08, 48),
      new THREE.MeshBasicMaterial({
        color: linearColor(0x45d6ff),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ghostRing.rotation.x = -Math.PI / 2;
    ghostRing.position.y = 0.018;
    ghostRing.renderOrder = 7;

    ghostBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.055, 2.25, 7, 1, true),
      new THREE.MeshBasicMaterial({
        color: linearColor(0x45d6ff),
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    ghostBeam.position.y = 1.25;
    ghostBeam.renderOrder = 7;

    ghostBeacon = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.5, 12),
      new THREE.MeshBasicMaterial({
        color: linearColor(0xffffff),
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      })
    );
    ghostBeacon.rotation.x = Math.PI;
    ghostBeacon.position.y = 2.45;
    ghostBeacon.renderOrder = 7;

    ghostGroup = new THREE.Group();
    ghostGroup.add(ghostMesh);
    ghostGroup.add(ghostOutline);
    ghostGroup.add(ghostRing);
    ghostGroup.add(ghostBeam);
    ghostGroup.add(ghostBeacon);
    ghostGroup.visible = false;
    scene.add(ghostGroup);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RENDERING UPDATES
     ───────────────────────────────────────────────────────────────────────── */

  function updateBuiltinInstances() {
    var placed = getPlacedCount();
    Object.keys(builtinMeshes).forEach(function (type) {
      var entry = builtinMeshes[type];
      var count = 0;
      for (var i = 0; i < entry.list.length; i++) {
        if (entry.list[i].step <= placed) count++;
        else break;
      }
      entry.mesh.count = count;
      for (i = 0; i < count; i++) {
        entry.mesh.setMatrixAt(i, placementMatrix(entry.list[i]));
      }
      entry.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  function updateCustomInstances() {
    var active = state.mode === 'authoring';

    Object.keys(customMeshes).forEach(function (type) {
      var entry = customMeshes[type];
      entry.mesh.visible = active;
      if (!active) {
        entry.mesh.count = 0;
        return;
      }

      var list = state.customBricks.filter(function (p) { return p.type === type; });
      entry.mesh.count = list.length;
      for (var i = 0; i < list.length; i++) {
        entry.mesh.setMatrixAt(i, placementMatrix(list[i]));
        entry.mesh.setColorAt(i, linearColor(list[i].color));
      }
      entry.mesh.instanceMatrix.needsUpdate = true;
      if (entry.mesh.instanceColor) entry.mesh.instanceColor.needsUpdate = true;
    });
  }

  function updateGhost() {
    if (state.explode > 0) {
      ghostGroup.visible = false;
      ghostTarget = null;
      return;
    }

    if (state.mode === 'authoring') {
      if (authoringHover) {
        updateAuthoringGhostVisual();
      } else {
        ghostGroup.visible = false;
        ghostTarget = null;
      }
      return;
    }

    if (state.completed) {
      ghostGroup.visible = false;
      ghostTarget = null;
      return;
    }

    var p = getCurrentPlacement();
    if (!p) {
      ghostGroup.visible = false;
      ghostTarget = null;
      return;
    }

    var fp = footprint(p.type, p.rot);
    var def = BRICK_TYPES[p.type];
    var yaw = (p.rot === 90 ? Math.PI / 2 : 0) + (ghostRotated ? Math.PI / 2 : 0);
    ghostTarget = p;
    ghostMesh.geometry = geometryCache[p.type];
    ghostMesh.rotation.y = yaw;
    setLinearColor(ghostMaterial.color, p.color);
    setLinearColor(ghostMaterial.emissive, p.color);
    ghostMaterial.emissiveIntensity = ghostRotated ? 0.9 : 1.55;

    ghostOutline.scale.set(fp.w * CELL - 0.04, def.h, fp.d * CELL - 0.04);
    ghostOutline.position.y = def.h / 2;
    ghostOutline.rotation.y = yaw;
    setLinearColor(ghostOutline.material.color, ghostRotated ? 0xffc93c : 0x45d6ff);
    setLinearColor(ghostBeam.material.color, ghostRotated ? 0xffc93c : 0x45d6ff);

    ghostGroup.position.set(
      worldX(p.gx, fp.w),
      p.y * PLATE_H + BASE_Y,
      worldZ(p.gz, fp.d)
    );
    ghostRing.scale.setScalar(Math.max(fp.w, fp.d) * 0.46);
    setLinearColor(ghostRing.material.color, ghostRotated ? 0xffc93c : 0x45d6ff);
    setLinearColor(ghostBeacon.material.color, ghostRotated ? 0xffc93c : 0xffffff);
    ghostGroup.visible = true;
  }

  function updateAuthoringGhostVisual() {
    if (!authoringHover || state.mode !== 'authoring' || state.explode > 0) {
      ghostGroup.visible = false;
      return;
    }

    var h = authoringHover;
    var def = BRICK_TYPES[state.authorType];
    var yaw = h.rot === 90 ? Math.PI / 2 : 0;
    ghostMesh.geometry = geometryCache[state.authorType];
    ghostMesh.rotation.y = yaw;
    setLinearColor(ghostMaterial.color, state.authorColor);
    setLinearColor(ghostMaterial.emissive, state.authorColor);
    ghostMaterial.emissiveIntensity = 1.45;

    ghostOutline.scale.set(h.w * CELL - 0.04, def.h, h.d * CELL - 0.04);
    ghostOutline.position.y = def.h / 2;
    ghostOutline.rotation.y = yaw;
    setLinearColor(ghostOutline.material.color, 0x45d6ff);
    setLinearColor(ghostBeam.material.color, 0x45d6ff);

    ghostGroup.position.set(
      worldX(h.gx, h.w),
      h.y * PLATE_H + BASE_Y,
      worldZ(h.gz, h.d)
    );
    ghostRing.scale.setScalar(Math.max(h.w, h.d) * 0.46);
    setLinearColor(ghostRing.material.color, 0x45d6ff);
    setLinearColor(ghostBeacon.material.color, 0xffffff);
    ghostGroup.visible = true;
    ghostTarget = { gx: h.gx, gz: h.gz, y: h.y, w: h.w, d: h.d, rot: h.rot };
  }

  function updateAll() {
    updateBuiltinInstances();
    updateCustomInstances();
    updateGhost();
    updateHud();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     HUD
     ───────────────────────────────────────────────────────────────────────── */

  var BRICK_WIDTHS = {
    '2x4b': 124, '2x2b': 92, '1x4b': 124, '1x2b': 82,
    '2x4p': 124, '2x2p': 92, '1x4p': 124, '1x2p': 82
  };

  function setRangeFill(input, percent) {
    if (!input) return;
    input.style.setProperty('--fill', clamp(percent, 0, 100).toFixed(2) + '%');
  }

  function updateBrickVisual(type, color, colorName) {
    var def = BRICK_TYPES[type] || BRICK_TYPES['2x4b'];
    var width = BRICK_WIDTHS[type] || 124;
    var height = def.kind === 'plate' ? 35 : 46;

    els.brickName.textContent = def.label;
    els.brickColorName.textContent = colorName;
    els.brickColorName.style.color = color;
    els.brickDims.textContent = def.label.replace(' Brick', '').replace(' Plate', '') + ' studs · ' + def.h + 'u tall';

    els.brickVisual.style.setProperty('--brick-color', color);
    els.brickVisual.style.setProperty('--brick-w', width + 'px');
    els.brickVisual.style.setProperty('--brick-h', height + 'px');

    var cols = def.w;
    var rows = def.d;
    var count = cols * rows;
    var margin = 10;
    var studWidth = 18;
    var stepX = cols > 1 ? (width - margin * 2 - studWidth) / (cols - 1) : 0;

    for (var i = 0; i < els.studs.length; i++) {
      var stud = els.studs[i];
      if (i >= count) {
        stud.style.display = 'none';
        continue;
      }
      var col = i % cols;
      var row = Math.floor(i / cols);
      stud.style.display = '';
      stud.style.left = (margin + col * stepX) + 'px';
      stud.style.top = (-5 + row * 8) + 'px';
    }

    els.brickVisual.setAttribute('aria-label', typeLabel(type) + ' in ' + colorName);
  }

  function updateHud() {
    var authoring = state.mode === 'authoring';
    var placed = getPlacedCount();
    var percent = placed / APP.totalSteps * 100;

    /* Global progress */
    els.progressBar.style.width = percent.toFixed(2) + '%';
    els.progressGlow.style.width = percent.toFixed(2) + '%';
    els.progressPct.textContent = (state.completed ? 100 : Math.floor(percent)) + '%';
    els.progressTrack.setAttribute('aria-valuenow', String(placed));
    els.visibleValue.textContent = String(placed);
    els.drawValue.textContent = String(countVisibleStuds());

    /* Explode + sounds + authoring controls */
    els.explodeSlider.value = String(state.explode);
    els.explodeValue.textContent = state.explode + '%';
    setRangeFill(els.explodeSlider, state.explode);
    els.soundIcon.textContent = state.sound ? '🔊' : '🔇';
    els.btnSound.classList.toggle('muted', !state.sound);
    els.btnSound.setAttribute('aria-label', state.sound ? 'Mute sound' : 'Enable sound');
    els.authorType.value = state.authorType;
    els.authorColor.value = state.authorColor;
    els.authoringState.textContent = authoring ? 'ON' : 'OFF';
    els.authoringState.classList.toggle('on', authoring);
    els.authoringTools.classList.toggle('hidden', !authoring);
    els.btnAuthoring.textContent = authoring ? 'Exit Authoring Mode' : 'Enter Authoring Mode';
    els.authoringCount.textContent = state.customBricks.length + ' / 250 pieces · click baseplate to stack · R rotates';

    if (authoring) {
      var customCount = state.customBricks.length;
      var customPercent = customCount / APP.totalSteps * 100;

      els.modelName.textContent = 'Custom Studio';
      els.modelMeta.textContent = customCount + ' / 250 pieces · custom build';
      els.stepLabel.textContent = 'AUTHORING · ' + customCount + ' / 250';
      els.stepNumberChip.textContent = 'CUSTOM';
      els.scrubberStep.textContent = 'AUTHORING';
      els.stepRange.value = String(clamp(customCount === 0 ? 1 : customCount, 1, 250));
      els.stepRange.disabled = true;
      setRangeFill(els.stepRange, customPercent);

      els.moduleBadgeText.textContent = 'Authoring Studio · Custom build';
      els.moduleBadgeDot.style.background = '#a78bfa';
      els.moduleBadgeDot.style.boxShadow = '0 0 8px rgba(167, 139, 250, 0.55)';

      if (state.explode > 0) {
        els.bayHint.innerHTML = 'Explode view is active. Return the slider to <b>0</b> to show the authoring ghost and stack bricks.';
        els.btnSnap.innerHTML = '<span>💥</span> Explode View Active';
        els.btnSnap.disabled = true;
      } else {
        els.bayHint.innerHTML = 'Pick a brick and colour, then click the baseplate to stack. Press <kbd>R</kbd> to rotate.';
        els.btnSnap.innerHTML = '<span>🧱</span> Place at Cursor';
        els.btnSnap.disabled = false;
      }
      els.btnPrev.disabled = true;
      els.btnNext.disabled = true;
      els.btnRotate.title = 'Rotate authoring brick 90° (R)';
      els.btnRotate.disabled = false;
      els.orientationHint.textContent = 'Click baseplate to place · R rotates · drag orbit';
      els.qualityValue.textContent = 'STUDIO';

      updateBrickVisual(state.authorType, state.authorColor, getColorName(state.authorColor));
    } else {
      var current = getCurrentPlacement();
      var module = getModuleForStep(state.activeStep);
      var moduleIndex = MODULES.indexOf(module) + 1;

      els.modelName.textContent = APP.modelName;
      els.modelMeta.textContent = '250 pieces · 3 sub-assemblies';
      els.stepLabel.textContent = state.completed
        ? 'BUILD COMPLETE · 250 OF 250'
        : 'STEP ' + state.activeStep + ' OF 250';
      els.stepNumberChip.textContent = '#' + pad3(state.activeStep);
      els.scrubberStep.textContent = 'STEP ' + pad3(state.activeStep);
      els.stepRange.value = String(state.activeStep);
      els.stepRange.disabled = false;
      setRangeFill(els.stepRange, state.completed ? 100 : ((state.activeStep - 1) / 249 * 100));

      els.moduleBadgeText.textContent = state.completed
        ? 'Module 3 · Keep & Crown · Complete'
        : 'Module ' + moduleIndex + ' · ' + module.name;
      els.moduleBadgeDot.style.background = state.completed ? '#3ee6a3' : module.color;
      els.moduleBadgeDot.style.boxShadow = '0 0 8px ' + (state.completed ? 'rgba(62, 230, 163, 0.6)' : module.color);

      if (state.explode > 0) {
        els.bayHint.innerHTML = 'Explode view is active. Return the slider to <b>0</b> to show the next target and keep assembling.';
        els.btnSnap.innerHTML = '<span>💥</span> Explode View Active';
        els.btnSnap.disabled = true;
      } else if (state.completed) {
        els.bayHint.innerHTML = 'All 250 pieces are locked in. Orbit the model, then use the completion card to keep exploring or start over.';
        els.btnSnap.innerHTML = '<span>✓</span> Build Complete';
        els.btnSnap.disabled = true;
      } else {
        els.bayHint.innerHTML = 'Click the glowing ghost, press <kbd>Space</kbd>, or drag this brick onto the target.';
        els.btnSnap.innerHTML = '<span>🧲</span> Snap Into Place <kbd>Space</kbd>';
        els.btnSnap.disabled = false;
      }

      els.btnPrev.disabled = state.activeStep <= 1 && !state.completed;
      els.btnNext.disabled = state.completed || state.explode > 0;
      els.btnRotate.title = 'Rotate preview 90° (R)';
      els.btnRotate.disabled = false;
      els.orientationHint.textContent = 'LMB orbit · scroll zoom · RMB pan';
      els.qualityValue.textContent = 'HIGH';

      if (current) {
        updateBrickVisual(current.type, current.color, current.colorName);
      }
    }

    updateModuleProgress();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     MODULE LIST
     ───────────────────────────────────────────────────────────────────────── */

  function buildModuleList() {
    els.moduleList.innerHTML = '';

    if (state.mode === 'authoring') {
      var custom = document.createElement('button');
      custom.type = 'button';
      custom.className = 'module-item active';
      custom.setAttribute('data-custom-module', 'true');
      custom.innerHTML =
        '<span class="module-icon">✏️</span>' +
        '<span class="module-copy"><strong>Custom Build</strong><span>0 / 250 pieces</span></span>' +
        '<span class="module-mini-track"><span class="module-mini-fill"></span></span>';
      custom.addEventListener('click', function () {
        toast('Keep clicking the baseplate to add custom bricks.', '', 1600);
      });
      els.moduleList.appendChild(custom);
      els.moduleCount.textContent = 'CUSTOM';
      updateModuleProgress();
      return;
    }

    MODULES.forEach(function (m, index) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'module-item';
      item.setAttribute('data-module-id', m.id);
      item.innerHTML =
        '<span class="module-icon">' + m.icon + '</span>' +
        '<span class="module-copy"><strong>' + (index + 1) + '. ' + m.name + '</strong><span>' +
        m.from + '–' + m.to + ' · ' + (m.to - m.from + 1) + ' pieces</span></span>' +
        '<span class="module-mini-track"><span class="module-mini-fill"></span></span>';
      item.addEventListener('click', function () {
        if (state.mode === 'authoring') return;
        jumpToStep(m.from);
      });
      els.moduleList.appendChild(item);
    });

    els.moduleCount.textContent = '3 MODULES';
    updateModuleProgress();
  }

  function updateModuleProgress() {
    var placed = getPlacedCount();

    if (state.mode === 'authoring') {
      var customItem = els.moduleList.querySelector('[data-custom-module]');
      if (customItem) {
        var fill = customItem.querySelector('.module-mini-fill');
        var copy = customItem.querySelector('.module-copy span');
        if (fill) fill.style.width = (placed / APP.totalSteps * 100).toFixed(1) + '%';
        if (copy) copy.textContent = placed + ' / 250 pieces';
        customItem.classList.toggle('done', placed >= APP.totalSteps);
      }
      return;
    }

    MODULES.forEach(function (m) {
      var item = els.moduleList.querySelector('[data-module-id="' + m.id + '"]');
      if (!item) return;
      var moduleSize = m.to - m.from + 1;
      var doneInModule = clamp(placed - (m.from - 1), 0, moduleSize);
      var done = placed >= m.to;
      var active = !done && state.activeStep >= m.from && state.activeStep <= m.to;

      if (state.completed) {
        done = true;
        active = false;
      }

      var fill = item.querySelector('.module-mini-fill');
      var copy = item.querySelector('.module-copy span');
      if (fill) fill.style.width = (doneInModule / moduleSize * 100).toFixed(1) + '%';
      if (copy) copy.textContent = doneInModule + ' / ' + moduleSize + ' pieces';
      item.classList.toggle('done', done);
      item.classList.toggle('active', active);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     STEP ENGINE
     ───────────────────────────────────────────────────────────────────────── */

  function snapCurrent() {
    if (state.explode > 0) {
      toast('Explode view is active — return the slider to 0 to keep building.', 'warn', 2000);
      return;
    }

    if (state.mode === 'authoring') {
      placeAuthoringAtHover(null);
      return;
    }

    if (state.completed) {
      toast('Build complete — 250 of 250 pieces are in place.', 'good', 2000);
      return;
    }

    var p = getCurrentPlacement();
    if (!p) return;

    var autoAligned = ghostRotated;
    var wasFinal = state.activeStep >= APP.totalSteps;

    spawnSnapEffect(p);
    audio.snap();

    if (wasFinal) {
      state.completed = true;
    } else {
      state.activeStep += 1;
    }

    ghostRotated = false;
    updateAll();
    scheduleSave();

    if (state.completed) {
      toast('Final piece snapped — the castle is complete!', 'good', 3000);
      window.clearTimeout(completeTimer);
      completeTimer = window.setTimeout(function () {
        showComplete({ sound: true });
      }, 460);
    } else {
      var extra = autoAligned ? ' · auto-aligned to target' : '';
      toast(typeLabel(p.type) + ' snapped · ' + getPlacedCount() + '/250' + extra, 'good', 1300);
    }
  }

  function prevStep() {
    if (state.mode === 'authoring') return;

    hideComplete();

    if (state.completed) {
      state.completed = false;
      state.activeStep = APP.totalSteps;
      toast('Final piece removed — step 250 is available again.', 'warn', 1800);
    } else if (state.activeStep > 1) {
      state.activeStep -= 1;
      toast('Rewound to step ' + state.activeStep + '.', '', 1200);
    } else {
      toast('You are at step 1 — nothing to rewind.', 'warn', 1400);
      return;
    }

    ghostRotated = false;
    updateAll();
    scheduleSave();
  }

  function jumpToStep(step) {
    if (state.mode === 'authoring') return;

    var target = clamp(Math.round(Number(step) || 1), 1, APP.totalSteps);
    state.activeStep = target;
    state.completed = false;
    ghostRotated = false;

    hideComplete();
    updateAll();
    scheduleSave();

    if (target < APP.totalSteps) {
      toast('Jumped to step ' + target + ' · ' + typeLabel(getCurrentPlacement().type) + '.', '', 1300);
    } else {
      toast('Step 250 · place the final brick to finish the build.', '', 1800);
    }
  }

  function resetBuild() {
    hideComplete();
    state.activeStep = 1;
    state.completed = false;
    state.explode = 0;
    ghostRotated = false;
    updateAll();
    scheduleSave();
    toast('Build reset — 250 fresh steps ready.', 'good', 1800);
  }

  function rotatePreview() {
    audio.click();

    if (state.mode === 'authoring') {
      state.authorRot = state.authorRot === 90 ? 0 : 90;
      if (lastPointer) {
        authoringHover = computeAuthoringHover(lastPointer);
      }
      updateGhost();
      updateHud();
      scheduleSave();
      return;
    }

    if (state.completed) {
      toast('The build is complete — rotation is available while authoring.', 'warn', 1600);
      return;
    }

    ghostRotated = !ghostRotated;
    updateGhost();
    toast(
      ghostRotated
        ? 'Preview rotated 90° — snapping will auto-align to the target.'
        : 'Preview returned to the instruction orientation.',
      ghostRotated ? 'warn' : '',
      1700
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
     AUTHORING STUDIO
     ───────────────────────────────────────────────────────────────────────── */

  function getTopAtFootprint(gx, gz, w, d) {
    var top = 0;
    for (var i = 0; i < state.customBricks.length; i++) {
      var p = state.customBricks[i];
      var def = BRICK_TYPES[p.type];
      var fp = footprint(p.type, p.rot);
      var overlaps = p.gx < gx + w && p.gx + fp.w > gx && p.gz < gz + d && p.gz + fp.d > gz;
      if (overlaps) {
        top = Math.max(top, p.y + Math.round(def.h / PLATE_H));
      }
    }
    return top;
  }

  function customPlacementFits(candidate) {
    var def = BRICK_TYPES[candidate.type];
    var fp = footprint(candidate.type, candidate.rot);
    var height = Math.round(def.h / PLATE_H);
    var occupied = Object.create(null);

    state.customBricks.forEach(function (p) {
      var pd = BRICK_TYPES[p.type];
      var pf = footprint(p.type, p.rot);
      var ph = Math.round(pd.h / PLATE_H);
      for (var xx = p.gx; xx < p.gx + pf.w; xx++) {
        for (var zz = p.gz; zz < p.gz + pf.d; zz++) {
          for (var yy = p.y; yy < p.y + ph; yy++) {
            occupied[xx + '|' + yy + '|' + zz] = true;
          }
        }
      }
    });

    for (var x = candidate.gx; x < candidate.gx + fp.w; x++) {
      for (var z = candidate.gz; z < candidate.gz + fp.d; z++) {
        for (var y = candidate.y; y < candidate.y + height; y++) {
          if (occupied[x + '|' + y + '|' + z]) return false;
        }
      }
    }
    return true;
  }

  function computeAuthoringHover(event) {
    if (!renderer || !baseplateMesh) return null;
    var point = raycastBaseplate(event);
    if (!point) return null;

    var def = BRICK_TYPES[state.authorType];
    var rot = state.authorRot === 90 ? 90 : 0;
    var fp = footprint(state.authorType, rot);

    var gx = Math.floor(point.x + GRID / 2);
    var gz = Math.floor(point.z + GRID / 2);
    if (gx < 0 || gz < 0 || gx >= GRID || gz >= GRID) return null;

    gx = clamp(gx, 0, GRID - fp.w);
    gz = clamp(gz, 0, GRID - fp.d);
    var y = getTopAtFootprint(gx, gz, fp.w, fp.d);

    return { gx: gx, gz: gz, w: fp.w, d: fp.d, y: y, rot: rot, def: def };
  }

  function placeAuthoringAtHover(event) {
    if (state.explode > 0) {
      toast('Return the Explode View slider to 0 before adding bricks.', 'warn', 2000);
      return;
    }

    if (state.customBricks.length >= APP.totalSteps) {
      toast('Custom build limit reached — 250 pieces. Export the step sequence or undo a piece.', 'warn', 3200);
      return;
    }

    var hover = event ? computeAuthoringHover(event) : authoringHover;
    if (!hover) {
      toast('Move the cursor over the baseplate, then click to place a brick.', 'warn', 2000);
      return;
    }

    var candidate = {
      step: state.customBricks.length + 1,
      type: state.authorType,
      gx: hover.gx,
      gz: hover.gz,
      y: hover.y,
      rot: state.authorRot,
      color: state.authorColor,
      colorName: getColorName(state.authorColor),
      module: 'custom'
    };

    if (!customPlacementFits(candidate)) {
      toast('That stud position is blocked — try another cell or layer.', 'bad', 1800);
      return;
    }

    state.customBricks.push(candidate);
    spawnSnapEffect(candidate);
    audio.place();

    if (event) {
      authoringHover = computeAuthoringHover(event);
    } else {
      authoringHover = computeAuthoringHoverFromPoint(hover.gx, hover.gz, hover);
    }

    updateCustomInstances();
    updateGhost();
    updateHud();
    scheduleSave();

    if (state.customBricks.length === APP.totalSteps) {
      toast('250-piece custom build complete. Export the step sequence as JSON.', 'good', 3600);
    }
  }

  function computeAuthoringHoverFromPoint(gx, gz, previous) {
    var def = BRICK_TYPES[state.authorType];
    var rot = state.authorRot === 90 ? 90 : 0;
    var fp = footprint(state.authorType, rot);
    var x = clamp(gx, 0, GRID - fp.w);
    var z = clamp(gz, 0, GRID - fp.d);
    return {
      gx: x,
      gz: z,
      w: fp.w,
      d: fp.d,
      y: getTopAtFootprint(x, z, fp.w, fp.d),
      rot: rot,
      def: def
    };
  }

  function undoCustom() {
    if (!state.customBricks.length) {
      toast('No custom bricks to undo.', 'warn', 1200);
      return;
    }
    state.customBricks.pop();
    audio.click();
    if (lastPointer) authoringHover = computeAuthoringHover(lastPointer);
    updateCustomInstances();
    updateGhost();
    updateHud();
    scheduleSave();
    toast('Removed the last custom brick.', '', 1300);
  }

  function clearCustom() {
    if (!state.customBricks.length) {
      toast('The authoring board is already empty.', '', 1200);
      return;
    }
    if (!window.confirm('Clear all ' + state.customBricks.length + ' custom bricks? This cannot be undone.')) {
      return;
    }
    state.customBricks = [];
    authoringHover = null;
    audio.error();
    updateCustomInstances();
    updateGhost();
    updateHud();
    scheduleSave();
    toast('Authoring board cleared.', 'warn', 1500);
  }

  function setAuthoring(on, options) {
    var opts = options || {};
    var previousMode = state.mode;
    state.mode = on ? 'authoring' : 'guided';

    if (on) {
      hideComplete();
      if (previousMode !== 'authoring') state.explode = 0;
      authoringHover = null;
    }

    Object.keys(builtinMeshes).forEach(function (type) {
      builtinMeshes[type].mesh.visible = !on;
    });

    if (els.modelIcon) els.modelIcon.textContent = on ? '✏️' : '🏰';
    if (els.moduleBadge) els.moduleBadge.setAttribute('data-mode', on ? 'authoring' : 'guided');

    buildModuleList();
    updateAll();

    if (!opts.skipSave) scheduleSave();

    if (!opts.silent) {
      if (on) {
        audio.click();
        toast('Authoring Studio ready — click the baseplate to stack bricks. Up to 250 pieces.', 'good', 2800);
      } else if (previousMode === 'authoring') {
        audio.click();
        toast('Back to the guided 250-step build.', '', 1600);
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RAYCASTING & POINTER
     ───────────────────────────────────────────────────────────────────────── */

  function eventToNdc(event) {
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return pointer;
  }

  function raycastBaseplate(event) {
    if (!renderer || !camera || !baseplateMesh) return null;
    eventToNdc(event);
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObject(baseplateMesh, false);
    return hits.length ? hits[0].point : null;
  }

  function hitsGhost(event) {
    if (!ghostGroup || !ghostGroup.visible) return false;
    eventToNdc(event);
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObject(ghostMesh, false);
    return hits.length > 0;
  }

  function clickNearTarget(event) {
    var p = getCurrentPlacement();
    if (!p) return false;
    var point = raycastBaseplate(event);
    if (!point) return false;

    var fp = footprint(p.type, p.rot);
    var tx = worldX(p.gx, fp.w);
    var tz = worldZ(p.gz, fp.d);
    return Math.abs(point.x - tx) <= fp.w / 2 + 0.75 &&
           Math.abs(point.z - tz) <= fp.d / 2 + 0.75;
  }

  function handleCanvasClick(event) {
    audio.ensure();

    if (state.mode === 'authoring') {
      authoringHover = computeAuthoringHover(event);
      updateAuthoringGhostVisual();
      placeAuthoringAtHover(event);
      return;
    }

    if (state.completed) {
      toast('Build complete — 250 pieces locked. Orbit to inspect the model.', 'good', 1800);
      return;
    }

    if (hitsGhost(event) || clickNearTarget(event)) {
      snapCurrent();
    } else {
      toast('Aim at the glowing ghost, or use the Snap button / Space bar.', 'warn', 1800);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    isDraggingBrick = false;
    els.dropHint.classList.add('hidden');

    if (state.mode === 'authoring') {
      var hover = computeAuthoringHover(event);
      authoringHover = hover;
      updateAuthoringGhostVisual();
      placeAuthoringAtHover(event);
      return;
    }

    if (state.completed) {
      toast('Build complete — no more bricks can be dropped.', 'warn', 1600);
      return;
    }

    if (hitsGhost(event) || clickNearTarget(event)) {
      snapCurrent();
    } else {
      toast('Drop the brick closer to the glowing target studs.', 'warn', 1800);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     SNAP EFFECT
     ───────────────────────────────────────────────────────────────────────── */

  function spawnSnapEffect(p) {
    if (!scene) return;
    var fp = footprint(p.type, p.rot);
    var geometry = new THREE.RingGeometry(0.62, 0.86, 40);
    var material = new THREE.MeshBasicMaterial({
      color: linearColor(0xffda6a),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(
      worldX(p.gx, fp.w),
      p.y * PLATE_H + BASE_Y + 0.02,
      worldZ(p.gz, fp.d)
    );
    ring.scale.setScalar(Math.max(fp.w, fp.d) * 0.45);
    ring.renderOrder = 9;
    scene.add(ring);

    effects.push({
      mesh: ring,
      life: 0,
      max: 0.52,
      baseScale: Math.max(fp.w, fp.d) * 0.45
    });
  }

  function updateEffects(dt) {
    for (var i = effects.length - 1; i >= 0; i--) {
      var fx = effects[i];
      fx.life += dt;
      var t = clamp(fx.life / fx.max, 0, 1);
      fx.mesh.scale.setScalar(fx.baseScale * (1 + t * 1.9));
      fx.mesh.material.opacity = 0.9 * (1 - t);
      if (t >= 1) {
        scene.remove(fx.mesh);
        try { fx.mesh.geometry.dispose(); } catch (e) {}
        try { fx.mesh.material.dispose(); } catch (e) {}
        effects.splice(i, 1);
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     CAMERA
     ───────────────────────────────────────────────────────────────────────── */

  function tweenCamera(toPosition, toTarget, duration) {
    if (!camera || !controls) return;
    cameraTween = {
      fromPosition: camera.position.clone(),
      toPosition: toPosition.clone(),
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone(),
      start: performance.now(),
      duration: duration || 700
    };
    controls.enabled = false;
  }

  function updateCameraTween(now) {
    if (!cameraTween) return;
    var t = clamp((now - cameraTween.start) / cameraTween.duration, 0, 1);
    var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
    camera.lookAt(controls.target);

    if (t >= 1) {
      cameraTween = null;
      controls.enabled = true;
      controls.update();
    }
  }

  function focusCurrent() {
    var target = new THREE.Vector3(0, 6.4, 0);

    if (state.mode === 'authoring') {
      if (authoringHover) {
        target.set(
          worldX(authoringHover.gx, authoringHover.w),
          authoringHover.y * PLATE_H + BASE_Y + 1.2,
          worldZ(authoringHover.gz, authoringHover.d)
        );
      }
    } else if (ghostTarget && !state.completed) {
      var fp = footprint(ghostTarget.type, ghostTarget.rot);
      target.set(
        worldX(ghostTarget.gx, fp.w),
        ghostTarget.y * PLATE_H + BASE_Y + 1.2,
        worldZ(ghostTarget.gz, fp.d)
      );
    } else {
      target.set(0, 7.2, 0);
    }

    var dir = camera.position.clone().sub(controls.target).normalize();
    var dist = clamp(camera.position.distanceTo(controls.target), 12, 22);
    var toPosition = target.clone().add(dir.multiplyScalar(dist));
    if (toPosition.y < target.y + 4) toPosition.y = target.y + 4;

    tweenCamera(toPosition, target, 720);
  }

  function resetView() {
    tweenCamera(new THREE.Vector3(28, 25, 40), new THREE.Vector3(0, 5.5, 0), 760);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     TOAST / COMPLETION
     ───────────────────────────────────────────────────────────────────────── */

  function toast(message, type, duration) {
    if (!els.toast) return;
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = window.setTimeout(function () {
      els.toast.className = 'toast' + (type ? ' ' + type : '');
    }, duration || 2200);
  }

  function showComplete(options) {
    var opts = options || {};
    if (state.mode !== 'guided') return;

    els.completeOverlay.classList.remove('hidden');
    buildConfetti();
    if (opts.sound !== false) audio.complete();
  }

  function hideComplete() {
    window.clearTimeout(completeTimer);
    if (els.completeOverlay) els.completeOverlay.classList.add('hidden');
  }

  function buildConfetti() {
    if (!els.confettiLayer) return;
    els.confettiLayer.innerHTML = '';
    var colors = ['#ffc93c', '#45d6ff', '#ff637d', '#3ee6a3', '#a78bfa', '#e8eef2', '#ff9f1c'];
    for (var i = 0; i < 56; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.width = (5 + Math.random() * 6) + 'px';
      piece.style.height = (9 + Math.random() * 10) + 'px';
      piece.style.animationDuration = (2.6 + Math.random() * 2.8) + 's';
      piece.style.animationDelay = (-Math.random() * 4) + 's';
      piece.style.setProperty('--drift', ((Math.random() - 0.5) * 180).toFixed(0) + 'px');
      els.confettiLayer.appendChild(piece);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     AUDIO
     ───────────────────────────────────────────────────────────────────────── */

  function AudioKit() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  AudioKit.prototype.setEnabled = function (enabled) {
    this.enabled = !!enabled;
    if (this.master) {
      this.master.gain.value = this.enabled ? 0.9 : 0.0001;
    }
  };

  AudioKit.prototype.ensure = function () {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) {
      return null;
    }
  };

  AudioKit.prototype.tone = function (freq, duration, type, volume, slideTo, delay) {
    var ctx = this.ensure();
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  };

  AudioKit.prototype.click = function () {
    this.tone(540, 0.045, 'triangle', 0.035, 680);
  };

  AudioKit.prototype.snap = function () {
    this.tone(165, 0.13, 'triangle', 0.15, 62);
    this.tone(1320, 0.035, 'square', 0.035, 420);
    this.tone(760, 0.055, 'sine', 0.045, 980);
  };

  AudioKit.prototype.place = function () {
    this.tone(420, 0.07, 'triangle', 0.06, 560);
    this.tone(880, 0.06, 'sine', 0.035, 1100, 0.01);
  };

  AudioKit.prototype.error = function () {
    this.tone(150, 0.14, 'sawtooth', 0.045, 92);
  };

  AudioKit.prototype.complete = function () {
    var notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    for (var i = 0; i < notes.length; i++) {
      this.tone(notes[i], 0.42, 'triangle', 0.075, null, i * 0.11);
    }
  };

  var audio = new AudioKit();

  /* ─────────────────────────────────────────────────────────────────────────
     SAVE / LOAD FILES
     ───────────────────────────────────────────────────────────────────────── */

  function serializeBuiltin(p) {
    return {
      step: p.step,
      type: p.type,
      typeLabel: typeLabel(p.type),
      color: p.color,
      colorName: p.colorName,
      x: p.gx,
      z: p.gz,
      y: p.y,
      rot: p.rot,
      module: p.module
    };
  }

  function serializeCustom(p) {
    return {
      step: p.step,
      type: p.type,
      typeLabel: typeLabel(p.type),
      color: p.color,
      colorName: p.colorName || getColorName(p.color),
      x: p.gx,
      z: p.gz,
      y: p.y,
      rot: p.rot,
      module: 'custom'
    };
  }

  function saveProgressFile() {
    var placed = getPlacedCount();
    var placedBricks = [];
    if (state.mode !== 'authoring') {
      for (var i = 0; i < placed; i++) {
        placedBricks.push(serializeBuiltin(BUILTIN_PLACEMENTS[i]));
      }
    }

    var payload = {
      app: APP.name,
      version: APP.version,
      type: 'brickstep-progress',
      modelId: state.modelId,
      modelName: APP.modelName,
      totalSteps: APP.totalSteps,
      activeStep: state.activeStep,
      completed: state.completed,
      placedCount: placed,
      mode: state.mode,
      explode: state.explode,
      sound: state.sound,
      customBricks: state.customBricks.map(serializeCustom),
      placedBricks: placedBricks,
      savedAt: new Date().toISOString()
    };

    downloadFile('brickstep_pro_250.json', JSON.stringify(payload, null, 2));
    toast('Saved brickstep_pro_250.json — take it to any device.', 'good', 2400);
  }

  function exportCustomFile() {
    if (state.customBricks.length === 0) {
      toast('Add at least one brick in Authoring Studio before exporting.', 'warn', 2200);
      return;
    }

    var payload = {
      app: APP.name,
      version: APP.version,
      type: 'brickstep-custom-model',
      modelId: 'custom-' + Date.now(),
      modelName: 'My Custom Build',
      totalSteps: 250,
      pieceCount: state.customBricks.length,
      authorType: state.authorType,
      authorColor: state.authorColor,
      steps: state.customBricks.map(serializeCustom),
      exportedAt: new Date().toISOString()
    };

    downloadFile('brickstep_custom_250.json', JSON.stringify(payload, null, 2));
    toast('Exported ' + state.customBricks.length + '-step custom sequence.', 'good', 2400);
  }

  function applyImportedData(data) {
    var isCustom = Array.isArray(data) ||
      (data && data.type === 'brickstep-custom-model') ||
      (data && Array.isArray(data.steps) && data.activeStep === undefined);

    if (isCustom) {
      var rawSteps = Array.isArray(data) ? data : data.steps;
      var importedCustom = sanitizeCustomBricks(rawSteps || []);
      if (!importedCustom.length) {
        toast('The custom file contains no valid bricks.', 'bad', 2400);
        return false;
      }
      state.mode = 'authoring';
      state.customBricks = importedCustom;
      state.activeStep = 1;
      state.completed = false;
      state.explode = 0;
      hideComplete();
      setAuthoring(true, { silent: true, skipSave: true });
      updateAll();
      saveStateNow();
      toast('Imported custom build · ' + importedCustom.length + ' steps. Export or keep editing.', 'good', 3200);
      return true;
    }

    if (data && data.activeStep !== undefined) {
      var importedState = sanitizeState({
        activeStep: data.activeStep,
        completed: data.completed,
        mode: data.mode,
        customBricks: data.customBricks,
        explode: data.explode,
        sound: data.sound,
        authorType: data.authorType,
        authorColor: data.authorColor,
        authorRot: data.authorRot
      });
      state = importedState;
      state.modelId = data.modelId || APP.modelId;
      audio.setEnabled(state.sound);

      setAuthoring(state.mode === 'authoring', { silent: true, skipSave: true });
      updateAll();
      saveStateNow();

      if (state.completed) {
        window.setTimeout(function () {
          showComplete({ sound: false });
        }, 450);
      }
      toast('Progress restored · step ' + state.activeStep + ' of 250.', 'good', 2600);
      return true;
    }

    toast('This JSON file is not a BrickStep progress or custom model.', 'bad', 2600);
    return false;
  }

  function importFile(file) {
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result || ''));
        applyImportedData(data);
      } catch (e) {
        toast('Could not read that JSON file. Please choose a BrickStep export.', 'bad', 2800);
      } finally {
        els.fileInput.value = '';
      }
    };

    reader.onerror = function () {
      toast('Could not read that file.', 'bad', 2200);
      els.fileInput.value = '';
    };

    reader.readAsText(file);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     HELP / FULLSCREEN / SCREENSHOT
     ───────────────────────────────────────────────────────────────────────── */

  function openHelp() {
    els.helpModal.classList.remove('hidden');
    window.setTimeout(function () {
      if (els.btnCloseHelp) els.btnCloseHelp.focus();
    }, 40);
  }

  function closeHelp() {
    els.helpModal.classList.add('hidden');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (els.viewportShell.requestFullscreen) {
        els.viewportShell.requestFullscreen().catch(function () {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
  }

  function takeScreenshot() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    try {
      var url = renderer.domElement.toDataURL('image/png');
      var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadDataUrl('brickstep-' + stamp + '.png', url);
      toast('Screenshot downloaded.', 'good', 1800);
    } catch (e) {
      toast('Screenshot is not available in this browser.', 'bad', 1800);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     SOUND TOGGLE
     ───────────────────────────────────────────────────────────────────────── */

  function toggleSound() {
    state.sound = !state.sound;
    audio.setEnabled(state.sound);
    if (state.sound) audio.click();
    updateHud();
    scheduleSave();
    toast(state.sound ? 'Sound enabled.' : 'Sound muted.', '', 1200);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     EVENT BINDINGS
     ───────────────────────────────────────────────────────────────────────── */

  function bindEvents() {
    /* Top bar */
    els.btnSound.addEventListener('click', function () {
      audio.ensure();
      toggleSound();
    });
    els.btnSave.addEventListener('click', function () { audio.ensure(); saveProgressFile(); });
    els.btnLoad.addEventListener('click', function () { audio.ensure(); els.fileInput.click(); });
    els.fileInput.addEventListener('change', function () {
      if (els.fileInput.files && els.fileInput.files[0]) importFile(els.fileInput.files[0]);
    });
    els.btnHelp.addEventListener('click', function () { audio.ensure(); openHelp(); });
    els.btnCloseHelp.addEventListener('click', closeHelp);
    els.helpModal.addEventListener('click', function (event) {
      if (event.target.getAttribute && event.target.getAttribute('data-close-modal') !== null) closeHelp();
    });

    /* Step engine */
    els.btnSnap.addEventListener('click', function () {
      audio.ensure();
      if (state.mode === 'authoring') placeAuthoringAtHover(null);
      else snapCurrent();
    });
    els.btnNext.addEventListener('click', function () { audio.ensure(); snapCurrent(); });
    els.btnPrev.addEventListener('click', function () { audio.ensure(); prevStep(); });
    els.btnRotate.addEventListener('click', rotatePreview);
    els.stepRange.addEventListener('input', function () { jumpToStep(Number(els.stepRange.value)); });

    /* Explode + camera */
    els.explodeSlider.addEventListener('input', function () {
      state.explode = clamp(Number(els.explodeSlider.value) || 0, 0, 100);
      updateBuiltinInstances();
      updateCustomInstances();
      updateHud();
      scheduleSave();
    });
    els.btnResetView.addEventListener('click', function () { audio.click(); resetView(); });
    els.btnFocus.addEventListener('click', function () { audio.click(); focusCurrent(); });

    /* Authoring */
    els.btnAuthoring.addEventListener('click', function () {
      audio.ensure();
      setAuthoring(state.mode !== 'authoring', { silent: false });
    });
    els.authorType.addEventListener('change', function () {
      state.authorType = BRICK_TYPES[els.authorType.value] ? els.authorType.value : '2x4b';
      if (lastPointer) authoringHover = computeAuthoringHover(lastPointer);
      updateGhost();
      updateHud();
      scheduleSave();
    });
    els.authorColor.addEventListener('input', function () {
      state.authorColor = isHexColor(els.authorColor.value) ? els.authorColor.value : '#3f7fbf';
      updateGhost();
      updateHud();
      scheduleSave();
    });
    els.btnUndo.addEventListener('click', function () { audio.click(); undoCustom(); });
    els.btnClearCustom.addEventListener('click', clearCustom);
    els.btnExportCustom.addEventListener('click', function () { audio.click(); exportCustomFile(); });

    /* Completion */
    els.btnCelebrate.addEventListener('click', function () {
      hideComplete();
      audio.click();
      toast('Studio unlocked — orbit the finished castle.', 'good', 2000);
    });
    els.btnResetBuild.addEventListener('click', function () {
      if (window.confirm('Start over and remove all 250 placed bricks?')) resetBuild();
    });

    /* Viewport tools */
    els.btnFullscreen.addEventListener('click', toggleFullscreen);
    els.btnScreenshot.addEventListener('click', takeScreenshot);
    document.addEventListener('fullscreenchange', function () {
      window.setTimeout(onResize, 120);
    });

    /* Canvas pointer */
    renderer.domElement.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      pointerDown = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now()
      };
      audio.ensure();
    });

    renderer.domElement.addEventListener('pointermove', function (event) {
      lastPointer = { clientX: event.clientX, clientY: event.clientY };
      if (state.mode !== 'authoring') return;
      authoringHover = computeAuthoringHover(event);
      updateGhost();
    });

    renderer.domElement.addEventListener('pointerup', function (event) {
      if (event.button !== 0 || !pointerDown) return;
      var dist = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      var elapsed = performance.now() - pointerDown.time;
      pointerDown = null;
      if (dist < 7 && elapsed < 700) handleCanvasClick(event);
    });

    renderer.domElement.addEventListener('pointerleave', function () {
      pointerDown = null;
    });

    /* Drag the brick from the bay */
    els.brickVisual.addEventListener('dragstart', function (event) {
      if (state.completed && state.mode !== 'authoring') {
        event.preventDefault();
        toast('Build complete — reset or author a new model to keep building.', 'warn', 2200);
        return;
      }
      isDraggingBrick = true;
      try {
        event.dataTransfer.setData('text/plain', 'brickstep-brick');
        event.dataTransfer.effectAllowed = 'copy';
      } catch (e) {}
      els.dropHint.classList.remove('hidden');
      audio.ensure();
    });

    els.brickVisual.addEventListener('dragend', function () {
      isDraggingBrick = false;
      els.dropHint.classList.add('hidden');
    });

    els.viewportShell.addEventListener('dragover', function (event) {
      if (!isDraggingBrick) return;
      event.preventDefault();
      try { event.dataTransfer.dropEffect = 'copy'; } catch (e) {}
      els.dropHint.classList.remove('hidden');
    });

    els.viewportShell.addEventListener('dragleave', function (event) {
      if (!isDraggingBrick) return;
      if (event.relatedTarget && els.viewportShell.contains(event.relatedTarget)) return;
      els.dropHint.classList.add('hidden');
    });

    els.viewportShell.addEventListener('drop', handleDrop);

    /* Keyboard */
    window.addEventListener('keydown', function (event) {
      var tag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
      var isField = tag === 'input' || tag === 'select' || tag === 'textarea' || event.target.isContentEditable;

      if (event.key === 'Escape') {
        if (!els.helpModal.classList.contains('hidden')) {
          closeHelp();
          return;
        }
        if (!els.completeOverlay.classList.contains('hidden')) {
          hideComplete();
          return;
        }
      }

      if (!els.helpModal.classList.contains('hidden')) return;
      if (isField) return;
      if (event.key === ' ' && (tag === 'button' || tag === 'a')) return;

      if (event.key === 'ArrowRight' || event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        if (state.mode !== 'authoring') snapCurrent();
      } else if (event.key === 'ArrowLeft' || event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        prevStep();
      } else if (event.key === ' ') {
        event.preventDefault();
        if (state.mode === 'authoring') placeAuthoringAtHover(null);
        else snapCurrent();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        rotatePreview();
      } else if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        state.explode = state.explode > 0 ? 0 : 60;
        updateBuiltinInstances();
        updateCustomInstances();
        updateHud();
        scheduleSave();
      } else if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        focusCurrent();
      } else if (event.key === '?' || event.key === '/') {
        event.preventDefault();
        openHelp();
      }
    });

    /* Resize + persistence */
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function () { onResize(); });
      observer.observe(els.viewportShell);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) saveStateNow();
    });

    window.addEventListener('beforeunload', saveStateNow);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RESIZE
     ───────────────────────────────────────────────────────────────────────── */

  function onResize() {
    if (!renderer || !camera || !els.viewport) return;
    var w = els.viewport.clientWidth;
    var h = els.viewport.clientHeight;
    if (w < 2 || h < 2) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     ANIMATION LOOP
     ───────────────────────────────────────────────────────────────────────── */

  function animate(now) {
    window.requestAnimationFrame(animate);

    var dt = Math.min(clock.getDelta(), 0.06);
    var elapsed = clock.elapsedTime;

    if (cameraTween) {
      updateCameraTween(now);
    } else if (controls) {
      controls.update();
    }

    if (ghostGroup && ghostGroup.visible) {
      ghostMesh.position.y = 0.035 + Math.sin(elapsed * 3.2) * 0.035;
      ghostMaterial.opacity = 0.36 + Math.sin(elapsed * 3.2) * 0.06;
      ghostOutline.material.opacity = 0.72 + Math.sin(elapsed * 3.2) * 0.2;
      ghostRing.material.opacity = 0.42 + Math.sin(elapsed * 3.2) * 0.15;
      ghostRing.rotation.z += dt * 0.28;
      ghostBeam.material.opacity = 0.14 + Math.sin(elapsed * 2.6) * 0.06;
      ghostBeacon.position.y = 2.4 + Math.sin(elapsed * 2.1) * 0.14;
      ghostBeacon.rotation.y += dt * 1.8;
    }

    updateEffects(dt);

    renderer.render(scene, camera);

    statFrames++;
    if (now - statLast >= 520) {
      var fps = Math.round(statFrames * 1000 / Math.max(1, now - statLast));
      statLast = now;
      statFrames = 0;
      if (els.fpsValue) {
        els.fpsValue.textContent = String(clamp(fps, 0, 99));
        els.fpsValue.className = fps >= 52 ? 'good' : (fps >= 32 ? 'warn' : 'bad');
      }

    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     LOADING / BOOT
     ───────────────────────────────────────────────────────────────────────── */

  function setLoading(percent, text) {
    if (els.loadingBar) els.loadingBar.style.width = clamp(percent, 0, 100) + '%';
    if (text && els.loadingText) els.loadingText.textContent = text;
  }

  function showFatal(message) {
    if (els.loadingError) {
      els.loadingError.classList.remove('hidden');
      els.loadingError.textContent = message;
    }
    if (els.loadingText) els.loadingText.textContent = 'Unable to start the 3D studio';
    setLoading(100, 'Unable to start the 3D studio');
  }

  function applyLoadedState() {
    els.authorType.value = state.authorType;
    els.authorColor.value = state.authorColor;
    els.explodeSlider.value = String(state.explode);
    audio.setEnabled(state.sound);

    setAuthoring(state.mode === 'authoring', { silent: true, skipSave: true });
    updateAll();
    saveStateNow();
  }

  function boot() {
    cacheDom();
    state = loadState();

    try {
      if (!window.THREE) {
        showFatal('Three.js could not be loaded. Check your internet connection and reload the page.');
        return;
      }
      if (!THREE.OrbitControls) {
        showFatal('OrbitControls could not be loaded. Check your internet connection and reload the page.');
        return;
      }

      setLoading(12, 'Moulding 250 bricks…');
      buildGeometryCache();

      setLoading(36, 'Laying the baseplate…');
      initScene();

      setLoading(62, 'Stacking instanced geometry…');
      initInstances();
      initGhost();

      setLoading(82, 'Wiring the instruction manual…');
      bindEvents();
      applyLoadedState();
      onResize();
      buildModuleList();
      updateAll();

      setLoading(96, 'Opening the studio…');
      statLast = performance.now();
      window.requestAnimationFrame(animate);

      window.setTimeout(function () {
        setLoading(100, 'Ready to build');
        els.loadingScreen.classList.add('loaded');
        window.setTimeout(function () {
          els.loadingScreen.classList.add('hidden');
        }, 900);
        if (state.completed) {
          window.setTimeout(function () {
            showComplete({ sound: false });
          }, 720);
        }
      }, 420);

      window.BrickStep = {
        version: APP.version,
        getState: function () { return JSON.parse(JSON.stringify(state)); },
        getPlacements: function () { return BUILTIN_PLACEMENTS.slice(); },
        snap: snapCurrent,
        jump: jumpToStep,
        reset: resetBuild,
        toggleAuthoring: function () { setAuthoring(state.mode !== 'authoring'); },
        importJSON: applyImportedData,
        save: saveStateNow,
        exportProgress: saveProgressFile
      };
    } catch (error) {
      if (window.console && console.error) console.error(error);
      showFatal('The 3D scene could not be created in this browser. Try Chrome, Safari, or Firefox with WebGL enabled.');
    }
  }

  boot();
})();
