#!/usr/bin/env node
// NHL '94 PC .QPP decoder: unpack, list, and export shapes to PNG.
//
// A .QPP is one compressed "shape bank". The compression is picked by the
// first two bytes (the same check as seg004 TypeId / LoadBlock in HOCKEY.EXE):
//   30 FB / 31 FB / 32 FB  EA Huffman + run-length (seg004 Unpack, 0x0430)
//   46 FB / 47 FB          EA BTree pair expansion  (seg004 Expand, 0x072E)
// The unpacked bank is the same layout as an NHL '94 PC .PPV bank. See
// README.md in this folder for the full format.
//
// No dependencies. Node 14+.

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------- Huffman --

class BitReader {
  // Mirrors seg004 GetBits: a 32-bit MSB-first buffer that is topped up
  // to at least 16 bits after every read.
  constructor(data, pos) {
    this.d = data; this.p = pos; this.buf = 0; this.cnt = 0;
  }
  get(n) {
    if (n > 16) {
      const hi = this.get(n - 16);
      return hi * 0x10000 + this.get(16);
    }
    const v = n ? this.buf >>> (32 - n) : 0;
    this.buf = n === 32 ? 0 : (this.buf << n) >>> 0;
    this.cnt -= n;
    while (this.cnt < 16) {
      const b = this.p < this.d.length ? this.d[this.p] : 0;
      this.p++;
      this.buf = (this.buf | (b << (24 - this.cnt))) >>> 0;
      this.cnt += 8;
    }
    return v;
  }
  peek16() { return this.buf >>> 16; }
  // seg004 ReadVar: unary prefix of zero bits picks the width.
  vnum() {
    let v = 2, n = 1;
    do { v *= 2; n++; } while (this.get(1) === 0);
    return this.get(n) + v - 4;
  }
}

function unhuff(d) {
  const type = (d[0] << 8) | d[1];
  let p = 2;
  if (type === 0x31fb) p += 3; // 31FB carries an extra 3-byte field
  const br = new BitReader(d, p);
  br.get(0);
  const size = br.get(24);
  const clue = br.get(8);

  // Canonical code table: count of codes per bit length.
  const base = [], lim = [];
  let num = 0, len = 1, code = 0;
  for (;;) {
    code = (code << 1) & 0xffff;
    base[len] = code - num;
    const n = br.vnum();
    num += n; code += n;
    const limit = n ? (code << (16 - len)) & 0xffff : 0;
    lim[len] = limit;
    len++;
    if (n !== 0 && limit === 0) break;
  }
  const maxlen = len - 1;

  // Symbol order: each entry skips that many still-unused byte values.
  const used = new Uint8Array(256), sym = [];
  let cur = -1;
  for (let i = 0; i < num; i++) {
    let skip = br.vnum() + 1;
    while (skip) {
      cur = (cur + 1) & 0xff;
      if (!used[cur]) skip--;
    }
    used[cur] = 1; sym.push(cur);
  }

  const out = Buffer.alloc(size);
  let o = 0;
  const put = (b) => { if (o < size) out[o] = b; o++; };
  for (;;) {
    const pk = br.peek16();
    let l = 1;
    while (lim[l] <= pk && l < maxlen) l++;
    const s = sym[(br.get(l) - base[l]) & 0xffff];
    if (s !== clue) { put(s); continue; }
    const n = br.vnum();
    if (n) { const prev = out[o - 1]; for (let i = 0; i < n; i++) put(prev); continue; }
    if (br.get(1) === 0) { put(br.get(8)); continue; }
    break; // clue, 0, 1 = end of stream
  }
  if (type === 0x32fb) { // running-sum (delta) pass
    let acc = 0;
    for (let i = 0; i < size; i++) { acc = (acc + out[i]) & 0xff; out[i] = acc; }
  }
  return out;
}

// ------------------------------------------------------------------ BTree --

function unbtree(d) {
  let p = 2;
  if (d[0] & 1) p += 3; // 47FB carries an extra 3-byte field
  const size = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2]; p += 3;
  const clue = d[p], nodes = d[p + 1]; p += 2;
  const isNode = new Uint8Array(256), left = new Uint8Array(256), right = new Uint8Array(256);
  for (let i = 0; i < nodes; i++) {
    const b = d[p]; isNode[b] = 1; left[b] = d[p + 1]; right[b] = d[p + 2]; p += 3;
  }
  const out = Buffer.alloc(size);
  let o = 0;
  const stack = [];
  while (o < size && p < d.length) {
    const c = d[p++];
    if (c === clue) { out[o++] = d[p++]; continue; }
    stack.push(c);
    while (stack.length && o < size) {
      const b = stack.pop();
      if (isNode[b]) { stack.push(right[b]); stack.push(left[b]); } else out[o++] = b;
    }
  }
  return out;
}

function unpack(d) {
  if (d.length > 2 && d[1] === 0xfb) {
    if (d[0] >= 0x30 && d[0] <= 0x32) return { method: 'huffman', data: unhuff(d) };
    if (d[0] === 0x46 || d[0] === 0x47) return { method: 'btree', data: unbtree(d) };
  }
  return { method: 'none', data: d };
}

