const BANKS = [
  { file: 'Sprites.anim', label: 'Sprites' },
  { file: 'Puck.anim', label: 'Puck' },
  { file: 'Crowd.anim', label: 'Crowd' },
  { file: 'Zam.anim', label: 'Zamboni' }
];

const SPA_ORDER = ['Skating', 'Shooting', 'Checking', 'Falls', 'Fight', 'Celebrate', 'Goalies', 'Puck', 'Special', 'Other'];
const SPF_ORDER = ['Players', 'Goalies', 'Ice', 'Other'];

const TEAMS = {
  allstar: 'All-Star', blackhawks: 'Blackhawks', blues: 'Blues', bruins: 'Bruins',
  campbell: 'Campbell', canadiens: 'Canadiens', canucks: 'Canucks', capitals: 'Capitals',
  devils: 'Devils', flames: 'Flames', flyers: 'Flyers', islanders: 'Islanders',
  jets: 'Jets', kings: 'Kings', mapleleafs: 'Maple Leafs', nordiques: 'Nordiques',
  northstars: 'North Stars', oilers: 'Oilers', penguins: 'Penguins', rangers: 'Rangers',
  redwings: 'Red Wings', sabres: 'Sabres', sharks: 'Sharks', wales: 'Wales', whalers: 'Whalers'
};

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
  spin: false,
  spinMs: 700,
  minGap: false,
  paletteName: '',
  query: '',
  acc: 0,
  lastClock: 0,
  lastSpin: 0
};

const banks = new Map();
const paletteFiles = new Map();
const bitmaps = new Map();
let catalog = null;
let sequenceKey = '';
let loadToken = 0;
let seqCache = null;
let seqCacheToken = '';

function paletteLabel(file) {
  const stem = file.replace(/\.pal$/i, '');
  const side = /h$/i.test(stem) ? 'home' : /v$/i.test(stem) ? 'away' : '';
  const teamKey = stem.replace(/[hv]$/i, '').toLowerCase();
  const team = TEAMS[teamKey] || teamKey;
  return side ? team + ' · ' + side : team;
}

function spfAt(frame) {
  if (!catalog) return null;
  return catalog.spfs.find((s) => frame >= s.start && frame <= s.end) || null;
}

function currentAnim() {
  return banks.get(state.mode === 'frame' ? state.bank : 'Sprites.anim') || null;
}

function activeColors() {
  const anim = currentAnim();
  if (!anim) return null;
  const colors = anim.combined.map((c) => c.slice());
  const override = paletteFiles.get(state.paletteName);
  if (override) {
    for (let i = 0; i < 16; i++) colors[32 + i] = override[i].slice();
  }
  return colors;
}

function sequence() {
  const anim = currentAnim();
  const token = [
    state.mode, state.bank, state.spf, state.spa, state.dir,
    catalog ? 1 : 0,
    anim ? anim.numFrames : 0
  ].join('|');
  if (seqCache && seqCacheToken === token) return seqCache;
  seqCache = buildSequence(anim);
  seqCacheToken = token;
  return seqCache;
}

