#!/usr/bin/env node
/*
 * Export NHL 94 PC .PPV shape banks to 8-bit .BMP files.
 *
 *   node ppv94ToBmp <file.PPV | folder> [more...] [--pal <palette>] [--out <folder>] [--key]
 *
 * For each bank, writes <out>/<BANK>/<index>_<name>.bmp plus <BANK>.json
 * (shape headers) and <BANK>_sheet.bmp (every shape on one sheet).
 *
 * Palette, in order of preference:
 *   1. --pal <file>: raw 768-byte VGA palette (6-bit or 8-bit), .ACT, or any
 *      PPV with a '!pal' entry (STOP*.PPV, TROPBACK.PPV).
 *   2. the bank's own '!pal' entry.
 *   3. a grey ramp (index = brightness).
 * --team <ABBR|index> [--side home|away] --teampals <folder>: recolor with
 *   a team from HOMEPALS.BIN / AWAYPALS.BIN (needs --pal, the game palette
 *   RINKPAL '!pal', for the non-team colors).
 * --key paints index 255 (transparent) magenta so it stands out.
 */
const fs = require('fs');
const path = require('path');
const Ppv94 = require('./ppv94');

function writeBmp8(file, w, h, pixels, rgb) {
  const stride = (w + 3) & ~3;
  const dataSize = stride * h;
  const off = 14 + 40 + 1024;
  const b = Buffer.alloc(off + dataSize);
  b.write('BM', 0, 'ascii');
  b.writeUInt32LE(off + dataSize, 2);
  b.writeUInt32LE(off, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(w, 18);
  b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(8, 28);
  b.writeUInt32LE(dataSize, 34);
  b.writeUInt32LE(256, 46);
  for (let i = 0; i < 256; i++) {
    const [r, g, bl] = rgb[i];
    b[54 + i * 4] = bl; b[55 + i * 4] = g; b[56 + i * 4] = r;
  }
  for (let y = 0; y < h; y++) {
    const row = off + (h - 1 - y) * stride;
    for (let x = 0; x < w; x++) b[row + x] = pixels[y * w + x];
  }
  fs.writeFileSync(file, b);
}

function exportBank(file, outRoot, forcedPal, key, team) {
  const bank = Ppv94.parseBank(fs.readFileSync(file));
  const base = path.basename(file, path.extname(file));
  const dir = path.join(outRoot, base);
  fs.mkdirSync(dir, { recursive: true });

  const own = bank.entries.find((e) => e.kind === 'palette');
  let rgb = forcedPal || (own ? Ppv94.vgaToRgb(own.palette) : Ppv94.greyPalette());
  let remap = null;
  if (team) { const t = Ppv94.teamColors(rgb, team); rgb = t.rgb; remap = t.remap; }
  if (key) { rgb = rgb.slice(); rgb[Ppv94.TRANSPARENT] = [255, 0, 255]; }

  const shapes = bank.entries.filter((e) => e.kind === 'shape');
  const meta = [];
  for (const e of shapes) {
    const px = Ppv94.toLinear(e);
    if (remap) for (let i = 0; i < px.length; i++) px[i] = remap[px[i]];
    const name = `${String(e.index).padStart(3, '0')}_${e.name.replace(/[^\w.-]/g, '_')}.bmp`;
    writeBmp8(path.join(dir, name), e.width, e.height, px, rgb);
    meta.push({ index: e.index, name: e.name, file: name, width: e.width, height: e.height,
      hotX: e.hotX, hotY: e.hotY, srcX: e.srcX, srcY: e.srcY, extra: e.extra, flags: e.flags });
  }
  if (own) {
    fs.writeFileSync(path.join(dir, 'pal.act'), Buffer.from(Ppv94.vgaToRgb(own.palette).flat()));
  }
  fs.writeFileSync(path.join(dir, `${base}.json`), JSON.stringify({
    file: path.basename(file), unpackedSize: bank.unpackedSize, entries: meta,
    palette: own ? 'pal.act' : null }, null, 2));

  // Contact sheet: shapes left to right, wrapping at 320 pixels, 2 px gaps.
  if (shapes.length) {
    const W = Math.max(320, ...shapes.map((e) => e.width));
    let x = 0, y = 0, rowH = 0;
    const place = shapes.map((e) => {
      if (x && x + e.width > W) { x = 0; y += rowH + 2; rowH = 0; }
      const p = { e, x, y }; x += e.width + 2; rowH = Math.max(rowH, e.height); return p;
    });
    const H = y + rowH;
    const sheet = new Uint8Array(W * H).fill(Ppv94.TRANSPARENT);
    for (const { e, x: px0, y: py0 } of place) {
      const px = Ppv94.toLinear(e);
      if (remap) for (let i = 0; i < px.length; i++) px[i] = remap[px[i]];
      for (let yy = 0; yy < e.height; yy++) {
        for (let xx = 0; xx < e.width; xx++) sheet[(py0 + yy) * W + px0 + xx] = px[yy * e.width + xx];
      }
    }
    writeBmp8(path.join(outRoot, `${base}_sheet.bmp`), W, H, sheet, rgb);
  }
  console.log(`${path.basename(file)}: ${shapes.length} shapes${own ? ' + palette' : ''} -> ${dir}`);
}

function main() {
  const args = process.argv.slice(2);
  let out = 'out', palFile = null, key = false, teamArg = null, side = 'home', teamDir = null;
  const inputs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out = args[++i];
    else if (args[i] === '--pal') palFile = args[++i];
    else if (args[i] === '--key') key = true;
    else if (args[i] === '--team') teamArg = args[++i];
    else if (args[i] === '--side') side = args[++i];
    else if (args[i] === '--teampals') teamDir = args[++i];
    else inputs.push(args[i]);
  }
  if (!inputs.length) {
    console.log('usage: node ppv94ToBmp <file.PPV | folder> [...] [--pal palette] [--team ABBR --side home|away --teampals folder] [--out folder] [--key]');
    process.exit(1);
  }
  const forcedPal = palFile ? Ppv94.readPalette(fs.readFileSync(palFile)) : null;
  let team = null;
  if (teamArg != null) {
    if (!forcedPal) { console.error('--team needs --pal (the game palette)'); process.exit(1); }
    const bin = path.join(teamDir || '.', side === 'away' ? 'AWAYPALS.BIN' : 'HOMEPALS.BIN');
    const teams = Ppv94.readTeamPalettes(fs.readFileSync(bin));
    team = /^\d+$/.test(teamArg) ? teams[+teamArg] : teams.find((t) => t.abbr === teamArg.toUpperCase());
    if (!team) { console.error(`unknown team ${teamArg}; one of ${Ppv94.TEAMS.join(' ')}`); process.exit(1); }
  }
  const files = [];
  for (const p of inputs) {
    if (fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p).sort()) if (/\.ppv$/i.test(f)) files.push(path.join(p, f));
    } else files.push(p);
  }
  let failed = 0;
  for (const f of files) {
    try { exportBank(f, out, forcedPal, key, team); } catch (e) { failed++; console.error(`${f}: ${e.message}`); }
  }
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();
module.exports = { writeBmp8, exportBank };
