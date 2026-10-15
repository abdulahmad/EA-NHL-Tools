let games = [];
let gameInfo = null;
let spritePalette = '';

const SPA_ORDER = ['Skating', 'Shooting', 'Checking', 'Falls', 'Fight', 'Celebrate', 'Goalies', 'Puck', 'Special', 'Other'];
const SPF_ORDER = ['Players', 'Goalies', 'Ice', 'Other'];

const el = (id) => document.getElementById(id);
const state = {
  mode: 'spa',
  bank: 'Sprites.anim',
  frame: 1,
  spf: 'SPFskatewp',
  spa: 'SPAskatewp',
  dir: 0,
  step: 0,
  playing: true,
  loop: true,
  speed: 1,
  scale: 8,
  pin: 'origin',
  spin: false,
  spinMs: 700,
  minGap: true,
  transparentOverride: null,
  sort: 'group',
  game: 'nhl92',
  image: '',
  paletteName: '',
  paletteExplicit: false,
  query: '',
  acc: 0,
  holdKey: '',
  holdLeft: null,
  lastClock: 0,
  lastSpin: 0
};

const banks = new Map();
const paletteFiles = new Map();
const bitmaps = new Map();
const roms = new Map();
const rinkColors = new Map();
let pathPrefix = '';
let useApi = true;
let clientPc = null;

function resolveUrl(path) {
  const p = path.charAt(0) === '/' ? path : '/' + path;
  return pathPrefix + p;
}

async function detectApi() {
  try {
    const response = await fetch(resolveUrl('/api/games'));
    if (response.ok) {
      useApi = true;
      pathPrefix = '';
      return;
    }
  } catch (err) {
    /* static / GitHub Pages */
  }
  useApi = false;
  const parts = location.pathname.split('/').filter(Boolean);
  pathPrefix = parts.length && !/^(api|lib|data|viewer\.js|viewer\.css)$/i.test(parts[0]) ? '/' + parts[0] : '';
}

async function loadGamesList() {
  await detectApi();
  if (useApi) {
    return fetch(resolveUrl('/api/games')).then((response) => response.json());
  }
  return fetch(resolveUrl('/games.json')).then((response) => response.json());
}
let catalog = null;
let sequenceKey = '';
const FILMSTRIP_LAZY_THRESHOLD = 48;
let filmstripPaintQueue = [];
let filmstripPaintScheduled = false;
let loadToken = 0;
let loadError = '';
let seqCache = null;
let seqCacheToken = '';

function spfAt(frame) {
  if (!catalog) return null;
  return catalog.spfs.find((s) => frame >= s.start && frame <= s.end) || null;
}

function spritesBankId() {
  if (gameInfo && gameInfo.banks.length) {
    const sprites = gameInfo.banks.find((bank) => /sprite/i.test(bank.id));
    return (sprites || gameInfo.banks[0]).id;
  }
  return 'Sprites.anim';
}

function spriteBank() {
  if (state.mode === 'image') return state.image;
  if (state.mode === 'frame') return state.bank;
  return spritesBankId();
}

function named(list, name) {
  if (!name || !list) return null;
  const key = String(name).toLowerCase();
  return list.find((item) => item.name.toLowerCase() === key) || null;
}

function currentAnim() {
  return banks.get(spriteBank()) || null;
}

function activeColors() {
  const anim = currentAnim();
  if (!anim) return null;
  const override = paletteFiles.get(state.paletteName);
  if (gameInfo && gameInfo.paletteKind === 'pc') {
    if (override && override.length >= 256) {
      const colors = override.map((c) => c.slice());
      if (override.game) colors.game = override.game;
      return colors;
    }
    return anim.combined.map((c) => c.slice());
  }
  const colors = anim.combined.map((c) => c.slice());
  if (override) {
    const base = ((gameInfo && gameInfo.jerseyRow) || 2) * 16;
    for (let i = 0; i < 16; i++) colors[base + i] = override[i].slice();
  }
  return colors;
}

function sequence() {
  const anim = currentAnim();
  const token = [
    state.game, state.mode, state.bank, state.image, state.spf, state.spa, state.dir,
    catalog ? 1 : 0,
    anim ? anim.numFrames : 0
  ].join('|');
  if (seqCache && seqCacheToken === token) return seqCache;
  seqCache = buildSequence(anim);
  seqCacheToken = token;
  return seqCache;
}

function buildSequence(anim) {
  if (!catalog) {
    return { key: 'empty', steps: [], directions: false, spin: false, loopDefault: true, title: 'Loading' };
  }
  if (state.mode === 'image') {
    const image = ((gameInfo && gameInfo.images) || []).find((item) => item.id === state.image);
    const steps = [];
    const count = anim ? anim.numFrames : 0;
    for (let f = 1; f <= count; f++) steps.push({ frame: f, ticks: 8 });
    return {
      key: 'image:' + state.image,
      steps,
      directions: false,
      spin: false,
      loopDefault: true,
      title: image ? image.label : (state.image || 'Image')
    };
  }
  if (state.mode === 'frame') {
    if (!anim) {
      return { key: 'frame:none', steps: [], directions: false, spin: false, loopDefault: true, title: state.bank };
    }
    const steps = [];
    for (let f = 1; f <= anim.numFrames; f++) steps.push({ frame: f, ticks: 8 });
    return {
      key: 'frame:' + state.bank,
      steps,
      directions: false,
      spin: false,
      loopDefault: true,
      title: ((gameInfo.banks || []).find((bank) => bank.id === state.bank) || {}).label || state.bank
    };
  }
  if (state.mode === 'spf') {
    const spf = catalog.spfs.find((s) => s.name === state.spf) || catalog.spfs[0];
    const stride = spf.stride;
    const steps = [];
    if (stride) {
      const start = spf.start + state.dir * stride;
      for (let i = 0; i < stride; i++) steps.push({ frame: start + i, ticks: 8 });
    } else {
      for (let f = spf.start; f <= spf.end; f++) steps.push({ frame: f, ticks: 8 });
    }
    return {
      key: 'spf:' + spf.name + ':' + (stride ? state.dir : 'flat'),
      steps,
      directions: Boolean(stride),
      spin: Boolean(stride),
      loopDefault: true,
      title: spf.name,
      blurb: spf.blurb
    };
  }
  if (!catalog.anims.length) {
    return {
      key: 'spa:none',
      steps: [],
      directions: false,
      spin: false,
      loopDefault: false,
      title: 'No SPA table'
    };
  }
  const spa = catalog.anims.find((s) => s.name === state.spa) || catalog.anims[0];
  const dir = spa.directions[state.dir];
  const steps = dir.unused ? [] : dir.steps.map((s) => ({ frame: s.frame, ticks: s.ticks, last: s.last }));
  return {
    key: 'spa:' + spa.name + ':' + state.dir,
    steps,
    directions: true,
    spin: spa.uniqueDirections > 1,
    loopDefault: spa.loop,
    title: spa.name,
    blurb: spa.blurb || spa.comment,
    spa
  };
}

function canvasSize(frame) {
  const width = frame.canvasWidth > 0 ? frame.canvasWidth : frame.width;
  const height = frame.canvasHeight > 0 ? frame.canvasHeight : frame.height;
  return { width, height };
}

function pinPoint(frame) {
  if (frame.picture) return { x: frame.width / 2, y: frame.height / 2 };
  if (state.pin === 'hotspot') return { x: frame.hotspotPxX, y: frame.hotspotPxY };
  return { x: -(frame.minX || 0), y: -(frame.minY || 0) };
}

function onCanvas(frame, x, y) {
  const box = canvasSize(frame);
  return x >= -48 && y >= -48 && x <= box.width + 48 && y <= box.height + 48;
}

function placement(frame) {
  const box = canvasSize(frame);
  const point = pinPoint(frame);
  if (onCanvas(frame, point.x, point.y)) return { mode: state.pin, ax: point.x, ay: point.y };
  return { mode: 'center', ax: box.width / 2, ay: box.height / 2 };
}

function imageTransparencyOn(frame) {
  if (state.transparentOverride != null) return state.transparentOverride;
  return Boolean(frame && frame.picture && !frame.opaque);
}

