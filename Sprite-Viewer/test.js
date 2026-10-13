const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { parseFrames } = require('./lib/parse-frames');
const { parseAnim, renderFrame } = require('./lib/anim');
const { holdVblanks } = require('./lib/playback');
const { parseSheet } = require('./lib/sheet');
const { paletteLabel, defaultPaletteFile, matchPaletteFile } = require('./lib/labels');
const { decodeJim } = require('./lib/jim');
const { unpack93 } = require('./lib/snespak');
const { parse93, parse94, openImage } = require('./lib/snes');
const { GAMES } = require('./lib/games');

const root = __dirname;
const framesSrc = fs.readFileSync(path.join(root, 'data', 'frames.asm'), 'utf8');
const catalog = parseFrames(framesSrc);

function spf(name) {
  const found = catalog.spfs.find((s) => s.name === name);
  assert(found, 'missing ' + name);
  return found;
}
function spa(name) {
  const found = catalog.anims.find((s) => s.name === name);
  assert(found, 'missing ' + name);
  return found;
}
function framesOf(dir) {
  return dir.steps.map((s) => s.frame);
}

assert.strictEqual(catalog.spfs.length, 29);
assert.strictEqual(spf('SPFskatewp').start, 1);
assert.strictEqual(spf('SPFskate').start, 41);
assert.strictEqual(spf('SPFskatewp').count, 40);
assert.strictEqual(spf('SPFskatewp').stride, 5);
assert.strictEqual(spf('SPFswing').count, 48);
assert.strictEqual(spf('SPFswing').stride, 6);
assert.strictEqual(spf('SPFSiren').start, 536);
assert.strictEqual(spf('SPFarrow').start, 378);
assert.strictEqual(spf('SPFpuck').start, 387);
assert.strictEqual(spf('SPFgoal').start, 398);
assert.strictEqual(spf('SPFGoalie').start, 400);
assert.strictEqual(spf('SPFGoalie').count, 112);
assert.strictEqual(spf('SPFGoalie').stride, null, 'goalie run is not one 8-facing strip');
assert.strictEqual(spf('SPFLogos').start, 512);
assert.strictEqual(spf('SPFfight').count, 17);

const ready = spa('SPAgready');
assert.strictEqual(ready.offset, 2);
assert.strictEqual(ready.loop, false);
assert.deepStrictEqual(ready.directions.map((d) => d.steps[0].frame), [400, 403, 406, 409, 412, 415, 418, 421]);
assert.ok(ready.directions.every((d) => d.steps.length === 1 && d.steps[0].last && d.steps[0].ticks === 8));

const skate = spa('SPAskatewp');
assert.deepStrictEqual(framesOf(skate.directions[0]), [2, 3, 4, 5, 1]);
assert.deepStrictEqual(skate.directions[0].steps.map((s) => s.rawTime), [10, 10, 10, 10, -15]);
assert.deepStrictEqual(framesOf(skate.directions[7]), [37, 38, 39, 40, 36]);
assert.strictEqual(skate.uniqueDirections, 8);

const puck = spa('SPApflip');
assert.strictEqual(puck.loop, true);
assert.deepStrictEqual(framesOf(puck.directions[0]), [389, 390, 391, 392, 393, 390, 394, 388]);
assert.strictEqual(puck.directions[4].steps[0].ticks, 0x1000);
assert.strictEqual(puck.directions[4].steps[0].last, true);

const fight = spa('SPAfight');
assert.deepStrictEqual(framesOf(fight.directions[0]), [354, 355, 356, 357]);
assert.deepStrictEqual(framesOf(fight.directions[2]), framesOf(fight.directions[0]));
assert.ok(fight.directions[0].sharedWith.includes(1));
assert.ok(fight.directions[0].sharedWith.includes(2));
assert.deepStrictEqual(framesOf(fight.directions[7]), [354, 355, 356, 362]);
assert.ok(fight.directions[3].sharedWith.includes(7));

const stack = spa('SPAgstackr');
assert.deepStrictEqual(framesOf(stack.directions[0]), [440, 441]);
assert.deepStrictEqual(framesOf(stack.directions[1]), [442, 443]);
assert.deepStrictEqual(framesOf(stack.directions[2]), [442, 443]);
assert.deepStrictEqual(framesOf(stack.directions[7]), [450, 451]);

