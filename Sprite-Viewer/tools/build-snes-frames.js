/**
 * Build the vendored SPF/SPA listings for the two SNES games.
 *
 * NHLPA 93 SNES names come from NHLPA93SNES src/data/frames93s.asm plus the
 * SPF equates in src/ram93snes.asm (commit recorded in the output header).
 * NHL 94 SNES has no named animation list yet (McMarkis fork, branch
 * segment/bank96_9000). Its tables are packed in LoROM bank $9D. Each table
 * is eight absolute bank addresses, a flags word, then (frame, time) pairs
 * ending in a negative time. Names are the 93 SNES animations whose vblank
 * lists match, in order, with extras left over.
 *
 * Usage: node tools/build-snes-frames.js
 * Reads /tmp/snes/93 and /tmp/snes/94 (local clones, not shipped).
 */
const fs = require('fs');
const path = require('path');
const { parseFrames } = require('../lib/parse-frames');

const SRC93 = process.env.SNES93 || '/tmp/snes/93';
const ROM94 = process.env.SNES94_ROM || '/tmp/snes/94/lst/nhl94snes.sfc';
const OUT = path.join(__dirname, '..', 'data');

function splitCode(line) {
  const idx = line.indexOf(';');
  if (idx < 0) return { code: line.trim(), comment: '' };
  return { code: line.slice(0, idx).trim(), comment: line.slice(idx + 1).trim() };
}

function loadEquates(ramText) {
  const eq = new Map();
  for (const line of ramText.split(/\r?\n/)) {
    const { code } = splitCode(line);
    const m = /^(SPF\w+)\s*=\s*(\d+|\$[0-9A-Fa-f]+)$/.exec(code);
    if (!m) continue;
    const raw = m[2];
    eq.set(m[1], raw[0] === '$' ? parseInt(raw.slice(1), 16) : parseInt(raw, 10));
  }
  return eq;
}

function evalFrame(expr, eq) {
  const s = expr.replace(/\s+/g, '');
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^\$[0-9A-Fa-f]+$/.test(s)) return parseInt(s.slice(1), 16);
  if (/^-\$[0-9A-Fa-f]+$/.test(s)) return -parseInt(s.slice(2), 16);
  const m = /^(SPF\w+)([+-]\d+)?$/.exec(s);
  if (!m || !eq.has(m[1])) throw new Error('bad frame expr ' + expr);
  return eq.get(m[1]) + (m[2] ? parseInt(m[2], 10) : 0);
}

function wordsOf(text) {
  const words = [];
  for (const line of text.split(/\r?\n/)) {
    const { code } = splitCode(line);
    if (!/^dw\s+/i.test(code)) continue;
    for (const part of code.replace(/^dw\s+/i, '').split(',')) {
      if (part.trim()) words.push(part.trim());
    }
  }
  return words;
}

function parse93(eq, framesText) {
  const body = framesText.replace(/^.*^SPAList:/ms, '');
  const chunks = body.split(/^(SPA\w+)_table:\s*(?:;.*)?$/m);
  const anims = [];
  for (let i = 1; i < chunks.length; i += 2) {
    const name = chunks[i];
    const block = chunks[i + 1].split(/^assert\b/m)[0];
    const comment = ((framesText.match(new RegExp('^' + name + '_table:\\s*;\\s*(.*)$', 'm')) || [])[1] || '').trim();
    const header = block.split(/^\.d0:/m)[0];
    const headerWords = wordsOf(header);
    const flags = evalFrame(headerWords[8], eq);
    const parts = block.split(/^\.d(\d):/m);
    const dirs = [];
    for (let p = 1; p < parts.length; p += 2) {
      const id = Number(parts[p]);
      const text = parts[p + 1].split(/^SPA\w+_table:/m)[0];
      const w = wordsOf(text);
      const steps = [];
      let unused = false;
      for (let k = 0; k + 1 < w.length; k += 2) {
        if (/_table/.test(w[k]) || /_table/.test(w[k + 1])) {
          unused = true;
          break;
        }
        const frame = evalFrame(w[k], eq);
        const time = evalFrame(w[k + 1], eq);
        steps.push([frame, time]);
        if (time < 0) break;
      }
      dirs[id] = unused ? null : steps;
    }
    anims.push({ name, comment, flags, dirs });
  }
  const spfs = [...eq.entries()].map(([name, start]) => ({ name, start }));
  spfs.sort((a, b) => a.start - b.start || a.name.localeCompare(b.name));
  return { anims, spfs };
}