function bitmapFor(frame, colors) {
  const named = state.paletteName;
  const pending = Boolean(named) && !paletteFiles.has(named);
  const team = !pending && named && paletteFiles.has(named);
  const own = Boolean(frame.colors) && !team;
  const override = state.mode === 'image' ? state.transparentOverride : null;
  const key = pending
    ? ''
    : state.game + ':' + spriteBank() + ':' + frame.frame + ':' + (own ? 'own' : (named || 'embedded')) + ':' + (override == null ? 'd' : override ? 't' : 'o');
  let canvas = key && bitmaps.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, frame.width);
    canvas.height = Math.max(1, frame.height);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    const data = image.data;
    let palette = own ? frame.colors : colors;
    if (!own && frame.dynamic === false && colors && colors.game) palette = colors.game;
    const opaque = override === false || (override == null && Boolean(frame.opaque));
    const skip = frame.transparent == null ? 0 : frame.transparent;
    const byRow = (override === true || (override == null && Boolean(frame.rowTransparent))) && !opaque;
    for (let i = 0; i < frame.pixels.length; i++) {
      const index = frame.pixels[i];
      const o = i * 4;
      if (byRow) {
        if (Nhl92Jim.picturePixelHidden(index, frame.clearIndex)) continue;
      } else if (index === skip && !opaque) continue;
      const rgb = palette[index] || [0, 0, 0];
      data[o] = rgb[0];
      data[o + 1] = rgb[1];
      data[o + 2] = rgb[2];
      data[o + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    if (key) bitmaps.set(key, canvas);
  }
  return canvas;
}

function renderedFrame(frameNumber) {
  const anim = currentAnim();
  if (!anim || frameNumber < 1 || frameNumber > anim.numFrames) return null;
  if (anim.renderFrame) return anim.renderFrame(frameNumber);
  return Nhl92Anim.renderFrame(anim, frameNumber);
}

function paintInto(ctx, cssW, cssH, frame, colors, scaleCap, opts) {
  const padBottom = opts && opts.padBottom || 0;
  const mark = !opts || opts.mark !== false;
  ctx.clearRect(0, 0, cssW, cssH);
  if (!frame || !frame.width) return 0;
  const box = canvasSize(frame);
  const place = placement(frame);
  let scale = scaleCap;
  if (!opts || !opts.exactScale) {
    const halfW = Math.max(8, (cssW - 8) / 2);
    const halfH = Math.max(8, (cssH - 8 - padBottom) / 2);
    const reachX = Math.max(place.ax, box.width - place.ax, 1);
    const reachY = Math.max(place.ay, box.height - place.ay, 1);
    scale = Math.max(0.08, Math.min(scaleCap, halfW / reachX, halfH / reachY));
  }
  const bmp = bitmapFor(frame, colors);
  const originX = cssW / 2;
  const originY = (cssH - padBottom) / 2;
  const dx = originX - place.ax * scale;
  const dy = originY - place.ay * scale;
  ctx.imageSmoothingEnabled = scale < 1.25;
  ctx.drawImage(bmp, dx, dy, frame.width * scale, frame.height * scale);
  strokeCanvas(ctx, dx, dy, box.width * scale, box.height * scale);
  if (mark) {
    const originPxX = -(frame.minX || 0);
    const originPxY = -(frame.minY || 0);
    if (onCanvas(frame, originPxX, originPxY)) strokeOrigin(ctx, dx + originPxX * scale, dy + originPxY * scale);
    if (onCanvas(frame, frame.hotspotPxX, frame.hotspotPxY)) {
      strokeOffset(ctx, dx + frame.hotspotPxX * scale, dy + frame.hotspotPxY * scale);
    }
  }
  return scale;
}

function strokeCanvas(ctx, x, y, w, h) {
  if (w < 1 || h < 1) return;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  ctx.strokeStyle = 'rgba(16, 20, 24, 0.92)';
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.restore();
}

function strokeOrigin(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 180, 41, 0.95)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();
  ctx.restore();
}

function strokeOffset(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = 'rgba(226, 59, 50, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx + 7, cy);
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();
  ctx.restore();
}

function paintStage() {
  const canvas = el('stage');
  const wrap = canvas.parentElement;
  const cssW = wrap.clientWidth;
  const cssH = wrap.clientHeight;
  if (!cssW || !cssH) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = activeColors();
  const seq = sequence();
  const step = seq.steps[state.step];
  const frame = step ? renderedFrame(step.frame) : null;
  if (!colors || !frame) {
    ctx.clearRect(0, 0, cssW, cssH);
    return;
  }
  const fit = viewScale(cssW, cssH, 46, 64);
  const picture = frame.picture || state.mode === 'image';
  const base = picture ? Math.min(8, fit) : Math.min(state.scale, fit);
  const zoom = picture ? Math.pow(2, (state.scale - 8) / 2) : 1;
  paintInto(ctx, cssW, cssH, frame, colors, base * zoom, {
    padBottom: 46,
    exactScale: true,
    mark: !frame.picture
  });
}

const fitCache = new Map();

function viewScale(cssW, cssH, padBottom, scaleCap) {
  const fitKey = [
    state.mode,
    state.mode === 'frame' ? state.bank + ':' + state.frame : state.mode === 'spa' ? state.spa : state.mode === 'image' ? state.image : state.spf,
    state.pin, cssW, cssH, padBottom, scaleCap
  ].join(':');
  if (fitCache.has(fitKey)) return fitCache.get(fitKey);
  const frames = [];
  if (state.mode === 'frame') {
    const frame = renderedFrame(state.frame);
    if (frame) frames.push(frame);
  } else if (state.mode === 'image') {
    const step = sequence().steps[state.step];
    const frame = step && renderedFrame(step.frame);
    if (frame) frames.push(frame);
  } else if (state.mode === 'spa' && catalog) {
    const spa = catalog.anims.find((s) => s.name === state.spa);
    if (spa) {
      for (const dir of spa.directions) {
        for (const step of dir.steps) {
          const frame = renderedFrame(step.frame);
          if (frame) frames.push(frame);
        }
      }
    }
  } else if (catalog) {
    const spf = catalog.spfs.find((s) => s.name === state.spf);
    if (spf && spf.stride) {
      for (let n = spf.start; n <= spf.end; n++) {
        const frame = renderedFrame(n);
        if (frame) frames.push(frame);
      }
    } else {
      const step = sequence().steps[state.step];
      const frame = step && renderedFrame(step.frame);
      if (frame) frames.push(frame);
    }
  }
  let maxX = 1;
  let maxY = 1;
  for (const frame of frames) {
    if (!frame.width) continue;
    const box = canvasSize(frame);
    const place = placement(frame);
    maxX = Math.max(maxX, place.ax, box.width - place.ax, 1);
    maxY = Math.max(maxY, place.ay, box.height - place.ay, 1);
  }
  const halfW = Math.max(24, (cssW - 36) / 2);
  const halfH = Math.max(24, (cssH - 28 - padBottom) / 2);
  const scale = Math.max(0.08, Math.min(scaleCap, halfW / maxX, halfH / maxY));
  fitCache.set(fitKey, scale);
  return scale;
}

function paintThumb(canvas, frame, colors) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = 78;
  const cssH = 72;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintInto(ctx, cssW, cssH, frame, colors, 4, { mark: false });
}

function stepTicks(step) {
  if (!step) return null;
  return Nhl92Playback.holdVblanks(step.ticks, state.minGap);
}

function advance() {
  const seq = sequence();
  if (!seq.steps.length) {
    state.playing = false;
    return;
  }
  if (state.step + 1 < seq.steps.length) state.step += 1;
  else if (state.loop) state.step = 0;
  else state.playing = false;
  state.holdKey = '';
  if (state.mode === 'frame') state.frame = seq.steps[state.step].frame;
  refreshPlaybackChrome();
}

function rotate(delta) {
  const seq = sequence();
  if (!seq.directions) return;
  for (let i = 1; i <= 8; i++) {
    const dir = (state.dir + delta * i + 8) % 8;
    if (state.mode === 'spa') {
      const spa = catalog.anims.find((s) => s.name === state.spa);
      if (!spa || spa.directions[dir].unused) continue;
    }
    state.dir = dir;
    const next = sequence();
    if (state.step >= next.steps.length) state.step = 0;
    refreshAll();
    return;
  }
}

function armHold() {
  const seq = sequence();
  const step = seq.steps[state.step];
  const key = seq.key + ':' + state.step + ':' + (state.minGap ? 1 : 0);
  if (state.holdKey === key) return state.holdLeft;
  state.holdKey = key;
  state.holdLeft = stepTicks(step);
  return state.holdLeft;
}

