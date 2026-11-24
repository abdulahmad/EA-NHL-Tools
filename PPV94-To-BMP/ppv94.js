/*
 * NHL 94 PC (DOS, 1993) PPV shape banks.
 *
 * This is NOT the NHL 95 PC PPV format (that one is an SHPI bank of SPIT
 * shapes). NHL 94 PC stores Mode X planar shapes, each plane packed with a
 * PackBits-style run code. Format notes: ../../NHL94PC/docs/PPV_FORMAT.md
 * (in the NHL94PC repo) and README.md next to this file.
 *
 * Works in node (require) and in the browser (window.Ppv94).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ppv94 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TRANSPARENT = 0xff;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function s16(b, o) { const v = u16(b, o); return v & 0x8000 ? v - 0x10000 : v; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  // One plane: control byte c.
  //   c == 0x00        end of plane
  //   c in 0x01..0x7F  repeat the next byte c times
  //   c in 0x80..0xFF  copy the next (256 - c) bytes
  // Same loop as the clipped blitter in HOCKEY.EXE seg028 (lodsb / or al,al /
  // jg run / jl literal / jz next plane).
  function unpackPlane(b, pos, expect) {
    const out = new Uint8Array(expect);
    let n = 0;
    for (;;) {
      if (pos >= b.length) throw new Error('PPV94: plane runs past end of data');
      const c = b[pos++];
      if (c === 0) break;
      if (c < 0x80) {
        const v = b[pos++];
        for (let i = 0; i < c; i++) { if (n < expect) out[n] = v; n++; }
      } else {
        const len = 256 - c;
        for (let i = 0; i < len; i++) { if (n < expect) out[n] = b[pos + i]; n++; }
        pos += len;
      }
    }
    if (n !== expect) throw new Error(`PPV94: plane unpacked to ${n} bytes, expected ${expect}`);
    return { data: out, pos };
  }

  // Parse a whole bank. Returns { unpackedSize, entries: [...] }.
  function parseBank(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (b.length < 6) throw new Error('PPV94: file too short');
    if (b[0] === 0x30 && b[1] === 0xfb) throw new Error('PPV94: this is EA Huffman packed (30 FB), probably a QPP; unpack it first');
    const unpackedSize = u32(b, 0);
    const count = u16(b, 4);
    const tableEnd = 6 + 8 * count;
    if (count === 0 || tableEnd > b.length) throw new Error('PPV94: bad entry count');
    const entries = [];
    for (let i = 0; i < count; i++) {
      const name = String.fromCharCode(b[6 + 4 * i], b[7 + 4 * i], b[8 + 4 * i], b[9 + 4 * i]);
      const offset = u32(b, 6 + 4 * count + 4 * i);
      entries.push({ index: i, name, offset: tableEnd + offset });
    }
    let expanded = tableEnd;
    for (const e of entries) {
      const o = e.offset;
      e.quads = s16(b, o);          // width in 4-pixel columns (bytes per plane row)
      e.height = s16(b, o + 2);
      e.width = e.quads * 4;
      e.hotX = s16(b, o + 4);
      e.hotY = s16(b, o + 6);
      e.srcX = s16(b, o + 8);
      e.srcY = s16(b, o + 10);
      e.extra = s16(b, o + 12);     // unknown, per shape
      e.flags = u16(b, o + 14);     // 0x0010 in every retail file
      if (e.name[0] === '!') {   // '!pal', '!bck', '!err': 768 raw palette bytes
        e.kind = 'palette';
        e.palette = b.slice(o + 16, o + 16 + 768);
        expanded += 16 + 768;
        continue;
      }
      e.kind = 'shape';
      const planeSize = e.quads * e.height;
      let pos = o + 16;
      e.planes = [];
      for (let p = 0; p < 4; p++) {
        const r = unpackPlane(b, pos, planeSize);
        e.planes.push(r.data);
        pos = r.pos;
      }
      e.packedEnd = pos;
      expanded += 16 + 4 * planeSize;
    }
    return { unpackedSize, expandedSize: expanded, entries };
  }

  // Interleave the four planes into a linear width*height index buffer.
  // Pixel x of a row is plane (x & 3), byte (x >> 2).
  function toLinear(e) {
    const w = e.width, h = e.height, q = e.quads;
    const out = new Uint8Array(w * h);
    for (let p = 0; p < 4; p++) {
      const plane = e.planes[p];
      for (let y = 0; y < h; y++) {
        for (let i = 0; i < q; i++) out[y * w + i * 4 + p] = plane[y * q + i];
      }
    }
    return out;
  }

  // 768 bytes of VGA DAC values (0..63) -> 256 x [r,g,b] 0..255.
  function vgaToRgb(pal) {
    const out = [];
    for (let i = 0; i < 256; i++) {
      const c = [pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2]];
      out.push(c.map((v) => Math.min(255, Math.round((v & 63) * 255 / 63))));
    }
    return out;
  }

  // Read a palette file: raw 768 bytes (6-bit VGA or 8-bit), a .ACT (768 or
  // 772 bytes), or a PPV bank with a '!pal' entry. Returns 256 x [r,g,b].
  function readPalette(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (b.length === 768 || b.length === 772) {
      const raw = b.slice(0, 768);
      let max = 0;
      for (const v of raw) if (v > max) max = v;
      if (max < 64) return vgaToRgb(raw);
      const out = [];
      for (let i = 0; i < 256; i++) out.push([raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]]);
      return out;
    }
    const bank = parseBank(b);
    const pal = bank.entries.find((e) => e.name === '!pal') || bank.entries.find((e) => e.kind === 'palette');
    if (!pal) throw new Error('PPV94: no !pal entry in that file');
    return vgaToRgb(pal.palette);
  }

  // HOMEPALS.BIN / AWAYPALS.BIN: 26 records of 448 bytes.
  //   +0    64 colors x 3 (6-bit VGA), loaded at palette slots 0x80..0xBF
  //   +192  128-byte remap for sprite pixels 0x00..0x7F
  //   +320  128-byte remap for sprite pixels 0x80..0xFF
  // Record order is the team table in HOCKEY.EXE (file offset 0x32DE2).
  const TEAM_RECORD = 448;
  const TEAMS = ['BOS', 'BUF', 'CGY', 'CHI', 'DET', 'EDM', 'HFD', 'LA', 'MIN', 'MTL', 'NJ', 'NYI', 'NYR',
    'OTT', 'PHI', 'PIT', 'QUE', 'STL', 'SJ', 'TB', 'TOR', 'VAN', 'WSH', 'WPG', 'ASC', 'ASW'];

  function readTeamPalettes(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (b.length % TEAM_RECORD) throw new Error('PPV94: team palette file is not a multiple of 448 bytes');
    const out = [];
    for (let t = 0; t < b.length / TEAM_RECORD; t++) {
      const r = b.subarray(t * TEAM_RECORD, (t + 1) * TEAM_RECORD);
      const remap = new Uint8Array(256);
      remap.set(r.subarray(192, 320), 0);
      remap.set(r.subarray(320, 448), 128);
      remap[TRANSPARENT] = TRANSPARENT;
      out.push({ index: t, abbr: TEAMS[t] || `T${t}`, colors: r.slice(0, 192), remap });
    }
    return out;
  }

  // Game palette (256 x [r,g,b]) + one team record -> { rgb, remap }.
  // Draw a sprite pixel v as rgb[remap[v]]; v = 0xFF stays transparent.
  function teamColors(baseRgb, team) {
    const rgb = baseRgb.slice();
    const tc = vgaToRgb(Object.assign(new Uint8Array(768), team.colors));
    for (let k = 0; k < 64; k++) rgb[0x80 + k] = tc[k];
    return { rgb, remap: team.remap };
  }

  // A stand-in palette for banks with no palette of their own: a grey ramp.
  function greyPalette() {
    const out = [];
    for (let i = 0; i < 256; i++) out.push([i, i, i]);
    return out;
  }

  return { TRANSPARENT, TEAMS, parseBank, toLinear, vgaToRgb, readPalette, greyPalette, unpackPlane,
    readTeamPalettes, teamColors };
});