const wall = spa('SPAwallright');
assert.strictEqual(wall.directions[7].unused, true);
assert.deepStrictEqual(framesOf(wall.directions[0]), [375, 376, 377]);
assert.deepStrictEqual(framesOf(wall.directions[1]), framesOf(wall.directions[2]));

const siren = spa('SPAsiren');
assert.strictEqual(siren.loop, true);
assert.strictEqual(siren.directions[0].steps.length, 14);
assert.strictEqual(siren.directions[0].steps[0].frame, 536);
assert.strictEqual(siren.directions[0].steps[13].frame, 549);
assert.strictEqual(siren.uniqueDirections, 1);
assert.ok(siren.directions[0].sharedWith.length === 7);

const face = spa('SPAfaceoff');
assert.deepStrictEqual(framesOf(face.directions[0]), [1, 258, 257]);
assert.deepStrictEqual(framesOf(face.directions[1]), framesOf(face.directions[7]));

for (const anim of catalog.anims) {
  for (const dir of anim.directions) {
    if (dir.unused) continue;
    assert.ok(dir.steps.length > 0, anim.name + ' dir ' + dir.id + ' empty');
    assert.strictEqual(dir.steps[dir.steps.length - 1].last, true, anim.name + ' dir ' + dir.id + ' missing last marker');
    for (const step of dir.steps) {
      assert.ok(step.frame >= 1 && step.frame <= 549, anim.name + ' frame ' + step.frame);
    }
  }
}

assert.strictEqual(catalog.anims.length, 49);

function readBmpIndices(file) {
  const buf = fs.readFileSync(file);
  const pixelOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const height = Math.abs(buf.readInt32LE(22));
  const rowStride = Math.ceil(width / 4) * 4;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixels[y * width + x] = buf[pixelOffset + y * rowStride + x];
  }
  return { width, height, pixels };
}

function compareBank(fileName) {
  const anim = parseAnim(fs.readFileSync(path.join(root, '..', 'ANIM-To-BMP', fileName)));
  const extracted = path.join(root, '..', 'ANIM-To-BMP', 'Extracted', fileName);
  const bmps = fs.readdirSync(extracted).filter((f) => f.endsWith('.bmp'));
  assert.strictEqual(bmps.length, anim.numFrames, fileName + ' frame count');
  for (let n = 1; n <= anim.numFrames; n++) {
    const rendered = renderFrame(anim, n);
    const bmp = readBmpIndices(path.join(extracted, n + '.bmp'));
    assert.strictEqual(rendered.width, bmp.width, fileName + ' frame ' + n + ' width');
    assert.strictEqual(rendered.height, bmp.height, fileName + ' frame ' + n + ' height');
    assert.strictEqual(Buffer.compare(Buffer.from(rendered.pixels), Buffer.from(bmp.pixels)), 0,
      fileName + ' frame ' + n + ' pixels');
    const opaque = rendered.pixels.some((p) => p !== 0);
    assert.ok(opaque, fileName + ' frame ' + n + ' is blank');
  }
  return anim;
}

const spritesAnim = compareBank('Sprites.anim');
const puckAnim = compareBank('Puck.anim');
const zamAnim = compareBank('Zam.anim');
const crowdAnim = compareBank('Crowd.anim');
assert.strictEqual(spritesAnim.numFrames, 549);
assert.strictEqual(spf('SPFSiren').end, null);
assert.ok(spritesAnim.frames[0].sprites.length > 0);
assert.ok(Number.isFinite(spritesAnim.frames[0].hotspotX));
assert.strictEqual(spritesAnim.frames[0].canvasWidth, 16);
assert.strictEqual(spritesAnim.frames[0].canvasHeight, 32);
const frame1 = renderFrame(spritesAnim, 1);
assert.strictEqual(frame1.hotspotX, -4);
assert.strictEqual(frame1.hotspotY, -20);
assert.strictEqual(frame1.canvasWidth, frame1.width);
assert.strictEqual(frame1.canvasHeight, frame1.height);
assert.strictEqual(frame1.hotspotPxX, frame1.hotspotX - frame1.minX);
assert.strictEqual(frame1.hotspotPxY, frame1.hotspotY - frame1.minY);
for (const bank of [spritesAnim, puckAnim, zamAnim, crowdAnim]) {
  for (const meta of bank.frames) {
    assert.ok(meta.canvasWidth > 0 && meta.canvasHeight > 0, 'frame ' + meta.frame + ' canvas');
    const rendered = renderFrame(bank, meta.frame);
    assert.strictEqual(rendered.canvasWidth, rendered.width, 'frame ' + meta.frame + ' canvas width');
    assert.strictEqual(rendered.canvasHeight, rendered.height, 'frame ' + meta.frame + ' canvas height');
  }
}