function clock(now) {
  if (!state.lastClock) state.lastClock = now;
  const dt = now - state.lastClock;
  state.lastClock = now;
  if (state.playing) {
    state.acc += dt * state.speed;
    let advanced = false;
    let steps = 0;
    while (state.acc >= Nhl92Playback.VBLANK_MS && steps < 8) {
      const hold = armHold();
      if (hold == null) {
        state.playing = false;
        state.acc = 0;
        break;
      }
      state.acc -= Nhl92Playback.VBLANK_MS;
      steps += 1;
      state.holdLeft -= 1;
      if (state.holdLeft <= 0) {
        advance();
        advanced = true;
      }
    }
    if (steps === 8) state.acc = 0;
    if (advanced) paintStage();
  }
  if (state.spin && sequence().spin) {
    if (!state.lastSpin) state.lastSpin = now;
    if (now - state.lastSpin >= state.spinMs) {
      state.lastSpin = now;
      rotate(1);
      paintStage();
    }
  }
  el('lamp').classList.toggle('is-on', state.playing);
  requestAnimationFrame(clock);
}

function bindSpfEnd() {
  const sprites = banks.get(spritesBankId());
  const last = catalog.spfs[catalog.spfs.length - 1];
  if (sprites && last && last.end == null) {
    last.end = sprites.numFrames;
    last.count = last.end - last.start + 1;
  }
}

const IMAGE_ORDER = ['Screens', 'Logos', 'Players', 'Sprites', 'Ice', 'Jumbotron', 'Fonts', 'Other'];
const imageMemory = new Map();

function renderImageList(box, q) {
  const images = (gameInfo && gameInfo.images) || [];
  if (!images.length) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = gameInfo && gameInfo.hint
      ? 'No picture files in Sprite-Viewer/pc95/ yet.'
      : 'This game has no extra pictures in the viewer yet.';
    box.appendChild(note);
    return;
  }
  const groups = new Map();
  const visible = [];
  for (const image of images) {
    const hay = (image.label + ' ' + image.id + ' ' + (image.files || []).join(' ') + ' ' + (image.group || '')).toLowerCase();
    if (q && !hay.includes(q)) continue;
    visible.push(image);
    const group = image.group || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(image);
  }
  if (!visible.length) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Nothing matches that search.';
    box.appendChild(note);
    return;
  }
  const extra = [...groups.keys()].filter((group) => !IMAGE_ORDER.includes(group));
  const sections = state.sort === 'file'
    ? [{ label: '', items: visible }]
    : IMAGE_ORDER.concat(extra).filter((group) => groups.has(group)).map((group) => ({ label: group, items: groups.get(group) }));
  for (const section of sections) {
    if (section.label) {
      const label = document.createElement('div');
      label.className = 'group-label';
      label.textContent = section.label;
      box.appendChild(label);
    }
    for (const image of section.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'item';
      button.setAttribute('role', 'option');
      const selected = image.id === state.image;
      button.classList.toggle('is-current', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = image.label;
      const sub = document.createElement('span');
      sub.className = 'sub';
      sub.textContent = image.files && image.files.length > 1 ? image.files.length + ' files' : image.id;
      button.append(name, sub);
      button.addEventListener('click', () => {
        if (state.image !== image.id) state.transparentOverride = null;
        state.image = image.id;
        state.step = 0;
        state.acc = 0;
        state.holdKey = '';
        state.playing = false;
        rememberImage();
        closeDrawers();
        applyImagePalette(image).then(() => ensureImage(state.image)).then(() => {
          loadError = '';
          refreshAll();
        }).catch((err) => {
          loadError = err.message;
          refreshAll();
        });
      });
      box.appendChild(button);
    }
  }
  const current = box.querySelector('.item.is-current');
  if (current) {
    const itemRect = current.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    if (itemRect.top < boxRect.top || itemRect.bottom > boxRect.bottom) {
      box.scrollTop += itemRect.top - boxRect.top - 28;
    }
  }
}

function renderList() {
  const box = el('catalog');
  box.replaceChildren();
  const q = state.query.trim().toLowerCase();
  if (!catalog) return;
  if (state.mode === 'image') {
    renderImageList(box, q);
    return;
  }
  if (state.mode === 'frame') {
    const note = document.createElement('p');
    note.className = 'empty-note';
    const anim = banks.get(state.bank);
    note.textContent = anim
      ? anim.numFrames + ' frames in ' + spriteBank() + '. Scrub the step slider or filmstrip, or pick an SPF or SPA.'
      : (gameInfo && !gameInfo.pixels
        ? (gameInfo.hint || ('Pictures need the ROM at Sprite-Viewer/' + gameInfo.romHint + '.'))
        : 'Loading ' + state.bank + '…');
    box.appendChild(note);
    return;
  }
  const entries = state.mode === 'spf' ? catalog.spfs : catalog.anims;
  const order = state.mode === 'spf' ? SPF_ORDER : SPA_ORDER;
  const visible = [];
  const groups = new Map();
  for (const entry of entries) {
    const hay = (entry.name + ' ' + (entry.blurb || '') + ' ' + (entry.comment || '')).toLowerCase();
    if (q && !hay.includes(q)) continue;
    visible.push(entry);
    const group = entry.group || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  }
  if (!visible.length) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = !entries.length && state.mode === 'spa' && !catalog.anims.length
      ? 'No SPA table for this game. The frame ranges are under SPF.'
      : 'Nothing matches that search.';
    box.appendChild(note);
    return;
  }
  const extraGroups = [...groups.keys()].filter((group) => !order.includes(group));
  const sections = state.sort === 'file'
    ? [{ label: '', items: visible }]
    : order.concat(extraGroups).filter((group) => groups.has(group)).map((group) => ({ label: group, items: groups.get(group) }));
  for (const section of sections) {
    if (section.label) {
      const label = document.createElement('div');
      label.className = 'group-label';
      label.textContent = section.label;
      box.appendChild(label);
    }
    for (const entry of section.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'item';
      button.setAttribute('role', 'option');
      const selected = state.mode === 'spf' ? entry.name === state.spf : entry.name === state.spa;
      button.classList.toggle('is-current', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = entry.name;
      const sub = document.createElement('span');
      sub.className = 'sub';
      if (state.mode === 'spf') {
        sub.textContent = entry.end == null
          ? 'from ' + entry.start
          : entry.start + '–' + entry.end + ' · ' + entry.count + ' frames' +
            (entry.stride ? ' · 8 facings' : '');
      } else {
        const faces = entry.uniqueDirections === 1 ? '1 shared sequence' : entry.uniqueDirections + ' facings';
        sub.textContent = (entry.comment || '') + (entry.comment ? ' · ' : '') + faces + (entry.loop ? ' · loops' : '');
      }
      button.append(name, sub);
      button.addEventListener('click', () => {
        closeDrawers();
        if (state.mode === 'spf') {
          state.spf = entry.name;
          state.dir = 0;
        } else {
          state.spa = entry.name;
        }
        state.step = 0;
        state.acc = 0;
        state.holdKey = '';
        state.playing = true;
        refreshAll();
      });
      box.appendChild(button);
    }
  }
  const current = box.querySelector('.item.is-current');
  if (current) {
    const itemRect = current.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    if (itemRect.top < boxRect.top || itemRect.bottom > boxRect.bottom) {
      box.scrollTop += itemRect.top - boxRect.top - 28;
    }
  }
}

function filmstripStepJump() {
  const len = sequence().steps.length;
  if (len < 2) return 1;
  return Math.max(8, Math.min(40, Math.round(len / 12)));
}

function scheduleFilmstripPaints() {
  if (filmstripPaintScheduled) return;
  filmstripPaintScheduled = true;
  const paintBatch = () => {
    const colors = activeColors();
    let painted = 0;
    while (filmstripPaintQueue.length && painted < 10) {
      const job = filmstripPaintQueue.shift();
      if (!job.canvas.isConnected) continue;
      const frame = renderedFrame(job.frameNumber);
      if (frame && colors) paintThumb(job.canvas, frame, colors);
      painted++;
    }
    if (filmstripPaintQueue.length) requestAnimationFrame(paintBatch);
    else filmstripPaintScheduled = false;
  };
  requestAnimationFrame(paintBatch);
}

function renderFilmstrip() {
  const seq = sequence();
  const strip = el('filmstrip');
  const filmKey = seq.key + ':' + state.pin;
  if (filmKey === sequenceKey && strip.childElementCount) {
    highlightStep();
    return;
  }
  sequenceKey = filmKey;
  filmstripPaintQueue = [];
  filmstripPaintScheduled = false;
  strip.replaceChildren();
  const colors = activeColors();
  if (!colors) return;
  const lazyPaint = seq.steps.length > FILMSTRIP_LAZY_THRESHOLD;
  const steps = seq.steps.map((step, index) => ({ step, index }));
  for (const item of steps) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.dataset.step = String(item.index);
    const canvas = document.createElement('canvas');
    const label = document.createElement('span');
    label.textContent = String(item.step.frame);
    button.append(canvas, label);
    if (lazyPaint) filmstripPaintQueue.push({ canvas, frameNumber: item.step.frame });
    else {
      const frame = renderedFrame(item.step.frame);
      if (frame) paintThumb(canvas, frame, colors);
    }
    button.addEventListener('click', () => {
      state.step = item.index;
      if (state.mode === 'frame') state.frame = item.step.frame;
      state.acc = 0;
      refreshPlaybackChrome();
      paintStage();
      writeHash();
    });
    strip.appendChild(button);
  }
  if (lazyPaint) scheduleFilmstripPaints();
  highlightStep();
}