function buildSequence(anim) {
  if (!anim || !catalog) {
    return { key: 'empty', steps: [], directions: false, spin: false, loopDefault: true, title: 'Loading' };
  }
  if (state.mode === 'frame') {
    const steps = [];
    for (let f = 1; f <= anim.numFrames; f++) steps.push({ frame: f, ticks: 8 });
    return {
      key: 'frame:' + state.bank,
      steps,
      directions: false,
      spin: false,
      loopDefault: true,
      title: state.bank
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
    blurb: spa.comment,
    spa
  };
}

function canvasSize(frame) {
  const width = frame.canvasWidth > 0 ? frame.canvasWidth : frame.width;
  const height = frame.canvasHeight > 0 ? frame.canvasHeight : frame.height;
  return { width, height };
}

function placement(frame) {
  const box = canvasSize(frame);
  const ax = frame.hotspotPxX;
  const ay = frame.hotspotPxY;
  const onCanvas = ax >= -48 && ay >= -48 && ax <= box.width + 48 && ay <= box.height + 48;
  // Crowd plates are hundreds of pixels across and store the offset on the
  // corner. Pinning that corner hides the plate, so those stay centered.
  const cornerPlate = (box.width > 200 || box.height > 200) && ax <= 8 && ay <= 8;
  if (onCanvas && !cornerPlate) {
    return { mode: 'offset', ax, ay };
  }
  return { mode: 'center', ax: box.width / 2, ay: box.height / 2 };
}

function bitmapFor(frame, colors) {
  const key = (state.mode === 'frame' ? state.bank : 'Sprites.anim') + ':' + frame.frame + ':' + (state.paletteName || 'embedded');
  let canvas = bitmaps.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, frame.width);
    canvas.height = Math.max(1, frame.height);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    const data = image.data;
    for (let i = 0; i < frame.pixels.length; i++) {
      const index = frame.pixels[i];
      const o = i * 4;
      if (!index) continue;
      const rgb = colors[index];
      data[o] = rgb[0];
      data[o + 1] = rgb[1];
      data[o + 2] = rgb[2];
      data[o + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    bitmaps.set(key, canvas);
  }
  return canvas;
}

function renderedFrame(frameNumber) {
  const anim = currentAnim();
  if (!anim || frameNumber < 1 || frameNumber > anim.numFrames) return null;
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
    const cx = dx + frame.hotspotPxX * scale;
    const cy = dy + frame.hotspotPxY * scale;
    const near = frame.hotspotPxX >= -2 && frame.hotspotPxY >= -2 &&
      frame.hotspotPxX <= box.width + 2 && frame.hotspotPxY <= box.height + 2;
    if (near) strokeOffset(ctx, cx, cy);
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
  paintInto(ctx, cssW, cssH, frame, colors, viewScale(cssW, cssH, 46, state.scale), { padBottom: 46, exactScale: true });
}

const fitCache = new Map();

function viewScale(cssW, cssH, padBottom, scaleCap) {
  const fitKey = [
    state.mode,
    state.mode === 'frame' ? state.bank + ':' + state.frame : state.mode === 'spa' ? state.spa : state.spf,
    cssW, cssH, padBottom, scaleCap
  ].join(':');
  if (fitCache.has(fitKey)) return fitCache.get(fitKey);
  const frames = [];
  if (state.mode === 'frame') {
    const frame = renderedFrame(state.frame);
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
  if (step.ticks >= 1000) return null;
  const floor = state.minGap ? 4 : 1;
  return Math.max(floor, step.ticks || 1);
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
      if (spa.directions[dir].unused) continue;
    }
    state.dir = dir;
    const next = sequence();
    if (state.step >= next.steps.length) state.step = 0;
    refreshAll();
    return;
  }
}