assert.strictEqual(holdVblanks(10, true), 11);
assert.strictEqual(holdVblanks(15, true), 16);
assert.strictEqual(holdVblanks(2, true), 4);
assert.strictEqual(holdVblanks(4, true), 5);
assert.strictEqual(holdVblanks(0x1000, true), null);
assert.strictEqual(holdVblanks(10, false), 11);

for (const file of ['frames93.asm', 'frames94.asm', 'frames95.asm']) {
  const later = parseFrames(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
  assert.ok(later.spfs.length > 29, file + ' spf');
  assert.ok(later.anims.length > 48, file + ' spa');
  const skating = later.anims.find((anim) => anim.name.toLowerCase() === 'spaskatewp');
  assert.ok(skating, file + ' skate');
  assert.strictEqual(skating.group, 'Skating');
  assert.ok(skating.directions[0].steps.length >= 4);
  assert.ok(skating.directions[0].steps.every((step, index, all) => index < all.length - 1 ? step.rawTime > 0 : step.rawTime < 0));
  const names = later.anims.map((anim) => anim.name);
  assert.deepStrictEqual(names.slice().sort(), [...new Set(names)].sort(), file + ' unique spa names');
  assert.ok(later.spfs.every((spf) => ['Players', 'Goalies', 'Ice', 'Other'].includes(spf.group)), file + ' spf group');
}

function be(buf, offset, value) {
  buf.writeUInt16BE(value & 0xffff, offset);
}

const rom = Buffer.alloc(0x200);
const palette = 0x00;
const base = 0x80;
for (let i = 0; i < 16; i++) be(rom, palette + i * 2, 0x000e);
rom.writeUInt32BE(0x80, base + 4); // frame table at base+0x80
const table = base + 0x80;
be(rom, table + 0, 0);
be(rom, table + 2, 16); // bounds, and frame 1's data starts past the index
be(rom, table + 4, 24); // one 8-byte sprite
const data = table + 16;
be(rom, data + 0, 0);
be(rom, data + 2, -8 & 0xffff);
be(rom, data + 4, 0);
rom[data + 6] = 0x20; // palette 1
rom[data + 7] = 0;
rom[base + 0x0a] = 0x10;
const hotlist = 0x160;
rom[hotlist + 2] = 4;
rom[hotlist + 3] = 0xfe;
const sheet = parseSheet(rom, {
  record: '94',
  boundsAt: 2,
  sprites: base,
  hotlist,
  palette
});
assert.strictEqual(sheet.numFrames, 1);
assert.strictEqual(sheet.frames[0].sprites[0].paletteIndex, 1);
assert.strictEqual(sheet.frames[0].hotspotX, 4);
assert.strictEqual(sheet.frames[0].hotspotY, -2);
const drawn = renderFrame(sheet, 1);
assert.strictEqual(drawn.sprites[0].ypos, -8);
assert.strictEqual(drawn.pixels[0], 17, 'palette 1 plus color 1');
assert.strictEqual(drawn.pixels[1], 0);

assert.strictEqual(paletteLabel('sabresh.pal'), 'Buffalo · home');
assert.strictEqual(paletteLabel('BUFh.snespal'), 'Buffalo · home');
assert.strictEqual(paletteLabel('rangersv.pal'), 'New York · away');
assert.strictEqual(paletteLabel('NYv.snespal'), 'New York · away');
assert.strictEqual(paletteLabel('islandersh.pal'), 'Long Island · home');
assert.strictEqual(paletteLabel('ASEh.snespal'), 'All-Star East · home');
assert.strictEqual(defaultPaletteFile(['bruinsv.pal', 'sabresv.pal', 'sabresh.pal']), 'sabresh.pal');
assert.strictEqual(defaultPaletteFile(['BUFv.snespal', 'BUFh.snespal']), 'BUFh.snespal');
assert.strictEqual(matchPaletteFile(['BUFh.snespal', 'BUFv.snespal'], 'sabresh.pal'), 'BUFh.snespal');
assert.strictEqual(matchPaletteFile(['oilersh.pal'], 'missing.pal'), '');

const snes93cat = parseFrames(fs.readFileSync(path.join(root, 'data', 'frames93snes.asm'), 'utf8'));
assert.strictEqual(snes93cat.anims.length, 59);
assert.strictEqual(snes93cat.spfs.length, 40);
const skate93 = snes93cat.anims.find((anim) => anim.name === 'SPAskatewp');
assert.deepStrictEqual(skate93.directions[0].steps.map((step) => step.frame), [2, 3, 4, 5, 1]);
assert.deepStrictEqual(skate93.directions[0].steps.map((step) => step.rawTime), [10, 10, 10, 10, -15]);
assert.strictEqual(snes93cat.spfs.find((item) => item.name === 'SPFsmallfont').group, 'Other');
assert.strictEqual(snes93cat.spfs.find((item) => item.name === 'SPFcrowd').group, 'Other');
assert.strictEqual(snes93cat.spfs.find((item) => item.name === 'SPFzamboni').group, 'Other');

const snes94cat = parseFrames(fs.readFileSync(path.join(root, 'data', 'frames94snes.asm'), 'utf8'));
assert.strictEqual(snes94cat.anims.length, 71);
assert.strictEqual(snes94cat.spfs.length, 28);
const skate94 = snes94cat.anims.find((anim) => anim.name === 'SPAskatewp');
assert.deepStrictEqual(skate94.directions[0].steps.map((step) => step.frame), [2, 3, 4, 5, 1]);
assert.deepStrictEqual(skate94.directions[0].steps.map((step) => step.rawTime), [10, 10, 10, 10, -15]);
const later = snes94cat.spfs.find((item) => item.name === 'SPFlater');
assert.strictEqual(later.start, 406);
assert.strictEqual(later.end, null);
assert.strictEqual(later.group, 'Other');
assert.strictEqual(snes94cat.anims.filter((anim) => anim.name === 'SPAskatewp').length, 1);

const literal = unpack93(Buffer.from([0x02, 1, 2, 3, 0xe0, 0]), 0);
assert.deepStrictEqual([...literal], [1, 2, 3]);

const jimTiles = 1;
const jimPal = 10 + jimTiles * 32;
const jimMap = jimPal + 128;
const jim = Buffer.alloc(jimMap + 4 + 2);
jim.writeUInt32BE(jimPal, 0);
jim.writeUInt32BE(jimMap, 4);
jim.writeUInt16BE(jimTiles, 8);
jim.writeUInt16BE(1, jimMap);
jim.writeUInt16BE(1, jimMap + 2);
jim.writeUInt16BE(0, jimMap + 4);
jim[10] = 0x10;
const picture = decodeJim(jim);
const pictureFrame = picture.renderFrame(1);
assert.strictEqual(picture.numFrames, 1);
assert.strictEqual(pictureFrame.picture, true);
assert.strictEqual(pictureFrame.opaque, true);
assert.strictEqual(pictureFrame.width, 8);
assert.strictEqual(pictureFrame.height, 8);
assert.strictEqual(pictureFrame.pixels[0], 1);
const compressed = Buffer.alloc(16);
compressed.writeUInt32BE(0, 0);
compressed.writeUInt32BE(20, 4);
compressed.writeUInt16BE(1, 8);
assert.throws(() => decodeJim(compressed), /compressed/);

const snes93rom = Buffer.alloc(160);
snes93rom.writeUInt16LE(0, 96);
snes93rom.writeUInt16LE(1, 98);
snes93rom[104] = 0x80;
const snes93anim = parse93(snes93rom, {
  sets: [{ frames: 1, pieceCount: 1, tiles: 1, pieceSize: 4, pieces: 100 }]
});
assert.strictEqual(snes93anim.numFrames, 1);
const snes93frame = snes93anim.renderFrame(1);
assert.strictEqual(snes93frame.width, 8);
assert.strictEqual(snes93frame.height, 8);
assert.strictEqual(snes93frame.pixels[0], 1);
assert.strictEqual(snes93frame.numSprites, 1);

const snes94rom = Buffer.alloc(0x80);
snes94rom.writeUInt32LE(4, 0);
snes94rom[4] = 1;
snes94rom.writeUInt16LE(32, 4 + 0x0c);
snes94rom.writeUInt16LE(0x1d, 4 + 0x10);
snes94rom[4 + 0x1d] = 0x80;
const snes94anim = parse94(snes94rom, { base: 0x808000 });
assert.strictEqual(snes94anim.numFrames, 1);
const snes94frame = snes94anim.renderFrame(1);
assert.strictEqual(snes94frame.width, 8);
assert.strictEqual(snes94frame.pixels[0], 1);

const nhl92 = GAMES.find((game) => game.id === 'nhl92');
for (const bank of nhl92.banks) {
  if (!bank.file) continue;
  const size = fs.statSync(path.join(root, '..', 'ANIM-To-BMP', bank.id)).size;
  assert.strictEqual(bank.end - bank.start, size, bank.id + ' ROM span');
}
assert.ok(nhl92.images.some((image) => image.kind === 'jim'));
assert.ok(GAMES.some((game) => game.id === 'nhlpa93snes' && game.kind === 'snes93'));
assert.ok(GAMES.some((game) => game.id === 'nhl94snes' && game.kind === 'snes94'));

function romIf(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}
const retail92 = romIf(path.join(root, '..', 'NHL92FMTunes-To-MIDI', 'nhl92retail.bin'));
if (retail92) {
  const sliced = parseAnim(retail92.subarray(0x3D5EE, 0x7216C));
  assert.strictEqual(sliced.numFrames, spritesAnim.numFrames);
  const title = decodeJim(retail92.subarray(0x25642, 0x2ADF0));
  assert.strictEqual(title.renderFrame(1).width, 256);
  const refs = decodeJim(retail92.subarray(0x3A3DC, 0x3D5EE));
  assert.strictEqual(refs.renderFrame(1).height, 2160);
}
const retail93 = romIf('/tmp/snes/93/lst/nhlpa93snes.bin');
if (retail93) {
  const drawn = parse93(retail93, GAMES.find((game) => game.id === 'nhlpa93snes').snes);
  assert.strictEqual(drawn.numFrames, 720);
  const first = drawn.renderFrame(1);
  assert.strictEqual(first.hotspotX, -4);
  assert.strictEqual(first.hotspotY, -20);
  assert.ok(first.pixels.some((pixel) => pixel));
  const title = openImage(retail93, GAMES.find((game) => game.id === 'nhlpa93snes').images[0], null, null);
  assert.strictEqual(title.renderFrame(1).width, 256);
}
const retail94 = romIf('/tmp/snes/94/lst/nhl94snes.sfc');
if (retail94) {
  const game = GAMES.find((item) => item.id === 'nhl94snes');
  const drawn = parse94(retail94, game.snes);
  assert.strictEqual(drawn.numFrames, 976);
  assert.ok(drawn.renderFrame(2).pixels.some((pixel) => pixel));
  const rink = openImage(retail94, game.images[0], game.snes, null);
  assert.strictEqual(rink.renderFrame(1).width, 384);
  assert.strictEqual(rink.renderFrame(1).height, 904);
}

console.log('catalog', catalog.spfs.length, 'SPF groups,', catalog.anims.length, 'SPA animations');
console.log('banks', {
  sprites: spritesAnim.numFrames,
  puck: puckAnim.numFrames,
  zam: zamAnim.numFrames,
  crowd: crowdAnim.numFrames
});
console.log('parse-frames and small ANIM banks match ANIM-To-BMP');