function highlightStep() {
  const strip = el('filmstrip');
  let current = null;
  for (const button of strip.querySelectorAll('.thumb')) {
    const on = Number(button.dataset.step) === state.step;
    button.classList.toggle('is-current', on);
    if (on) current = button;
  }
  if (current) {
    const left = current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left) });
  }
}

function renderMeta() {
  const anim = currentAnim();
  const seq = sequence();
  const step = seq.steps[state.step];
  const frame = step ? renderedFrame(step.frame) : null;
  const detail = el('detail');
  detail.replaceChildren();
  const rows = [];
  if (state.mode === 'spa' && seq.spa) {
    const dir = seq.spa.directions[state.dir];
    const facing = catalog.directions[state.dir];
    rows.push(['SPA', seq.spa.name]);
    rows.push(['Facing', state.dir + ' ' + facing.name]);
    rows.push(['Flags', '0x' + seq.spa.flags.toString(16)]);
    rows.push(['Loop bit', seq.spa.loop ? 'set' : 'clear']);
    if (dir.sharedWith.length) {
      rows.push(['Shared', dir.sharedWith.map((d) => catalog.directions[d].short).join(' ')]);
    }
    if (dir.unused) rows.push(['Sequence', 'none']);
  } else if (state.mode === 'spf') {
    const spf = catalog.spfs.find((s) => s.name === state.spf);
    rows.push(['SPF', spf.name]);
    rows.push(['Range', spf.start + '–' + spf.end]);
    rows.push(['Stride', spf.stride ? String(spf.stride) : 'flat']);
  } else if (state.mode === 'image') {
    const image = ((gameInfo && gameInfo.images) || []).find((item) => item.id === state.image);
    rows.push(['Image', image ? image.label : state.image]);
    if (image) {
      const files = image.files && image.files.length ? image.files : [image.id];
      rows.push(['File', files.length > 1 ? files[0] + ' … ' + files[files.length - 1] : image.id]);
    }
  }
  if (frame) {
    const owner = spfAt(frame.frame);
    rows.push(['Frame', String(frame.frame)]);
    rows.push(['Index', String(frame.index)]);
    if (state.mode !== 'image' && (state.mode !== 'frame' || state.bank === spritesBankId())) {
      rows.push(['In SPF', owner ? owner.name : '—']);
    }
    rows.push(['Sprites', String(frame.numSprites)]);
    const box = canvasSize(frame);
    rows.push(['Canvas', box.width + '×' + box.height]);
    if (box.width !== frame.width || box.height !== frame.height) {
      rows.push(['Art', frame.width + '×' + frame.height]);
    }
    rows.push(['Hotspot', frame.hotspotX + ', ' + frame.hotspotY]);
    if (step) {
      const shown = stepTicks(step);
      rows.push(['Hold', shown == null ? 'forever (' + step.ticks + ')' : step.ticks + ' in the table · ' + shown + ' on screen']);
    }
  }
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    detail.append(dt, dd);
  }
  el('detail-title').textContent = frame ? 'Frame ' + frame.frame : 'Frame';

  const table = el('sprites');
  table.replaceChildren();
  if (!frame || frame.picture || !frame.sprites.length) {
    table.textContent = frame && frame.picture
      ? 'This is a picture, not a sprite frame.'
      : frame && frame.width
        ? 'This frame is one picture, not a stack of Genesis sprites.'
        : 'No sprites in this frame.';
    return;
  }
  const html = document.createElement('table');
  html.innerHTML = '<thead><tr><th>#</th><th>x</th><th>y</th><th>w</th><th>h</th><th>tile</th><th>flip</th><th>pal</th></tr></thead>';
  const body = document.createElement('tbody');
  frame.sprites.forEach((sprite, index) => {
    const tr = document.createElement('tr');
    const flip = (sprite.hFlip ? 'H' : '') + (sprite.vFlip ? 'V' : '') || '–';
    const cells = [
      index, sprite.xpos, sprite.ypos,
      sprite.dimensions.width, sprite.dimensions.height,
      sprite.tileIndex, flip, sprite.paletteIndex
    ];
    for (const cell of cells) {
      const td = document.createElement('td');
      td.textContent = String(cell);
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  html.appendChild(body);
  table.appendChild(html);
}

function renderSwatches() {
  const colors = activeColors();
  const box = el('swatches');
  box.replaceChildren();
  if (!colors || !colors.length) return;
  const row = ((gameInfo && gameInfo.jerseyRow) || 2) * 16;
  const base = row + 15 < colors.length ? row : 0;
  for (let i = 0; i < 16; i++) {
    const rgb = colors[base + i];
    if (!rgb) continue;
    const chip = document.createElement('i');
    chip.style.background = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    chip.title = (base === row ? 'Jersey color ' : 'Color ') + i;
    box.appendChild(chip);
  }
}

function romHint() {
  const images = (gameInfo && gameInfo.images) || [];
  if (!images.length) {
    if (gameInfo && gameInfo.hint && !gameInfo.pixels) return gameInfo.hint;
    return 'This game has no extra pictures in the viewer yet.';
  }
  if (gameInfo && !gameInfo.pixels) {
    if (gameInfo.hint) return gameInfo.hint;
    if (gameInfo.romHint) {
      return 'Add the ROM at Sprite-Viewer/' + gameInfo.romHint + ' to draw this picture.';
    }
  }
  return 'No picture loaded.';
}

function rememberImage() {
  if (!gameInfo || !state.image) return;
  const image = ((gameInfo.images) || []).find((item) => item.id === state.image);
  imageMemory.set(gameInfo.id, { id: state.image, label: image ? image.label : '' });
}

function closeDrawers() {
  const app = document.querySelector('.app');
  if (!app) return;
  app.classList.remove('show-list', 'show-meta');
  const list = el('toggle-list');
  const meta = el('toggle-meta');
  if (list) list.setAttribute('aria-expanded', 'false');
  if (meta) meta.setAttribute('aria-expanded', 'false');
}

function currentImage() {
  return ((gameInfo && gameInfo.images) || []).find((image) => image.id === state.image) || null;
}

function showEmbeddedPalette() {
  if (state.mode !== 'image' && state.paletteName) spritePalette = state.paletteName;
  state.paletteName = '';
  const menu = el('palette');
  if (menu && [...menu.options].some((option) => option.value === '')) menu.value = '';
}

// Jumbotron clips and the scoreboard are indexed into the team palette.
async function applyImagePalette(image) {
  if (image && image.group === 'Jumbotron') {
    if (!state.paletteName) await restoreSpritePalette();
    return;
  }
  showEmbeddedPalette();
}

async function restoreSpritePalette() {
  if (state.mode !== 'image') return;
  const menu = el('palette');
  const files = menu ? [...menu.options].map((option) => option.value).filter(Boolean) : [];
  const matched = Nhl92Labels.matchPaletteFile(files, spritePalette) || '';
  state.paletteName = matched;
  spritePalette = matched;
  if (menu && [...menu.options].some((option) => option.value === matched)) menu.value = matched;
  if (state.paletteName) await ensurePalette(state.paletteName);
  bitmaps.clear();
}

function renderCaption() {
  const seq = sequence();
  const step = seq.steps[state.step];
  const cap = el('caption');
  if (!step) {
    cap.textContent = loadError || (state.mode === 'spa'
      ? (catalog && !catalog.anims.length
        ? 'No SPA table for this game. The frame ranges are under SPF.'
        : 'This facing has no sequence of its own. The table runs off the end of the animation.')
      : state.mode === 'image'
        ? romHint()
        : 'No frame.');
    return;
  }
  const frame = renderedFrame(step.frame);
  if (!frame) {
    if (loadError) {
      cap.textContent = loadError;
      return;
    }
    cap.textContent = gameInfo && !gameInfo.pixels
      ? (gameInfo.hint || (gameInfo.title + ' names are loaded. Add the ROM at Sprite-Viewer/' + gameInfo.romHint + ' and restart the server to draw the frames.'))
      : 'Frame ' + step.frame + ' is outside this bank.';
    return;
  }
  const facing = catalog.directions[state.dir];
  const bits = [];
  bits.push(seq.title);
  if (seq.directions) bits.push(facing.short + ' ' + facing.name.toLowerCase());
  bits.push('step ' + (state.step + 1) + '/' + seq.steps.length);
  bits.push('frame ' + step.frame);
  if (state.mode === 'spa') {
    const shown = stepTicks(step);
    bits.push(shown == null ? 'holds' : shown + ' vblanks');
  }
  cap.textContent = bits.join(' · ');
}

function renderCompass() {
  const seq = sequence();
  const compass = el('compass');
  compass.classList.toggle('is-hidden', !seq.directions);
  for (const button of compass.querySelectorAll('[data-dir]')) {
    const dir = Number(button.dataset.dir);
    let unused = false;
    if (state.mode === 'spa' && catalog) {
      const spa = catalog.anims.find((s) => s.name === state.spa);
      unused = spa ? spa.directions[dir].unused : false;
    }
    button.disabled = !seq.directions || unused;
    button.setAttribute('aria-pressed', dir === state.dir && seq.directions ? 'true' : 'false');
  }
  const spin = el('spin');
  spin.disabled = !seq.spin;
  spin.setAttribute('aria-pressed', state.spin && seq.spin ? 'true' : 'false');
  if (!seq.spin && state.spin) state.spin = false;
}

function renderTransport() {
  const seq = sequence();
  const frameSlider = el('frame');
  const stepCount = seq.steps.length;
  if (stepCount) {
    const clampedStep = Math.max(0, Math.min(stepCount - 1, state.step));
    const step = seq.steps[clampedStep];
    const frameNum = step ? step.frame : state.frame;
    frameSlider.min = '1';
    frameSlider.max = String(stepCount);
    frameSlider.disabled = false;
    frameSlider.value = String(clampedStep + 1);
    const readout = el('frame-readout');
    if (stepCount > 1) readout.textContent = frameNum + ' · step ' + (clampedStep + 1) + '/' + stepCount;
    else readout.textContent = frameNum + ' · index ' + (frameNum - 1);
  } else {
    frameSlider.min = '1';
    frameSlider.max = '1';
    frameSlider.value = '1';
    frameSlider.disabled = true;
    el('frame-readout').textContent = '—';
  }
  el('play').textContent = state.playing ? 'Pause' : 'Play';
  el('loop').checked = state.loop;
  el('min-gap').checked = state.minGap;
  const transparent = el('transparent');
  const showTransparent = state.mode === 'image';
  el('transparent-field').classList.toggle('is-hidden', !showTransparent);
  if (showTransparent) {
    const frame = renderedFrame(sequence().steps[state.step] ? sequence().steps[state.step].frame : 1);
    transparent.checked = frame ? imageTransparencyOn(frame) : false;
  }
  el('scale-readout').textContent = state.scale + '×';
  el('pin-origin').setAttribute('aria-pressed', state.pin === 'hotspot' ? 'false' : 'true');
  el('pin-hotspot').setAttribute('aria-pressed', state.pin === 'hotspot' ? 'true' : 'false');
  el('sort-group').setAttribute('aria-pressed', state.sort === 'group' ? 'true' : 'false');
  el('sort-file').setAttribute('aria-pressed', state.sort === 'file' ? 'true' : 'false');
  if ([...el('bank').options].some((option) => option.value === state.bank)) el('bank').value = state.bank;
  el('bank').disabled = state.mode !== 'frame' || !gameInfo || gameInfo.banks.length < 2;
  for (const mode of ['frame', 'spf', 'spa', 'image']) {
    el('mode-' + mode).setAttribute('aria-selected', state.mode === mode ? 'true' : 'false');
  }
}

function refreshPlaybackChrome() {
  renderCaption();
  renderTransport();
  renderCompass();
  renderMeta();
  if (sequence().key + ':' + state.pin !== sequenceKey) renderFilmstrip();
  else highlightStep();
}

function refreshAll() {
  renderList();
  renderSwatches();
  refreshPlaybackChrome();
  renderFilmstrip();
  paintStage();
  writeHash();
}

function writeHash() {
  const params = new URLSearchParams();
  params.set('game', state.game);
  params.set('mode', state.mode);
  if (state.mode === 'image') {
    params.set('img', state.image);
  } else if (state.mode === 'frame') {
    params.set('bank', state.bank);
    params.set('frame', String(state.frame));
  } else if (state.mode === 'spf') {
    params.set('spf', state.spf);
    params.set('dir', String(state.dir));
  } else {
    params.set('spa', state.spa);
    params.set('dir', String(state.dir));
    params.set('step', String(state.step));
  }
  params.set('pal', state.paletteName || 'embedded');
  if (state.pin === 'hotspot') params.set('pin', 'hotspot');
  if (state.spin) params.set('spin', '1');
  history.replaceState(null, '', '#' + params.toString());
}

function readHash() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const mode = params.get('mode');
  if (mode === 'frame' || mode === 'spf' || mode === 'spa' || mode === 'image') state.mode = mode;
  if (params.get('game') && games.some((game) => game.id === params.get('game'))) state.game = params.get('game');
  if (params.get('bank') && gameInfo && gameInfo.banks.some((bank) => bank.id === params.get('bank'))) {
    state.bank = params.get('bank');
  }
  if (params.get('spf')) state.spf = params.get('spf');
  if (params.get('spa')) state.spa = params.get('spa');
  if (params.get('img')) state.image = params.get('img');
  if (params.get('dir')) state.dir = Math.max(0, Math.min(7, Number(params.get('dir')) || 0));
  if (params.get('frame')) state.frame = Number(params.get('frame')) || 1;
  if (params.get('step')) state.step = Number(params.get('step')) || 0;
  if (params.has('pal')) {
    state.paletteExplicit = true;
    state.paletteName = params.get('pal') === 'embedded' ? '' : params.get('pal');
  }
  if (params.get('pin') === 'hotspot') state.pin = 'hotspot';
  if (params.get('spin') === '1') state.spin = true;
}

function selectNeighbor(delta) {
  const buttons = [...el('catalog').querySelectorAll('.item')];
  const index = buttons.findIndex((button) => button.classList.contains('is-current'));
  const next = buttons[index + delta];
  if (next) next.click();
}

function wire() {
  function clearSearch() {
    state.query = '';
    el('search').value = '';
  }
  el('mode-frame').addEventListener('click', async () => {
    clearSearch();
    await restoreSpritePalette();
    const from = state.mode;
    const shown = sequence().steps[state.step];
    state.mode = 'frame';
    if (from !== 'frame') {
      state.bank = spriteBank();
      if (shown) state.frame = shown.frame;
    }
    state.step = state.frame - 1;
    state.playing = false;
    el('bank').value = state.bank;
    await ensureBank(state.bank);
    refreshAll();
  });
  el('mode-spf').addEventListener('click', async () => {
    clearSearch();
    await restoreSpritePalette();
    state.mode = 'spf';
    state.dir = 0;
    state.step = 0;
    state.playing = true;
    state.acc = 0;
    refreshAll();
  });
  el('mode-spa').addEventListener('click', async () => {
    clearSearch();
    await restoreSpritePalette();
    state.mode = 'spa';
    state.step = 0;
    state.acc = 0;
    state.playing = true;
    refreshAll();
  });
  el('mode-image').addEventListener('click', async () => {
    clearSearch();
    if (state.mode !== 'image' && state.paletteName) spritePalette = state.paletteName;
    state.mode = 'image';
    if (!state.image && gameInfo && gameInfo.images.length) state.image = gameInfo.images[0].id;
    await applyImagePalette(currentImage());
    state.step = 0;
    state.acc = 0;
    state.playing = false;
    try {
      loadError = '';
      await ensureImage(state.image);
    } catch (err) {
      loadError = err.message;
    }
    refreshAll();
  });
  el('search').addEventListener('input', () => {
    state.query = el('search').value;
    renderList();
  });
  el('bank').addEventListener('change', async () => {
    state.bank = el('bank').value;
    state.frame = 1;
    state.step = 0;
    await ensureBank(state.bank);
    refreshAll();
  });
  function setPin(pin) {
    if (state.pin === pin) return;
    state.pin = pin;
    renderTransport();
    renderFilmstrip();
    paintStage();
    writeHash();
  }
  el('pin-origin').addEventListener('click', () => setPin('origin'));
  el('pin-hotspot').addEventListener('click', () => setPin('hotspot'));
  el('scale').addEventListener('input', () => {
    state.scale = Number(el('scale').value);
    el('scale-readout').textContent = state.scale + '×';
    paintStage();
  });
  el('frame').addEventListener('input', async () => {
    const seq = sequence();
    const stepIndex = Math.max(0, Math.min(seq.steps.length - 1, Number(el('frame').value) - 1));
    state.step = stepIndex;
    state.acc = 0;
    const step = seq.steps[stepIndex];
    if (state.mode === 'frame' && step) {
      state.frame = step.frame;
    } else if (state.mode === 'image') {
      refreshAll();
      return;
    }
    refreshPlaybackChrome();
    paintStage();
    writeHash();
  });
  el('play').addEventListener('click', () => {
    state.playing = !state.playing;
    state.acc = 0;
    state.holdKey = '';
    if (state.playing) {
      const seq = sequence();
      const ticks = stepTicks(seq.steps[state.step]);
      if (ticks == null || state.step === seq.steps.length - 1 && !state.loop) state.step = 0;
    }
    renderTransport();
  });
  el('prev').addEventListener('click', (event) => nudge(event.shiftKey ? -filmstripStepJump() : -1));
  el('next').addEventListener('click', (event) => nudge(event.shiftKey ? filmstripStepJump() : 1));
  el('loop').addEventListener('change', () => { state.loop = el('loop').checked; });
  el('speed').addEventListener('change', () => { state.speed = Number(el('speed').value); });
  el('min-gap').addEventListener('change', () => {
    state.minGap = el('min-gap').checked;
    state.holdKey = '';
    state.acc = 0;
  });
  el('transparent').addEventListener('change', () => {
    state.transparentOverride = el('transparent').checked;
    paintStage();
  });
  function setSort(sort) {
    if (state.sort === sort) return;
    state.sort = sort;
    renderList();
    renderTransport();
  }
  el('sort-group').addEventListener('click', () => setSort('group'));
  el('sort-file').addEventListener('click', () => setSort('file'));
  el('game').addEventListener('change', () => {
    loadGame(el('game').value, false).catch((err) => {
      el('caption').textContent = err.message;
    });
  });
  el('dwell').addEventListener('input', () => { state.spinMs = Number(el('dwell').value); });
  el('spin').addEventListener('click', () => {
    if (!sequence().spin) return;
    state.spin = !state.spin;
    state.lastSpin = 0;
    renderCompass();
    writeHash();
  });
  el('compass').addEventListener('click', (event) => {
    const button = event.target.closest('[data-dir]');
    if (!button || button.disabled) return;
    state.dir = Number(button.dataset.dir);
    const seq = sequence();
    if (state.step >= seq.steps.length) state.step = 0;
    state.acc = 0;
    refreshAll();
  });
  el('palette').addEventListener('change', async () => {
    const next = el('palette').value;
    state.paletteExplicit = true;
    await ensurePalette(next);
    state.paletteName = next;
    if (state.paletteName || state.mode !== 'image') spritePalette = state.paletteName;
    bitmaps.clear();
    sequenceKey = '';
    refreshAll();
  });
  function setDrawer(name, open) {
    const app = document.querySelector('.app');
    const showList = name === 'list' ? open : false;
    const showMeta = name === 'meta' ? open : false;
    app.classList.toggle('show-list', showList);
    app.classList.toggle('show-meta', showMeta);
    el('toggle-list').setAttribute('aria-expanded', showList ? 'true' : 'false');
    el('toggle-meta').setAttribute('aria-expanded', showMeta ? 'true' : 'false');
  }
  el('toggle-list').addEventListener('click', () => {
    setDrawer('list', !document.querySelector('.app').classList.contains('show-list'));
  });
  el('toggle-meta').addEventListener('click', () => {
    setDrawer('meta', !document.querySelector('.app').classList.contains('show-meta'));
  });
  el('scrim').addEventListener('click', closeDrawers);
  el('stage').addEventListener('wheel', (event) => {
    event.preventDefault();
    state.scale = Math.max(1, Math.min(12, state.scale + (event.deltaY < 0 ? 1 : -1)));
    el('scale').value = String(state.scale);
    el('scale-readout').textContent = state.scale + '×';
    paintStage();
  }, { passive: false });
  window.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (event.code === 'Space') {
      event.preventDefault();
      el('play').click();
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      nudge(event.shiftKey ? filmstripStepJump() : 1);
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      nudge(event.shiftKey ? -filmstripStepJump() : -1);
    } else if (event.code === 'PageDown') { event.preventDefault(); nudge(filmstripStepJump()); }
    else if (event.code === 'PageUp') { event.preventDefault(); nudge(-filmstripStepJump()); }
    else if (event.code === 'ArrowDown') { event.preventDefault(); selectNeighbor(1); }
    else if (event.code === 'ArrowUp') { event.preventDefault(); selectNeighbor(-1); }
    else if (event.key === 'q' || event.key === 'Q') rotate(-1);
    else if (event.key === 'e' || event.key === 'E') rotate(1);
    else if (event.key === 's' || event.key === 'S') el('spin').click();
  });
  window.addEventListener('resize', paintStage);
  new ResizeObserver(paintStage).observe(el('stage').parentElement);
  wireDropTarget();
}

