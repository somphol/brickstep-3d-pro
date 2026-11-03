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
    version: '2.0.0',
    storageKey: 'brickstep_pro_250_v1',
    defaultModelId: 'castle-workshop-250'
  };

  var CELL = 1;             // one stud pitch in world units
  var PLATE_H = 0.4;        // one plate height
  var BASE_Y = 0.15;        // brick bottom sits above the baseplate studs
  var CASTLE_PLATE = 24;    // classic workshop board
  var AUTHOR_GRID = 24;     // authoring board
  var AUTHOR_MAX = 250;     // authoring piece cap
  var GRID = CASTLE_PLATE;  // active board size; changes when a preset loads
  var BUILD_OFFSET = 4;     // built-in 16 × 16 castle centred on its 24 × 24 plate

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
    black: { name: 'Black', hex: '#22262e' },
    neonCyan: { name: 'Neon Cyan', hex: '#32e6ff' },
    neonPink: { name: 'Neon Pink', hex: '#ff3d8d' },
    lime: { name: 'Electric Lime', hex: '#9cff3d' },
    silver: { name: 'Silver', hex: '#c9d4e0' },
    gunmetal: { name: 'Gunmetal', hex: '#3b4654' },
    deepRed: { name: 'Deep Red', hex: '#8f1d2c' },
    teal: { name: 'Teal', hex: '#0f8b8d' },
    bronze: { name: 'Bronze', hex: '#b87333' },
    magenta: { name: 'Magenta', hex: '#c026d3' }
  };

  var CASTLE_MODULES = [
    { id: 'foundation', name: 'Foundation', icon: '▦', from: 1, to: 64, color: '#64748b' },
    { id: 'walls', name: 'Walls & Towers', icon: '▥', from: 65, to: 166, color: '#3f7fbf' },
    { id: 'crown', name: 'Keep & Crown', icon: '♛', from: 167, to: 250, color: '#f1c40f' }
  ];

  var activeModel = null;
  var modelLoading = false;
  var modelLoadToken = 0;
  var pendingModelId = null;
  var authoringView = null;
  var previewFinished = false;
  var explodeFrame = 0;

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
      'modelCredit', 'modelGrid', 'libraryStatus', 'modelLoader', 'modelLoaderTitle',
      'modelLoaderText', 'scrubberMax', 'completePieces', 'completeModules',
      'completeTitle', 'completeText', 'btnQuickPreview', 'previewBadge',
      'viewModeState', 'viewModeToggle'
    ];

    ids.forEach(function (id) {
      els[id] = document.getElementById(id);
    });

    els.modelIcon = document.querySelector('.model-icon');
    els.moduleBadgeDot = document.querySelector('.module-badge-dot');
    els.viewPanel = document.querySelector('.view-panel');
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
      modelId: APP.defaultModelId,
      activeStep: 1,
      completed: false,
      mode: 'guided',
      customBricks: [],
      modelProgress: {},
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
    var plateSize = CASTLE_PLATE;
    var O = BUILD_OFFSET;

    function add(type, gx, gz, y, rot, colorKey) {
      var def = BRICK_TYPES[type];
      if (!def) throw new Error('Unknown brick type: ' + type);

      var fp = footprint(type, rot);
      if (gx < 0 || gz < 0 || gx + fp.w > plateSize || gz + fp.d > plateSize) {
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

    if (list.length !== 250) {
      throw new Error('Castle generator produced ' + list.length + ' pieces, expected 250.');
    }

    list.forEach(function (p, index) {
      p.step = index + 1;
      p.module = p.step <= 64 ? 'foundation' : (p.step <= 166 ? 'walls' : 'crown');
    });

    return list;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PROCEDURAL PRESET BUILDER
     A small, deterministic brick tiler. Each preset is generated only when
     its library card is loaded, so inactive 1k–5k models are just metadata.
     ───────────────────────────────────────────────────────────────────────── */

  function ModelBuilder(plateSize) {
    this.plateSize = plateSize;
    this.placements = [];
    this.occupied = Object.create(null);
    this.moduleDefs = [];
    this.currentModule = null;
  }

  ModelBuilder.prototype.module = function (id, name, icon, color) {
    var exists = null;
    for (var i = 0; i < this.moduleDefs.length; i++) {
      if (this.moduleDefs[i].id === id) { exists = this.moduleDefs[i]; break; }
    }
    if (!exists) {
      exists = { id: id, name: name, icon: icon, color: color };
      this.moduleDefs.push(exists);
    }
    this.currentModule = id;
    return this;
  };

  ModelBuilder.prototype.add = function (type, gx, gz, y, rot, color, moduleId) {
    var def = BRICK_TYPES[type];
    if (!def) throw new Error('Unknown brick type: ' + type);

    var fp = footprint(type, rot);
    if (gx < 0 || gz < 0 || gx + fp.w > this.plateSize || gz + fp.d > this.plateSize) {
      throw new Error('Out of bounds: ' + type + ' @ ' + gx + ',' + gz);
    }
    if (y < 0) throw new Error('Negative Y for ' + type);

    var height = Math.round(def.h / PLATE_H);
    var xx, zz, yy, key;
    for (xx = gx; xx < gx + fp.w; xx++) {
      for (zz = gz; zz < gz + fp.d; zz++) {
        for (yy = y; yy < y + height; yy++) {
          key = xx + '|' + yy + '|' + zz;
          if (this.occupied[key]) {
            throw new Error('Overlap at ' + key + ' for ' + type + ' step ' + (this.placements.length + 1));
          }
        }
      }
    }

    var colorDef;
    if (typeof color === 'string') {
      colorDef = COLORS[color] || (isHexColor(color) ? { hex: color, name: getColorName(color) } : COLORS.steel);
    } else {
      colorDef = color || COLORS.steel;
    }

    var module = moduleId || this.currentModule;
    if (!module) throw new Error('No module selected for ' + type);

    var placement = {
      step: this.placements.length + 1,
      type: type,
      gx: gx,
      gz: gz,
      y: y,
      rot: rot,
      color: colorDef.hex,
      colorName: colorDef.name,
      module: module
    };

    for (xx = gx; xx < gx + fp.w; xx++) {
      for (zz = gz; zz < gz + fp.d; zz++) {
        for (yy = y; yy < y + height; yy++) {
          this.occupied[xx + '|' + yy + '|' + zz] = placement.step;
        }
      }
    }

    this.placements.push(placement);
    return placement;
  };

  ModelBuilder.prototype.fillRect = function (type1, type2, gx, gz, w, d, y, colorFn, moduleId) {
    if (w < 2 || d < 2 || w % 2 !== 0 || d % 2 !== 0) {
      throw new Error('fillRect needs even dimensions: ' + w + 'x' + d);
    }

    var that = this;
    var index = 0;
    function colorAt(x, z) {
      return typeof colorFn === 'function' ? colorFn(index, x, z) : colorFn;
    }

    var rowCost = Math.ceil(w / 4) * (d / 2);
    var canRotate = (w % 2 === 0 && d % 4 === 0);
    var rotCost = canRotate ? (w / 2) * (d / 4) : Infinity;

    if (canRotate && rotCost < rowCost) {
      for (var z = 0; z < d; z += 4) {
        for (var x = 0; x < w; x += 2) {
          that.add(type1, gx + x, gz + z, y, 90, colorAt(x, z), moduleId);
          index++;
        }
      }
      return;
    }

    for (var dz = 0; dz < d; dz += 2) {
      var dx = 0;
      while (dx < w) {
        var remaining = w - dx;
        if (remaining >= 4) {
          that.add(type1, gx + dx, gz + dz, y, 0, colorAt(dx, dz), moduleId);
          dx += 4;
        } else {
          that.add(type2, gx + dx, gz + dz, y, 0, colorAt(dx, dz), moduleId);
          dx += 2;
        }
        index++;
      }
    }
  };

  ModelBuilder.prototype.block = function (type1, type2, gx, gz, w, d, layers, y, colorFn, moduleId) {
    var layerHeight = Math.round(BRICK_TYPES[type1].h / PLATE_H);
    for (var l = 0; l < layers; l++) {
      this.fillRect(
        type1, type2, gx, gz, w, d, y + l * layerHeight,
        function (i, x, z) {
          return typeof colorFn === 'function' ? colorFn(i, x, z, l) : colorFn;
        },
        moduleId
      );
    }
  };

  ModelBuilder.prototype.isFree = function (type, gx, gz, y, rot) {
    var def = BRICK_TYPES[type];
    if (!def) return false;
    var fp = footprint(type, rot);
    if (gx < 0 || gz < 0 || gx + fp.w > this.plateSize || gz + fp.d > this.plateSize || y < 0) return false;
    var height = Math.round(def.h / PLATE_H);
    for (var xx = gx; xx < gx + fp.w; xx++) {
      for (var zz = gz; zz < gz + fp.d; zz++) {
        for (var yy = y; yy < y + height; yy++) {
          if (this.occupied[xx + '|' + yy + '|' + zz]) return false;
        }
      }
    }
    return true;
  };

  ModelBuilder.prototype.ringRect = function (type1, type2, gx, gz, w, d, thickness, layers, y, colorFn, moduleId) {
    var layerHeight = Math.round(BRICK_TYPES[type1].h / PLATE_H);
    for (var l = 0; l < layers; l++) {
      var ly = y + l * layerHeight;
      var wrap = function (i, x, z) {
        return typeof colorFn === 'function' ? colorFn(i, gx + x, gz + z, l) : colorFn;
      };
      this.fillRect(type1, type2, gx, gz, w, thickness, ly, wrap, moduleId);
      this.fillRect(type1, type2, gx, gz + d - thickness, w, thickness, ly, wrap, moduleId);
      this.fillRect(type1, type2, gx, gz + thickness, thickness, d - thickness * 2, ly, wrap, moduleId);
      this.fillRect(type1, type2, gx + w - thickness, gz + thickness, thickness, d - thickness * 2, ly, wrap, moduleId);
    }
  };

  ModelBuilder.prototype.finishMega = function (meta, target, plinthName, plinthIcon, plinthColor, colorFn) {
    if (this.placements.length < target) {
      this.module('plinth', plinthName || 'Display Plinth', plinthIcon || '▦', plinthColor || '#64748b');
      var added = 0;
      for (var layer = 0; layer < 3 && this.placements.length < target; layer++) {
        var y = layer * 3;
        for (var x = 2; x <= this.plateSize - 4 && this.placements.length < target; x += 2) {
          for (var z = 2; z <= this.plateSize - 4 && this.placements.length < target; z += 2) {
            var outer = x < 8 || x >= this.plateSize - 8 || z < 8 || z >= this.plateSize - 8;
            if (!outer) continue;
            if (!this.isFree('2x2b', x, z, y, 0)) continue;
            this.add('2x2b', x, z, y, 0, colorFn ? colorFn(added, x, z, layer) : (layer % 2 ? 'gunmetal' : 'charcoal'), 'plinth');
            added++;
          }
        }
      }
    }
    return this.finish(meta);
  };

  ModelBuilder.prototype.finish = function (meta) {
    var placements = this.placements;
    var modules = [];
    var expected = 1;

    this.moduleDefs.forEach(function (m) {
      var list = placements.filter(function (p) { return p.module === m.id; });
      if (!list.length) return;
      if (list[0].step !== expected) {
        throw new Error('Module ' + m.id + ' starts at ' + list[0].step + ', expected ' + expected);
      }
      expected = list[list.length - 1].step + 1;
      modules.push({
        id: m.id,
        name: m.name,
        icon: m.icon,
        color: m.color,
        from: list[0].step,
        to: list[list.length - 1].step,
        count: list.length
      });
    });

    if (expected - 1 !== placements.length) {
      throw new Error('Module coverage gap: ' + (expected - 1) + ' of ' + placements.length);
    }

    return {
      id: meta.id,
      name: meta.name,
      icon: meta.icon,
      category: meta.category,
      description: meta.description,
      accent: meta.accent,
      plateSize: this.plateSize,
      pieceCount: placements.length,
      placements: placements,
      modules: modules
    };
  };

  function buildCastlePreset() {
    var placements = buildCastleModel();
    var modules = CASTLE_MODULES.map(function (m) {
      return {
        id: m.id,
        name: m.name,
        icon: m.icon,
        color: m.color,
        from: m.from,
        to: m.to,
        count: m.to - m.from + 1
      };
    });
    return {
      placements: placements,
      modules: modules,
      pieceCount: placements.length
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PRESET 1 · AURORA SHUTTLE — launch pad, tower, boosters, tank, orbiter
     ───────────────────────────────────────────────────────────────────────── */

  function buildAuroraShuttle() {
    var b = new ModelBuilder(48);

    b.module('pad', 'Launch Pad', '▦', '#64748b');
    b.block('2x4b', '2x2b', 9, 12, 26, 20, 3, 0, function (i, x, z, layer) {
      if (layer === 2) return (i % 6 === 0) ? 'gold' : 'gunmetal';
      return (i % 5 === 0) ? 'slate' : 'charcoal';
    }, 'pad');

    b.module('tower', 'Launch Tower', '▥', '#f1c40f');
    b.block('2x4b', '2x2b', 10, 12, 6, 6, 25, 9, function (i, x, z, layer) {
      if (layer % 6 === 5) return 'gold';
      return layer % 2 === 0 ? 'steel' : 'white';
    }, 'tower');
    b.fillRect('2x4p', '2x2p', 11, 13, 4, 4, 84, 'gold', 'tower');

    b.module('boosters', 'Solid Boosters', '▮', '#ff637d');
    [13, 29].forEach(function (bx, bi) {
      b.block('2x4b', '2x2b', bx, 20, 6, 6, 20, 9, function (i, x, z, layer) {
        if (layer % 5 === 4) return 'deepRed';
        return layer % 2 === 0 ? 'white' : 'silver';
      }, 'boosters');
      b.fillRect('2x4p', '2x2p', bx + 1, 21, 4, 4, 69, bi === 0 ? 'deepRed' : 'gold', 'boosters');
      b.add('2x2p', bx + 2, 22, 70, 0, 'gold', 'boosters');
    });

    b.module('tank', 'External Tank', '◆', '#e67e22');
    b.block('2x4b', '2x2b', 20, 20, 8, 8, 26, 9, function (i, x, z, layer) {
      if (layer % 8 === 7) return 'gold';
      return layer % 2 === 0 ? 'orange' : 'tan';
    }, 'tank');
    b.fillRect('2x4p', '2x2p', 21, 21, 6, 6, 87, 'orange', 'tank');
    b.fillRect('2x4p', '2x2p', 22, 22, 4, 4, 88, 'gold', 'tank');
    b.add('2x2p', 23, 23, 89, 0, 'white', 'tank');

    b.module('orbiter', 'Orbiter', '▰', '#e8eef2');
    b.block('2x4b', '2x2b', 20, 28, 8, 8, 18, 9, function (i, x, z, layer) {
      if (layer === 0) return 'black';
      if (layer % 6 === 5) return 'silver';
      return layer % 2 === 0 ? 'white' : 'cream';
    }, 'orbiter');
    b.fillRect('2x4p', '2x2p', 21, 29, 6, 6, 63, 'white', 'orbiter');
    b.fillRect('2x4p', '2x2p', 22, 30, 4, 4, 64, 'black', 'orbiter');
    b.add('2x2p', 23, 31, 65, 0, 'neonCyan', 'orbiter');

    b.module('wings', 'Wings & Tail', '◢', '#45d6ff');
    b.block('2x4p', '2x2p', 4, 28, 16, 10, 3, 21, function (i, x, z, layer) {
      return (i % 5 === 0) ? 'deepRed' : (layer === 2 ? 'neonCyan' : 'white');
    }, 'wings');
    b.block('2x4p', '2x2p', 28, 28, 16, 10, 3, 21, function (i, x, z, layer) {
      return (i % 5 === 0) ? 'deepRed' : (layer === 2 ? 'neonCyan' : 'white');
    }, 'wings');
    b.block('2x4b', '2x2b', 23, 36, 2, 8, 8, 9, function (i, x, z, layer) {
      return layer % 3 === 0 ? 'gold' : 'deepRed';
    }, 'wings');

    return b.finish({
      id: 'aurora-shuttle',
      name: 'Aurora Shuttle',
      icon: '🚀',
      category: 'SPACE',
      description: 'A launch-ready orbital shuttle stack with pad, tower, boosters, orange tank and delta wings.',
      accent: '#45d6ff'
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PRESET 2 · NEON WYRM — a four-legged cyber dragon with broad wings
     ───────────────────────────────────────────────────────────────────────── */

  function buildNeonWyrm() {
    var b = new ModelBuilder(48);

    b.module('terrain', 'Terrain & Claws', '◆', '#64748b');
    b.block('2x4b', '2x2b', 13, 12, 22, 18, 3, 0, function (i, x, z, layer) {
      return (i % 7 === 0) ? 'teal' : (layer % 2 === 0 ? 'charcoal' : 'slate');
    }, 'terrain');
    [
      [13, 22], [17, 24], [21, 22], [25, 24], [29, 22], [33, 24], [15, 26], [31, 26]
    ].forEach(function (r) {
      b.add('2x2b', r[0], r[1], 9, 0, (r[0] + r[1]) % 4 === 0 ? 'teal' : 'slate', 'terrain');
    });

    b.module('legs', 'Legs & Claws', '▥', '#3ee6a3');
    [
      [14, 28], [26, 28], [14, 10], [26, 10]
    ].forEach(function (f, fi) {
      b.block('2x4b', '2x2b', f[0], f[1], 8, 10, 2, 9, function (i, x, z, layer) {
        return layer === 1 ? 'teal' : 'charcoal';
      }, 'legs');
    });
    [
      [15, 29], [27, 29], [15, 11], [27, 11]
    ].forEach(function (l, li) {
      b.block('2x4b', '2x2b', l[0], l[1], 6, 6, 12, 15, function (i, x, z, layer) {
        if (layer % 4 === 3) return 'gold';
        return layer % 2 === 0 ? 'teal' : 'green';
      }, 'legs');
    });

    b.module('body', 'Body & Spines', '♜', '#32e6ff');
    b.block('2x4b', '2x2b', 19, 12, 10, 24, 10, 51, function (i, x, z, layer) {
      if (layer % 5 === 4) return 'gold';
      if (layer % 3 === 1) return 'teal';
      return 'green';
    }, 'body');
    [14, 18, 22, 26, 30, 34].forEach(function (cz, ci) {
      b.add('2x2b', 23, cz, 81, 0, ci % 2 ? 'neonPink' : 'magenta', 'body');
    });

    b.module('wings', 'Storm Wings', '◢', '#a78bfa');
    b.block('2x4p', '2x2p', 3, 20, 16, 16, 5, 60, function (i, x, z, layer) {
      if (layer === 4) return 'neonPink';
      if (layer === 0) return 'violet';
      return (i % 6 === 0) ? 'silver' : 'neonCyan';
    }, 'wings');
    b.block('2x4p', '2x2p', 29, 20, 16, 16, 5, 60, function (i, x, z, layer) {
      if (layer === 4) return 'neonPink';
      if (layer === 0) return 'violet';
      return (i % 6 === 0) ? 'silver' : 'neonCyan';
    }, 'wings');
    [5, 9, 13].forEach(function (wx) {
      b.add('2x2b', wx, 21, 65, 0, 'silver', 'wings');
      b.add('2x2b', wx + 27, 21, 65, 0, 'silver', 'wings');
    });

    b.module('neck', 'Neck & Head', '♛', '#f1c40f');
    b.block('2x4b', '2x2b', 21, 36, 6, 6, 8, 51, function (i, x, z, layer) {
      return layer % 4 === 3 ? 'gold' : 'teal';
    }, 'neck');
    b.block('2x4b', '2x2b', 20, 42, 8, 6, 8, 75, function (i, x, z, layer) {
      if (layer === 7) return 'gold';
      return layer % 2 === 0 ? 'teal' : 'lime';
    }, 'neck');
    b.add('2x2b', 20, 43, 99, 0, 'neonPink', 'neck');
    b.add('2x2b', 26, 43, 99, 0, 'neonPink', 'neck');
    b.add('2x2p', 22, 46, 99, 0, 'gold', 'neck');
    b.add('2x2p', 24, 46, 99, 0, 'neonCyan', 'neck');

    b.module('tail', 'Tail & Spikes', '➰', '#ff3d8d');
    [0, 6].forEach(function (tz, ti) {
      b.block('2x4b', '2x2b', 21, tz, 6, 6, 5, 51, function (i, x, z, layer) {
        return layer % 3 === 2 ? 'magenta' : (layer % 2 === 0 ? 'teal' : 'green');
      }, 'tail');
    });
    [0, 2, 4, 6, 8, 10].forEach(function (tz, ti) {
      b.add('2x2b', 23, tz, 66, 0, ti % 2 ? 'neonPink' : 'gold', 'tail');
    });

    return b.finish({
      id: 'neon-wyrm',
      name: 'Neon Wyrm',
      icon: '🐉',
      category: 'FANTASY',
      description: 'A four-legged neon dragon with broad storm wings, raised head, gold belly bands and a spiked tail.',
      accent: '#9cff3d'
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PRESET 3 · NEO MEGACITY — a 3k+ brick cyber skyline with a central spire
     ───────────────────────────────────────────────────────────────────────── */

  function buildNeoMegacity() {
    var b = new ModelBuilder(48);
    var glass = 'black';

    b.module('streets', 'Streets & Grid', '▦', '#64748b');
    b.block('2x4p', '2x2p', 2, 2, 44, 44, 1, 0, function (i, x, z) {
      var gridX = (x % 12 < 4);
      var gridZ = (z % 12 < 4);
      if (gridX || gridZ) return 'charcoal';
      return (i % 9 === 0) ? 'teal' : 'gunmetal';
    }, 'streets');

    // Low neon barriers around the edge of the district.
    for (var bx = 4; bx < 43; bx += 4) {
      b.add('1x2b', bx, 2, 1, 0, bx % 8 === 0 ? 'neonCyan' : 'gold', 'streets');
      b.add('1x2b', bx, 45, 1, 0, bx % 8 === 0 ? 'neonPink' : 'gold', 'streets');
    }
    for (var bz = 4; bz < 43; bz += 4) {
      b.add('1x2b', 2, bz, 1, 90, bz % 8 === 0 ? 'neonCyan' : 'gold', 'streets');
      b.add('1x2b', 45, bz, 1, 90, bz % 8 === 0 ? 'neonPink' : 'gold', 'streets');
    }

    var towers = [
      { id: 'west', x: 4, z: 4, w: 12, d: 10, h: 24, base: 'navy', accent: 'neonCyan', name: 'West District', icon: '▥', color: '#3f7fbf' },
      { id: 'west', x: 3, z: 18, w: 8, d: 12, h: 28, base: 'steel', accent: 'gold', name: 'West District', icon: '▥', color: '#3f7fbf' },
      { id: 'west', x: 4, z: 34, w: 10, d: 8, h: 18, base: 'teal', accent: 'neonPink', name: 'West District', icon: '▥', color: '#3f7fbf' },
      { id: 'central', x: 20, z: 3, w: 10, d: 12, h: 32, base: 'charcoal', accent: 'neonCyan', name: 'Central Spire', icon: '♛', color: '#f1c40f' },
      { id: 'central', x: 15, z: 18, w: 8, d: 8, h: 36, base: 'navy', accent: 'neonPink', name: 'Central Spire', icon: '♛', color: '#f1c40f', spire: true },
      { id: 'central', x: 18, z: 32, w: 8, d: 10, h: 26, base: 'gunmetal', accent: 'lime', name: 'Central Spire', icon: '♛', color: '#f1c40f' },
      { id: 'east', x: 34, z: 4, w: 8, d: 10, h: 22, base: 'steel', accent: 'neonPink', name: 'East District', icon: '▤', color: '#ff3d8d' },
      { id: 'east', x: 27, z: 16, w: 14, d: 10, h: 20, base: 'charcoal', accent: 'gold', name: 'East District', icon: '▤', color: '#ff3d8d' },
      { id: 'east', x: 30, z: 30, w: 10, d: 12, h: 24, base: 'navy', accent: 'lime', name: 'East District', icon: '▤', color: '#ff3d8d' }
    ];

    function towerColor(t) {
      return function (i, x, z, layer) {
        if (layer % 7 === 6) return t.accent;
        if (layer % 5 === 2 && i % 4 === 0) return glass;
        if (layer % 3 === 1 && i % 5 === 0) return 'silver';
        return t.base;
      };
    }

    towers.forEach(function (t) {
      b.module(t.id, t.name, t.icon, t.color);
      b.block('2x4b', '2x2b', t.x, t.z, t.w, t.d, t.h, 1, towerColor(t), t.id);

      if (t.spire) {
        b.block('2x4b', '2x2b', t.x + 1, t.z + 1, 6, 6, 12, 1 + t.h * 3, function (i, x, z, layer) {
          return layer % 4 === 3 ? 'neonPink' : (layer % 2 === 0 ? 'navy' : 'steel');
        }, t.id);
        b.add('2x2p', t.x + 3, t.z + 3, 1 + t.h * 3 + 36, 0, 'neonCyan', t.id);
        b.add('2x2b', t.x + 3, t.z + 3, 1 + t.h * 3 + 37, 0, 'neonPink', t.id);
      }

      if (!t.spire) {
        var capY = 1 + t.h * 3;
        var cw = Math.max(4, t.w - 4);
        var cd = Math.max(4, t.d - 4);
        if (cw % 2 !== 0) cw--;
        if (cd % 2 !== 0) cd--;
        b.fillRect('2x4p', '2x2p', t.x + Math.floor((t.w - cw) / 2), t.z + Math.floor((t.d - cd) / 2), cw, cd, capY, function (i) {
          return i % 3 === 0 ? 'neonCyan' : 'silver';
        }, t.id);
        b.add('2x2b', t.x + Math.floor(t.w / 2) - 1, t.z + Math.floor(t.d / 2) - 1, capY + 1, 0, t.accent, t.id);
        b.add('2x2b', t.x + Math.floor(t.w / 2) - 1, t.z + Math.floor(t.d / 2) - 1, capY + 4, 0, 'gold', t.id);
      }
    });

    b.module('skyline', 'Skyline Details', '✦', '#a78bfa');
    // Neon streetlights in the road gaps.
    [
      [18, 16], [18, 28], [12, 32], [24, 28], [24, 30], [8, 16], [12, 16],
      [32, 27], [36, 27], [42, 16], [42, 27], [16, 30], [20, 30], [28, 29]
    ].forEach(function (s, si) {
      b.add('2x2b', s[0], s[1], 1, 0, si % 3 === 0 ? 'neonCyan' : (si % 3 === 1 ? 'neonPink' : 'gold'), 'skyline');
    });

    // A small flying car above the central avenue.
    b.fillRect('2x4p', '2x2p', 23, 27, 4, 4, 45, 'neonPink', 'skyline');
    b.add('2x2b', 23, 27, 46, 0, 'neonCyan', 'skyline');
    b.add('2x2b', 25, 29, 46, 0, 'gold', 'skyline');

    // Two pedestrian skybridges.
    b.fillRect('2x4p', '2x2p', 20, 15, 4, 2, 30, 'neonCyan', 'skyline');
    b.fillRect('2x4p', '2x2p', 23, 22, 4, 4, 35, 'neonPink', 'skyline');

    return b.finish({
      id: 'neo-megacity',
      name: 'Neo Megacity',
      icon: '🌆',
      category: '4K FLAGSHIP',
      description: 'A 3,000+ piece cyber skyline with nine towers, a stepped central spire, neon bands, skybridges, streetlights and a flying car.',
      accent: '#ff3d8d'
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     PRESET REGISTRY — metadata only until a card is loaded
     ───────────────────────────────────────────────────────────────────────── */

  /* ─────────────────────────────────────────────────────────────────────────
     MEGA PRESETS · 3,000–5,000 pieces each
     All shapes are generated only when selected. The display-plinth helper
     tops each sculpture up to its target count without loading inactive data.
     ───────────────────────────────────────────────────────────────────────── */

  function buildTitanMecha() {
    var b = new ModelBuilder(64);

    b.module('legs', 'Feet & Legs', '▥', '#3f7fbf');
    [12, 42].forEach(function (fx) {
      b.block('2x4b', '2x2b', fx, 18, 10, 14, 4, 0, function (i, x, z, layer) {
        return layer === 3 ? 'steel' : (i % 3 === 0 ? 'gunmetal' : 'charcoal');
      }, 'legs');
      b.block('2x4b', '2x2b', fx, 20, 10, 10, 26, 12, function (i, x, z, layer) {
        if (layer % 6 === 5) return 'gold';
        return layer % 2 === 0 ? 'steel' : 'gunmetal';
      }, 'legs');
    });

    b.module('torso', 'Hips & Torso', '♜', '#f1c40f');
    b.block('2x4b', '2x2b', 20, 18, 24, 14, 6, 90, function (i, x, z, layer) {
      return layer % 2 === 0 ? 'navy' : 'steel';
    }, 'torso');
    b.block('2x4b', '2x2b', 18, 18, 28, 18, 18, 108, function (i, x, z, layer) {
      if (layer % 6 === 5) return 'gold';
      if (layer % 4 === 2 && i % 5 === 0) return 'neonCyan';
      return layer % 2 === 0 ? 'steel' : 'navy';
    }, 'torso');

    b.module('arms', 'Arms & Cannons', '◢', '#ff3d8d');
    [6, 46].forEach(function (ax) {
      b.block('2x4b', '2x2b', ax, 20, 12, 12, 4, 156, function (i, x, z, layer) {
        return layer % 2 === 0 ? 'gold' : 'deepRed';
      }, 'arms');
      b.block('2x4b', '2x2b', ax + 2, 21, 10, 10, 16, 108, function (i, x, z, layer) {
        return layer % 4 === 3 ? 'gold' : 'steel';
      }, 'arms');
      var forearmX = ax === 6 ? 4 : 52;
      b.block('2x4b', '2x2b', forearmX, 22, 8, 10, 10, 78, function (i, x, z, layer) {
        return layer % 5 === 4 ? 'neonCyan' : 'gunmetal';
      }, 'arms');
      b.block('2x4b', '2x2b', forearmX, 23, 6, 8, 2, 72, 'gunmetal', 'arms');
    });
    [8, 48].forEach(function (cx) {
      b.block('2x4b', '2x2b', cx, 22, 4, 4, 3, 168, 'neonPink', 'arms');
    });

    b.module('head', 'Head & Core', '♛', '#32e6ff');
    b.block('2x4b', '2x2b', 28, 28, 8, 8, 2, 162, 'gunmetal', 'head');
    b.block('2x4b', '2x2b', 25, 27, 14, 14, 8, 168, function (i, x, z, layer) {
      if (layer === 7) return 'gold';
      return layer % 2 === 0 ? 'silver' : 'steel';
    }, 'head');
    b.block('2x4b', '2x2b', 29, 36, 6, 6, 3, 120, 'neonCyan', 'head');
    [27, 31, 35].forEach(function (vx) {
      b.add('2x2b', vx, 41, 180, 0, 'neonCyan', 'head');
    });

    b.module('details', 'Armor & Details', '✦', '#a78bfa');
    [22, 36].forEach(function (tx) {
      b.block('2x4b', '2x2b', tx, 12, 6, 6, 4, 120, 'deepRed', 'details');
    });
    [13, 43].forEach(function (kx) {
      b.block('2x4b', '2x2b', kx, 30, 8, 4, 2, 30, 'gold', 'details');
    });
    b.add('2x2b', 31, 28, 192, 0, 'neonPink', 'details');
    b.add('2x2b', 31, 28, 195, 0, 'gold', 'details');

    return b.finishMega({
      id: 'titan-mecha',
      name: 'Titan Mecha',
      icon: '🤖',
      category: 'MEGA · ROBOT',
      description: 'A 3,900-piece heavy assault mech with layered armor, cannon shoulders, a glowing core and a hangar plinth.',
      accent: '#ff3d8d'
    }, 3900, 'Hangar Deck', '▦', '#64748b', function (i, x, z, layer) {
      return layer % 3 === 0 && i % 5 === 0 ? 'neonPink' : (layer % 2 ? 'gunmetal' : 'charcoal');
    });
  }

  function buildCelestialDragon() {
    var b = new ModelBuilder(64);

    b.module('legs', 'Claws & Legs', '▥', '#3ee6a3');
    [
      [18, 18], [36, 18], [18, 34], [36, 34]
    ].forEach(function (f) {
      b.block('2x4b', '2x2b', f[0], f[1], 10, 12, 3, 0, function (i, x, z, layer) {
        return layer === 2 ? 'teal' : 'charcoal';
      }, 'legs');
    });
    [
      [20, 20], [36, 20], [20, 36], [36, 36]
    ].forEach(function (l) {
      b.block('2x4b', '2x2b', l[0], l[1], 8, 8, 6, 9, function (i, x, z, layer) {
        return layer % 4 === 3 ? 'gold' : (layer % 2 === 0 ? 'teal' : 'green');
      }, 'legs');
    });

    b.module('body', 'Serpent Body', '♜', '#32e6ff');
    b.block('2x4b', '2x2b', 23, 12, 18, 32, 16, 27, function (i, x, z, layer) {
      if (layer % 7 === 6) return 'gold';
      if (layer % 4 === 2) return 'neonCyan';
      return layer % 2 === 0 ? 'teal' : 'green';
    }, 'body');
    [16, 20, 24, 28, 32, 36, 40].forEach(function (cz, ci) {
      b.block('2x4b', '2x2b', 31, cz, 2, 2, 3, 75, ci % 2 ? 'neonPink' : 'magenta', 'body');
    });

    b.module('wings', 'Swept Storm Wings', '◢', '#a78bfa');
    [0, 1].forEach(function (side) {
      var offsets = side === 0 ? [19, 15, 11, 7, 3] : [41, 45, 49, 53, 57];
      var zs = [16, 18, 20, 22, 24];
      for (var layer = 0; layer < 6; layer++) {
        for (var i = 0; i < offsets.length; i++) {
          b.fillRect('2x4p', '2x2p', offsets[i], zs[i], 4, 40 - zs[i], 50 + layer, function (idx, x, z) {
            return layer === 5 ? 'neonPink' : (idx % 5 === 0 ? 'silver' : 'neonCyan');
          }, 'wings');
        }
      }
      var bones = side === 0 ? [19, 15, 11, 7] : [43, 47, 51, 55];
      bones.forEach(function (wx) {
        b.add('2x2b', wx, 16, 56, 0, 'silver', 'wings');
      });
    });

    b.module('head', 'Neck & Dragon Head', '♛', '#f1c40f');
    b.block('2x4b', '2x2b', 27, 44, 8, 4, 4, 75, function (i, x, z, layer) {
      return layer % 2 === 0 ? 'teal' : 'gold';
    }, 'head');
    b.block('2x4b', '2x2b', 23, 48, 18, 12, 12, 87, function (i, x, z, layer) {
      if (layer === 11) return 'gold';
      return layer % 2 === 0 ? 'teal' : 'lime';
    }, 'head');
    b.block('2x4b', '2x2b', 26, 60, 12, 4, 2, 91, 'green', 'head');
    b.block('2x4b', '2x2b', 26, 60, 12, 4, 2, 97, 'neonCyan', 'head');
    b.add('2x2b', 27, 60, 111, 0, 'neonCyan', 'head');
    b.add('2x2b', 35, 60, 111, 0, 'neonCyan', 'head');
    b.add('2x2b', 24, 58, 123, 0, 'neonPink', 'head');
    b.add('2x2b', 24, 58, 126, 0, 'gold', 'head');
    b.add('2x2b', 36, 58, 123, 0, 'neonPink', 'head');
    b.add('2x2b', 36, 58, 126, 0, 'gold', 'head');

    b.module('tail', 'Tail & Spikes', '➰', '#ff3d8d');
    b.block('2x4b', '2x2b', 27, 0, 8, 8, 12, 27, function (i, x, z, layer) {
      return layer % 5 === 4 ? 'magenta' : (layer % 2 === 0 ? 'teal' : 'green');
    }, 'tail');
    b.block('2x4b', '2x2b', 29, 8, 4, 4, 12, 27, function (i, x, z, layer) {
      return layer % 4 === 3 ? 'gold' : 'teal';
    }, 'tail');
    [0, 2, 4, 6, 8, 10].forEach(function (tz, ti) {
      b.add('2x2b', 31, tz, 63, 0, ti % 2 ? 'neonPink' : 'gold', 'tail');
    });

    return b.finishMega({
      id: 'celestial-dragon',
      name: 'Celestial Dragon',
      icon: '🐲',
      category: 'MEGA · FANTASY',
      description: 'A long-bodied celestial dragon with swept storm wings, a raised horned head, crystal spine and floating plinth.',
      accent: '#32e6ff'
    }, 3300, 'Floating Plinth', '▦', '#a78bfa', function (i, x, z, layer) {
      return layer === 2 ? 'violet' : (i % 5 === 0 ? 'neonCyan' : 'navy');
    });
  }

  function buildAuroraDreadnought() {
    var b = new ModelBuilder(64);

    b.module('hull', 'Hull & Keel', '▰', '#3f7fbf');
    b.block('2x4b', '2x2b', 24, 8, 16, 44, 3, 0, function (i, x, z, layer) {
      return layer === 2 ? 'gold' : 'gunmetal';
    }, 'hull');
    b.block('2x4b', '2x2b', 20, 12, 24, 36, 16, 9, function (i, x, z, layer) {
      if (layer % 6 === 5) return 'neonCyan';
      if (layer % 3 === 1) return 'steel';
      return 'navy';
    }, 'hull');

    b.module('wings', 'Wings & Armor', '◢', '#45d6ff');
    [-16, 24].forEach(function (wx) {
      var x = wx === -16 ? 4 : 44;
      b.block('2x4p', '2x2p', x, 20, 16, 20, 4, 18, function (i, x, z, layer) {
        return layer === 2 ? 'neonCyan' : (i % 5 === 0 ? 'deepRed' : 'steel');
      }, 'wings');
    });

    b.module('bridge', 'Bridge & Superstructure', '♛', '#f1c40f');
    b.block('2x4b', '2x2b', 24, 20, 16, 16, 10, 57, function (i, x, z, layer) {
      if (layer % 4 === 3) return 'gold';
      return layer % 2 === 0 ? 'silver' : 'steel';
    }, 'bridge');
    b.block('2x4b', '2x2b', 28, 24, 8, 8, 5, 87, 'neonCyan', 'bridge');
    b.add('2x2b', 31, 31, 102, 0, 'neonPink', 'bridge');

    b.module('engines', 'Engines', '◆', '#ff637d');
    [22, 29, 36].forEach(function (ex) {
      b.block('2x4b', '2x2b', ex, 4, 6, 8, 8, 12, function (i, x, z, layer) {
        return layer % 2 === 0 ? 'gold' : 'orange';
      }, 'engines');
    });

    b.module('weapons', 'Weapons', '✦', '#e8eef2');
    [
      [20, 20], [40, 20], [20, 32], [40, 32]
    ].forEach(function (t) {
      b.block('2x4b', '2x2b', t[0], t[1], 4, 4, 3, 57, 'neonCyan', 'weapons');
    });
    [
      [6, 24], [14, 24], [50, 24], [58, 24]
    ].forEach(function (t) {
      b.block('2x4b', '2x2b', t[0], t[1], 4, 4, 3, 22, 'deepRed', 'weapons');
    });

    return b.finishMega({
      id: 'aurora-dreadnought',
      name: 'Aurora Dreadnought',
      icon: '🛸',
      category: 'MEGA · SPACE',
      description: 'A 3,700-piece deep-space battleship with a layered wedge hull, delta armor wings, engine bank and neon turrets.',
      accent: '#45d6ff'
    }, 3700, 'Dry Dock', '▦', '#24446b', function (i, x, z, layer) {
      return layer === 2 ? 'neonCyan' : (i % 4 === 0 ? 'navy' : 'gunmetal');
    });
  }

  function buildPirateGalleon() {
    var b = new ModelBuilder(64);

    b.module('hull', 'Hull', '▰', '#b87333');
    b.block('2x4b', '2x2b', 24, 14, 16, 36, 8, 0, function (i, x, z, layer) {
      return layer % 3 === 2 ? 'deepRed' : (layer % 2 === 0 ? 'tan' : 'bronze');
    }, 'hull');
    b.block('2x4b', '2x2b', 22, 12, 20, 40, 8, 24, function (i, x, z, layer) {
      return layer % 3 === 2 ? 'gold' : (layer % 2 === 0 ? 'tan' : 'bronze');
    }, 'hull');
    b.block('2x4b', '2x2b', 20, 10, 24, 44, 4, 48, function (i, x, z, layer) {
      return i % 7 === 0 ? 'deepRed' : 'cream';
    }, 'hull');

    b.module('deck', 'Deck & Cabin', '♜', '#f0d6ad');
    b.block('2x4b', '2x2b', 22, 48, 20, 8, 8, 60, function (i, x, z, layer) {
      if (layer === 7) return 'gold';
      return layer % 2 === 0 ? 'tan' : 'cream';
    }, 'deck');

    b.module('masts', 'Masts', '▥', '#c18445');
    [18, 30, 42].forEach(function (mz) {
      b.block('2x4b', '2x2b', 30, mz, 4, 4, 36, 60, function (i, x, z, layer) {
        return layer % 8 === 7 ? 'gold' : 'bronze';
      }, 'masts');
    });

    b.module('sails', 'Sails', '◢', '#e8eef2');
    [
      [16, 0], [22, 0], [28, 0], [34, 0], [40, 0], [46, 0]
    ].forEach(function (s) {
      b.block('2x4p', '2x2p', 22, s[0], 16, 2, 16, 72, function (i, x, z, layer) {
        if (layer === 15) return 'gold';
        return (i % 9 === 0) ? 'deepRed' : 'cream';
      }, 'sails');
    });

    b.module('cannons', 'Cannons & Details', '✦', '#ff637d');
    [14, 22, 30, 38, 46].forEach(function (cz, ci) {
      b.add('2x2b', 20, cz, 36, 0, 'gunmetal', 'cannons');
      b.add('2x2b', 20, cz, 39, 0, 'gold', 'cannons');
      b.add('2x2b', 42, cz, 36, 0, 'gunmetal', 'cannons');
      b.add('2x2b', 42, cz, 39, 0, 'gold', 'cannons');
    });

    return b.finishMega({
      id: 'pirate-galleon',
      name: 'Pirate Galleon',
      icon: '🏴‍☠️',
      category: 'MEGA · ADVENTURE',
      description: 'A 3,600-piece treasure galleon with a layered hull, cream sails, gold masts, side cannons and a harbor plinth.',
      accent: '#e67e22'
    }, 3600, 'Harbor Plinth', '▦', '#0f8b8d', function (i, x, z, layer) {
      return layer === 2 ? 'gold' : (i % 6 === 0 ? 'teal' : 'navy');
    });
  }

  function buildEiffelTower() {
    var b = new ModelBuilder(64);

    b.module('legs', 'Base Legs', '▥', '#b87333');
    [
      [10, 10], [44, 10], [10, 44], [44, 44]
    ].forEach(function (p) {
      b.block('2x4b', '2x2b', p[0], p[1], 10, 10, 30, 0, function (i, x, z, layer) {
        if (layer % 6 === 5) return 'gold';
        return layer % 2 === 0 ? 'bronze' : 'tan';
      }, 'legs');
    });

    b.module('platforms', 'Platforms', '▦', '#f1c40f');
    b.block('2x4b', '2x2b', 15, 15, 34, 34, 4, 90, function (i, x, z, layer) {
      return i % 9 === 0 ? 'gold' : 'steel';
    }, 'platforms');
    b.block('2x4b', '2x2b', 23, 23, 18, 18, 3, 174, function (i, x, z, layer) {
      return i % 7 === 0 ? 'gold' : 'steel';
    }, 'platforms');
    b.block('2x4p', '2x2p', 28, 28, 8, 8, 2, 234, 'gold', 'platforms');

    b.module('upper', 'Upper Lattice', '◢', '#45d6ff');
    [
      [19, 19], [39, 19], [19, 39], [39, 39]
    ].forEach(function (p) {
      b.block('2x4b', '2x2b', p[0], p[1], 6, 6, 24, 102, function (i, x, z, layer) {
        return layer % 6 === 5 ? 'neonCyan' : 'bronze';
      }, 'upper');
    });
    [
      [25, 25], [35, 25], [25, 35], [35, 35]
    ].forEach(function (p) {
      b.block('2x4b', '2x2b', p[0], p[1], 4, 4, 17, 183, function (i, x, z, layer) {
        return layer % 5 === 4 ? 'gold' : 'steel';
      }, 'upper');
    });
    [[30, 30, 20, 236]].forEach(function (p) {
      b.block('2x4b', '2x2b', p[0], p[1], 4, 4, p[2], p[3], function (i, x, z, layer) {
        return layer % 4 === 3 ? 'neonCyan' : 'gold';
      }, 'upper');
    });

    b.module('lattice', 'Cross Bracing', '✦', '#e8eef2');
    [30, 45, 60, 75].forEach(function (y) {
      b.block('2x4b', '2x2b', 20, 10, 24, 2, 1, y, 'steel', 'lattice');
      b.block('2x4b', '2x2b', 20, 52, 24, 2, 1, y, 'steel', 'lattice');
      b.block('2x4b', '2x2b', 10, 20, 2, 24, 1, y, 'steel', 'lattice');
      b.block('2x4b', '2x2b', 52, 20, 2, 24, 1, y, 'steel', 'lattice');
    });

    return b.finishMega({
      id: 'eiffel-tower',
      name: 'Eiffel Tower',
      icon: '🗼',
      category: 'MEGA · LANDMARK',
      description: 'A 3,900-piece bronze lattice tower with four splayed legs, three observation platforms, cross-bracing and a Champ de Mars plinth.',
      accent: '#f1c40f'
    }, 3900, 'Champ de Mars', '▦', '#27ae60', function (i, x, z, layer) {
      return layer === 2 ? 'gold' : (i % 7 === 0 ? 'lime' : 'green');
    });
  }

  function buildColosseum() {
    var b = new ModelBuilder(64);

    b.module('arena', 'Arena Floor', '▦', '#0f8b8d');
    b.block('2x4p', '2x2p', 12, 16, 40, 32, 2, 0, function (i) {
      return i % 5 === 0 ? 'gold' : 'teal';
    }, 'arena');

    b.module('outer', 'Outer Wall', '▥', '#d9a066');
    b.ringRect('2x4b', '2x2b', 8, 12, 48, 40, 4, 18, 0, function (i, x, z, layer) {
      if (layer % 6 === 5) return 'gold';
      return layer % 2 === 0 ? 'sand' : 'tan';
    }, 'outer');

    b.module('tiers', 'Seating Tiers', '◢', '#c18445');
    b.ringRect('2x4b', '2x2b', 12, 16, 40, 32, 6, 4, 2, function (i, x, z, layer) {
      return layer % 2 === 0 ? 'cream' : 'sand';
    }, 'tiers');
    b.ringRect('2x4b', '2x2b', 18, 22, 28, 20, 4, 4, 14, function (i, x, z, layer) {
      return layer % 2 === 0 ? 'tan' : 'cream';
    }, 'tiers');

    b.module('columns', 'Columns & Banners', '♛', '#f1c40f');
    [12, 20, 28, 36, 44].forEach(function (cx) {
      b.block('2x4b', '2x2b', cx, 12, 4, 4, 10, 54, function (i, x, z, layer) {
        return layer % 4 === 3 ? 'gold' : 'cream';
      }, 'columns');
      b.block('2x4b', '2x2b', cx, 48, 4, 4, 10, 54, function (i, x, z, layer) {
        return layer % 4 === 3 ? 'gold' : 'cream';
      }, 'columns');
    });

    return b.finishMega({
      id: 'colosseum',
      name: 'Grand Colosseum',
      icon: '🏛️',
      category: 'MEGA · LANDMARK',
      description: 'A 3,700-piece sandstone arena with a layered outer wall, stepped seating, colonnade and a Roman plaza plinth.',
      accent: '#d9a066'
    }, 3700, 'Roman Plaza', '▦', '#b87333', function (i, x, z, layer) {
      return layer === 2 ? 'cream' : (i % 8 === 0 ? 'gold' : 'tan');
    });
  }

  function buildCrystalCitadel() {
    var b = new ModelBuilder(64);

    b.module('base', 'Base & Walls', '▦', '#64748b');
    b.block('2x4b', '2x2b', 10, 10, 44, 44, 2, 0, function (i, x, z, layer) {
      return layer === 1 ? 'gold' : (i % 7 === 0 ? 'violet' : 'slate');
    }, 'base');
    b.block('2x4b', '2x2b', 18, 10, 28, 4, 8, 6, function (i, x, z, layer) {
      return layer % 2 === 0 ? 'steel' : 'slate';
    }, 'base');
    b.block('2x4b', '2x2b', 18, 50, 28, 4, 8, 6, 'steel', 'base');
    b.block('2x4b', '2x2b', 10, 18, 4, 28, 8, 6, 'slate', 'base');
    b.block('2x4b', '2x2b', 50, 18, 4, 28, 8, 6, 'steel', 'base');

    b.module('towers', 'Corner Towers', '♛', '#a78bfa');
    [
      [10, 10], [46, 10], [10, 46], [46, 46]
    ].forEach(function (t, ti) {
      b.block('2x4b', '2x2b', t[0], t[1], 8, 8, 22, 6, function (i, x, z, layer) {
        if (layer % 6 === 5) return 'gold';
        return layer % 2 === 0 ? 'violet' : 'steel';
      }, 'towers');
      b.block('2x4b', '2x2b', t[0] + 2, t[1] + 2, 4, 4, 12, 72, function (i, x, z, layer) {
        return layer % 3 === 2 ? 'neonCyan' : 'silver';
      }, 'towers');
    });

    b.module('mid', 'Sky Bridges & Mid Towers', '◢', '#32e6ff');
    [28, 28].forEach(function (mx, mi) {
      var mz = mi === 0 ? 10 : 46;
      b.block('2x4b', '2x2b', mx, mz, 8, 8, 12, 30, function (i, x, z, layer) {
        return layer % 2 === 0 ? 'steel' : 'violet';
      }, 'mid');
      b.block('2x4b', '2x2b', mx + 2, mz + 2, 4, 4, 12, 66, 'neonCyan', 'mid');
    });

    b.module('keep', 'Crystal Keep', '◆', '#f1c40f');
    b.block('2x4b', '2x2b', 25, 25, 14, 14, 28, 6, function (i, x, z, layer) {
      if (layer % 8 === 7) return 'gold';
      if (layer % 5 === 3) return 'neonCyan';
      return layer % 2 === 0 ? 'violet' : 'white';
    }, 'keep');
    b.block('2x4b', '2x2b', 29, 29, 6, 6, 12, 90, function (i, x, z, layer) {
      return layer % 3 === 2 ? 'neonPink' : 'silver';
    }, 'keep');

    b.module('details', 'Crystal Spires & Banners', '✦', '#ff3d8d');
    [
      [14, 14], [50, 14], [14, 50], [50, 50]
    ].forEach(function (t) {
      b.add('2x2b', t[0], t[1], 108, 0, 'neonPink', 'details');
      b.add('2x2b', t[0], t[1], 111, 0, 'gold', 'details');
    });

    return b.finishMega({
      id: 'crystal-citadel',
      name: 'Crystal Citadel',
      icon: '🏰',
      category: 'MEGA · FANTASY',
      description: 'A 3,900-piece crystal fortress with four corner towers, sky bridges, a luminous keep and neon spires.',
      accent: '#a78bfa'
    }, 3900, 'Crystal Courtyard', '▦', '#24446b', function (i, x, z, layer) {
      return layer === 2 ? 'neonCyan' : (i % 6 === 0 ? 'violet' : 'navy');
    });
  }

  function buildSolarisStation() {
    var b = new ModelBuilder(64);

    b.module('ring', 'Outer Ring', '◯', '#c9d4e0');
    b.ringRect('2x4b', '2x2b', 8, 8, 48, 48, 6, 6, 60, function (i, x, z, layer) {
      return layer % 2 === 0 ? 'silver' : 'steel';
    }, 'ring');
    b.ringRect('2x4b', '2x2b', 18, 18, 28, 28, 4, 6, 78, function (i, x, z, layer) {
      return layer % 3 === 2 ? 'gold' : 'silver';
    }, 'ring');

    b.module('hub', 'Hub & Spokes', '◆', '#45d6ff');
    b.block('2x4b', '2x2b', 24, 24, 16, 16, 18, 78, function (i, x, z, layer) {
      if (layer % 5 === 4) return 'neonCyan';
      return layer % 2 === 0 ? 'white' : 'silver';
    }, 'hub');
    [
      [28, 14, 8, 10], [28, 40, 8, 10], [14, 28, 10, 8], [40, 28, 10, 8]
    ].forEach(function (s) {
      b.block('2x4b', '2x2b', s[0], s[1], s[2], s[3], 2, 60, 'steel', 'hub');
    });

    b.module('solar', 'Solar Arrays', '▰', '#32e6ff');
    [
      [2, 22], [42, 22], [22, 2], [22, 42]
    ].forEach(function (p) {
      b.block('2x4p', '2x2p', p[0], p[1], 20, 20, 3, 132, function (i, x, z, layer) {
        if (layer === 2) return 'neonCyan';
        return (i % 8 === 0) ? 'gold' : 'navy';
      }, 'solar');
    });

    b.module('pods', 'Docking Pods', '✦', '#ff3d8d');
    [
      [8, 8], [48, 8], [8, 48], [48, 48]
    ].forEach(function (p, pi) {
      b.block('2x4b', '2x2b', p[0], p[1], 8, 8, 8, 78, function (i, x, z, layer) {
        return layer % 3 === 2 ? 'neonPink' : 'white';
      }, 'pods');
    });
    [30, 32].forEach(function (ax) {
      b.add('2x2b', ax, 31, 132, 0, 'neonCyan', 'pods');
      b.add('2x2b', ax, 31, 135, 0, 'gold', 'pods');
    });

    return b.finishMega({
      id: 'solaris-station',
      name: 'Solaris Station',
      icon: '🛰️',
      category: 'MEGA · SPACE',
      description: 'A 3,600-piece orbital station with concentric rings, a bright hub, four solar arrays and docking pods.',
      accent: '#45d6ff'
    }, 3600, 'Docking Cradle', '▦', '#24446b', function (i, x, z, layer) {
      return layer === 2 ? 'neonCyan' : (i % 5 === 0 ? 'gold' : 'gunmetal');
    });
  }

  function buildSunPyramid() {
    var b = new ModelBuilder(64);

    b.module('lower', 'Lower Terraces', '▦', '#d9a066');
    b.block('2x4b', '2x2b', 8, 8, 48, 48, 4, 0, function (i, x, z, layer) {
      return layer === 0 ? 'gold' : (i % 9 === 0 ? 'orange' : 'sand');
    }, 'lower');
    b.block('2x4b', '2x2b', 12, 12, 40, 40, 3, 12, function (i, x, z, layer) {
      return i % 8 === 0 ? 'gold' : 'tan';
    }, 'lower');
    b.block('2x4b', '2x2b', 16, 16, 32, 32, 3, 21, function (i, x, z, layer) {
      return i % 7 === 0 ? 'orange' : 'sand';
    }, 'lower');

    b.module('upper', 'Upper Terraces', '◢', '#f1c40f');
    b.block('2x4b', '2x2b', 20, 20, 24, 24, 3, 30, function (i, x, z, layer) {
      return i % 6 === 0 ? 'gold' : 'tan';
    }, 'upper');
    b.block('2x4b', '2x2b', 24, 24, 16, 16, 3, 39, function (i, x, z, layer) {
      return i % 5 === 0 ? 'orange' : 'sand';
    }, 'upper');

    b.module('temple', 'Sun Temple', '♛', '#0f8b8d');
    b.block('2x4b', '2x2b', 26, 26, 12, 12, 12, 48, function (i, x, z, layer) {
      if (layer % 5 === 4) return 'gold';
      return layer % 2 === 0 ? 'teal' : 'sand';
    }, 'temple');
    b.block('2x4b', '2x2b', 30, 26, 4, 2, 2, 84, 'gold', 'temple');
    b.add('2x2b', 31, 31, 84, 0, 'neonCyan', 'temple');

    b.module('details', 'Gold Trim & Offerings', '✦', '#ff3d8d');
    [
      [22, 24], [40, 24], [24, 22], [24, 40]
    ].forEach(function (p) {
      b.add('2x2b', p[0], p[1], 84, 0, 'gold', 'details');
    });

    return b.finishMega({
      id: 'sun-pyramid',
      name: 'Sun Pyramid',
      icon: '🔺',
      category: 'MEGA · LANDMARK',
      description: 'A 3,700-piece stepped sun temple with five golden terraces, a teal sanctuary, neon offerings and a desert plaza.',
      accent: '#f1c40f'
    }, 3700, 'Desert Plaza', '▦', '#b87333', function (i, x, z, layer) {
      return layer === 2 ? 'neonCyan' : (i % 6 === 0 ? 'gold' : 'tan');
    });
  }

  var PRESET_MODELS = [
    {
      id: 'castle-workshop-250',
      name: 'Castle Workshop',
      icon: '🏰',
      category: 'CLASSIC',
      description: 'The original fortress with foundation, walls, towers, keep and gold crown.',
      accent: '#f1c40f',
      plateSize: 24,
      pieceCount: 250,
      generate: buildCastlePreset
    },
    {
      id: 'aurora-shuttle',
      name: 'Aurora Shuttle',
      icon: '🚀',
      category: 'SPACE · 1K',
      description: 'A launch-ready orbital shuttle stack with pad, tower, boosters, orange tank and delta wings.',
      accent: '#45d6ff',
      plateSize: 48,
      pieceCount: 1099,
      generate: buildAuroraShuttle
    },
    {
      id: 'neon-wyrm',
      name: 'Neon Wyrm',
      icon: '🐉',
      category: 'FANTASY · 1K',
      description: 'A four-legged neon dragon with broad storm wings, raised head, gold belly bands and a spiked tail.',
      accent: '#9cff3d',
      plateSize: 48,
      pieceCount: 1336,
      generate: buildNeonWyrm
    },
    {
      id: 'neo-megacity',
      name: 'Neo Megacity',
      icon: '🌆',
      category: 'MEGA · 3K',
      description: 'A cyber skyline with nine towers, a stepped central spire, neon bands, skybridges and a flying car.',
      accent: '#ff3d8d',
      plateSize: 48,
      pieceCount: 3317,
      generate: buildNeoMegacity
    },
    {
      id: 'titan-mecha',
      name: 'Titan Mecha',
      icon: '🤖',
      category: 'MEGA · ROBOT',
      description: 'A heavy assault mech with layered armor, cannon shoulders, a glowing core and a hangar plinth.',
      accent: '#ff3d8d',
      plateSize: 64,
      pieceCount: 3900,
      generate: buildTitanMecha
    },
    {
      id: 'celestial-dragon',
      name: 'Celestial Dragon',
      icon: '🐲',
      category: 'MEGA · FANTASY',
      description: 'A colossal celestial dragon with swept storm wings, a raised horned head, crystal spine and floating plinth.',
      accent: '#32e6ff',
      plateSize: 64,
      pieceCount: 3300,
      viewDir: [0.85, 0.38, 0.36],
      generate: buildCelestialDragon
    },
    {
      id: 'aurora-dreadnought',
      name: 'Aurora Dreadnought',
      icon: '🛸',
      category: 'MEGA · SPACE',
      description: 'A deep-space battleship with a layered wedge hull, delta armor wings, engine bank and neon turrets.',
      accent: '#45d6ff',
      plateSize: 64,
      pieceCount: 3700,
      generate: buildAuroraDreadnought
    },
    {
      id: 'pirate-galleon',
      name: 'Pirate Galleon',
      icon: '🏴‍☠️',
      category: 'MEGA · ADVENTURE',
      description: 'A treasure galleon with a layered hull, cream sails, gold masts, side cannons and a harbor plinth.',
      accent: '#e67e22',
      plateSize: 64,
      pieceCount: 3600,
      generate: buildPirateGalleon
    },
    {
      id: 'eiffel-tower',
      name: 'Eiffel Tower',
      icon: '🗼',
      category: 'MEGA · LANDMARK',
      description: 'A bronze lattice tower with four splayed legs, three observation platforms, cross-bracing and a Champ de Mars plinth.',
      accent: '#f1c40f',
      plateSize: 64,
      pieceCount: 3900,
      generate: buildEiffelTower
    },
    {
      id: 'colosseum',
      name: 'Grand Colosseum',
      icon: '🏛️',
      category: 'MEGA · LANDMARK',
      description: 'A sandstone arena with a layered outer wall, stepped seating, colonnade and a Roman plaza plinth.',
      accent: '#d9a066',
      plateSize: 64,
      pieceCount: 3452,
      generate: buildColosseum
    },
    {
      id: 'crystal-citadel',
      name: 'Crystal Citadel',
      icon: '🏰',
      category: 'MEGA · FANTASY',
      description: 'A crystal fortress with four corner towers, sky bridges, a luminous keep and neon spires.',
      accent: '#a78bfa',
      plateSize: 64,
      pieceCount: 3808,
      generate: buildCrystalCitadel
    },
    {
      id: 'solaris-station',
      name: 'Solaris Station',
      icon: '🛰️',
      category: 'MEGA · SPACE',
      description: 'An orbital station with concentric rings, a bright hub, four solar arrays and docking pods.',
      accent: '#45d6ff',
      plateSize: 64,
      pieceCount: 3532,
      generate: buildSolarisStation
    },
    {
      id: 'sun-pyramid',
      name: 'Sun Pyramid',
      icon: '🔺',
      category: 'MEGA · LANDMARK',
      description: 'A stepped sun temple with five golden terraces, a teal sanctuary, neon offerings and a desert plaza.',
      accent: '#f1c40f',
      plateSize: 64,
      pieceCount: 3643,
      generate: buildSunPyramid
    }
  ];

  function getPresetMeta(id) {
    for (var i = 0; i < PRESET_MODELS.length; i++) {
      if (PRESET_MODELS[i].id === id) return PRESET_MODELS[i];
    }
    return null;
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

    for (var i = 0; i < raw.length && output.length < AUTHOR_MAX; i++) {
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

      if (gx < 0 || gz < 0 || gx + fp.w > AUTHOR_GRID || gz + fp.d > AUTHOR_GRID) continue;
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

    var meta = getPresetMeta(raw.modelId) || getPresetMeta(APP.defaultModelId) || PRESET_MODELS[0];
    var pieceCount = meta ? meta.pieceCount : 250;
    clean.modelId = meta ? meta.id : APP.defaultModelId;
    clean.activeStep = clamp(Math.round(Number(raw.activeStep) || 1), 1, pieceCount);
    clean.completed = !!raw.completed;
    if (clean.completed) clean.activeStep = pieceCount;
    clean.mode = raw.mode === 'authoring' ? 'authoring' : 'guided';
    clean.explode = clamp(Math.round(Number(raw.explode) || 0), 0, 100);
    clean.sound = raw.sound !== false;
    clean.authorType = BRICK_TYPES[raw.authorType] ? raw.authorType : '2x4b';
    clean.authorColor = isHexColor(raw.authorColor) ? raw.authorColor : '#3f7fbf';
    clean.authorRot = Number(raw.authorRot) === 90 ? 90 : 0;
    clean.customBricks = sanitizeCustomBricks(raw.customBricks);

    var progress = {};
    if (raw.modelProgress && typeof raw.modelProgress === 'object') {
      Object.keys(raw.modelProgress).forEach(function (id) {
        var m = getPresetMeta(id);
        if (!m) return;
        var entry = raw.modelProgress[id] || {};
        var step = clamp(Math.round(Number(entry.activeStep) || 1), 1, m.pieceCount);
        var done = !!entry.completed;
        if (done) step = m.pieceCount;
        progress[id] = { activeStep: step, completed: done };
      });
    }
    progress[clean.modelId] = { activeStep: clean.activeStep, completed: clean.completed };
    clean.modelProgress = progress;
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

  function getActivePieceCount() {
    if (activeModel) return activeModel.pieceCount;
    var meta = getPresetMeta(state.modelId) || getPresetMeta(APP.defaultModelId);
    return meta ? meta.pieceCount : 250;
  }

  function getPlacedCount() {
    if (state.mode === 'authoring') return state.customBricks.length;
    return state.completed ? getActivePieceCount() : Math.max(0, state.activeStep - 1);
  }

  function getRenderCount() {
    if (!activeModel || state.mode === 'authoring') return 0;
    if (state.completed || previewFinished) return activeModel.pieceCount;
    return Math.max(0, state.activeStep - 1);
  }

  function getCurrentPlacement() {
    if (!activeModel || !activeModel.placements.length) return null;
    var index = clamp(state.activeStep, 1, activeModel.pieceCount) - 1;
    return activeModel.placements[index];
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

    if (!activeModel) return 0;
    var placed = getRenderCount();
    for (var i = 0; i < placed; i++) {
      var def = BRICK_TYPES[activeModel.placements[i].type];
      total += def.w * def.d;
    }
    return total;
  }

  function getModuleForStep(step) {
    var modules = (activeModel && activeModel.modules) ? activeModel.modules : [];
    for (var i = 0; i < modules.length; i++) {
      if (step >= modules[i].from && step <= modules[i].to) return modules[i];
    }
    return modules[modules.length - 1] || null;
  }

  function rememberActiveProgress() {
    if (!activeModel) return;
    if (!state.modelProgress) state.modelProgress = {};
    state.modelProgress[activeModel.meta.id] = {
      activeStep: state.activeStep,
      completed: state.completed
    };
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveStateNow, 180);
  }

  function saveStateNow() {
    try {
      rememberActiveProgress();
      var placed = getPlacedCount();
      var compact = [];
      if (state.mode !== 'authoring' && activeModel) {
        for (var i = 0; i < placed; i++) {
          var p = activeModel.placements[i];
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
        modelProgress: state.modelProgress,
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
  var baseplateMaterial = null;
  var studMaterial = null;
  var studGeometry = null;
  var contactMaterial = null;
  var contactRing = null;
  var baseplateSize = 0;
  var keyLight = null;

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
    scene.fog = new THREE.FogExp2(0x070d18, 0.0042);

    camera = new THREE.PerspectiveCamera(38, viewportW / viewportH, 0.1, 600);
    camera.position.set(28, 25, 40);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.7;
    controls.minDistance = 6;
    controls.maxDistance = 320;
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
    key.position.set(26, 42, 20);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -62;
    key.shadow.camera.right = 62;
    key.shadow.camera.top = 92;
    key.shadow.camera.bottom = -42;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 260;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    keyLight = key;
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

    /* Baseplate materials are created once; the plate geometry is rebuilt
       whenever a preset with a different board size is loaded. */
    baseplateMaterial = new THREE.MeshStandardMaterial({
      color: linearColor(0x102b22),
      roughness: 0.76,
      metalness: 0.04
    });
    studMaterial = new THREE.MeshStandardMaterial({
      color: linearColor(0x1d4a3c),
      roughness: 0.7,
      metalness: 0.05
    });
    studGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10, 1, false);
    contactMaterial = new THREE.MeshBasicMaterial({
      color: linearColor(0x0c1728),
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    setBaseplateSize(CASTLE_PLATE);
  }

  function initMaterial() {
    brickMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.02,
      clearcoat: 0.36,
      clearcoatRoughness: 0.32,
      reflectivity: 0.35,
      dithering: true
    });
  }

  function initCustomMeshes() {
    Object.keys(BRICK_TYPES).forEach(function (type) {
      var mesh = new THREE.InstancedMesh(geometryCache[type], brickMaterial, AUTHOR_MAX);
      mesh.count = AUTHOR_MAX;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // Pre-allocate the authoring colour buffer while count is at capacity.
      var defaultColor = linearColor('#3f7fbf');
      for (var i = 0; i < AUTHOR_MAX; i++) {
        mesh.setColorAt(i, defaultColor);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      mesh.count = 0;
      mesh.visible = false;
      customMeshes[type] = { mesh: mesh, list: [] };
    });
  }

  function disposeBuiltinMeshes() {
    Object.keys(builtinMeshes).forEach(function (type) {
      var mesh = builtinMeshes[type].mesh;
      mesh.count = 0;
      mesh.visible = false;
      scene.remove(mesh);
      if (typeof mesh.dispose === 'function') {
        try { mesh.dispose(); } catch (e) {}
      }
    });
    builtinMeshes = {};
  }

  function unloadActiveModel() {
    disposeBuiltinMeshes();
    activeModel = null;
  }

  function buildInstancesForActiveModel() {
    if (!activeModel || !scene) return;
    var placements = activeModel.placements;

    Object.keys(BRICK_TYPES).forEach(function (type) {
      var list = placements.filter(function (p) { return p.type === type; });
      if (!list.length) return;

      var mesh = new THREE.InstancedMesh(geometryCache[type], brickMaterial, list.length);
      mesh.count = list.length;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);

      // r128 sizes instanceColor from mesh.count on the first setColorAt call.
      for (var i = 0; i < list.length; i++) {
        mesh.setColorAt(i, linearColor(list[i].color));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.count = 0;

      builtinMeshes[type] = { mesh: mesh, list: list };
    });
  }

  function setBaseplateSize(size) {
    if (!scene || !baseplateMaterial) return;
    size = Math.max(8, Math.round(size));
    if (baseplateSize === size && baseplateMesh && baseplateStuds) {
      GRID = size;
      return;
    }

    if (baseplateMesh) {
      scene.remove(baseplateMesh);
      try { baseplateMesh.geometry.dispose(); } catch (e) {}
      baseplateMesh = null;
    }
    if (baseplateStuds) {
      scene.remove(baseplateStuds);
      baseplateStuds.count = 0;
      baseplateStuds = null;
    }
    if (contactRing) {
      scene.remove(contactRing);
      try { contactRing.geometry.dispose(); } catch (e) {}
      contactRing = null;
    }

    GRID = size;
    baseplateSize = size;

    baseplateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, 0.34, size),
      baseplateMaterial
    );
    baseplateMesh.position.y = -0.17;
    baseplateMesh.receiveShadow = true;
    baseplateMesh.castShadow = true;
    scene.add(baseplateMesh);

    baseplateStuds = new THREE.InstancedMesh(studGeometry, studMaterial, size * size);
    var plateDummy = new THREE.Object3D();
    var plateIndex = 0;
    for (var px = 0; px < size; px++) {
      for (var pz = 0; pz < size; pz++) {
        plateDummy.position.set(
          px - size / 2 + 0.5,
          0.06,
          pz - size / 2 + 0.5
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

    contactRing = new THREE.Mesh(
      new THREE.CircleGeometry(size * 0.92, 64),
      contactMaterial
    );
    contactRing.rotation.x = -Math.PI / 2;
    contactRing.position.y = -0.355;
    scene.add(contactRing);

    if (keyLight) {
      keyLight.shadow.camera.updateProjectionMatrix();
    }
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

  function formatNumber(value) {
    return Math.round(Number(value) || 0).toLocaleString('en-US');
  }

  function computeModelBounds(model, includeExplode) {
    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;

    model.placements.forEach(function (p) {
      var def = BRICK_TYPES[p.type];
      var fp = footprint(p.type, p.rot);
      var cx = worldX(p.gx, fp.w);
      var cz = worldZ(p.gz, fp.d);
      var y0 = p.y * PLATE_H + BASE_Y;
      if (includeExplode) y0 += explodeOffset(p);

      minX = Math.min(minX, cx - fp.w / 2);
      maxX = Math.max(maxX, cx + fp.w / 2);
      minZ = Math.min(minZ, cz - fp.d / 2);
      maxZ = Math.max(maxZ, cz + fp.d / 2);
      minY = Math.min(minY, y0);
      maxY = Math.max(maxY, y0 + def.h);
    });

    if (!isFinite(minX)) {
      return {
        center: new THREE.Vector3(0, 3, 0),
        size: new THREE.Vector3(16, 6, 16)
      };
    }

    return {
      center: new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2),
      size: new THREE.Vector3(maxX - minX, maxY - minY, maxZ - minZ)
    };
  }

  function setView(view, immediate) {
    if (!camera || !controls || !view) return;
    if (immediate) {
      camera.position.copy(view.position);
      controls.target.copy(view.target);
      controls.update();
      return;
    }
    tweenCamera(view.position, view.target, 760);
  }

  function fitCameraToModel(model, options) {
    if (!model || !camera) return;
    var opts = options || {};
    var bounds = computeModelBounds(model, !!opts.includeExplode);
    var vFov = camera.fov * Math.PI / 180;
    var hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.35, camera.aspect));
    var fitHeight = (bounds.size.y / 2) / Math.tan(vFov / 2);
    var fitWidth = (Math.max(bounds.size.x, bounds.size.z) / 2) / Math.tan(hFov / 2);
    var distance = Math.max(fitHeight, fitWidth) * 1.28 + 5;
    var viewDir = (model.meta && model.meta.viewDir) ? model.meta.viewDir : [0.62, 0.52, 0.78];
    var dir = new THREE.Vector3(viewDir[0], viewDir[1], viewDir[2]).normalize();
    var target = new THREE.Vector3(bounds.center.x, bounds.center.y + bounds.size.y * 0.025, bounds.center.z);
    var position = target.clone().add(dir.multiplyScalar(distance));

    model.view = { position: position, target: target };
    setView(model.view, !!opts.immediate);
  }

  function fitAuthoringView(immediate) {
    var view = {
      position: new THREE.Vector3(18, 15, 24),
      target: new THREE.Vector3(0, 2.5, 0)
    };
    authoringView = view;
    setBaseplateSize(AUTHOR_GRID);
    setView(view, !!immediate);
  }

  function showModelLoader(meta) {
    if (!els.modelLoader) return;
    if (els.modelLoaderTitle) {
      els.modelLoaderTitle.textContent = 'Loading ' + (meta ? meta.name : 'model');
    }
    if (els.modelLoaderText) {
      els.modelLoaderText.textContent = meta
        ? 'Generating ' + formatNumber(meta.pieceCount) + ' bricks in memory…'
        : 'Generating bricks…';
    }
    els.modelLoader.classList.remove('hidden');
  }

  function hideModelLoader() {
    if (els.modelLoader) els.modelLoader.classList.add('hidden');
  }

  function buildModelLibrary() {
    if (!els.modelGrid) return;
    els.modelGrid.innerHTML = '';

    PRESET_MODELS.forEach(function (meta) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'model-card';
      card.setAttribute('data-model-id', meta.id);
      card.title = meta.name + ' · ' + formatNumber(meta.pieceCount) + ' pieces · ' + meta.category;
      card.style.setProperty('--card-accent', meta.accent);
      card.innerHTML =
        '<span class="model-card-icon">' + meta.icon + '</span>' +
        '<span class="model-card-name">' + meta.name + '</span>' +
        '<span class="model-card-meta">' + formatNumber(meta.pieceCount) + ' pcs · ' + meta.category + '</span>' +
        '<span class="model-card-progress"><span class="model-card-progress-fill"></span></span>';
      card.addEventListener('click', function () {
        loadPresetModel(meta.id);
      });
      els.modelGrid.appendChild(card);
    });

    if (els.libraryStatus) els.libraryStatus.textContent = PRESET_MODELS.length + ' MODELS';
    updateModelLibrary();
  }

  function scrollActiveModelCard() {
    if (!els.modelGrid) return;
    var active = els.modelGrid.querySelector('.model-card.active');
    if (!active) return;
    var gridRect = els.modelGrid.getBoundingClientRect();
    var cardRect = active.getBoundingClientRect();
    var top = cardRect.top - gridRect.top + els.modelGrid.scrollTop;
    if (top < els.modelGrid.scrollTop || top + active.offsetHeight > els.modelGrid.scrollTop + els.modelGrid.clientHeight) {
      els.modelGrid.scrollTop = Math.max(0, top - 6);
    }
  }

  function updateModelLibrary() {
    if (!els.modelGrid) return;
    var activeId = activeModel ? activeModel.meta.id : state.modelId;
    var cards = els.modelGrid.querySelectorAll('.model-card');

    Array.prototype.forEach.call(cards, function (card) {
      var id = card.getAttribute('data-model-id');
      var meta = getPresetMeta(id);
      if (!meta) return;
      var active = id === activeId;
      card.classList.toggle('active', active);
      card.classList.toggle('loading', !!(modelLoading && pendingModelId === id));

      var prog = state.modelProgress && state.modelProgress[id];
      var step = prog ? prog.activeStep : 1;
      var done = prog ? !!prog.completed : false;
      if (active) {
        step = state.activeStep;
        done = state.completed;
      }
      var pct = done ? 100 : Math.max(0, Math.min(100, ((step - 1) / meta.pieceCount) * 100));
      var fill = card.querySelector('.model-card-progress-fill');
      if (fill) fill.style.width = pct.toFixed(1) + '%';

      var metaEl = card.querySelector('.model-card-meta');
      if (metaEl) {
        if (active) {
          metaEl.textContent = formatNumber(meta.pieceCount) + ' pcs · LOADED';
        } else if (step > 1 || done) {
          metaEl.textContent = formatNumber(meta.pieceCount) + ' pcs · ' + (done ? 'DONE' : Math.floor(pct) + '%');
        } else {
          metaEl.textContent = formatNumber(meta.pieceCount) + ' pcs · ' + meta.category;
        }
      }
    });

    if (els.libraryStatus) {
      els.libraryStatus.textContent = PRESET_MODELS.length + ' MODELS · 1 ACTIVE';
    }
  }

  function loadPresetModel(id, options) {
    var opts = options || {};
    var meta = getPresetMeta(id) || getPresetMeta(APP.defaultModelId) || PRESET_MODELS[0];
    if (!meta) return;

    if (activeModel && activeModel.meta.id === meta.id && !opts.force) {
      if (!opts.preserveMode && state.mode === 'authoring') {
        setAuthoring(false, { silent: true, skipSave: true });
      }
      if (opts.onReady) opts.onReady();
      return;
    }

    if (modelLoading && !opts.force) return;

    hideComplete();
    previewFinished = false;
    var token = ++modelLoadToken;
    pendingModelId = meta.id;
    modelLoading = true;
    showModelLoader(meta);
    updateModelLibrary();

    window.setTimeout(function () {
      if (token !== modelLoadToken) return;

      var data;
      try {
        data = meta.generate();
      } catch (error) {
        modelLoading = false;
        pendingModelId = null;
        hideModelLoader();
        updateModelLibrary();
        if (window.console && console.error) console.error(error);
        toast('Could not generate ' + meta.name + '. Keeping the current model.', 'bad', 3000);
        if (opts.onError) opts.onError(error);
        return;
      }

      if (!opts.skipRemember) rememberActiveProgress();
      unloadActiveModel();

      // Give the loaded model a stable metadata object with the real count.
      meta.pieceCount = data.pieceCount;
      activeModel = {
        meta: meta,
        placements: data.placements,
        modules: data.modules,
        pieceCount: data.pieceCount,
        view: null
      };

      if (!opts.preserveMode) {
        state.mode = 'guided';
      }
      state.modelId = meta.id;
      var progress = state.modelProgress && state.modelProgress[meta.id];
      state.activeStep = clamp(
        progress ? progress.activeStep : 1,
        1,
        meta.pieceCount
      );
      state.completed = progress ? !!progress.completed : false;
      if (state.completed) state.activeStep = meta.pieceCount;
      if (!opts.preserveState) state.explode = 0;

      GRID = meta.plateSize;
      setBaseplateSize(meta.plateSize);
      buildInstancesForActiveModel();
      Object.keys(builtinMeshes).forEach(function (type) {
        builtinMeshes[type].mesh.visible = state.mode !== 'authoring';
      });
      buildModuleList();
      updateAll();
      fitCameraToModel(activeModel, { immediate: !!opts.immediate, includeExplode: state.explode > 0 });
      updateModelLibrary();
      scrollActiveModelCard();
      hideComplete();
      modelLoading = false;
      pendingModelId = null;
      hideModelLoader();
      scheduleSave();

      if (state.completed && !opts.preserveState) {
        window.setTimeout(function () { showComplete({ sound: false }); }, 360);
      }
      if (!opts.silent) {
        toast(meta.name + ' loaded · ' + formatNumber(meta.pieceCount) + ' pieces in memory.', 'good', 2400);
      }
      if (opts.onReady) opts.onReady();
    }, 70);
  }

  function updateBuiltinInstances() {
    var placed = getRenderCount();
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
    if (previewFinished) {
      ghostGroup.visible = false;
      ghostTarget = null;
      return;
    }

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

  function updateViewModeUi() {
    if (!els.viewModeToggle) return;
    var authoring = state.mode === 'authoring';
    var preview = previewFinished && !state.completed && !authoring;
    var buildBtn = els.viewModeToggle.querySelector('[data-view="build"]');
    var finishedBtn = els.viewModeToggle.querySelector('[data-view="finished"]');

    if (buildBtn) {
      buildBtn.classList.toggle('active', !authoring && !preview && !state.completed);
      buildBtn.disabled = authoring || state.completed;
    }
    if (finishedBtn) {
      finishedBtn.classList.toggle('active', preview || state.completed);
      finishedBtn.disabled = authoring || state.completed;
    }

    if (els.viewPanel) els.viewPanel.classList.toggle('previewing', preview);
    if (els.viewModeState) {
      els.viewModeState.textContent = authoring ? 'AUTHOR' : (state.completed ? 'COMPLETE' : (preview ? 'PREVIEW' : 'BUILD'));
    }
    if (els.viewModeHint) {
      els.viewModeHint.textContent = preview
        ? 'Finished preview is on. Toggle Build to continue at your saved step.'
        : 'Finished preview is temporary and does not change your saved step.';
    }
    if (els.previewBadge) els.previewBadge.classList.toggle('hidden', !preview);
    if (els.btnQuickPreview) {
      els.btnQuickPreview.classList.toggle('active', preview);
      els.btnQuickPreview.disabled = authoring || state.completed;
      els.btnQuickPreview.setAttribute('aria-pressed', preview ? 'true' : 'false');
      els.btnQuickPreview.title = preview ? 'Return to build (V)' : 'Preview the finished model (V)';
    }
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
    var pieceCount = authoring ? AUTHOR_MAX : getActivePieceCount();
    var placed = getPlacedCount();
    var percent = pieceCount ? placed / pieceCount * 100 : 0;
    var meta = activeModel ? activeModel.meta : (getPresetMeta(state.modelId) || PRESET_MODELS[0]);
    var modules = (activeModel && activeModel.modules) ? activeModel.modules : [];

    /* Global progress */
    var preview = !authoring && previewFinished && !state.completed;
    var displayPercent = (state.completed && !authoring) || preview ? 100 : percent;
    var visibleCount = authoring ? state.customBricks.length : getRenderCount();
    els.progressBar.style.width = displayPercent.toFixed(2) + '%';
    els.progressGlow.style.width = displayPercent.toFixed(2) + '%';
    els.progressPct.textContent = ((state.completed && !authoring) || preview ? 100 : Math.floor(percent)) + '%';
    els.progressTrack.setAttribute('aria-valuemax', String(pieceCount));
    els.progressTrack.setAttribute('aria-valuenow', String(visibleCount));
    els.visibleValue.textContent = formatNumber(visibleCount);
    els.drawValue.textContent = formatNumber(countVisibleStuds());
    els.scrubberMax.textContent = formatNumber(pieceCount);
    els.completePieces.textContent = formatNumber(pieceCount);
    els.completeModules.textContent = String(modules.length || 0);

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
    els.authoringCount.textContent = state.customBricks.length + ' / ' + AUTHOR_MAX + ' pieces · click baseplate to stack · R rotates';

    if (authoring) {
      var customCount = state.customBricks.length;
      var customPercent = customCount / AUTHOR_MAX * 100;

      els.modelName.textContent = 'Custom Studio';
      els.modelMeta.textContent = customCount + ' / ' + AUTHOR_MAX + ' pieces · custom build';
      els.modelIcon.textContent = '✏️';
      els.stepLabel.textContent = 'AUTHORING · ' + customCount + ' / ' + AUTHOR_MAX;
      els.stepNumberChip.textContent = 'CUSTOM';
      els.scrubberStep.textContent = 'AUTHORING';
      els.stepRange.max = String(AUTHOR_MAX);
      els.stepRange.value = String(clamp(customCount === 0 ? 1 : customCount, 1, AUTHOR_MAX));
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
      var moduleIndex = module ? modules.indexOf(module) + 1 : 0;
      var lastModule = modules.length ? modules[modules.length - 1] : null;

      els.modelName.textContent = meta ? meta.name : 'Model';
      els.modelMeta.textContent = formatNumber(pieceCount) + ' pieces · ' + modules.length + ' sub-assemblies';
      els.modelIcon.textContent = meta ? meta.icon : '🧱';
      els.stepLabel.textContent = state.completed
        ? 'BUILD COMPLETE · ' + formatNumber(pieceCount) + ' OF ' + formatNumber(pieceCount)
        : (preview
          ? 'FINISHED PREVIEW · ALL ' + formatNumber(pieceCount) + ' PIECES'
          : 'STEP ' + formatNumber(state.activeStep) + ' OF ' + formatNumber(pieceCount));
      els.stepNumberChip.textContent = preview ? 'PREVIEW' : '#' + pad3(state.activeStep);
      els.scrubberStep.textContent = preview ? 'PREVIEW' : 'STEP ' + pad3(state.activeStep);
      els.stepRange.max = String(pieceCount);
      els.stepRange.value = String(state.activeStep);
      els.stepRange.disabled = preview;
      setRangeFill(els.stepRange, preview || state.completed ? 100 : (pieceCount > 1 ? ((state.activeStep - 1) / (pieceCount - 1) * 100) : 0));

      els.moduleBadgeText.textContent = preview
        ? 'Finished preview · All modules visible'
        : (state.completed
          ? 'Module ' + modules.length + ' · ' + (lastModule ? lastModule.name : 'Build') + ' · Complete'
          : 'Module ' + moduleIndex + ' · ' + (module ? module.name : 'Build'));
      els.moduleBadgeDot.style.background = preview ? '#45d6ff' : (state.completed ? '#3ee6a3' : (module ? module.color : '#45d6ff'));
      els.moduleBadgeDot.style.boxShadow = '0 0 8px ' + (preview ? 'rgba(69, 214, 255, 0.6)' : (state.completed ? 'rgba(62, 230, 163, 0.6)' : (module ? module.color : '#45d6ff')));

      if (preview) {
        els.bayHint.innerHTML = 'Finished preview is on. Your saved step <b>' + formatNumber(state.activeStep) + '</b> is unchanged — switch View Mode back to <b>Build</b> to continue.';
        els.btnSnap.innerHTML = '<span>👁</span> Finished Model Preview';
        els.btnSnap.disabled = true;
      } else if (state.explode > 0) {
        els.bayHint.innerHTML = 'Explode view is active. Return the slider to <b>0</b> to show the next target and keep assembling.';
        els.btnSnap.innerHTML = '<span>💥</span> Explode View Active';
        els.btnSnap.disabled = true;
      } else if (state.completed) {
        els.bayHint.innerHTML = 'All ' + formatNumber(pieceCount) + ' pieces are locked in. Orbit the model, then use the completion card to keep exploring or start over.';
        els.btnSnap.innerHTML = '<span>✓</span> Build Complete';
        els.btnSnap.disabled = true;
      } else {
        els.bayHint.innerHTML = 'Click the glowing ghost, press <kbd>Space</kbd>, or drag this brick onto the target.';
        els.btnSnap.innerHTML = '<span>🧲</span> Snap Into Place <kbd>Space</kbd>';
        els.btnSnap.disabled = false;
      }

      els.btnPrev.disabled = preview || (state.activeStep <= 1 && !state.completed);
      els.btnNext.disabled = preview || state.completed || state.explode > 0;
      els.btnRotate.title = 'Rotate preview 90° (R)';
      els.btnRotate.disabled = preview;
      els.orientationHint.textContent = preview ? 'Finished preview · switch Build to continue' : 'LMB orbit · scroll zoom · RMB pan';
      els.qualityValue.textContent = 'HIGH';

      if (current) {
        updateBrickVisual(current.type, current.color, current.colorName);
      }
    }

    updateModuleProgress();
    updateModelLibrary();
    updateViewModeUi();
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
        '<span class="module-copy"><strong>Custom Build</strong><span>0 / ' + AUTHOR_MAX + ' pieces</span></span>' +
        '<span class="module-mini-track"><span class="module-mini-fill"></span></span>';
      custom.addEventListener('click', function () {
        toast('Keep clicking the baseplate to add custom bricks.', '', 1600);
      });
      els.moduleList.appendChild(custom);
      els.moduleCount.textContent = 'CUSTOM';
      updateModuleProgress();
      return;
    }

    var modules = (activeModel && activeModel.modules) ? activeModel.modules : [];
    modules.forEach(function (m, index) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'module-item';
      item.setAttribute('data-module-id', m.id);
      item.innerHTML =
        '<span class="module-icon">' + m.icon + '</span>' +
        '<span class="module-copy"><strong>' + (index + 1) + '. ' + m.name + '</strong><span>' +
        formatNumber(m.count) + ' pieces</span></span>' +
        '<span class="module-mini-track"><span class="module-mini-fill"></span></span>';
      item.addEventListener('click', function () {
        if (state.mode === 'authoring') return;
        jumpToStep(m.from);
      });
      els.moduleList.appendChild(item);
    });

    els.moduleCount.textContent = modules.length + ' MODULE' + (modules.length === 1 ? '' : 'S');
    updateModuleProgress();
  }

  function updateModuleProgress() {
    var placed = getPlacedCount();

    if (state.mode === 'authoring') {
      var customItem = els.moduleList.querySelector('[data-custom-module]');
      if (customItem) {
        var fill = customItem.querySelector('.module-mini-fill');
        var copy = customItem.querySelector('.module-copy span');
        if (fill) fill.style.width = (placed / AUTHOR_MAX * 100).toFixed(1) + '%';
        if (copy) copy.textContent = placed + ' / ' + AUTHOR_MAX + ' pieces';
        customItem.classList.toggle('done', placed >= AUTHOR_MAX);
      }
      return;
    }

    var modules = (activeModel && activeModel.modules) ? activeModel.modules : [];
    modules.forEach(function (m) {
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
      if (copy) copy.textContent = formatNumber(doneInModule) + ' / ' + formatNumber(moduleSize) + ' pieces';
      item.classList.toggle('done', done);
      item.classList.toggle('active', active);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     STEP ENGINE
     ───────────────────────────────────────────────────────────────────────── */

  function snapCurrent() {
    if (previewFinished) {
      toast('Finished preview is on — switch View Mode back to Build to continue at step ' + formatNumber(state.activeStep) + '.', 'warn', 2200);
      return;
    }

    if (state.explode > 0) {
      toast('Explode view is active — return the slider to 0 to keep building.', 'warn', 2000);
      return;
    }

    if (state.mode === 'authoring') {
      placeAuthoringAtHover(null);
      return;
    }

    if (state.completed) {
      toast('Build complete — ' + formatNumber(getActivePieceCount()) + ' of ' + formatNumber(getActivePieceCount()) + ' pieces are in place.', 'good', 2000);
      return;
    }

    var p = getCurrentPlacement();
    if (!p) return;

    var autoAligned = ghostRotated;
    var wasFinal = state.activeStep >= getActivePieceCount();

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
      toast('Final piece snapped — ' + activeModel.meta.name + ' is complete!', 'good', 3000);
      window.clearTimeout(completeTimer);
      completeTimer = window.setTimeout(function () {
        showComplete({ sound: true });
      }, 460);
    } else {
      var extra = autoAligned ? ' · auto-aligned to target' : '';
      toast(typeLabel(p.type) + ' snapped · ' + formatNumber(getPlacedCount()) + '/' + formatNumber(getActivePieceCount()) + extra, 'good', 1300);
    }
  }

  function prevStep() {
    if (state.mode === 'authoring') return;
    if (previewFinished) {
      toast('Switch View Mode back to Build before rewinding.', 'warn', 1800);
      return;
    }

    hideComplete();

    if (state.completed) {
      state.completed = false;
      state.activeStep = getActivePieceCount();
      toast('Final piece removed — the last step is available again.', 'warn', 1800);
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
    if (previewFinished) {
      toast('Switch View Mode back to Build before jumping steps.', 'warn', 1800);
      return;
    }

    var target = clamp(Math.round(Number(step) || 1), 1, getActivePieceCount());
    state.activeStep = target;
    state.completed = false;
    ghostRotated = false;

    hideComplete();
    updateAll();
    scheduleSave();

    if (target < getActivePieceCount()) {
      toast('Jumped to step ' + formatNumber(target) + ' · ' + typeLabel(getCurrentPlacement().type) + '.', '', 1300);
    } else {
      toast('Final step · place the last brick to finish ' + activeModel.meta.name + '.', '', 1800);
    }
  }

  function resetBuild() {
    hideComplete();
    previewFinished = false;
    state.activeStep = 1;
    state.completed = false;
    state.explode = 0;
    ghostRotated = false;
    updateAll();
    scheduleSave();
    toast('Build reset — ' + formatNumber(getActivePieceCount()) + ' fresh steps ready.', 'good', 1800);
  }

  function rotatePreview() {
    if (previewFinished) {
      toast('Switch View Mode back to Build before rotating.', 'warn', 1600);
      return;
    }
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

    var gx = Math.floor(point.x + AUTHOR_GRID / 2);
    var gz = Math.floor(point.z + AUTHOR_GRID / 2);
    if (gx < 0 || gz < 0 || gx >= AUTHOR_GRID || gz >= AUTHOR_GRID) return null;

    gx = clamp(gx, 0, AUTHOR_GRID - fp.w);
    gz = clamp(gz, 0, AUTHOR_GRID - fp.d);
    var y = getTopAtFootprint(gx, gz, fp.w, fp.d);

    return { gx: gx, gz: gz, w: fp.w, d: fp.d, y: y, rot: rot, def: def };
  }

  function placeAuthoringAtHover(event) {
    if (state.explode > 0) {
      toast('Return the Explode View slider to 0 before adding bricks.', 'warn', 2000);
      return;
    }

    if (state.customBricks.length >= AUTHOR_MAX) {
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

    if (state.customBricks.length === AUTHOR_MAX) {
      toast('250-piece custom build complete. Export the step sequence as JSON.', 'good', 3600);
    }
  }

  function computeAuthoringHoverFromPoint(gx, gz, previous) {
    var def = BRICK_TYPES[state.authorType];
    var rot = state.authorRot === 90 ? 90 : 0;
    var fp = footprint(state.authorType, rot);
    var x = clamp(gx, 0, AUTHOR_GRID - fp.w);
    var z = clamp(gz, 0, AUTHOR_GRID - fp.d);
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

  function setPreview(on) {
    if (state.mode === 'authoring') {
      toast('Exit Authoring Mode to preview a finished preset.', 'warn', 1800);
      return;
    }
    if (state.completed) {
      toast('This build is already complete — every piece is visible.', 'good', 1800);
      return;
    }

    previewFinished = !!on;
    audio.click();
    updateBuiltinInstances();
    updateAll();
    if (previewFinished) {
      toast('Finished preview · all ' + formatNumber(getActivePieceCount()) + ' pieces. Your step ' + formatNumber(state.activeStep) + ' is unchanged.', 'good', 2600);
    } else {
      toast('Back to the build · step ' + formatNumber(state.activeStep) + ' of ' + formatNumber(getActivePieceCount()) + '.', '', 1800);
    }
  }

  function setAuthoring(on, options) {
    var opts = options || {};
    var previousMode = state.mode;
    state.mode = on ? 'authoring' : 'guided';

    if (on) {
      if (previousMode !== 'authoring') rememberActiveProgress();
      previewFinished = false;
      hideComplete();
      if (previousMode !== 'authoring') state.explode = 0;
      authoringHover = null;
      setBaseplateSize(AUTHOR_GRID);
      if (!opts.skipCamera) fitAuthoringView(true);
    } else if (activeModel) {
      setBaseplateSize(activeModel.meta.plateSize);
      if (!opts.skipCamera) fitCameraToModel(activeModel, { immediate: true, includeExplode: state.explode > 0 });
    }

    Object.keys(builtinMeshes).forEach(function (type) {
      builtinMeshes[type].mesh.visible = !on;
    });

    if (els.modelIcon) els.modelIcon.textContent = on ? '✏️' : (activeModel ? activeModel.meta.icon : '🧱');
    if (els.moduleBadge) els.moduleBadge.setAttribute('data-mode', on ? 'authoring' : 'guided');

    buildModuleList();
    updateAll();

    if (!opts.skipSave) scheduleSave();

    if (!opts.silent) {
      if (on) {
        audio.click();
        toast('Authoring Studio ready — click the baseplate to stack bricks. Up to ' + AUTHOR_MAX + ' pieces.', 'good', 2800);
      } else if (previousMode === 'authoring') {
        audio.click();
        toast('Back to the guided ' + (activeModel ? activeModel.meta.name : 'build') + '.', '', 1600);
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

    if (previewFinished) {
      toast('Finished preview is on — switch View Mode back to Build to continue.', 'warn', 1800);
      return;
    }

    if (state.mode === 'authoring') {
      authoringHover = computeAuthoringHover(event);
      updateAuthoringGhostVisual();
      placeAuthoringAtHover(event);
      return;
    }

    if (state.completed) {
      toast('Build complete — ' + formatNumber(getActivePieceCount()) + ' pieces locked. Orbit to inspect the model.', 'good', 1800);
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

    if (previewFinished) {
      toast('Finished preview is on — switch View Mode back to Build to drop a brick.', 'warn', 1800);
      return;
    }

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
    } else if (activeModel && activeModel.view) {
      target.copy(activeModel.view.target);
    } else {
      target.set(0, 7.2, 0);
    }

    var dir = camera.position.clone().sub(controls.target).normalize();
    var currentDistance = camera.position.distanceTo(controls.target);
    var dist = clamp(currentDistance * 0.58, 10, 55);
    var toPosition = target.clone().add(dir.multiplyScalar(dist));
    if (toPosition.y < target.y + 4) toPosition.y = target.y + 4;

    tweenCamera(toPosition, target, 720);
  }

  function resetView() {
    if (state.mode === 'authoring' && authoringView) {
      setView(authoringView, false);
    } else if (activeModel) {
      fitCameraToModel(activeModel, { includeExplode: state.explode > 0 });
    } else {
      tweenCamera(new THREE.Vector3(28, 25, 40), new THREE.Vector3(0, 5.5, 0), 760);
    }
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
    if (state.mode !== 'guided' || !activeModel) return;
    previewFinished = false;

    if (els.completeTitle) {
      els.completeTitle.innerHTML = activeModel.meta.name + '<br /><span>assembled.</span>';
    }
    if (els.completeText) {
      els.completeText.textContent = 'All ' + formatNumber(activeModel.pieceCount) + ' pieces are locked in place. Orbit the camera and admire the ' + activeModel.meta.name + '.';
    }
    if (els.completePieces) els.completePieces.textContent = formatNumber(activeModel.pieceCount);
    if (els.completeModules) els.completeModules.textContent = String(activeModel.modules.length || 0);

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
    rememberActiveProgress();
    var placed = getPlacedCount();
    var placedBricks = [];
    if (state.mode !== 'authoring') {
      for (var i = 0; i < placed && activeModel; i++) {
        placedBricks.push(serializeBuiltin(activeModel.placements[i]));
      }
    }

    var payload = {
      app: APP.name,
      version: APP.version,
      type: 'brickstep-progress',
      modelId: state.modelId,
      modelName: activeModel ? activeModel.meta.name : 'Model',
      totalSteps: activeModel ? activeModel.pieceCount : 250,
      pieceCount: activeModel ? activeModel.pieceCount : 250,
      activeStep: state.activeStep,
      completed: state.completed,
      placedCount: placed,
      mode: state.mode,
      explode: state.explode,
      sound: state.sound,
      customBricks: state.customBricks.map(serializeCustom),
      placedBricks: placedBricks,
      modelProgress: state.modelProgress,
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
      totalSteps: AUTHOR_MAX,
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
      state.explode = 0;
      hideComplete();
      setAuthoring(true, { silent: true, skipSave: true });
      updateAll();
      saveStateNow();
      toast('Imported custom build · ' + importedCustom.length + ' steps. Export or keep editing.', 'good', 3200);
      return true;
    }

    if (data && data.activeStep !== undefined) {
      var targetMeta = getPresetMeta(data.modelId) || getPresetMeta(APP.defaultModelId) || PRESET_MODELS[0];
      var importedState = sanitizeState({
        modelId: targetMeta.id,
        activeStep: data.activeStep,
        completed: data.completed,
        mode: data.mode,
        customBricks: data.customBricks,
        modelProgress: data.modelProgress,
        explode: data.explode,
        sound: data.sound,
        authorType: data.authorType,
        authorColor: data.authorColor,
        authorRot: data.authorRot
      });

      rememberActiveProgress();
      state = importedState;
      audio.setEnabled(state.sound);

      function finishProgressImport() {
        setAuthoring(state.mode === 'authoring', { silent: true, skipSave: true });
        updateAll();
        saveStateNow();
        if (state.completed) {
          window.setTimeout(function () {
            showComplete({ sound: false });
          }, 450);
        }
        toast('Progress restored · ' + (activeModel ? activeModel.meta.name : 'model') + ' · step ' + formatNumber(state.activeStep) + ' of ' + formatNumber(getActivePieceCount()) + '.', 'good', 3000);
      }

      if (!activeModel || activeModel.meta.id !== targetMeta.id) {
        loadPresetModel(targetMeta.id, {
          silent: true,
          preserveMode: true,
          preserveState: true,
          skipRemember: true,
          onReady: finishProgressImport
        });
      } else {
        finishProgressImport();
      }
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
      updateHud();
      scheduleSave();
      if (!explodeFrame) {
        explodeFrame = window.requestAnimationFrame(function () {
          explodeFrame = 0;
          updateBuiltinInstances();
          updateCustomInstances();
        });
      }
    });
    els.explodeSlider.addEventListener('change', function () {
      if (state.mode === 'guided' && activeModel) {
        fitCameraToModel(activeModel, { includeExplode: state.explode > 0 });
      }
    });
    els.btnResetView.addEventListener('click', function () { audio.click(); resetView(); });
    els.btnFocus.addEventListener('click', function () { audio.click(); focusCurrent(); });

    els.viewModeToggle.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-view]') : null;
      if (!btn || btn.disabled) return;
      audio.ensure();
      setPreview(btn.getAttribute('data-view') === 'finished');
    });
    els.btnQuickPreview.addEventListener('click', function () {
      audio.ensure();
      setPreview(!previewFinished);
    });

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
      if (window.confirm('Start over and remove all ' + formatNumber(getActivePieceCount()) + ' placed bricks?')) resetBuild();
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
      } else if (event.key === 'v' || event.key === 'V') {
        event.preventDefault();
        setPreview(!previewFinished);
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

      setLoading(10, 'Moulding the brick library…');
      buildGeometryCache();

      setLoading(28, 'Laying the studio stage…');
      initScene();
      initMaterial();
      initCustomMeshes();
      initGhost();
      onResize();

      setLoading(46, 'Wiring the instruction manual…');
      bindEvents();
      buildModelLibrary();

      var initialId = state.modelId || APP.defaultModelId;
      setLoading(64, 'Generating the active model…');
      loadPresetModel(initialId, {
        immediate: true,
        silent: true,
        preserveMode: true,
        preserveState: true,
        onError: function (error) {
          showFatal('The active model could not be generated: ' + (error && error.message ? error.message : 'unknown error'));
        },
        onReady: function () {
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
          }, 320);

          window.BrickStep = {
            version: APP.version,
            getState: function () { return JSON.parse(JSON.stringify(state)); },
            getPlacements: function () { return activeModel ? activeModel.placements.slice() : []; },
            getModels: function () {
              return PRESET_MODELS.map(function (m) {
                return { id: m.id, name: m.name, pieceCount: m.pieceCount, plateSize: m.plateSize, loaded: !!(activeModel && activeModel.meta.id === m.id) };
              });
            },
            loadModel: loadPresetModel,
            snap: snapCurrent,
            jump: jumpToStep,
            reset: resetBuild,
            toggleAuthoring: function () { setAuthoring(state.mode !== 'authoring'); },
            importJSON: applyImportedData,
            save: saveStateNow,
            exportProgress: saveProgressFile
          };
        }
      });
    } catch (error) {
      if (window.console && console.error) console.error(error);
      showFatal('The 3D scene could not be created in this browser. Try Chrome, Safari, or Firefox with WebGL enabled.');
    }
  }

  boot();
})();