function clock(now) {
  if (!state.lastClock) state.lastClock = now;
  const dt = now - state.lastClock;
  state.lastClock = now;
  if (state.playing) {
    const seq = sequence();
    const ticks = stepTicks(seq.steps[state.step]);
    if (ticks == null) state.playing = false;
    else {
      state.acc += dt * state.speed;
      const need = ticks * (1000 / 60);
      if (state.acc >= need) {
        state.acc = 0;
        advance();
        paintStage();
      }
    }
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
  const sprites = banks.get('Sprites.anim');
  const last = catalog.spfs[catalog.spfs.length - 1];
  if (sprites && last && last.end == null) {
    last.end = sprites.numFrames;
    last.count = last.end - last.start + 1;
  }
}

function renderList() {
  const box = el('catalog');
  box.replaceChildren();
  const q = state.query.trim().toLowerCase();
  if (!catalog) return;
  if (state.mode === 'frame') {
    const note = document.createElement('p');
    note.className = 'empty-note';
    const anim = banks.get(state.bank);
    note.textContent = anim
      ? anim.numFrames + ' frames in ' + state.bank + '. Scrub the frame slider, or pick an SPF or SPA.'
      : 'Loading ' + state.bank + '…';
    box.appendChild(note);
    return;
  }
  const entries = state.mode === 'spf' ? catalog.spfs : catalog.anims;
  const order = state.mode === 'spf' ? SPF_ORDER : SPA_ORDER;
  const groups = new Map();
  for (const entry of entries) {
    const hay = (entry.name + ' ' + (entry.blurb || '') + ' ' + (entry.comment || '')).toLowerCase();
    if (q && !hay.includes(q)) continue;
    const group = entry.group || 'Other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  }
  if (!groups.size) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'Nothing matches that search.';
    box.appendChild(note);
    return;
  }
  for (const group of order) {
    const items = groups.get(group);
    if (!items) continue;
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = group;
    box.appendChild(label);
    for (const entry of items) {
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
        sub.textContent = entry.start + '–' + entry.end + ' · ' + entry.count + ' frames' +
          (entry.stride ? ' · 8 facings' : '');
      } else {
        const faces = entry.uniqueDirections === 1 ? '1 shared sequence' : entry.uniqueDirections + ' facings';
        sub.textContent = (entry.comment || '') + (entry.comment ? ' · ' : '') + faces + (entry.loop ? ' · loops' : '');
      }
      button.append(name, sub);
      button.addEventListener('click', () => {
        if (state.mode === 'spf') state.spf = entry.name;
        else state.spa = entry.name;
        state.dir = 0;
        state.step = 0;
        state.acc = 0;
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

function renderFilmstrip() {
  const seq = sequence();
  const strip = el('filmstrip');
  const filmKey = seq.steps.length > 80 ? seq.key + '@' + state.step : seq.key;
  if (filmKey === sequenceKey && strip.childElementCount) {
    highlightStep();
    return;
  }
  sequenceKey = filmKey;
  strip.replaceChildren();
  const colors = activeColors();
  if (!colors) return;
  const windowed = seq.steps.length > 80;
  const steps = windowed
    ? seq.steps.map((step, index) => ({ step, index })).filter((item) => Math.abs(item.index - state.step) <= 8)
    : seq.steps.map((step, index) => ({ step, index }));
  for (const item of steps) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.dataset.step = String(item.index);
    const canvas = document.createElement('canvas');
    const label = document.createElement('span');
    label.textContent = String(item.step.frame);
    button.append(canvas, label);
    const frame = renderedFrame(item.step.frame);
    if (frame) paintThumb(canvas, frame, colors);
    button.addEventListener('click', () => {
      state.step = item.index;
      state.acc = 0;
      refreshPlaybackChrome();
      paintStage();
    });
    strip.appendChild(button);
  }
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
  }
  if (frame) {
    const owner = spfAt(frame.frame);
    rows.push(['Frame', String(frame.frame)]);
    rows.push(['Index', String(frame.index)]);
    if (state.mode !== 'frame' || state.bank === 'Sprites.anim') {
      rows.push(['In SPF', owner ? owner.name : '—']);
    }
    rows.push(['Sprites', String(frame.numSprites)]);
    const box = canvasSize(frame);
    rows.push(['Canvas', box.width + '×' + box.height]);
    if (box.width !== frame.width || box.height !== frame.height) {
      rows.push(['Art', frame.width + '×' + frame.height]);
    }
    rows.push(['Offset', frame.hotspotX + ', ' + frame.hotspotY]);
    if (step) {
      rows.push(['Hold', step.ticks >= 1000 ? 'forever (' + step.ticks + ')' : step.ticks + ' vblanks']);
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
  if (!frame || !frame.sprites.length) {
    table.textContent = 'No sprites in this frame.';
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
  if (!colors) return;
  for (let i = 0; i < 16; i++) {
    const chip = document.createElement('i');
    const rgb = colors[32 + i];
    chip.style.background = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    chip.title = 'Jersey color ' + i;
    box.appendChild(chip);
  }
}

function renderCaption() {
  const seq = sequence();
  const step = seq.steps[state.step];
  const cap = el('caption');
  if (!step) {
    cap.textContent = state.mode === 'spa'
      ? 'This facing has no sequence of its own. The table runs off the end of the animation.'
      : 'No frame.';
    return;
  }
  const frame = renderedFrame(step.frame);
  if (!frame) {
    cap.textContent = 'Frame ' + step.frame + ' is outside this bank.';
    return;
  }
  const facing = catalog.directions[state.dir];
  const bits = [];
  bits.push(seq.title);
  if (seq.directions) bits.push(facing.short + ' ' + facing.name.toLowerCase());
  bits.push('step ' + (state.step + 1) + '/' + seq.steps.length);
  bits.push('frame ' + step.frame);
  if (state.mode === 'spa') {
    bits.push(step.ticks >= 1000 ? 'holds' : step.ticks + ' vblanks');
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
  const anim = currentAnim();
  const frameSlider = el('frame');
  if (anim) {
    frameSlider.max = String(anim.numFrames);
    const shown = state.mode === 'frame' ? state.frame : (sequence().steps[state.step] || {}).frame || state.frame;
    frameSlider.value = String(Math.max(1, Math.min(anim.numFrames, shown)));
    el('frame-readout').textContent = shown + ' · index ' + (shown - 1);
  }
  el('play').textContent = state.playing ? 'Pause' : 'Play';
  el('loop').checked = state.loop;
  el('scale-readout').textContent = state.scale + '×';
  el('bank').value = state.mode === 'frame' ? state.bank : 'Sprites.anim';
  el('bank').disabled = state.mode !== 'frame';
  for (const mode of ['frame', 'spf', 'spa']) {
    el('mode-' + mode).setAttribute('aria-selected', state.mode === mode ? 'true' : 'false');
  }
}

function refreshPlaybackChrome() {
  renderCaption();
  renderTransport();
  renderCompass();
  renderMeta();
  if (sequence().key !== sequenceKey || sequence().steps.length > 80) renderFilmstrip();
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
  params.set('mode', state.mode);
  if (state.mode === 'frame') {
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
  if (state.paletteName) params.set('pal', state.paletteName);
  if (state.spin) params.set('spin', '1');
  history.replaceState(null, '', '#' + params.toString());
}

function readHash() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const mode = params.get('mode');
  if (mode === 'frame' || mode === 'spf' || mode === 'spa') state.mode = mode;
  if (params.get('bank') && BANKS.some((b) => b.file === params.get('bank'))) state.bank = params.get('bank');
  if (params.get('spf')) state.spf = params.get('spf');
  if (params.get('spa')) state.spa = params.get('spa');
  if (params.get('dir')) state.dir = Math.max(0, Math.min(7, Number(params.get('dir')) || 0));
  if (params.get('frame')) state.frame = Number(params.get('frame')) || 1;
  if (params.get('step')) state.step = Number(params.get('step')) || 0;
  if (params.get('pal')) state.paletteName = params.get('pal');
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
    const from = state.mode;
    const shown = sequence().steps[state.step];
    state.mode = 'frame';
    if (from !== 'frame') {
      state.bank = 'Sprites.anim';
      if (shown) state.frame = shown.frame;
    }
    state.step = state.frame - 1;
    state.playing = false;
    el('bank').value = state.bank;
    await ensureBank(state.bank);
    refreshAll();
  });
  el('mode-spf').addEventListener('click', () => {
    clearSearch();
    state.mode = 'spf';
    state.dir = 0;
    state.step = 0;
    state.playing = true;
    state.acc = 0;
    refreshAll();
  });
  el('mode-spa').addEventListener('click', () => {
    clearSearch();
    state.mode = 'spa';
    state.step = 0;
    state.acc = 0;
    state.playing = true;
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
  el('scale').addEventListener('input', () => {
    state.scale = Number(el('scale').value);
    el('scale-readout').textContent = state.scale + '×';
    paintStage();
  });
  el('frame').addEventListener('input', async () => {
    const from = state.mode;
    state.mode = 'frame';
    if (from !== 'frame') state.bank = 'Sprites.anim';
    state.frame = Number(el('frame').value);
    state.step = state.frame - 1;
    state.acc = 0;
    el('bank').value = state.bank;
    await ensureBank(state.bank);
    refreshAll();
  });
  el('play').addEventListener('click', () => {
    state.playing = !state.playing;
    state.acc = 0;
    if (state.playing) {
      const seq = sequence();
      const ticks = stepTicks(seq.steps[state.step]);
      if (ticks == null || state.step === seq.steps.length - 1 && !state.loop) state.step = 0;
    }
    renderTransport();
  });
  el('prev').addEventListener('click', () => nudge(-1));
  el('next').addEventListener('click', () => nudge(1));
  el('loop').addEventListener('change', () => { state.loop = el('loop').checked; });
  el('speed').addEventListener('change', () => { state.speed = Number(el('speed').value); });
  el('min-gap').addEventListener('change', () => { state.minGap = el('min-gap').checked; });
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
    state.paletteName = el('palette').value;
    await ensurePalette(state.paletteName);
    bitmaps.clear();
    sequenceKey = '';
    refreshAll();
  });
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
    } else if (event.code === 'ArrowRight') { event.preventDefault(); nudge(1); }
    else if (event.code === 'ArrowLeft') { event.preventDefault(); nudge(-1); }
    else if (event.code === 'ArrowDown') { event.preventDefault(); selectNeighbor(1); }
    else if (event.code === 'ArrowUp') { event.preventDefault(); selectNeighbor(-1); }
    else if (event.key === 'q' || event.key === 'Q') rotate(-1);
    else if (event.key === 'e' || event.key === 'E') rotate(1);
    else if (event.key === 's' || event.key === 'S') el('spin').click();
  });
  window.addEventListener('resize', paintStage);
  new ResizeObserver(paintStage).observe(el('stage').parentElement);
}

function nudge(delta) {
  const seq = sequence();
  if (!seq.steps.length) return;
  let next = state.step + delta;
  if (state.loop) next = (next + seq.steps.length) % seq.steps.length;
  else next = Math.max(0, Math.min(seq.steps.length - 1, next));
  state.step = next;
  if (state.mode === 'frame') state.frame = seq.steps[state.step].frame;
  state.acc = 0;
  refreshPlaybackChrome();
  paintStage();
  writeHash();
}

async function ensureBank(name) {
  if (banks.has(name)) return banks.get(name);
  const token = ++loadToken;
  const response = await fetch('/anim/' + name);
  if (!response.ok) throw new Error('Could not load ' + name);
  const parsed = Nhl92Anim.parseAnim(await response.arrayBuffer());
  if (token !== loadToken && name !== 'Sprites.anim') return parsed;
  banks.set(name, parsed);
  bitmaps.clear();
  return parsed;
}

async function ensurePalette(name) {
  if (!name || paletteFiles.has(name)) return;
  const response = await fetch('/palettes/' + encodeURIComponent(name));
  if (!response.ok) return;
  paletteFiles.set(name, Nhl92Anim.decodePaletteFile(await response.arrayBuffer()));
}

async function boot() {
  const bankSelect = el('bank');
  for (const bank of BANKS) {
    const option = document.createElement('option');
    option.value = bank.file;
    option.textContent = bank.label + ' · ' + bank.file;
    bankSelect.appendChild(option);
  }
  const [asm, pals] = await Promise.all([
    fetch('/data/frames.asm').then((r) => r.text()),
    fetch('/api/palettes').then((r) => r.json()),
    ensureBank('Sprites.anim')
  ]);
  catalog = Nhl92Frames.parseFrames(asm);
  bindSpfEnd();
  const paletteSelect = el('palette');
  const embedded = document.createElement('option');
  embedded.value = '';
  embedded.textContent = 'Embedded palette';
  paletteSelect.appendChild(embedded);
  const labeled = pals.map((file) => ({ file, label: paletteLabel(file) }));
  labeled.sort((a, b) => a.label.localeCompare(b.label));
  for (const item of labeled) {
    const option = document.createElement('option');
    option.value = item.file;
    option.textContent = item.label;
    paletteSelect.appendChild(option);
  }
  readHash();
  if (!catalog.spfs.some((s) => s.name === state.spf)) state.spf = catalog.spfs[0].name;
  if (!catalog.anims.some((s) => s.name === state.spa)) state.spa = 'SPAskatewp';
  bankSelect.value = state.bank;
  if (state.paletteName) {
    paletteSelect.value = state.paletteName;
    await ensurePalette(state.paletteName);
  }
  if (state.mode === 'frame' && state.bank !== 'Sprites.anim') await ensureBank(state.bank);
  const anim = currentAnim();
  if (state.mode === 'frame') {
    state.frame = Math.max(1, Math.min(anim.numFrames, state.frame));
    state.step = state.frame - 1;
  } else if (state.mode === 'spa') {
    const spa = catalog.anims.find((s) => s.name === state.spa);
    if (spa && spa.directions[state.dir].unused) {
      state.dir = Math.max(0, spa.directions.findIndex((d) => !d.unused));
    }
    seqCache = null;
    if (state.step >= sequence().steps.length) state.step = 0;
  } else if (state.step >= sequence().steps.length) {
    state.step = 0;
  }
  wire();
  refreshAll();
  requestAnimationFrame(clock);
}

boot().catch((err) => {
  el('caption').textContent = err.message;
});