function nudge(delta) {
  const seq = sequence();
  if (!seq.steps.length || !delta) return;
  let next = state.step + delta;
  if (state.loop) next = (next + seq.steps.length) % seq.steps.length;
  else next = Math.max(0, Math.min(seq.steps.length - 1, next));
  state.step = next;
  const step = seq.steps[state.step];
  if (state.mode === 'frame' && step) state.frame = step.frame;
  state.acc = 0;
  state.holdKey = '';
  refreshPlaybackChrome();
  paintStage();
  writeHash();
}

function fillSelect(select, items, selected) {
  select.replaceChildren();
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  }
  if (selected != null && [...select.options].some((option) => option.value === selected)) {
    select.value = selected;
  }
}

const icePalettes = new Map();

async function icePaletteBytes() {
  if (!gameInfo) return null;
  if (icePalettes.has(gameInfo.id)) return icePalettes.get(gameInfo.id);
  const image = (gameInfo.images || []).find((item) => item.kind === 'jim' && /^(IceRink|Rinktilelist)/i.test(item.id));
  if (!image) {
    icePalettes.set(gameInfo.id, null);
    return null;
  }
  const bytes = await bytesFor(image);
  const view = bytes && bytes.length >= 12 ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null;
  const palOff = view ? view.getUint32(0) : 0;
  if (!view || !palOff || palOff === 0xffffffff || palOff + 128 > bytes.length) {
    icePalettes.set(gameInfo.id, null);
    return null;
  }
  const donor = bytes.slice(palOff, palOff + 128);
  icePalettes.set(gameInfo.id, donor);
  return donor;
}