function emit(spfs, anims, header) {
  const lines = header.trim().split('\n');
  lines.push('');
  for (const spf of spfs) lines.push(spf.name + '\t= ' + spf.start);
  lines.push('');
  lines.push('SPAList:');
  lines.push('\tdc.w\t0');
  for (const anim of anims) {
    lines.push('');
    lines.push(anim.name + '\t= *-SPAList' + (anim.comment ? '\t; ' + anim.comment : ''));
    lines.push('.t');
    const offs = [];
    for (let d = 0; d < 8; d++) offs.push(anim.dirs[d] ? '.' + d + '-.t' : '$8000');
    lines.push('\tdc.w\t' + offs.join(','));
    lines.push('\tdc.w\t' + anim.flags);
    for (let d = 0; d < 8; d++) {
      const steps = anim.dirs[d];
      if (!steps) continue;
      const flat = [];
      for (const [frame, time] of steps) flat.push(frame, time);
      lines.push('.' + d + '\tdc.w\t' + flat.join(','));
    }
  }
  lines.push('');
  return lines.join('\n');
}

function read94Tables(rom) {
  const base = 0x1d * 0x8000;
  const bankEnd = base + 0x8000;
  function u16(off) { return rom[off] | (rom[off + 1] << 8); }
  function s16(off) {
    const v = u16(off);
    return v & 0x8000 ? v - 0x10000 : v;
  }
  function parseAt(off) {
    const addrs = [];
    for (let i = 0; i < 8; i++) addrs.push(u16(off + i * 2));
    const flags = u16(off + 16);
    const seqs = [];
    let end = off + 18;
    let live = 0;
    for (const addr of addrs) {
      if (addr < 0x8000) return null;
      const file = base + (addr & 0x7fff);
      // A facing that points at the next table (93's wall/glass dirs do this)
      // is unused. So is anything that is not a frame/time list.
      if (file < off + 18 || file + 4 > bankEnd) {
        seqs.push(null);
        continue;
      }
      const steps = [];
      let i = file;
      let ok = true;
      while (i + 4 <= bankEnd) {
        const frame = s16(i);
        const time = s16(i + 2);
        if (frame <= 0 || frame > 1200) { ok = false; break; }
        steps.push([frame, time]);
        i += 4;
        if (time < 0) break;
        if (steps.length > 40) { ok = false; break; }
      }
      if (!ok || !steps.length || steps[steps.length - 1][1] >= 0) {
        seqs.push(null);
        continue;
      }
      seqs.push(steps);
      live += 1;
      end = Math.max(end, i);
    }
    if (!live || (end & 1)) return null;
    return { flags, seqs, end };
  }
  const tables = [];
  let off = 0xee0fe;
  while (off + 18 < bankEnd) {
    const parsed = parseAt(off);
    if (!parsed) break;
    tables.push(parsed);
    off = parsed.end;
  }
  return tables;
}

function sig(dirs, fromRom) {
  const out = [];
  for (let d = 0; d < 8; d++) {
    const steps = fromRom ? dirs[d] : dirs[d];
    if (!steps) out.push('');
    else out.push(steps.map((step) => (fromRom ? step[1] : step[1])).join(','));
  }
  return out.join('|');
}