// ------------------------------------------------------------------- Bank --

function parseBank(u) {
  const allocSize = u.readUInt32LE(0);
  const count = u.readUInt16LE(4);
  const base = 6 + count * 8;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const name = u.toString('latin1', 6 + i * 4, 10 + i * 4);
    const off = base + u.readUInt32LE(6 + count * 4 + i * 4);
    const h = {
      w4: u.readInt16LE(off), height: u.readInt16LE(off + 2),
      hotX: u.readInt16LE(off + 4), hotY: u.readInt16LE(off + 6),
      posX: u.readInt16LE(off + 8), posY: u.readInt16LE(off + 10),
      field12: u.readUInt16LE(off + 12), field14: u.readUInt16LE(off + 14),
    };
    entries.push({ name, offset: off, isPalette: name[0] === '!', ...h });
  }
  return { allocSize, entries };
}

function paletteBytes(u, e) {
  return u.subarray(e.offset + 16, e.offset + 16 + 768);
}

// Four Mode X planes, each a PackBits stream that ends with 00.
// Plane k holds the pixels at x % 4 == k.
function decodeShape(u, e) {
  const w4 = e.w4, h = e.height, W = w4 * 4;
  const px = Buffer.alloc(W * h);
  let p = e.offset + 16;
  const planeLens = [];
  for (let k = 0; k < 4; k++) {
    let i = 0;
    for (;;) {
      const c = u[p++];
      if (c === 0) break;
      if (c < 0x80) {
        const v = u[p++];
        for (let j = 0; j < c; j++, i++) if (i < w4 * h) px[Math.floor(i / w4) * W + (i % w4) * 4 + k] = v;
      } else {
        for (let j = 0; j < 256 - c; j++, i++) { const v = u[p++]; if (i < w4 * h) px[Math.floor(i / w4) * W + (i % w4) * 4 + k] = v; }
      }
    }
    planeLens.push(i);
  }
  return { width: W, height: h, pixels: px, planeLens, end: p };
}

// ------------------------------------------------------------------- PNG --

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// 8-bit indexed PNG. pal = 768 bytes of 8-bit RGB. transparent = index or -1.
function writePng(file, W, H, pixels, pal, transparent) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 3;
  const raw = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) pixels.copy(raw, y * (W + 1) + 1, y * W, y * W + W);
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', Buffer.from(pal))];
  if (transparent >= 0) { const t = Buffer.alloc(transparent + 1, 255); t[transparent] = 0; parts.push(chunk('tRNS', t)); }
  parts.push(chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)));
  fs.writeFileSync(file, Buffer.concat(parts));
}

// 6-bit VGA DAC values to 8-bit.
function vgaTo8(p6) { return Buffer.from(Array.from(p6, (c) => Math.round((c & 63) * 255 / 63))); }

// ------------------------------------------------------------ Palettes --

// Banks without their own palette, and the bank whose palette the game
// loads next to them (from the name pairs in HOCKEY.EXE data, e.g.
// "playoffs ... embpal !pal", "embnhl bkgd tspal !pal", "arena !pal rink").
const PALETTE_SOURCE = {
  EMBNHL: ['TSPAL', '!pal'],
  PLAYOFFS: ['EMBPAL', '!pal'],
  EMBSCUP: ['EMBPAL', '!pal'],
  SAVEGAME: ['EASNDESK', '!pal'],
  SETTING3: ['EASNDESK', '!pal'], SETTING4: ['EASNDESK', '!pal'], SETTING5: ['EASNDESK', '!pal'],
  SETTING6: ['EASNDESK', '!pal'], SETTING7: ['EASNDESK', '!pal'], SOUND: ['EASNDESK', '!pal'],
  EXHGAME2: ['LOCKRM', '!p01'],
  SUMMARY2: ['SUMMARY', '!pal'], SUMMARY3: ['SUMMARY', '!pal'],
  NUMSHP: ['RINKPAL', '!pal'], SCOREBRD: ['RINKPAL', '!pal'], TRINKND: ['RINKPAL', '!pal'],
  CFLAG: ['FLAG', '!pal'], CLAP: ['FLAG', '!pal'], FANOM: ['FLAG', '!pal'],
  GOAL: ['FLAG', '!pal'], UFLAG: ['FLAG', '!pal'],
};
// EMBxxx team backgrounds without a palette use EMBPAL.
function paletteSourceFor(base) {
  if (PALETTE_SOURCE[base]) return PALETTE_SOURCE[base];
  if (/^EMB/.test(base)) return ['EMBPAL', '!pal'];
  return null;
}

function loadBank(file) {
  const raw = fs.readFileSync(file);
  const { method, data } = unpack(raw);
  return { raw, method, data, bank: parseBank(data) };
}

function findFile(dir, base) {
  for (const n of fs.readdirSync(dir)) if (n.toUpperCase() === base.toUpperCase() + '.QPP') return path.join(dir, n);
  return null;
}