async function ensureRom() {
  if (!gameInfo) return null;
  if (roms.has(gameInfo.id)) return roms.get(gameInfo.id);
  if (!useApi) return null;
  const response = await fetch(resolveUrl('/api/games/' + gameInfo.id + '/rom'));
  if (!response.ok) {
    roms.set(gameInfo.id, null);
    return null;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  roms.set(gameInfo.id, bytes);
  return bytes;
}

async function ensureRink() {
  if (!gameInfo || gameInfo.paletteKind !== 'snes') return null;
  if (rinkColors.has(gameInfo.id)) return rinkColors.get(gameInfo.id);
  const response = await fetch(resolveUrl('/api/games/' + gameInfo.id + '/palettes/' + encodeURIComponent('Rink.snespal')));
  if (!response.ok) return null;
  const colors = Nhl92Snes.decodeRinkPalette(await response.arrayBuffer());
  rinkColors.set(gameInfo.id, colors);
  return colors;
}

async function bytesFor(spec) {
  if (spec.start != null && spec.end != null) {
    const rom = await ensureRom();
    if (rom && spec.start >= 0 && spec.end <= rom.length && spec.start < spec.end) {
      return rom.subarray(spec.start, spec.end);
    }
  }
  if (spec.file) {
    const response = await fetch('/anim/' + encodeURIComponent(spec.id));
    if (!response.ok) throw new Error('Could not load ' + spec.id);
    return new Uint8Array(await response.arrayBuffer());
  }
  return null;
}

async function ensureBank(name) {
  if (banks.has(name)) return banks.get(name);
  if (!gameInfo) return null;
  const spec = (gameInfo.banks || []).find((bank) => bank.id === name);
  if (!spec) return null;
  const token = ++loadToken;
  let parsed;
  if (gameInfo.kind === 'anim') {
    const bytes = await bytesFor(spec);
    if (!bytes) return null;
    parsed = Nhl92Anim.parseAnim(bytes);
  } else if (gameInfo.kind === 'sheet') {
    if (!gameInfo.pixels) return null;
    const rom = await ensureRom();
    if (!rom) throw new Error('Could not load the ' + gameInfo.title + ' ROM');
    if (spec.kind === 'frames' && spec.start != null && spec.end != null) {
      const bytes = rom.subarray(spec.start, spec.end);
      const missing = bytes.length >= 4
        && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0) === 0xffffffff;
      const frameOpts = gameInfo.sheet && gameInfo.sheet.record === '95' ? { record: '95' } : null;
      parsed = Nhl92Sheet.openFrames(bytes, Nhl92Jim, missing ? await icePaletteBytes() : null, frameOpts);
    } else {
      parsed = Nhl92Sheet.parseSheet(rom, gameInfo.sheet);
    }
  } else if (gameInfo.kind === 'pc95') {
    if (!gameInfo.pixels) return null;
    let bundle;
    if (clientPc) {
      const files = name === 'rink' ? clientPc.catalog.rinkFiles : clientPc.catalog.spriteFiles;
      const parts = files.map((rel) => ({ name: rel, data: clientPc.map.get(rel) })).filter((part) => part.data);
      if (!parts.length) return null;
      bundle = Nhl95Pc.encodeBundle(parts);
    } else if (!useApi) {
      return null;
    } else {
      const response = await fetch(resolveUrl('/api/games/' + gameInfo.id + '/sprites?bank=' + encodeURIComponent(name)));
      if (!response.ok) return null;
      bundle = new Uint8Array(await response.arrayBuffer());
    }
    parsed = Nhl95Pc.openSpriteBundle(bundle);
  } else if (gameInfo.kind === 'snes93' || gameInfo.kind === 'snes94') {
    if (!gameInfo.pixels) return null;
    const rom = await ensureRom();
    if (!rom) throw new Error('Could not load the ' + gameInfo.title + ' ROM');
    const rink = await ensureRink();
    parsed = gameInfo.kind === 'snes93'
      ? Nhl92Snes.parse93(rom, gameInfo.snes, rink)
      : Nhl92Snes.parse94(rom, gameInfo.snes, rink);
  } else {
    return null;
  }
  if (token !== loadToken && name !== spriteBank() && name !== spritesBankId()) return parsed;
  banks.set(name, parsed);
  bitmaps.clear();
  return parsed;
}

