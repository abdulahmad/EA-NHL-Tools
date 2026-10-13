/**
 * NHL 95 PC pictures.
 *
 * QFS files are EA RefPack (the 10 FB / 11 FB form unpacked by sub_97CE0
 * in NHL95PC). PPV and unpacked QFS payloads are SHPP shape banks: a
 * 16-byte header, then 8-byte tag/offset entries, which is the lookup
 * sub_B30B4 does. Each shape is a SPIT picture. Type 123 is raw pixels.
 * Anything else is the ILBM-style run already decoded by SPIT-To-BMP.
 *
 * Player and goalie sprites use a 256-color palette. HOMEPALS.BIN and
 * AWAYPALS.BIN hold 28 teams of 448 bytes. Colors 0–127 are the rink,
 * 128–191 are the 64 team colors, and the 128 mapping bytes at team
 * offset 320 remap sprite indexes 128–255. Index 0 is transparent.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl95Pc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const FRAME_COUNT = 1134;
  const TEAM_BYTES = 448;
  const BUNDLE_MAGIC = [0x50, 0x39, 0x35, 0x42];

  const TEAMS = [
    { code: 'bos', city: 'Boston' },
    { code: 'buf', city: 'Buffalo' },
    { code: 'cgy', city: 'Calgary' },
    { code: 'chi', city: 'Chicago' },
    { code: 'det', city: 'Detroit' },
    { code: 'edm', city: 'Edmonton' },
    { code: 'hfd', city: 'Hartford' },
    { code: 'la', city: 'Los Angeles' },
    { code: 'min', city: 'Minnesota' },
    { code: 'mtl', city: 'Montreal' },
    { code: 'nj', city: 'New Jersey' },
    { code: 'nyi', city: 'Long Island' },
    { code: 'nyr', city: 'New York' },
    { code: 'ott', city: 'Ottawa' },
    { code: 'phi', city: 'Philadelphia' },
    { code: 'pit', city: 'Pittsburgh' },
    { code: 'que', city: 'Quebec' },
    { code: 'stl', city: 'St. Louis' },
    { code: 'sj', city: 'San Jose' },
    { code: 'tb', city: 'Tampa Bay' },
    { code: 'tor', city: 'Toronto' },
    { code: 'van', city: 'Vancouver' },
    { code: 'wsh', city: 'Washington' },
    { code: 'wpg', city: 'Winnipeg' },
    { code: 'ana', city: 'Anaheim' },
    { code: 'fla', city: 'Florida' },
    { code: 'asw', city: 'All-Star West' },
    { code: 'ase', city: 'All-Star East' }
  ];

  const LABELS = {
    ARENA: ['Arena', 'Screens'],
    SRLOGO: ['EA Sports logo', 'Screens'],
    CREDITS: ['Credits', 'Screens'],
    CTBKGD: ['City background', 'Screens'],
    CTLOGO: ['City logo', 'Screens'],
    CITY: ['City', 'Screens'],
    CTTITLE: ['City title', 'Screens'],
    CTTITLE1: ['City title 2', 'Screens'],
    CTTITLE2: ['City title 3', 'Screens'],
    CTTITLE3: ['City title 4', 'Screens'],
    PSTATBAR: ['Player stat bar', 'Screens'],
    DB_BUT: ['Dialog buttons', 'Screens'],
    DIALOGBX: ['Dialog box', 'Screens'],
    EXHGAME2: ['Exhibition', 'Screens'],
    PLAQUE: ['Plaque', 'Screens'],
    PLAYOFFS: ['Playoffs', 'Screens'],
    SETTING: ['Settings', 'Screens'],
    SETTINGS: ['Settings', 'Screens'],
    EMBPAL: ['Team emblems', 'Screens'],
    RINK: ['Ice rink', 'Ice'],
    RINKPAL: ['Rink palette', 'Ice'],
    SUMMARY: ['Summary', 'Screens'],
    SUMMARY2: ['Summary', 'Screens'],
    HOMEPAL3: ['Home jersey colors', 'Other'],
    AWAYPAL3: ['Away jersey colors', 'Other'],
    NUMSHP: ['Number shapes', 'Fonts'],
    SCRBRD1: ['Scoreboard', 'Screens'],
    TRINKND: ['Rink end', 'Ice'],
    F000149: ['Photos F000–F149', 'Other'],
    CALENDAR: ['Calendar', 'Screens'],
    HILIGHT: ['Highlight font', 'Fonts']
  };

  // Pictures whose colors live in a different QFS. From QFS-To-BMP.
  const PAL_DONOR = {
    SRLOGO: 'ARENA',
    CTLOGO: 'CTBKGD',
    CTTITLE: 'CITY',
    CTTITLE1: 'CITY',
    CTTITLE2: 'CITY',
    CTTITLE3: 'CITY',
    PSTATBAR: 'CITY',
    DIALOGBX: 'DB_BUT',
    EXHGAME2: 'DB_BUT',
    PLAQUE: 'DB_BUT',
    PLAYOFFS: 'DB_BUT',
    SETTING: 'DB_BUT',
    SETTINGS: 'DB_BUT',
    RINK: 'RINKPAL',
    SUMMARY2: 'SUMMARY'
  };
  for (let i = 0; i < 20; i++) PAL_DONOR['CREDIT' + (i < 10 ? '0' : '') + i] = 'CREDITS';
  for (let i = 2; i <= 7; i++) PAL_DONOR['SETTING' + i] = 'DB_BUT';

  function bytesOf(buffer) {
    if (buffer instanceof Uint8Array) return buffer;
    return new Uint8Array(buffer);
  }

  function u16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function s16(bytes, offset) {
    return (u16(bytes, offset) << 16) >> 16;
  }

  function isRefPack(bytes) {
    return bytes && bytes.length >= 5 && bytes[1] === 0xFB && (bytes[0] & 0xFE) === 0x10;
  }

  function isShapeMagic(bytes) {
    if (!bytes || bytes.length < 16) return false;
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    return magic === 'SHPP' || magic === 'SHPS' || magic === 'SHPI' || magic === 'SHPM';
  }

  function isBundle(bytes) {
    return bytes && bytes.length >= 8 &&
      bytes[0] === BUNDLE_MAGIC[0] && bytes[1] === BUNDLE_MAGIC[1] &&
      bytes[2] === BUNDLE_MAGIC[2] && bytes[3] === BUNDLE_MAGIC[3];
  }

  /**
   * RefPack as sub_97CE0 runs it. Flags 0x10 omit the compressed size;
   * flags 0x11 store a 3-byte compressed size before the 3-byte
   * decompressed size. Both sizes are big-endian.
   */
  function decompressRefPack(buffer) {
    const bytes = bytesOf(buffer);
    if (!isRefPack(bytes)) return null;
    let p = 2;
    if (bytes[0] & 1) p += 3;
    if (p + 3 > bytes.length) return null;
    const size = (bytes[p] << 16) | (bytes[p + 1] << 8) | bytes[p + 2];
    p += 3;
    if (size <= 0 || size > 32 * 1024 * 1024) return null;
    const out = new Uint8Array(size);
    let w = 0;

    function copyLit(n) {
      if (n < 0 || p + n > bytes.length || w + n > size) return false;
      out.set(bytes.subarray(p, p + n), w);
      p += n;
      w += n;
      return true;
    }

    function copyRef(offset, length) {
      if (offset <= 0 || offset > w || length < 0 || w + length > size) return false;
      for (let i = 0; i < length; i++) out[w + i] = out[w - offset + i];
      w += length;
      return true;
    }

    while (w < size && p < bytes.length) {
      const b0 = bytes[p++];
      const lit2 = b0 & 3;
      if ((b0 & 0x80) === 0) {
        if (p >= bytes.length) break;
        const b1 = bytes[p++];
        if (lit2 && !copyLit(lit2)) break;
        if (!copyRef(((b0 & 0x60) << 3) + b1 + 1, ((b0 & 0x1C) >> 2) + 3)) break;
      } else if ((b0 & 0x40) === 0) {
        if (p + 1 >= bytes.length) break;
        const b1 = bytes[p++];
        const b2 = bytes[p++];
        const lits = b1 >> 6;
        if (lits && !copyLit(lits)) break;
        if (!copyRef(((b1 & 0x3F) << 8) + b2 + 1, (b0 & 0x3F) + 4)) break;
      } else if ((b0 & 0x20) === 0) {
        if (p + 2 >= bytes.length) break;
        const b1 = bytes[p++];
        const b2 = bytes[p++];
        const b3 = bytes[p++];
        if (lit2 && !copyLit(lit2)) break;
        const offset = ((b0 & 0x10) << 12) + (b1 << 8) + b2 + 1;
        const length = ((b0 & 0x0C) << 6) + b3 + 5;
        if (!copyRef(offset, length)) break;
      } else if (b0 < 0xFC) {
        if (!copyLit(((b0 & 0x1F) + 1) * 4)) break;
      } else {
        if (lit2) copyLit(lit2);
        break;
      }
    }
    return out;
  }

  function decodeSpit(buffer) {
    const bytes = bytesOf(buffer);
    if (bytes.length < 16) return null;
    const type = bytes[0];
    const width = s16(bytes, 4);
    const height = s16(bytes, 6);
    if (width <= 0 || height <= 0 || width > 2048 || height > 2048) return null;
    const count = width * height;
    if (count > 4000000) return null;
    const rawType = type === 123;
    if (rawType && bytes.length < 16 + count) return null;
    const pixels = new Uint8Array(count);
    let index = 16;
    let raw = 0;
    while (raw < count) {
      let description;
      if (rawType) {
        description = 1;
      } else {
        if (index >= bytes.length) break;
        description = bytes[index++];
      }
      if (description === 0) break;
      if (description >= 128) {
        const writeLen = 255 - description + 1;
        if (index + writeLen > bytes.length) break;
        for (let i = 0; i < writeLen && raw < count; i++) pixels[raw++] = bytes[index++];
      } else {
        if (index >= bytes.length) break;
        const color = bytes[index++];
        for (let i = 0; i < description && raw < count; i++) pixels[raw++] = color;
      }
    }
    if (!rawType && raw === 0) return null;
    return {
      width,
      height,
      xOffset: s16(bytes, 8),
      yOffset: s16(bytes, 10),
      xPos: s16(bytes, 12),
      yPos: s16(bytes, 14),
      pixels
    };
  }

  function tagAt(bytes, offset) {
    let text = '';
    for (let i = 0; i < 4; i++) {
      const c = bytes[offset + i];
      if (!c) break;
      text += String.fromCharCode(c);
    }
    return text;
  }

  function numericTag(tag) {
    const text = String(tag || '').trim();
    if (!/^\d{1,4}$/.test(text)) return null;
    return parseInt(text, 10);
  }

  function parseShapeBank(buffer) {
    const bytes = bytesOf(buffer);
    if (!isShapeMagic(bytes)) return null;
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const little = magic === 'SHPP' || magic === 'SHPS';
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint32(8, little);
    if (count <= 0 || count > 20000) return null;
    if (16 + count * 8 > bytes.length) return null;
    const shapes = [];
    let palette = null;
    for (let i = 0; i < count; i++) {
      const entry = 16 + i * 8;
      const tag = tagAt(bytes, entry);
      const offset = view.getUint32(entry + 4, little);
      if (offset <= 0 || offset >= bytes.length) continue;
      const slice = bytes.subarray(offset);
      if (tag.charAt(0) === '!' || /^pal/i.test(tag)) {
        palette = palette || decodeEaPalette(slice);
        continue;
      }
      const spit = decodeSpit(slice);
      if (!spit) continue;
      spit.tag = tag;
      shapes.push(spit);
    }
    return { shapes, palette };
  }

  function decodeBundle(buffer) {
    const bytes = bytesOf(buffer);
    if (!isBundle(bytes)) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint32(4, true);
    if (count < 0 || count > 20000) return null;
    const files = [];
    let p = 8;
    for (let i = 0; i < count; i++) {
      if (p + 8 > bytes.length) return null;
      const nameLen = view.getUint32(p, true);
      const dataLen = view.getUint32(p + 4, true);
      p += 8;
      if (nameLen < 0 || dataLen < 0 || p + nameLen + dataLen > bytes.length) return null;
      const name = new TextDecoder().decode(bytes.subarray(p, p + nameLen));
      p += nameLen;
      const data = bytes.subarray(p, p + dataLen);
      p += dataLen;
      files.push({ name, data });
    }
    return files;
  }

  function encodeBundle(files) {
    const encoded = files.map((file) => ({
      name: new TextEncoder().encode(file.name),
      data: bytesOf(file.data)
    }));
    let size = 8;
    for (const file of encoded) size += 8 + file.name.length + file.data.length;
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer);
    out.set(BUNDLE_MAGIC, 0);
    view.setUint32(4, encoded.length, true);
    let p = 8;
    for (const file of encoded) {
      view.setUint32(p, file.name.length, true);
      view.setUint32(p + 4, file.data.length, true);
      p += 8;
      out.set(file.name, p);
      p += file.name.length;
      out.set(file.data, p);
      p += file.data.length;
    }
    return out;
  }

  function openBytes(buffer) {
    const bytes = bytesOf(buffer);
    if (isBundle(bytes)) {
      const files = decodeBundle(bytes);
      if (!files) return null;
      const shapes = [];
      let palette = null;
      for (const file of files) {
        const base = file.name.split(/[\\/]/).pop();
        if (base.charAt(0) === '!') {
          palette = palette || decodeEaPalette(file.data);
          continue;
        }
        const opened = openBytes(file.data);
        if (!opened) continue;
        if (opened.palette && !palette) palette = opened.palette;
        shapes.push.apply(shapes, opened.shapes);
      }
      return { shapes, palette };
    }
    if (isShapeMagic(bytes)) return parseShapeBank(bytes);
    if (isRefPack(bytes)) {
      const raw = decompressRefPack(bytes);
      if (!raw) return null;
      if (isShapeMagic(raw) || isBundle(raw)) return openBytes(raw);
      const spit = decodeSpit(raw);
      if (spit) return { shapes: [spit], palette: null };
      return null;
    }
    const spit = decodeSpit(bytes);
    if (spit) return { shapes: [spit], palette: null };
    return null;
  }

  function grayscale() {
    const colors = [];
    for (let i = 0; i < 256; i++) colors.push([i, i, i]);
    return colors;
  }

  function decodeAct(buffer) {
    const bytes = bytesOf(buffer);
    const colors = [];
    const count = Math.min(256, Math.floor(bytes.length / 3));
    for (let i = 0; i < count; i++) {
      colors.push([bytes[i * 3], bytes[i * 3 + 1], bytes[i * 3 + 2]]);
    }
    while (colors.length < 256) colors.push([0, 0, 0]);
    return colors;
  }

  function decodeEaPalette(buffer) {
    const bytes = bytesOf(buffer);
    if (bytes.length < 19) return null;
    const offset = 16;
    const count = Math.min(256, Math.floor((bytes.length - offset) / 3));
    if (count < 1) return null;
    let max = 0;
    const raw = [];
    for (let i = 0; i < count; i++) {
      const rgb = [bytes[offset + i * 3], bytes[offset + i * 3 + 1], bytes[offset + i * 3 + 2]];
      if (rgb[0] > max) max = rgb[0];
      if (rgb[1] > max) max = rgb[1];
      if (rgb[2] > max) max = rgb[2];
      raw.push(rgb);
    }
    const mul = max <= 63 ? 4 : 1;
    const colors = raw.map((rgb) => [rgb[0] * mul, rgb[1] * mul, rgb[2] * mul]);
    while (colors.length < 256) colors.push([0, 0, 0]);
    return colors;
  }

  function decodeRinkFile(buffer) {
    const bytes = bytesOf(buffer);
    if (bytes.length === 768 || (bytes.length % 3 === 0 && bytes.length <= 768 && bytes.length >= 384)) {
      return decodeAct(bytes);
    }
    return decodeEaPalette(bytes);
  }

  function colorsToAct(colors) {
    const out = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      const rgb = colors[i] || [0, 0, 0];
      out[i * 3] = rgb[0];
      out[i * 3 + 1] = rgb[1];
      out[i * 3 + 2] = rgb[2];
    }
    return out;
  }

  function buildTeamPalette(teamBlock, rinkColors) {
    const bytes = bytesOf(teamBlock);
    if (bytes.length < TEAM_BYTES) return null;
    const base = [];
    for (let i = 0; i < 128; i++) {
      if (rinkColors && rinkColors[i]) base.push(rinkColors[i].slice());
      else base.push([i, i, i]);
    }
    for (let i = 0; i < 64; i++) {
      base.push([bytes[i * 3] * 4, bytes[i * 3 + 1] * 4, bytes[i * 3 + 2] * 4]);
    }
    while (base.length < 256) base.push([0, 0, 0]);
    const mapped = base.map((rgb) => rgb.slice());
    for (let i = 0; i < 128; i++) {
      const src = bytes[320 + i];
      mapped[128 + i] = (base[src] || [0, 0, 0]).slice();
    }
    return mapped;
  }

  function emptyFrame(frame) {
    return {
      frame,
      index: frame - 1,
      width: 0,
      height: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      minX: 0,
      minY: 0,
      hotspotX: 0,
      hotspotY: 0,
      hotspotPxX: 0,
      hotspotPxY: 0,
      pixels: new Uint8Array(0),
      numSprites: 0,
      sprites: [],
      picture: false,
      opaque: false
    };
  }

  function shapeToFrame(shape, frame, picture) {
    return {
      frame,
      index: frame - 1,
      width: shape.width,
      height: shape.height,
      canvasWidth: shape.width,
      canvasHeight: shape.height,
      minX: picture ? 0 : shape.xOffset,
      minY: picture ? 0 : shape.yOffset,
      hotspotX: shape.xPos,
      hotspotY: shape.yPos,
      hotspotPxX: shape.xPos,
      hotspotPxY: shape.yPos,
      pixels: shape.pixels,
      numSprites: picture ? 0 : 1,
      sprites: [],
      picture,
      opaque: picture,
      tag: shape.tag || ''
    };
  }

  function numericName(name) {
    const base = String(name || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    return numericTag(base);
  }

  function isSpriteBank(opened, filename) {
    const base = String(filename || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    if (/^(sprites?|players?)$/i.test(base)) return true;
    if (!opened || !opened.shapes) return false;
    let numbered = 0;
    for (const shape of opened.shapes) {
      if (numericTag(shape.tag) != null) numbered += 1;
    }
    return numbered >= 200;
  }

  function placeShape(frames, shape, index, picture) {
    if (index < 0 || index >= frames.length) return;
    frames[index] = shapeToFrame(shape, index + 1, picture);
  }

  function buildSpriteBank(files) {
    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) frames.push(emptyFrame(i + 1));
    for (const file of files) {
      const named = numericName(file.name);
      const opened = openBytes(file.data);
      if (!opened) continue;
      if (opened.shapes.length === 1 && named != null) {
        placeShape(frames, opened.shapes[0], named, false);
        continue;
      }
      for (const shape of opened.shapes) {
        const index = numericTag(shape.tag);
        if (index == null) continue;
        placeShape(frames, shape, index, false);
      }
    }
    return {
      numFrames: FRAME_COUNT,
      frames,
      combined: grayscale(),
      renderFrame: function (frameNumber) {
        return frames[frameNumber - 1] || null;
      }
    };
  }

  function openSpriteBundle(buffer) {
    const bytes = bytesOf(buffer);
    const files = isBundle(bytes) ? decodeBundle(bytes) : [{ name: 'sprites', data: bytes }];
    if (!files) return buildSpriteBank([]);
    return buildSpriteBank(files);
  }

  function paletteFrom(buffer) {
    if (!buffer) return null;
    const bytes = bytesOf(buffer);
    if (isShapeMagic(bytes) || isRefPack(bytes) || isBundle(bytes)) {
      const opened = openBytes(bytes);
      if (opened && opened.palette) return opened.palette;
    }
    if (bytes.length === 768) return decodeAct(bytes);
    return decodeEaPalette(bytes);
  }

  function openImage(buffer, donor) {
    const opened = openBytes(buffer) || { shapes: [], palette: null };
    const colors = opened.palette || paletteFrom(donor) || grayscale();
    const frames = opened.shapes.map((shape, index) => {
      const frame = shapeToFrame(shape, index + 1, true);
      frame.colors = colors;
      return frame;
    });
    return {
      numFrames: frames.length,
      frames,
      combined: colors,
      renderFrame: function (frameNumber) {
        return frames[frameNumber - 1] || null;
      }
    };
  }

  function stemOf(rel) {
    const base = String(rel || '').split(/[\\/]/).pop();
    const cut = base.lastIndexOf('.');
    return (cut > 0 ? base.slice(0, cut) : base);
  }

  function imageMeta(rel) {
    const stem = stemOf(rel).toUpperCase();
    const parent = stemOf(String(rel || '').split(/[\\/]/).slice(0, -1).pop() || '').toUpperCase();
    if (/^EMB/.test(stem) && stem.length > 3) {
      return { label: stem.slice(3) + ' emblem', group: 'Screens' };
    }
    if (/^CREDIT\d+$/.test(stem)) {
      return { label: 'Credits ' + stem.slice(6), group: 'Screens' };
    }
    const photo = /^(\d+)_(\d+)$/.exec(stem);
    if (photo) return { label: 'Photos ' + photo[1] + '–' + photo[2], group: 'Other' };
    const known = LABELS[stem] || LABELS[parent];
    if (known && LABELS[stem]) return { label: known[0], group: known[1] };
    if (known) return { label: stemOf(rel), group: known[1] };
    return { label: stemOf(rel), group: 'Other' };
  }

  function parseTeamFile(name) {
    const match = /^([a-z]+)([hv])\.pal$/i.exec(String(name || ''));
    if (!match) return null;
    const code = match[1].toLowerCase();
    const index = TEAMS.findIndex((team) => team.code === code);
    if (index < 0) return null;
    return { index, code, side: match[2].toLowerCase() === 'v' ? 'away' : 'home' };
  }

  function paletteNames(hasHome, hasAway) {
    const names = [];
    for (const team of TEAMS) {
      if (hasHome) names.push(team.code + 'h.pal');
      if (hasAway) names.push(team.code + 'v.pal');
    }
    return names;
  }

  function isPaletteFile(rel) {
    if (/\.(qfs|ppv|spit|vsh)$/i.test(rel)) return false;
    const base = stemOf(rel);
    if (/^(homepals|awaypals|rinkpal)$/i.test(base)) return true;
    return /\.(act|pal)$/i.test(rel);
  }

  function isIgnored(rel) {
    return /\.(bmp|raw|json|md|txt|js|asm)$/i.test(rel);
  }

  function catalogDirectory(dir) {
    const empty = {
      spriteFiles: [],
      images: [],
      hasHome: false,
      hasAway: false,
      homeFile: '',
      awayFile: '',
      rinkFile: '',
      paletteNames: []
    };
    if (!dir || typeof require !== 'function') return empty;
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(dir)) return empty;
    const files = [];

    function walk(abs, rel) {
      const entries = fs.readdirSync(abs, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.charAt(0) === '.') continue;
        const childRel = rel ? rel + '/' + entry.name : entry.name;
        const childAbs = path.join(abs, entry.name);
        if (entry.isDirectory()) {
          if (/^sprites?$/i.test(entry.name)) {
            walkSprites(childAbs, childRel);
          } else {
            walk(childAbs, childRel);
          }
        } else if (entry.isFile()) {
          files.push(childRel);
        }
      }
    }

    function walkSprites(abs, rel) {
      const entries = fs.readdirSync(abs, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.charAt(0) === '.') continue;
        const childRel = rel + '/' + entry.name;
        const childAbs = path.join(abs, entry.name);
        if (entry.isDirectory()) walkSprites(childAbs, childRel);
        else if (entry.isFile() && entry.name.charAt(0) !== '!') files.push(childRel);
      }
    }

    walk(dir, '');
    const spriteFiles = [];
    const images = [];
    let hasHome = false;
    let hasAway = false;
    let homeFile = '';
    let awayFile = '';
    let rinkFile = '';
    for (const rel of files) {
      const base = stemOf(rel);
      if (/^homepals$/i.test(base) && /\.bin$/i.test(rel)) {
        hasHome = true;
        if (!homeFile) homeFile = rel;
      }
      if (/^awaypals$/i.test(base) && /\.bin$/i.test(rel)) {
        hasAway = true;
        if (!awayFile) awayFile = rel;
      }
      if (/^rinkpal$/i.test(base) && !rinkFile) rinkFile = rel;
      if (isPaletteFile(rel) || isIgnored(rel)) continue;
      const inSprites = /(^|\/)sprites?\//i.test(rel);
      if (inSprites) {
        spriteFiles.push(rel);
        continue;
      }
      let opened = null;
      try {
        const stat = fs.statSync(path.join(dir, rel));
        if (stat.size > 32 * 1024 * 1024) continue;
        opened = openBytes(fs.readFileSync(path.join(dir, rel)));
      } catch (err) {
        opened = null;
      }
      if (!opened || !opened.shapes.length) continue;
      if (isSpriteBank(opened, rel)) {
        spriteFiles.push(rel);
        continue;
      }
      const meta = imageMeta(rel);
      images.push({
        id: rel,
        label: meta.label,
        group: meta.group,
        kind: 'pc95',
        palette: ''
      });
    }
    const byId = new Map(files.map((rel) => [stemOf(rel).toUpperCase(), rel]));
    for (const image of images) {
      const dirName = image.id.split('/').slice(0, -1).join('/');
      const sibling = files.find((rel) => {
        const parent = rel.split('/').slice(0, -1).join('/');
        return parent === dirName && stemOf(rel).charAt(0) === '!';
      });
      if (sibling) {
        image.palette = sibling;
        continue;
      }
      const donor = PAL_DONOR[stemOf(image.id).toUpperCase()];
      if (donor && byId.has(donor)) image.palette = byId.get(donor);
    }
    images.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
    return {
      spriteFiles,
      images,
      hasHome,
      hasAway,
      homeFile,
      awayFile,
      rinkFile,
      paletteNames: paletteNames(hasHome, hasAway)
    };
  }

  return {
    FRAME_COUNT,
    TEAM_BYTES,
    TEAMS,
    LABELS,
    PAL_DONOR,
    isRefPack,
    decompressRefPack,
    decodeSpit,
    parseShapeBank,
    encodeBundle,
    decodeBundle,
    openBytes,
    grayscale,
    decodeAct,
    decodeEaPalette,
    decodeRinkFile,
    colorsToAct,
    buildTeamPalette,
    isSpriteBank,
    buildSpriteBank,
    openSpriteBundle,
    openImage,
    paletteFrom,
    imageMeta,
    parseTeamFile,
    paletteNames,
    catalogDirectory
  };
});