function resolvePalette(file, b, opts) {
  if (opts.pal) {
    const [pf, pn] = opts.pal.split(':');
    if (/\.qpp$/i.test(pf)) {
      const pb = loadBank(pf);
      const e = pb.bank.entries.find((x) => x.isPalette && (!pn || x.name.trim() === pn)) || pb.bank.entries.find((x) => x.isPalette);
      return { pal: vgaTo8(paletteBytes(pb.data, e)), from: `${path.basename(pf)} ${e.name}` };
    }
    const bytes = fs.readFileSync(pf).subarray(0, 768);
    return { pal: opts.pal8 ? Buffer.from(bytes) : vgaTo8(bytes), from: path.basename(pf) };
  }
  const own = b.bank.entries.filter((x) => x.isPalette);
  const pick = own.find((x) => x.name === opts.palName) || own.find((x) => x.name === '!pal') || own[0];
  if (pick) return { pal: vgaTo8(paletteBytes(b.data, pick)), from: `own ${pick.name}` };
  const base = path.basename(file).replace(/\.qpp$/i, '').toUpperCase();
  const src = paletteSourceFor(base);
  if (src) {
    const pf = findFile(path.dirname(file), src[0]);
    if (pf) {
      const pb = loadBank(pf);
      const e = pb.bank.entries.find((x) => x.name === src[1]) || pb.bank.entries.find((x) => x.isPalette);
      return { pal: vgaTo8(paletteBytes(pb.data, e)), from: `${src[0]}.QPP ${e.name}` };
    }
  }
  const grey = Buffer.alloc(768);
  for (let i = 0; i < 256; i++) grey[i * 3] = grey[i * 3 + 1] = grey[i * 3 + 2] = i;
  return { pal: grey, from: 'greyscale (no palette found)' };
}

// ------------------------------------------------------------------ CLI --

function usage() {
  console.log(`Usage:
  node qpp94.js list   <file.QPP|dir>              list entries
  node qpp94.js unpack <file.QPP> [out.bin]        write the unpacked bank
  node qpp94.js png    <file.QPP|dir> [outDir]     export every shape and palette
     --pal <file.QPP[:!name] | file.pal>  palette override (6-bit VGA .pal; --pal8 for 8-bit)
     --palname <!name>                    pick one of the bank's own palettes
     --transparent <index>                write index as transparent (default none)`);
}

function main(argv) {
  const opts = { transparent: -1 };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pal') opts.pal = argv[++i];
    else if (a === '--pal8') opts.pal8 = true;
    else if (a === '--palname') opts.palName = argv[++i];
    else if (a === '--transparent') opts.transparent = parseInt(argv[++i], 10);
    else pos.push(a);
  }
  const [cmd, input, out] = pos;
  if (!cmd || !input) return usage();
  const files = fs.statSync(input).isDirectory()
    ? fs.readdirSync(input).filter((n) => /\.qpp$/i.test(n)).sort().map((n) => path.join(input, n))
    : [input];

  for (const file of files) {
    const b = loadBank(file);
    const name = path.basename(file).replace(/\.qpp$/i, '');
    if (cmd === 'list') {
      console.log(`${path.basename(file)}  ${b.method}  packed ${b.raw.length}  unpacked ${b.data.length}  entries ${b.bank.entries.length}`);
      for (const e of b.bank.entries) {
        if (e.isPalette) console.log(`  ${JSON.stringify(e.name)}  palette (768 bytes, 6-bit VGA)`);
        else console.log(`  ${JSON.stringify(e.name)}  ${e.w4 * 4}x${e.height}  hot ${e.hotX},${e.hotY}  pos ${e.posX},${e.posY}`);
      }
    } else if (cmd === 'unpack') {
      const o = out || `${name}.unpacked.bin`;
      fs.writeFileSync(o, b.data);
      console.log(`${path.basename(file)} (${b.method}) -> ${o} (${b.data.length} bytes)`);
    } else if (cmd === 'png') {
      const dir = path.join(out || 'QPP94-out', name);
      fs.mkdirSync(dir, { recursive: true });
      const { pal, from } = resolvePalette(file, b, opts);
      const safe = (n) => n.replace(/[^A-Za-z0-9_!-]/g, '_');
      let shapes = 0;
      for (const e of b.bank.entries) {
        if (e.isPalette) {
          // 16x16 swatch of the palette
          const p8 = vgaTo8(paletteBytes(b.data, e));
          const px = Buffer.alloc(256 * 256);
          for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) px[y * 256 + x] = (y >> 4) * 16 + (x >> 4);
          writePng(path.join(dir, `${safe(e.name)}.png`), 256, 256, px, p8, -1);
          continue;
        }
        const s = decodeShape(b.data, e);
        writePng(path.join(dir, `${safe(e.name)}.png`), s.width, s.height, s.pixels, pal, opts.transparent);
        shapes++;
      }
      console.log(`${path.basename(file)}: ${shapes} shape(s) -> ${dir}  [palette: ${from}]`);
    } else return usage();
  }
}

module.exports = { unhuff, unbtree, unpack, parseBank, decodeShape, paletteBytes, vgaTo8, writePng };
if (require.main === module) main(process.argv.slice(2));