async function ensureImage(id) {
  if (!id) return null;
  if (banks.has(id)) return banks.get(id);
  const image = ((gameInfo && gameInfo.images) || []).find((item) => item.id === id);
  if (!image) return null;
  if ((gameInfo.banks || []).some((bank) => bank.id === id)) return ensureBank(id);
  const token = ++loadToken;
  let parsed;
  if (image.kind === 'anim') {
    const bytes = await bytesFor(image);
    if (!bytes) return null;
    parsed = Nhl92Anim.parseAnim(bytes);
  } else if (image.kind === 'jim') {
    const bytes = await bytesFor(image);
    if (!bytes) return null;
    let donor = null;
    if (image.paletteAt != null) {
      const rom = await ensureRom();
      if (rom && image.paletteAt >= 0 && image.paletteAt + 128 <= rom.length) {
        donor = rom.subarray(image.paletteAt, image.paletteAt + 128);
      }
    } else if (bytes.length >= 8) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const palOff = view.getUint32(0);
      const mapOff = view.getUint32(4);
      if (palOff === 0xffffffff || (palOff === 0 && mapOff === 0)) donor = await icePaletteBytes();
    }
    if (image.forceIce) donor = await icePaletteBytes();
    parsed = Nhl92Jim.decodeJim(bytes, donor, image.remap ? { remap: image.remap, forceDonor: Boolean(image.forceIce) } : null);
  } else if (image.kind === 'frames') {
    const bytes = await bytesFor(image);
    if (!bytes) return null;
    const missing = bytes.length >= 4 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0) === 0xffffffff;
    const frameOpts = gameInfo.sheet && gameInfo.sheet.record === '95' ? { record: '95' } : null;
    parsed = Nhl92Sheet.openFrames(bytes, Nhl92Jim, missing ? await icePaletteBytes() : null, frameOpts);
  } else if (image.kind === 'pc95') {
    const paths = image.files && image.files.length ? image.files : [image.id];
    const parts = [];
    for (const rel of paths) {
      let data = null;
      if (clientPc && clientPc.map.has(rel)) data = clientPc.map.get(rel);
      else if (useApi) {
        const response = await fetch(resolveUrl('/api/games/' + gameInfo.id + '/file?path=' + encodeURIComponent(rel)));
        if (!response.ok) continue;
        data = new Uint8Array(await response.arrayBuffer());
      }
      if (!data) continue;
      parts.push({ name: rel, data });
    }
    if (!parts.length) return null;
    let donor = null;
    if (image.palette) {
      const pal = await fetch(resolveUrl('/api/games/' + gameInfo.id + '/file?path=' + encodeURIComponent(image.palette)));
      if (pal.ok) donor = new Uint8Array(await pal.arrayBuffer());
    }
    parsed = Nhl95Pc.openImageParts(parts, donor);
  } else if (image.kind && image.kind.indexOf('snes') === 0) {
    const rom = await ensureRom();
    if (!rom) return null;
    parsed = Nhl92Snes.openImage(rom, image, gameInfo.snes, await ensureRink());
  } else {
    return null;
  }
  if (token !== loadToken && id !== state.image) return parsed;
  banks.set(id, parsed);
  bitmaps.clear();
  return parsed;
}

async function ensurePalette(name) {
  if (!name || paletteFiles.has(name) || !gameInfo) return;
  let response;
  if (!useApi && gameInfo.paletteKind === 'snes') {
    response = await fetch(resolveUrl('/data/pals/snes/' + encodeURIComponent(name)));
  } else if (useApi) {
    response = await fetch(resolveUrl('/api/games/' + gameInfo.id + '/palettes/' + encodeURIComponent(name)));
  } else {
    return;
  }
  if (!response.ok) return;
  const buf = await response.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const colors = gameInfo.paletteKind === 'pc'
    ? Nhl95Pc.decodeAct(bytes)
    : gameInfo.paletteKind === 'snes'
      ? Nhl92Snes.decodeTeamPalette(buf)
      : Nhl92Anim.decodePaletteFile(buf);
  if (gameInfo.paletteKind === 'pc' && bytes.length >= 1536) {
    colors.game = Nhl95Pc.decodeAct(bytes.subarray(768, 1536));
  }
  paletteFiles.set(name, colors);
}

function choosePalette(pals, previous, keepSelection) {
  if (keepSelection && previous.paletteExplicit) {
    if (!previous.paletteName) return '';
    if (pals.includes(previous.paletteName)) return previous.paletteName;
    return Nhl92Labels.defaultPaletteFile(pals);
  }
  if (!keepSelection) return Nhl92Labels.matchPaletteFile(pals, previous.paletteName);
  return Nhl92Labels.defaultPaletteFile(pals);
}

