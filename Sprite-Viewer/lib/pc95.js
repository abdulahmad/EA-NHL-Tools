/**
 * NHL 95 PC pictures.
 *
 * QFS files are EA RefPack (the 10 FB / 11 FB form unpacked by sub_97CE0
 * in NHL95PC). PPV files, and the bytes inside a QFS, are SHPI shape
 * banks. On this PC game the size, count, and offsets are little-endian
 * dwords, which is how sub_B30B4 reads them, even though the magic is
 * SHPI. Each entry is a SPIT picture. Type 123 is raw pixels. Anything
 * else is the ILBM-style run already decoded by SPIT-To-BMP.
 *
 * Player and goalie sprites use the createPal from PAL-To-ACT: rink
 * colors, the 64 team colors, the mapping bytes at team offset 320,
 * then createjerseyShadowfixed for indexes 0–143. Static sprites
 * (referee, puck, the F*.PPV crowd) use the game palette instead,
 * which is rinkpal plus those team colors and rinkpal's last five
 * colors. The blitter skips index 255, and index 0 is equipment black.
 *
 * SPIT bytes 8 and 10 are the console 0, 0 point (DrawSprite subtracts
 * them from the world position). GetHot reads HotList in HOCKEY.EXE;
 * its Y is stored with the opposite sign of the Genesis hotspot.
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
    CREDITS: ['Credits background', 'Screens'],
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
    SCRBRD2: ['Scoreboard 2', 'Screens'],
    TRINKND: ['Rink end', 'Ice'],
    F000149: ['Rink and crowd', 'Ice'],
    CALENDAR: ['Calendar', 'Screens'],
    HILIGHT: ['Highlight font', 'Fonts'],
    CLAP: ['Clap', 'Ice'],
    GOAL: ['Goal light', 'Ice'],
    HOOK: ['Hook', 'Ice'],
    SIREN: ['Siren', 'Ice'],
    RUFF: ['Ruff', 'Ice'],
    FANOM: ['Fan', 'Ice'],
    CROSS: ['Cross', 'Ice'],
    CFLAG: ['Canadian flag', 'Ice'],
    UFLAG: ['US flag', 'Ice'],
    SAVED: ['Saved', 'Screens'],
    CRESTS4: ['Crests', 'Logos'],
    GADGET5: ['Gadget', 'Screens'],
    GADGET6: ['Gadget replay', 'Screens'],
    POINTER3: ['Pointer', 'Screens'],
    LOAD: ['Loading', 'Screens'],
    LOCKROOM: ['Locker room', 'Screens'],
    PLAYER: ['Player card', 'Screens'],
    LELOGO: ['League logos', 'Logos'],
    CALLOGO: ['Calendar logos', 'Logos'],
    OPEN_BUT: ['Open buttons', 'Screens'],
    JOYCAL: ['Joystick calibration', 'Screens'],
    SAVEGAME: ['Save game', 'Screens'],
    SOUND: ['Sound', 'Screens'],
    PALETTE: ['Palette', 'Other'],
    EASN: ['EA Sports Net', 'Screens'],
    EASCRN: ['EA screen', 'Screens'],
    EASCRN1: ['EA screen 2', 'Screens'],
    EAOPEN: ['EA open', 'Screens'],
    EADESK: ['EA desk', 'Screens'],
    SCRBRD: ['Scoreboard', 'Jumbotron']
  };

  // Event clips and the scoreboard. They share one sidebar group.
  const JUMBOTRON = {
    CLAP: 1, CROSS: 1, CFLAG: 1, UFLAG: 1, FANOM: 1, GOAL: 1, GUILT: 1, HOOK: 1,
    RUFF: 1, SAVED: 1, SIREN: 1, SCRBRD1: 1, SCRBRD2: 1
  };

  const SEQUENCE_LABELS = {
    CREDIT: ['Credits', 'Screens'],
    PORTR: ['Portraits', 'Screens'],
    EADESK: ['EA desk', 'Screens'],
    SETTING: ['Settings', 'Screens'],
    PIONEER: ['Pioneer', 'Screens'],
    EASCRN: ['EA screen', 'Screens'],
    SCRBRD: ['Scoreboard', 'Jumbotron'],
    CTTITLE: ['City titles', 'Screens']
  };

  const CITY_CODES = {
    ANA: 'Anaheim', ASE: 'All-Star East', ASW: 'All-Star West', BOS: 'Boston', BUF: 'Buffalo',
    CGY: 'Calgary', CHI: 'Chicago', DAL: 'Dallas', DET: 'Detroit', EAS: 'EA Sports',
    EDM: 'Edmonton', FLA: 'Florida', HFD: 'Hartford', LA: 'Los Angeles', MIN: 'Minnesota',
    MTL: 'Montreal', NHL: 'NHL', NJ: 'New Jersey', NYI: 'Long Island', NYR: 'New York',
    OTT: 'Ottawa', PHI: 'Philadelphia', PIT: 'Pittsburgh', QUE: 'Quebec', SCUP: 'Stanley Cup',
    SJ: 'San Jose', STL: 'St. Louis', TB: 'Tampa Bay', TOR: 'Toronto', VAN: 'Vancouver',
    WES: 'West', WPG: 'Winnipeg', WSH: 'Washington'
  };

  // Pictures whose colors live in a different QFS. From QFS-To-BMP.
  const PAL_DONOR = {
    SRLOGO: 'ARENA',
    CTLOGO: 'CTBKGD',
    // TonightsGameScreen and the summary screens load ctbkgd "!pal" before these shapes.
    CTTITLE: 'CTBKGD',
    CTTITLE1: 'CTBKGD',
    CTTITLE2: 'CTBKGD',
    CTTITLE3: 'CTBKGD',
    // DrawCreatePlayer copies prez2 "!pal" before the stat bar.
    PSTATBAR: 'PREZ2',
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

  function shapeIsLittle(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    function plausible(little) {
      const size = view.getUint32(4, little);
      const count = view.getUint32(8, little);
      if (count <= 0 || count > 10000) return false;
      if (16 + count * 8 > bytes.length) return false;
      return size === bytes.length || (size > 16 && size <= bytes.length);
    }
    const le = plausible(true);
    const be = plausible(false);
    if (le && !be) return true;
    if (be && !le) return false;
    if (le && be) {
      if (view.getUint32(4, true) === bytes.length) return true;
      if (view.getUint32(4, false) === bytes.length) return false;
    }
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    return magic === 'SHPP' || magic === 'SHPS';
  }

  function parseShapeBank(buffer) {
    const bytes = bytesOf(buffer);
    if (!isShapeMagic(bytes)) return null;
    const little = shapeIsLittle(bytes);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint32(8, little);
    if (count <= 0 || count > 20000) return null;
    if (16 + count * 8 > bytes.length) return null;
    const shapes = [];
    let palette = null;
    let paletteRank = 0;
    for (let i = 0; i < count; i++) {
      const entry = 16 + i * 8;
      const tag = tagAt(bytes, entry);
      const offset = view.getUint32(entry + 4, little);
      if (offset <= 0 || offset >= bytes.length) continue;
      const slice = bytes.subarray(offset);
      if (tag.charAt(0) === '!' || /^pal/i.test(tag)) {
        const decoded = decodeEaPalette(slice);
        const rank = tag === '!pal' ? 3 : 2;
        if (decoded && rank >= paletteRank) {
          palette = decoded;
          paletteRank = rank;
        }
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

  const ACTS = {};
  // HotList at HOCKEY.EXE file offset 0x11339C. Pairs are signed X, then
  // Y with the opposite sign of the Genesis hotspot. 814 entries.
  const HOT_B64 = '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';

  function actColors(name) {
    if (Object.prototype.hasOwnProperty.call(ACTS, name)) return ACTS[name];
    ACTS[name] = null;
    if (typeof require !== 'function') return null;
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(__dirname, '..', '..', 'PAL-To-ACT', name);
      if (!fs.existsSync(file)) return null;
      ACTS[name] = decodeAct(fs.readFileSync(file));
      return ACTS[name];
    } catch (err) {
      return null;
    }
  }

  function padColors(colors) {
    const out = [];
    for (let i = 0; i < 256; i++) {
      if (colors && colors[i]) out.push(colors[i].slice());
      else out.push([0, 0, 0]);
    }
    return out;
  }

  // mergePal.js: the first palette keeps its head, and a rink palette
  // also keeps its last five colors (indexes 251–255).
  function mergeColors(first, second, colorsFromFirst, keepTail) {
    const end = keepTail ? 251 : 256;
    const out = [];
    for (let i = 0; i < 256; i++) {
      const source = i < colorsFromFirst || i >= end ? first : second;
      out.push((source[i] || [0, 0, 0]).slice());
    }
    return out;
  }

  function hotTable() {
    if (hotTable.bytes) return hotTable.bytes;
    let bytes;
    if (typeof Buffer !== 'undefined') bytes = new Uint8Array(Buffer.from(HOT_B64, 'base64'));
    else {
      const bin = atob(HOT_B64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    }
    hotTable.bytes = bytes;
    return bytes;
  }

  function signedByte(value) {
    return value > 127 ? value - 256 : value;
  }

  // GetHot in engine_core.asm. The frame number is the 0-based PC index.
  function hotspotFor(index) {
    let frame = index;
    if (frame < 0 || frame >= 0x468) return { x: 0, y: 0 };
    if (frame >= 0x378) frame -= 0xF4;
    else if (frame > 0x283) return { x: 0, y: 0 };
    if (frame >= 0x2DA) frame -= 0x46;
    else if (frame > 0x293) return { x: 0, y: 0 };
    const table = hotTable();
    const at = frame * 2;
    if (at + 1 >= table.length) return { x: 0, y: 0 };
    return { x: signedByte(table[at]), y: -signedByte(table[at + 1]) };
  }

  // Arrows, the puck, nets, the goal light, glass, and the referee use
  // the game palette. Player and goalie poses use createPal.
  function frameIsDynamic(frame) {
    if (frame >= 353 && frame <= 357) return false;
    if (frame >= 384 && frame <= 407) return false;
    if (frame >= 555 && frame <= 568) return false;
    if (frame >= 645 && frame <= 872) return false;
    if (frame >= 1129 && frame <= 1134) return false;
    return true;
  }

  function buildTeamPalette(teamBlock, rinkColors) {
    const bytes = bytesOf(teamBlock);
    if (bytes.length < TEAM_BYTES) return null;
    const team = padColors(null);
    for (let i = 0; i < 64; i++) {
      team[128 + i] = [bytes[i * 3] * 4, bytes[i * 3 + 1] * 4, bytes[i * 3 + 2] * 4];
    }
    const map = new Uint8Array(256);
    for (let i = 0; i < 128; i++) map[128 + i] = bytes[320 + i];
    const fallback = padColors(rinkColors);
    const rinkPlain = actColors('rinkpal.act') || fallback;
    const rinkFixed = actColors('rinkpalShadowfixed.act') || fallback;
    const jersey = actColors('createjerseyShadowfixed.act');
    const game = mergeColors(rinkPlain, team, 128, true);
    const gameFixed = mergeColors(rinkFixed, team, 128, true);
    const mapped = [];
    for (let i = 0; i < 256; i++) mapped.push((gameFixed[map[i]] || [0, 0, 0]).slice());
    let sprite = mapped;
    if (jersey) {
      const edit = [];
      for (let i = 0; i < 256; i++) edit.push((i >= 251 ? jersey[i] : mapped[i]).slice());
      sprite = mergeColors(jersey, edit, 144, false);
    }
    sprite.game = game;
    return sprite;
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

  function shapeToFrame(shape, frame, picture, kind) {
    const minX = picture ? 0 : -shape.xOffset;
    const minY = picture ? 0 : -shape.yOffset;
    const hot = picture || kind === 'rink' ? { x: 0, y: 0 } : hotspotFor(frame - 1);
    return {
      frame,
      index: frame - 1,
      width: shape.width,
      height: shape.height,
      canvasWidth: shape.width,
      canvasHeight: shape.height,
      minX,
      minY,
      hotspotX: hot.x,
      hotspotY: hot.y,
      hotspotPxX: hot.x - minX,
      hotspotPxY: hot.y - minY,
      pixels: shape.pixels,
      numSprites: picture ? 0 : 1,
      sprites: [],
      picture,
      opaque: Boolean(picture),
      transparent: picture ? 0 : 255,
      dynamic: !picture && kind !== 'rink' && frameIsDynamic(frame),
      tag: shape.tag || ''
    };
  }

  function numericName(name) {
    const base = String(name || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    return numericTag(base);
  }

  /**
   * Player sheets are one PPV per 50 frames: 000_049, 050_099, … 950_999,
   * then 10001049, 10501099, and 11001149 (LoadPlayerPhotos). Rink and
   * crowd sheets use the same cut with an F prefix (F000_049 … F100_149),
   * and F000_149 is the wider rink-object bank DrawRinkObjects indexes.
   */
  function rangeOf(name) {
    const stem = stemOf(name).toUpperCase();
    let match = /^F(\d{3})_(\d{3})$/.exec(stem);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (end >= start) return { kind: 'rink', start, end };
    }
    match = /^(\d{3})_(\d{3})$/.exec(stem);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start % 50 === 0 && end === start + 49) return { kind: 'players', start, end };
    }
    match = /^(\d{4})(\d{4})$/.exec(stem);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start >= 1000 && start % 50 === 0 && end === start + 49) return { kind: 'players', start, end };
    }
    return null;
  }

  function tagIndex(tag) {
    const text = String(tag || '').trim();
    const prefixed = /^f(\d{1,4})$/i.exec(text);
    if (prefixed) return parseInt(prefixed[1], 10);
    return numericTag(text);
  }

  function isSpriteBank(opened, filename) {
    const range = rangeOf(filename);
    if (range) return range.kind === 'players';
    const base = String(filename || '').split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    return /^(sprites?|players?)$/i.test(base);
  }

  function isRinkBank(opened, filename) {
    const range = rangeOf(filename);
    return Boolean(range && range.kind === 'rink');
  }

  function placeShape(frames, shape, index, picture, kind) {
    if (index < 0 || index >= frames.length) return;
    frames[index] = shapeToFrame(shape, index + 1, picture, kind);
  }

  function buildSpriteBank(files, kind) {
    const list = files || [];
    let count = kind === 'rink' ? 0 : FRAME_COUNT;
    if (kind === 'rink') {
      for (const file of list) {
        const range = rangeOf(file.name);
        if (range) count = Math.max(count, range.end + 1);
      }
      if (!count) count = 1;
    }
    const frames = [];
    for (let i = 0; i < count; i++) frames.push(emptyFrame(i + 1));
    const ordered = list.slice().sort((a, b) => {
      const left = rangeOf(a.name);
      const right = rangeOf(b.name);
      const spanA = left ? left.end - left.start : 0;
      const spanB = right ? right.end - right.start : 0;
      return spanB - spanA;
    });
    for (const file of ordered) {
      const named = numericName(file.name);
      const range = rangeOf(file.name);
      const opened = openBytes(file.data);
      if (!opened) continue;
      if (!range && opened.shapes.length === 1 && named != null) {
        placeShape(frames, opened.shapes[0], named, false, kind);
        continue;
      }
      for (let local = 0; local < opened.shapes.length; local++) {
        const shape = opened.shapes[local];
        let index = tagIndex(shape.tag);
        if (range && (index == null || index < range.start || index > range.end)) {
          index = range.start + local;
        }
        if (index == null) continue;
        placeShape(frames, shape, index, false, kind);
      }
    }
    if (kind === 'rink') {
      while (frames.length > 1 && frames[frames.length - 1].width === 0) frames.pop();
    }
    return {
      numFrames: frames.length,
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
    if (!files) return buildSpriteBank([], 'players');
    const rink = files.some((file) => isRinkBank(null, file.name));
    const players = files.some((file) => isSpriteBank(null, file.name) && rangeOf(file.name));
    return buildSpriteBank(files, rink && !players ? 'rink' : 'players');
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

  function openImageParts(parts, donor) {
    const frames = [];
    let carry = paletteFrom(donor) || null;
    for (const part of parts || []) {
      const opened = openBytes(part && part.data) || { shapes: [], palette: null };
      if (opened.palette) carry = opened.palette;
      const use = opened.palette || carry || grayscale();
      for (const shape of opened.shapes) {
        const frame = shapeToFrame(shape, frames.length + 1, true);
        frame.colors = use;
        frames.push(frame);
      }
    }
    const use = (frames[0] && frames[0].colors) || carry || grayscale();
    return {
      numFrames: frames.length,
      frames,
      combined: use,
      renderFrame: function (frameNumber) {
        return frames[frameNumber - 1] || null;
      }
    };
  }

  function openImage(buffer, donor) {
    return openImageParts([{ data: buffer }], donor);
  }

  function stemOf(rel) {
    const base = String(rel || '').split(/[\\/]/).pop();
    const cut = base.lastIndexOf('.');
    return (cut > 0 ? base.slice(0, cut) : base);
  }

  function cityOf(code) {
    return CITY_CODES[code] || code;
  }

  function imageMeta(rel) {
    const stem = stemOf(rel).toUpperCase();
    const parent = stemOf(String(rel || '').split(/[\\/]/).slice(0, -1).pop() || '').toUpperCase();
    const jersey = /^JER([A-Z]{2,4})([HV])$/.exec(stem);
    if (jersey) {
      return {
        label: cityOf(jersey[1]) + (jersey[2] === 'V' ? ' away' : ' home') + ' jersey',
        group: 'Jerseys'
      };
    }
    if (JUMBOTRON[stem]) return { label: LABELS[stem] ? LABELS[stem][0] : stemOf(rel), group: 'Jumbotron' };
    const emblem = /^EMB([A-Z]{2,4})$/.exec(stem);
    if (emblem && !/^PAL/.test(emblem[1])) {
      return { label: cityOf(emblem[1]) + ' emblem', group: 'Logos' };
    }
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

  function sequenceParts(stem) {
    const match = /^(.*\D)(\d+)$/.exec(String(stem || '').toUpperCase());
    if (!match) return null;
    return { prefix: match[1], n: parseInt(match[2], 10) };
  }

  function groupImages(items) {
    const buckets = new Map();
    const bare = new Map();
    const singles = [];
    for (const item of items) {
      const stem = stemOf(item.rel).toUpperCase();
      const parts = sequenceParts(stem);
      if (!parts) {
        if (!bare.has(stem)) bare.set(stem, []);
        bare.get(stem).push(item);
        continue;
      }
      const dirName = item.rel.split('/').slice(0, -1).join('/');
      const key = dirName + '\n' + parts.prefix;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ item, n: parts.n, prefix: parts.prefix, dirName });
    }
    const images = [];
    const used = new Set();
    for (const group of buckets.values()) {
      const prefix = group[0].prefix;
      const extras = (bare.get(prefix) || []).filter((item) => {
        const dirName = item.rel.split('/').slice(0, -1).join('/');
        return dirName === group[0].dirName && !used.has(item.rel);
      });
      if (group.length + extras.length < 2) {
        singles.push(group[0].item);
        continue;
      }
      group.sort((a, b) => a.n - b.n || a.item.rel.localeCompare(b.item.rel));
      const members = extras.concat(group.map((entry) => entry.item));
      for (const item of members) used.add(item.rel);
      const known = SEQUENCE_LABELS[prefix];
      const first = members[0];
      const last = members[members.length - 1];
      images.push({
        id: first.rel,
        label: known ? known[0] : stemOf(first.rel) + '–' + stemOf(last.rel),
        group: known ? known[1] : first.meta.group,
        kind: 'pc95',
        palette: '',
        files: members.map((item) => item.rel)
      });
    }
    for (const item of singles) {
      if (used.has(item.rel)) continue;
      images.push({
        id: item.rel,
        label: item.meta.label,
        group: item.meta.group,
        kind: 'pc95',
        palette: '',
        files: [item.rel]
      });
    }
    for (const list of bare.values()) {
      for (const item of list) {
        if (used.has(item.rel)) continue;
        images.push({
          id: item.rel,
          label: item.meta.label,
          group: item.meta.group,
          kind: 'pc95',
          palette: '',
          files: [item.rel]
        });
      }
    }
    return images;
  }

  function catalogDirectory(dir) {
    const empty = {
      spriteFiles: [],
      rinkFiles: [],
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
    const rinkFiles = [];
    const loose = [];
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
      if (!/\.(qfs|ppv|spit|shp|vsh)$/i.test(rel)) continue;
      let opened = null;
      try {
        const stat = fs.statSync(path.join(dir, rel));
        if (stat.size > 32 * 1024 * 1024) continue;
        opened = openBytes(fs.readFileSync(path.join(dir, rel)));
      } catch (err) {
        opened = null;
      }
      const ranged = rangeOf(rel);
      if (ranged || isSpriteBank(opened, rel) || isRinkBank(opened, rel)) {
        if (!opened || !opened.shapes.length) continue;
        if (ranged && ranged.kind === 'rink') rinkFiles.push(rel);
        else spriteFiles.push(rel);
        continue;
      }
      if (!opened || !opened.shapes.length) continue;
      loose.push({ rel, meta: imageMeta(rel) });
    }
    const images = groupImages(loose);
    function byRange(a, b) {
      const left = rangeOf(a);
      const right = rangeOf(b);
      const startA = left ? left.start : 0;
      const startB = right ? right.start : 0;
      return startA - startB || a.localeCompare(b);
    }
    spriteFiles.sort(byRange);
    rinkFiles.sort(byRange);
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
      const stem = stemOf(image.id).toUpperCase();
      let donor = PAL_DONOR[stem];
      if (!donor && /^EMB/.test(stem) && !/^EMBPAL/.test(stem)) donor = 'EMBPAL';
      if (donor && byId.has(donor)) image.palette = byId.get(donor);
    }
    images.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
    return {
      spriteFiles,
      rinkFiles,
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
    hotspotFor,
    frameIsDynamic,
    isSpriteBank,
    isRinkBank,
    rangeOf,
    buildSpriteBank,
    openSpriteBundle,
    openImage,
    openImageParts,
    paletteFrom,
    imageMeta,
    parseTeamFile,
    paletteNames,
    catalogDirectory
  };
});