function align(srcAnims, tables) {
  const A = srcAnims.map((anim) => sig(anim.dirs, false));
  const B = tables.map((table) => sig(table.seqs, true));
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const cost = i > 0 && j > 0 && A[i - 1] === B[j - 1] ? 0 : 1;
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost) {
      pairs.push([i - 1, j - 1, cost]);
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
      pairs.push([null, j - 1, 1]);
      j -= 1;
    } else {
      pairs.push([i - 1, null, 1]);
      i -= 1;
    }
  }
  pairs.reverse();
  return pairs;
}

function main() {
  const eq = loadEquates(fs.readFileSync(path.join(SRC93, 'src/ram93snes.asm'), 'utf8'));
  const framesText = fs.readFileSync(path.join(SRC93, 'src/data/frames93s.asm'), 'utf8');
  const parsed = parse93(eq, framesText);
  const header93 = `; SPF bases and SPA sequences for NHLPA Hockey 93 on the SNES.
; Converted from NHLPA93SNES src/data/frames93s.asm and src/ram93snes.asm.
; A direction word of $8000 runs off the end of that animation (the source
; points at the next table). SPF symbols are sorted by frame number.
`;
  const asm93 = emit(parsed.spfs, parsed.anims, header93);
  fs.writeFileSync(path.join(OUT, 'frames93snes.asm'), asm93);
  const cat93 = parseFrames(asm93);
  if (cat93.anims.length !== parsed.anims.length) {
    throw new Error('93 anim count ' + cat93.anims.length + ' != ' + parsed.anims.length);
  }

  const rom = fs.readFileSync(ROM94);
  const tables = read94Tables(rom);
  const pairs = align(parsed.anims, tables);
  const anims94 = [];
  let extra = 0;
  let matched = 0;
  for (const [ai, bi, cost] of pairs) {
    if (bi == null) continue;
    const table = tables[bi];
    let name = 'SPAextra' + (++extra);
    let comment = 'SNES 94 sequence';
    if (ai != null && cost === 0) {
      name = parsed.anims[ai].name;
      comment = parsed.anims[ai].comment || 'Same vblank list as NHLPA 93 SNES';
      matched += 1;
      extra -= 1;
    }
    anims94.push({
      name,
      comment,
      flags: table.flags,
      dirs: table.seqs
    });
  }
  // Skate, stop and skate-back still start at the 93 SNES frame numbers, so the
  // player SPF bases (everything before the goalie) still apply. Goalie, crowd
  // and the later props moved; one sentinel keeps them out of SPFpuck.
  const goalie = parsed.spfs.find((spf) => spf.name === 'SPFGoalie');
  const spfs94 = parsed.spfs.filter((spf) => goalie && spf.start < goalie.start);
  spfs94.push({ name: 'SPFlater', start: goalie ? goalie.start : 406 });
  const header94 = `; SPF bases and SPA sequences for NHL 94 on the SNES.
; Frame and time words are from LoROM bank $9D (file 0xEE0FE) of the retail
; ROM, read from McMarkis' NHL94SNES branch segment/bank96_9000.
; A sequence keeps its NHLPA 93 SNES name when the eight vblank lists match.
; SPAextraN is a sequence that list does not have. Player SPF bases are the
; 93 SNES bases before SPFgoalie. SPFlater is everything after that.
`;
  const asm94 = emit(spfs94, anims94, header94);
  fs.writeFileSync(path.join(OUT, 'frames94snes.asm'), asm94);
  const cat94 = parseFrames(asm94);
  const skate = cat94.anims.find((anim) => anim.name.toLowerCase() === 'spaskatewp');
  console.log('93 anims', cat93.anims.length, 'spf', cat93.spfs.length);
  console.log('94 tables', tables.length, 'named', matched, 'anims', cat94.anims.length, 'spf', cat94.spfs.length);
  console.log('94 skate', skate && skate.directions[0].steps.map((s) => s.frame + ':' + s.rawTime).join(' '));
}

main();