async function loadGame(id, keepSelection) {
  rememberImage();
  const previous = {
    mode: state.mode,
    bank: state.bank,
    frame: state.frame,
    spf: state.spf,
    spa: state.spa,
    dir: state.dir,
    step: state.step,
    image: state.image,
    imageLabel: (((gameInfo && gameInfo.images) || []).find((image) => image.id === state.image) || {}).label || '',
    paletteName: state.paletteName,
    paletteExplicit: state.paletteExplicit
  };
  const info = games.find((game) => game.id === id) || games[0];
  state.game = info.id;
  gameInfo = info;
  loadToken += 1;
  loadError = '';
  banks.clear();
  bitmaps.clear();
  paletteFiles.clear();
  fitCache.clear();
  seqCache = null;
  seqCacheToken = '';
  state.holdKey = '';
  state.acc = 0;
  const asm = await fetch(resolveUrl(useApi ? '/api/games/' + info.id + '/frames' : '/data/' + info.frames)).then((response) => {
    if (!response.ok) throw new Error('Could not load ' + info.frames);
    return response.text();
  });
  let pals = [];
  if (useApi) {
    pals = await fetch(resolveUrl('/api/games/' + info.id + '/palettes')).then((response) => response.json());
  } else if (info.paletteFiles) {
    pals = info.paletteFiles;
  }
  catalog = Nhl92Frames.parseFrames(asm);
  const bankId = info.banks.some((bank) => bank.id === previous.bank) ? previous.bank : info.banks[0].id;
  fillSelect(el('bank'), info.banks.map((bank) => ({
    value: bank.id,
    label: bank.label + (info.kind === 'anim' ? ' · ' + bank.id : '')
  })), bankId);
  state.bank = el('bank').value || info.banks[0].id;
  const jerseys = pals.filter((file) => !/^rink\./i.test(file));
  const labeled = jerseys.map((file) => {
    const parts = Nhl92Labels.paletteParts(file);
    return { file, label: parts.label, city: parts.city, side: parts.side };
  });
  labeled.sort((a, b) => {
    const city = a.city.localeCompare(b.city);
    if (city) return city;
    if (a.side === b.side) return a.label.localeCompare(b.label);
    if (a.side === 'home') return -1;
    if (b.side === 'home') return 1;
    return a.side.localeCompare(b.side);
  });
  const paletteItems = [{ value: '', label: 'Embedded palette' }];
  for (const item of labeled) paletteItems.push({ value: item.file, label: item.label });
  const chosen = choosePalette(jerseys, previous, keepSelection);
  const images = info.images || [];
  if (keepSelection) {
    state.mode = previous.mode;
    state.frame = previous.frame;
    state.dir = previous.dir;
    state.step = previous.step;
  } else {
    state.mode = previous.mode === 'frame' || previous.mode === 'spf' || previous.mode === 'spa' || previous.mode === 'image'
      ? previous.mode
      : 'spa';
    state.dir = previous.dir;
    state.step = 0;
    state.frame = previous.frame || 1;
    state.playing = state.mode === 'spa' || state.mode === 'spf';
  }
  if (keepSelection && state.mode !== 'spa' && state.mode !== 'spf') state.playing = false;
  const spaMatch = named(catalog.anims, previous.spa) || named(catalog.anims, 'SPAskatewp') || catalog.anims[0];
  const spfMatch = named(catalog.spfs, previous.spf) || catalog.spfs[0];
  state.spa = spaMatch ? spaMatch.name : '';
  state.spf = spfMatch ? spfMatch.name : '';
  if (!catalog.anims.length && state.mode === 'spa' && catalog.spfs.length) state.mode = 'spf';
  const remembered = imageMemory.get(info.id);
  const imageMatch = images.find((image) => image.id === previous.image)
    || images.find((image) => previous.imageLabel && image.label.toLowerCase() === previous.imageLabel.toLowerCase())
    || (remembered && (images.find((image) => image.id === remembered.id)
      || images.find((image) => remembered.label && image.label.toLowerCase() === remembered.label.toLowerCase())))
    || images[0];
  state.transparentOverride = null;
  state.image = imageMatch ? imageMatch.id : '';
  rememberImage();
  if (state.mode !== 'image' && chosen) await ensurePalette(chosen);
  if (state.mode === 'image') {
    if (!spritePalette) spritePalette = chosen || Nhl92Labels.defaultPaletteFile(jerseys);
    const teamPic = imageMatch && imageMatch.group === 'Jumbotron';
    fillSelect(el('palette'), paletteItems, teamPic ? (spritePalette || chosen || '') : '');
    state.paletteName = el('palette').value;
    if (state.paletteName) await ensurePalette(state.paletteName);
  } else {
    fillSelect(el('palette'), paletteItems, chosen);
    state.paletteName = el('palette').value;
    if (state.paletteName) spritePalette = state.paletteName;
  }
  el('palette').parentElement.querySelector('span').textContent = info.paletteLabel || ('Palette slot ' + (info.jerseyRow || 2));
  el('game-title').textContent = info.title;
  el('tagline').textContent = info.tagline || (info.pixels
    ? 'Frame index, SPF groups, SPA sequences, and other pictures'
    : 'SPF and SPA names from ' + info.source + '. Pictures need the ROM.');
  document.title = info.title + ' · NHL9X Studio';
  if (info.pixels) {
    await ensureBank(spritesBankId());
    if (state.mode === 'frame' && state.bank !== spritesBankId()) await ensureBank(state.bank);
    bindSpfEnd();
  }
  if (state.mode === 'image') {
    try {
      await ensureImage(state.image);
    } catch (err) {
      loadError = err.message;
    }
  }
  const anim = currentAnim();
  if (state.mode === 'frame' && anim) {
    state.frame = Math.max(1, Math.min(anim.numFrames, state.frame));
    state.step = state.frame - 1;
  } else if (state.mode === 'spa') {
    const spa = catalog.anims.find((entry) => entry.name === state.spa);
    if (spa && spa.directions[state.dir] && spa.directions[state.dir].unused) {
      state.dir = Math.max(0, spa.directions.findIndex((dir) => !dir.unused));
    }
    seqCache = null;
    if (state.step >= sequence().steps.length) state.step = 0;
  } else if (state.step >= sequence().steps.length) {
    state.step = 0;
  }
  refreshAll();
}

async function ingestDroppedFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const entries = await Promise.all(files.map(async (file) => ({
    file,
    rel: (file.webkitRelativePath || file.name).replace(/^\/+/, ''),
    bytes: new Uint8Array(await file.arrayBuffer())
  })));
  const isFolder = entries.some((entry) => entry.rel.includes('/'));
  const hasPc = entries.some((entry) => /\.(ppv|qfs|qpp)$/i.test(entry.rel));
  if (isFolder && hasPc) {
    const map = new Map(entries.map((entry) => [entry.rel, entry.bytes]));
    const paths = [...map.keys()];
    clientPc = { map, catalog: Nhl95Pc.catalogFromPaths(paths, (rel) => map.get(rel)) };
    let entry = games.find((game) => game.id === 'nhl95pc') || { id: 'nhl95pc', kind: 'pc95' };
    entry = Object.assign({}, entry, {
      pixels: clientPc.catalog.spriteFiles.length > 0 || clientPc.catalog.images.length > 0,
      rom: true,
      images: clientPc.catalog.images
    });
    games = games.map((game) => (game.id === 'nhl95pc' ? entry : game));
    await loadGame('nhl95pc');
    return;
  }
  if (files.length !== 1) {
    loadError = 'Drop one ROM/asset file, or a PC game folder';
    refreshAll();
    return;
  }
  const { file, bytes } = entries[0];
  const classified = NhlOpenAsset.classify(file.name, bytes);
  if (classified.kind === 'iso') {
    loadError = classified.message;
    refreshAll();
    return;
  }
  const rom = classified.kind === 'rom'
    ? classified
    : (classified.kind === 'rom-candidate' ? NhlRomDetect.detect(file.name, bytes) : null);
  if (rom) {
    const id = rom.id || rom.gameId;
    const body = rom.bytes || bytes;
    roms.set(id, body);
    let entry = games.find((game) => game.id === id);
    if (entry && typeof NhlRevA !== 'undefined') entry = NhlRevA.adjustGameStatus(entry, rom.revADate || '');
    if (entry) {
      entry = Object.assign({}, entry, { rom: true, pixels: true });
      games = games.map((game) => (game.id === id ? entry : game));
    }
    state.game = id;
    el('game').value = id;
    await loadGame(id);
    return;
  }
  const decoded = NhlOpenAsset.decodeLoose(classified, {
    anim: Nhl92Anim,
    sheet: Nhl92Sheet,
    jim: Nhl92Jim,
    pc95: Nhl95Pc
  });
  if (!decoded) {
    loadError = 'Could not open ' + file.name;
    refreshAll();
    return;
  }
  if (decoded.gameId) {
    state.game = decoded.gameId;
    el('game').value = decoded.gameId;
    gameInfo = games.find((game) => game.id === decoded.gameId);
  }
  banks.set(decoded.bankId, decoded.parsed);
  state.mode = decoded.mode;
  state.bank = decoded.bankId;
  if (decoded.mode === 'image') state.image = decoded.imageId || decoded.bankId;
  state.frame = 1;
  state.step = 0;
  refreshAll();
}

function wireDropTarget() {
  const overlay = el('drop-overlay');
  const show = (on) => {
    overlay.hidden = !on;
    overlay.setAttribute('aria-hidden', on ? 'false' : 'true');
  };
  let depth = 0;
  window.addEventListener('dragenter', (event) => {
    event.preventDefault();
    depth += 1;
    show(true);
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) show(false);
  });
  window.addEventListener('dragover', (event) => event.preventDefault());
  window.addEventListener('drop', async (event) => {
    event.preventDefault();
    depth = 0;
    show(false);
    loadError = '';
    try {
      await ingestDroppedFiles(event.dataTransfer.files);
    } catch (err) {
      loadError = err.message || String(err);
      refreshAll();
    }
  });
}

async function boot() {
  games = await loadGamesList();
  fillSelect(el('game'), games.map((game) => ({ value: game.id, label: game.title })), 'nhl92');
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (params.get('game') && games.some((game) => game.id === params.get('game'))) {
    state.game = params.get('game');
  }
  gameInfo = games.find((game) => game.id === state.game) || games[0];
  readHash();
  gameInfo = games.find((game) => game.id === state.game) || games[0];
  el('game').value = state.game;
  wire();
  await loadGame(state.game, true);
  requestAnimationFrame(clock);
}

boot().catch((err) => {
  el('caption').textContent = err.message;
});
