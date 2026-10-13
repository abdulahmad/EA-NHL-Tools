const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { parseFrames } = require('./lib/parse-frames');
const { parseAnim, renderFrame } = require('./lib/anim');
const { holdVblanks } = require('./lib/playback');
const { parseSheet, openFrames } = require('./lib/sheet');
const { paletteLabel, defaultPaletteFile, matchPaletteFile } = require('./lib/labels');
const { decodeJim, decompressBytecode, picturePixelHidden } = require('./lib/jim');
const { unpack93 } = require('./lib/snespak');
const { parse93, parse94, openImage } = require('./lib/snes');
const { GAMES, revAAdjust } = require('./lib/games');
const pc95 = require('./lib/pc95');

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
assert.strictEqual(pictureFrame.opaque, false);
assert.strictEqual(pictureFrame.rowTransparent, true);
assert.strictEqual(picturePixelHidden(0), false);
assert.strictEqual(picturePixelHidden(16), true);
assert.strictEqual(picturePixelHidden(32), true);
assert.strictEqual(picturePixelHidden(48), true);
assert.strictEqual(picturePixelHidden(17), false);
assert.strictEqual(picturePixelHidden(255, 255), true);
const palJim = Buffer.alloc(jimMap + 4 + 2);
palJim.writeUInt32BE(jimPal, 0);
palJim.writeUInt32BE(jimMap, 4);
palJim.writeUInt16BE(jimTiles, 8);
palJim.writeUInt16BE(1, jimMap);
palJim.writeUInt16BE(1, jimMap + 2);
palJim.writeUInt16BE(0x2000, jimMap + 4);
const palFrame = decodeJim(palJim).renderFrame(1);
assert.strictEqual(palFrame.pixels[0], 16);
assert.strictEqual(picturePixelHidden(palFrame.pixels[0]), true);
assert.strictEqual(pictureFrame.width, 8);
assert.strictEqual(pictureFrame.height, 8);
assert.strictEqual(pictureFrame.pixels[0], 1);
const notJim = Buffer.alloc(16);
notJim.writeUInt32BE(100, 0);
notJim.writeUInt32BE(200, 4);
notJim.writeUInt16BE(1, 8);
assert.throws(() => decodeJim(notJim), /not a JIM/);

const arenaSheet = Buffer.alloc(10 + 24 * 32);
arenaSheet.writeUInt16BE(24, 8);
arenaSheet[10] = 0x10;
const arenaPic = decodeJim(arenaSheet);
assert.strictEqual(arenaPic.renderFrame(1).width, 64);
assert.strictEqual(arenaPic.renderFrame(1).height, 24);
assert.strictEqual(arenaPic.renderFrame(1).pixels[0], 1);
const unpaletted = Buffer.alloc(10 + 32 + 6);
unpaletted.writeUInt32BE(0xffffffff, 0);
unpaletted.writeUInt32BE(42, 4);
unpaletted.writeUInt16BE(1, 8);
unpaletted.writeUInt16BE(1, 42);
unpaletted.writeUInt16BE(1, 44);
const donor = Buffer.alloc(128);
const fromDonor = decodeJim(unpaletted, donor);
assert.deepStrictEqual(fromDonor.combined[1], [0, 0, 0]);

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
assert.ok(GAMES.some((game) => game.id === 'nhl94snes' && game.kind === 'snes94' && game.jerseyRow === 4));
const snes94images = GAMES.find((game) => game.id === 'nhl94snes').images.map((image) => image.id);
for (const id of ['title', 'easports', 'logos', 'rink', 'center', 'letters', 'smallletters']) {
  assert.ok(snes94images.includes(id), id);
}

const pa93 = GAMES.find((game) => game.id === 'nhlpa93');
const g94 = GAMES.find((game) => game.id === 'nhl94');
const g95 = GAMES.find((game) => game.id === 'nhl95');
assert.strictEqual(pa93.images.length, 25);
assert.strictEqual(g94.images.length, 215);
assert.strictEqual(g95.images.length, 300);
assert.ok(pa93.images.some((image) => image.id === 'IceRink.map.jim' && image.kind === 'jim'));
assert.ok(pa93.images.some((image) => image.id === 'Crowd.anim' && image.kind === 'frames'));
assert.ok(g94.images.some((image) => image.id === 'logoBOS.map.jim' && image.paletteAt === 0xFF482));
assert.ok(g94.images.some((image) => image.id === 'CardMarioLemieux.bin' && image.paletteAt === 0xC6762));
assert.ok(g95.images.some((image) => image.id === 'CardGuyHebert.bin' && image.paletteAt));
assert.ok(g95.images.some((image) => image.id === 'logoANA.map.jim'));
assert.ok(!pa93.images.some((image) => /palette|sound|scouttext/i.test(image.id)));

function inkCount(frame) {
  let n = 0;
  for (let i = 0; i < frame.pixels.length; i++) if (frame.pixels[i]) n++;
  return n;
}

const ronbarr = decodeJim(fs.readFileSync(path.join(root, '..', 'JIM-Tools', 'ronbarr.map.jzip')));
const ronFrame = ronbarr.renderFrame(1);
assert.strictEqual(ronFrame.width, 64);
assert.strictEqual(ronFrame.height, 72);
assert.ok(inkCount(ronFrame) > 100);

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
const genesis94 = romIf('/tmp/disasm/NHL94Genesis/lst/nhl94.bin');
if (genesis94) {
  const boston = g94.images.find((image) => image.id === 'logoBOS.map.jim');
  const logo = decodeJim(
    genesis94.subarray(boston.start, boston.end),
    genesis94.subarray(boston.paletteAt, boston.paletteAt + 32)
  );
  assert.ok(logo.combined.some((color) => color[0] > 180 && color[1] > 140 && color[2] < 80));
  const titleSpec = g94.images.find((image) => image.id === 'Title94-1.map.jim');
  const title = decodeJim(genesis94.subarray(titleSpec.start, titleSpec.end));
  assert.ok(title.renderFrame(1).width >= 64);
  assert.ok(inkCount(title.renderFrame(1)) > 100);
  const card = g94.images.find((image) => image.id === 'CardMarioLemieux.bin');
  const portrait = decodeJim(
    genesis94.subarray(card.start, card.end),
    genesis94.subarray(card.paletteAt, card.paletteAt + 128)
  );
  const face = portrait.renderFrame(1);
  assert.strictEqual(face.width, 48);
  assert.strictEqual(face.height, 48);
  assert.ok(inkCount(face) > 50);
  assert.deepStrictEqual(portrait.combined[6], [0, 0, 0]);
  assert.deepStrictEqual(portrait.combined[5], [255, 255, 255]);
  const crowdSpec = g94.images.find((image) => image.id === 'Crowd.anim');
  const crowd = openFrames(genesis94.subarray(crowdSpec.start, crowdSpec.end), { decompressBytecode });
  assert.ok(crowd.numFrames >= 2);
  assert.ok(inkCount(crowd.renderFrame(1)) > 100);
}
const genesis95 = romIf('/tmp/disasm/NHL95Genesis/lst/nhl95.bin');
if (genesis95) {
  const logo = g95.images.find((image) => image.id === 'logoANA.map.jim');
  const drawn = decodeJim(genesis95.subarray(logo.start, logo.end));
  assert.ok(inkCount(drawn.renderFrame(1)) > 20);
  const card = g95.images.find((image) => image.group === 'Players' && image.paletteAt);
  const portrait = decodeJim(
    genesis95.subarray(card.start, card.end),
    genesis95.subarray(card.paletteAt, card.paletteAt + 128)
  );
  assert.ok(inkCount(portrait.renderFrame(1)) > 20);
  assert.deepStrictEqual(portrait.combined[6], [0, 0, 0]);
}
const revA93 = romIf(path.join(root, '..', 'JIM-Tools', 'nhlpa93retailRevA.bin'));
if (revA93) {
  assert.strictEqual(revA93.slice(0x118, 0x120).toString('ascii'), '1992.OCT');
  const adjusted = revAAdjust(pa93, '1992.OCT');
  assert.strictEqual(adjusted.sheet.sprites, pa93.sheet.sprites + 0x2E);
  assert.strictEqual(adjusted.sheet.hotlist, pa93.sheet.hotlist + 0x2E);
  assert.strictEqual(adjusted.images[0].start, pa93.images[0].start + 0x2E);
  assert.strictEqual(revAAdjust(pa93, '1992.JUL').sheet.sprites, pa93.sheet.sprites);
  const sheet = parseSheet(revA93, adjusted.sheet);
  assert.ok(sheet.numFrames > 100);
  assert.ok(renderFrame(sheet, 1).pixels.some((pixel) => pixel));
  const ice = adjusted.images.find((image) => image.id === 'IceRink.map.jim');
  const rink = decodeJim(revA93.subarray(ice.start, ice.end));
  assert.ok(rink.renderFrame(1).width > 64);
  assert.ok(inkCount(rink.renderFrame(1)) > 100);
  const crowdSpec = adjusted.images.find((image) => image.id === 'Crowd.anim');
  const crowd = openFrames(revA93.subarray(crowdSpec.start, crowdSpec.end), { decompressBytecode });
  assert.ok(crowd.numFrames >= 2);
  assert.ok(inkCount(crowd.renderFrame(1)) > 100);
}
const retail93 = romIf('/tmp/snes/93/lst/nhlpa93snes.bin');
if (retail93) {
  const drawn = parse93(retail93, GAMES.find((game) => game.id === 'nhlpa93snes').snes);
  assert.strictEqual(drawn.numFrames, 720);
  const first = drawn.renderFrame(1);
  assert.strictEqual(first.hotspotX, -4);
  assert.strictEqual(first.hotspotY, -20);
  assert.ok(first.pixels.some((pixel) => pixel));
  const snesGame = GAMES.find((game) => game.id === 'nhlpa93snes');
  const title = openImage(retail93, snesGame.images[0], null, null);
  assert.strictEqual(title.renderFrame(1).width, 256);
  const face = openImage(retail93, snesGame.images.find((image) => image.id === 'faceoff'), null, null);
  assert.strictEqual(face.renderFrame(1).width, 96);
  assert.strictEqual(face.renderFrame(1).height, 80);
  const framer = openImage(retail93, snesGame.images.find((image) => image.id === 'framer'), null, null);
  assert.strictEqual(framer.renderFrame(1).width, 24);
  assert.strictEqual(framer.renderFrame(1).height, 24);
  const blocks = openImage(retail93, snesGame.images.find((image) => image.id === 'teamblocks'), null, null);
  assert.strictEqual(blocks.numFrames, 26);
  assert.strictEqual(blocks.renderFrame(1).width, 72);
  const playoff = openImage(retail93, snesGame.images.find((image) => image.id === 'playoff'), null, null);
  assert.strictEqual(playoff.renderFrame(1).width, 96);
  assert.strictEqual(playoff.renderFrame(1).height, 184);
}
const retail94 = romIf('/tmp/snes/94/lst/nhl94snes.sfc');
if (retail94) {
  const game = GAMES.find((item) => item.id === 'nhl94snes');
  const drawn = parse94(retail94, game.snes);
  assert.strictEqual(drawn.numFrames, 976);
  assert.ok(drawn.renderFrame(2).pixels.some((pixel) => pixel));
  const rink = openImage(retail94, game.images.find((image) => image.id === 'rink'), game.snes, null);
  assert.strictEqual(rink.renderFrame(1).width, 384);
  assert.strictEqual(rink.renderFrame(1).height, 904);
  const logos = openImage(retail94, game.images.find((image) => image.id === 'logos'), game.snes, null);
  assert.strictEqual(logos.numFrames, 30);
  const bruins = logos.renderFrame(1);
  assert.ok(bruins.pixels.some((pixel) => pixel));
  assert.ok(bruins.colors.some((rgb) => rgb[0] !== rgb[1] || rgb[1] !== rgb[2]));
  const title = openImage(retail94, game.images.find((image) => image.id === 'title'), game.snes, null);
  assert.strictEqual(title.numFrames, 13);
  assert.ok(title.renderFrame(1).pixels.some((pixel) => pixel));
  const easports = openImage(retail94, game.images.find((image) => image.id === 'easports'), game.snes, null);
  assert.strictEqual(easports.renderFrame(1).width, 256);
  assert.strictEqual(easports.renderFrame(1).height, 224);
  const letters = openImage(retail94, game.images.find((image) => image.id === 'letters'), game.snes, null);
  assert.strictEqual(letters.numFrames, 26);
  const small = openImage(retail94, game.images.find((image) => image.id === 'smallletters'), game.snes, null);
  assert.strictEqual(small.numFrames, 37);
  const center = openImage(retail94, game.images.find((image) => image.id === 'center'), game.snes, null);
  assert.strictEqual(center.numFrames, 28);
  const shield = center.renderFrame(27);
  assert.strictEqual(shield.width, 48);
  assert.strictEqual(shield.height, 32);
  assert.ok(shield.pixels.some((pixel) => pixel));
}

function spitHeader(type, width, height, xOffset, yOffset, xPos, yPos) {
  const header = Buffer.alloc(16);
  header[0] = type;
  header.writeInt16LE(width, 4);
  header.writeInt16LE(height, 6);
  header.writeInt16LE(xOffset, 8);
  header.writeInt16LE(yOffset, 10);
  header.writeInt16LE(xPos, 12);
  header.writeInt16LE(yPos, 14);
  return header;
}

const rleSpit = Buffer.concat([
  spitHeader(0, 4, 1, 0, 0, 5, 6),
  Buffer.from([3, 9, 0xFF, 8, 0])
]);
const rle = pc95.decodeSpit(rleSpit);
assert.deepStrictEqual(Array.from(rle.pixels), [9, 9, 9, 8]);
assert.strictEqual(rle.xPos, 5);
assert.strictEqual(rle.yPos, 6);

const rawSpit = Buffer.concat([
  spitHeader(123, 2, 2, -1, 16, 0, 0),
  Buffer.from([1, 2, 3, 4])
]);
const raw = pc95.decodeSpit(rawSpit);
assert.deepStrictEqual(Array.from(raw.pixels), [1, 2, 3, 4]);
assert.strictEqual(raw.xOffset, -1);
assert.strictEqual(raw.yOffset, 16);

const shortPack = Buffer.from([
  0x10, 0xFB, 0x00, 0x00, 0x06,
  0x03, 0x02, 0x61, 0x62, 0x63,
  0xFC
]);
assert.strictEqual(Buffer.from(pc95.decompressRefPack(shortPack)).toString('ascii'), 'abcabc');

const sizedPack = Buffer.from([
  0x11, 0xFB, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x04,
  0xE0, 0x41, 0x42, 0x43, 0x44,
  0xFC
]);
assert.strictEqual(Buffer.from(pc95.decompressRefPack(sizedPack)).toString('ascii'), 'ABCD');

const mediumPack = Buffer.from([
  0x10, 0xFB, 0x00, 0x00, 0x08,
  0xE0, 0x61, 0x62, 0x63, 0x64,
  0x80, 0x00, 0x03,
  0xFC
]);
assert.strictEqual(Buffer.from(pc95.decompressRefPack(mediumPack)).toString('ascii'), 'abcdabcd');

const longPack = Buffer.from([
  0x10, 0xFB, 0x00, 0x00, 0x06,
  0xC1, 0x00, 0x00, 0x00, 0x5A,
  0xFC
]);
assert.strictEqual(Buffer.from(pc95.decompressRefPack(longPack)).toString('ascii'), 'ZZZZZZ');

function shapeBank(tag, spit) {
  const bank = Buffer.alloc(24 + spit.length);
  bank.write('SHPP', 0);
  bank.writeUInt32LE(bank.length, 4);
  bank.writeUInt32LE(1, 8);
  bank.write('DIR ', 12);
  bank.write(tag, 16);
  bank.writeUInt32LE(24, 20);
  spit.copy(bank, 24);
  return bank;
}

const packedBank = Buffer.concat([
  Buffer.from([0x10, 0xFB, 0x00, 0x00, 0x2C, 0xEA]),
  shapeBank('0000', rawSpit),
  Buffer.from([0xFC])
]);
assert.strictEqual(shapeBank('0000', rawSpit).length, 0x2C);
const shpiBank = Buffer.from(shapeBank('0000', rawSpit));
shpiBank.write('SHPI', 0);
const shpiShapes = pc95.openBytes(shpiBank);
assert.strictEqual(shpiShapes.shapes.length, 1);
assert.strictEqual(shpiShapes.shapes[0].tag, '0000');
assert.deepStrictEqual(Array.from(shpiShapes.shapes[0].pixels), [1, 2, 3, 4]);

const packedShapes = pc95.openBytes(packedBank);
assert.strictEqual(packedShapes.shapes.length, 1);
assert.strictEqual(packedShapes.shapes[0].tag, '0000');
assert.deepStrictEqual(Array.from(packedShapes.shapes[0].pixels), [1, 2, 3, 4]);

const spriteBundle = pc95.encodeBundle([
  { name: 'sprites/000', data: rawSpit },
  { name: 'players.ppv', data: shapeBank('0005', rawSpit) }
]);
const spriteAnim = pc95.openSpriteBundle(spriteBundle);
assert.strictEqual(spriteAnim.numFrames, 1134);
assert.deepStrictEqual(Array.from(spriteAnim.renderFrame(1).pixels), [1, 2, 3, 4]);
assert.strictEqual(spriteAnim.renderFrame(1).minX, 1);
assert.strictEqual(spriteAnim.renderFrame(1).minY, -16);
assert.strictEqual(spriteAnim.renderFrame(1).hotspotX, -4);
assert.strictEqual(spriteAnim.renderFrame(1).hotspotY, -20);
assert.strictEqual(spriteAnim.renderFrame(1).transparent, 255);
assert.strictEqual(spriteAnim.renderFrame(1).dynamic, true);
assert.strictEqual(spriteAnim.renderFrame(6).tag, '0005');
assert.strictEqual(spriteAnim.renderFrame(2).width, 0);

const numbered = [];
for (let i = 0; i < 200; i++) numbered.push({ tag: String(i).padStart(4, '0') });
assert.strictEqual(pc95.isSpriteBank({ shapes: numbered }, 'bank.ppv'), false);
assert.strictEqual(pc95.isSpriteBank({ shapes: numbered.slice(0, 50) }, '000_049.PPV'), true);
assert.strictEqual(pc95.isSpriteBank({ shapes: numbered.slice(0, 50) }, '10001049.PPV'), true);
assert.strictEqual(pc95.isRinkBank({ shapes: numbered.slice(0, 50) }, 'F000_049.PPV'), true);
assert.strictEqual(pc95.isRinkBank({ shapes: numbered.slice(0, 105) }, 'F000_149.PPV'), true);
assert.strictEqual(pc95.isSpriteBank({ shapes: numbered.slice(0, 105) }, 'F000_149.PPV'), false);
assert.strictEqual(pc95.isSpriteBank({ shapes: [] }, 'sprites.ppv'), true);

const playerSheet = pc95.encodeBundle([
  { name: '000_049.PPV', data: shapeBank('0000', rawSpit) },
  { name: '050_099.PPV', data: shapeBank('0000', rawSpit) },
  { name: '11001149.PPV', data: shapeBank('1100', rawSpit) }
]);
const sheets = pc95.openSpriteBundle(playerSheet);
assert.strictEqual(sheets.numFrames, 1134);
assert.strictEqual(sheets.renderFrame(1).tag, '0000');
assert.strictEqual(sheets.renderFrame(51).tag, '0000');
assert.strictEqual(sheets.renderFrame(51).index, 50);
assert.strictEqual(sheets.renderFrame(1101).tag, '1100');
assert.strictEqual(sheets.renderFrame(2).width, 0);

const wide = Buffer.from(rawSpit);
wide[16] = 9;
const crowd = pc95.encodeBundle([
  { name: 'F000_149.PPV', data: shapeBank('0000', wide) },
  { name: 'F000_049.PPV', data: shapeBank('0000', rawSpit) },
  { name: 'F050_099.PPV', data: shapeBank('F050', rawSpit) }
]);
const crowdAnimPc = pc95.openSpriteBundle(crowd);
assert.strictEqual(crowdAnimPc.numFrames, 51);
assert.strictEqual(crowdAnimPc.renderFrame(1).tag, '0000');
assert.strictEqual(crowdAnimPc.renderFrame(1).dynamic, false);
assert.strictEqual(crowdAnimPc.renderFrame(1).hotspotX, 0);
assert.deepStrictEqual(Array.from(crowdAnimPc.renderFrame(1).pixels), [1, 2, 3, 4]);
assert.strictEqual(crowdAnimPc.renderFrame(51).tag, 'F050');
assert.strictEqual(crowdAnimPc.renderFrame(51).index, 50);

const team = Buffer.alloc(448);
team[0] = 10;
team[1] = 20;
team[2] = 30;
team[336] = 128;
const rink = [];
for (let i = 0; i < 128; i++) rink.push([i, 0, 1]);
const teamColors = pc95.buildTeamPalette(team, rink);
const jerseyAct = fs.readFileSync(path.join(root, '..', 'PAL-To-ACT', 'createjerseyShadowfixed.act'));
const rinkAct = fs.readFileSync(path.join(root, '..', 'PAL-To-ACT', 'rinkpal.act'));
function actAt(buf, index) {
  return [buf[index * 3], buf[index * 3 + 1], buf[index * 3 + 2]];
}
assert.deepStrictEqual(teamColors[0], actAt(jerseyAct, 0));
assert.deepStrictEqual(teamColors[143], actAt(jerseyAct, 143));
assert.deepStrictEqual(teamColors[144], [40, 80, 120]);
assert.deepStrictEqual(teamColors.game[128], [40, 80, 120]);
assert.deepStrictEqual(teamColors.game[0], actAt(rinkAct, 0));
assert.deepStrictEqual(teamColors.game[251], actAt(rinkAct, 251));
assert.deepStrictEqual(teamColors.game[255], actAt(rinkAct, 255));
assert.strictEqual(pc95.hotspotFor(0).x, -4);
assert.strictEqual(pc95.hotspotFor(0).y, -20);
assert.strictEqual(pc95.frameIsDynamic(1), true);
assert.strictEqual(pc95.frameIsDynamic(394), false);
assert.strictEqual(pc95.frameIsDynamic(650), false);

const pcCatalog = parseFrames(fs.readFileSync(path.join(root, 'data', 'frames95pc.asm'), 'utf8'));
assert.strictEqual(pcCatalog.anims.length, 119);
const pcReady = pcCatalog.anims.find((anim) => anim.name.toLowerCase() === 'spagready');
assert.ok(pcReady.loop);
assert.strictEqual(pcReady.directions[0].steps[0].frame, 407);
const pcSkate = pcCatalog.anims.find((anim) => anim.name.toLowerCase() === 'spaskatewp');
assert.strictEqual(pcSkate.directions[0].steps[0].frame, 2);
assert.strictEqual(pcCatalog.anims[pcCatalog.anims.length - 1].name.toLowerCase(), 'sparefhistick');
assert.ok(!pcCatalog.spfs.some((spf) => spf.name.toLowerCase() === 'spflimit'));
let cursor = 1;
for (const spf of pcCatalog.spfs) {
  assert.strictEqual(spf.start, cursor, spf.name);
  cursor = spf.end + 1;
}
assert.strictEqual(cursor, 1135);
assert.strictEqual(pcCatalog.spfs[0].name, 'SPFskaters');
assert.strictEqual(pcCatalog.spfs[0].end, 352);
assert.strictEqual(pcCatalog.spfs.find((spf) => spf.name === 'SPFref95').start, 1129);
assert.strictEqual(pcCatalog.spfs.find((spf) => spf.name === 'SPFbenchcheck').group, 'Players');
assert.strictEqual(pcCatalog.spfs.find((spf) => spf.name === 'SPFref').group, 'Other');
assert.ok(pcCatalog.spfs.find((spf) => spf.name === 'SPFskaters').blurb.includes('000-351'));

const pcGame = GAMES.find((game) => game.id === 'nhl95pc');
assert.strictEqual(pcGame.kind, 'pc95');
assert.strictEqual(pcGame.paletteKind, 'pc');
assert.strictEqual(pcGame.jerseyRow, 9);
assert.strictEqual(defaultPaletteFile(['bosh.pal', 'bufh.pal', 'bufv.pal']), 'bufh.pal');

const pcDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pc95-'));
fs.mkdirSync(path.join(pcDir, 'sprites'));
fs.writeFileSync(path.join(pcDir, 'sprites', '000'), rawSpit);
fs.writeFileSync(path.join(pcDir, 'LOGO.QFS'), packedBank);
fs.writeFileSync(path.join(pcDir, '000_049.PPV'), shapeBank('0000', rawSpit));
fs.writeFileSync(path.join(pcDir, '050_099.PPV'), shapeBank('0055', rawSpit));
fs.writeFileSync(path.join(pcDir, 'F000_049.PPV'), shapeBank('0000', rawSpit));
fs.writeFileSync(path.join(pcDir, 'F050_099.PPV'), shapeBank('0050', rawSpit));
fs.writeFileSync(path.join(pcDir, 'CREDIT00.QFS'), packedBank);
fs.writeFileSync(path.join(pcDir, 'CREDIT01.QFS'), shapeBank('0001', rawSpit));
fs.writeFileSync(path.join(pcDir, 'JERBUFH.QFS'), packedBank);
const home = Buffer.alloc(28 * 448);
home.set(team, 448);
fs.writeFileSync(path.join(pcDir, 'HOMEPALS.BIN'), home);
const listed = pc95.catalogDirectory(pcDir);
assert.deepStrictEqual(listed.spriteFiles, ['000_049.PPV', 'sprites/000', '050_099.PPV']);
assert.deepStrictEqual(listed.rinkFiles, ['F000_049.PPV', 'F050_099.PPV']);
const credits = listed.images.find((image) => image.label === 'Credits');
assert.ok(credits);
assert.deepStrictEqual(credits.files, ['CREDIT00.QFS', 'CREDIT01.QFS']);
assert.strictEqual(credits.palette, '');
const buffalo = listed.images.find((image) => image.id === 'JERBUFH.QFS');
assert.strictEqual(buffalo.label, 'Buffalo home jersey');
assert.strictEqual(buffalo.group, 'Jerseys');
assert.ok(listed.images.some((image) => image.id === 'LOGO.QFS'));
const joined = pc95.openImageParts([
  { name: 'CREDIT00.QFS', data: fs.readFileSync(path.join(pcDir, 'CREDIT00.QFS')) },
  { name: 'CREDIT01.QFS', data: fs.readFileSync(path.join(pcDir, 'CREDIT01.QFS')) }
]);
assert.strictEqual(joined.numFrames, 2);
if (fs.existsSync('/tmp/nhl95all/EMBBOS.QFS')) {
  const live = pc95.catalogDirectory('/tmp/nhl95all');
  const bos = live.images.find((image) => /EMBBOS/i.test(image.id));
  assert.ok(bos && /EMBPAL\.QFS$/i.test(bos.palette));
  const goal = live.images.find((image) => /GOAL\.PPV$/i.test(image.id));
  assert.strictEqual(goal.group, 'Jumbotron');
  const titles = live.images.find((image) => /CTTITLE\.QFS$/i.test(image.id));
  assert.ok(titles && /CTBKGD\.QFS$/i.test(titles.palette));
  const bar = live.images.find((image) => /PSTATBAR\.QFS$/i.test(image.id));
  assert.ok(bar && /PREZ2\.QFS$/i.test(bar.palette));
  const desk = live.images.find((image) => /EADESK0/i.test(image.id));
  const parts = desk.files.map((rel) => ({
    name: rel,
    data: fs.readFileSync(path.join('/tmp/nhl95all', rel))
  }));
  const opened = pc95.openImageParts(parts);
  assert.ok(opened.numFrames >= 3);
  assert.notDeepStrictEqual(opened.renderFrame(1).colors[1], opened.renderFrame(2).colors[1]);
}
assert.strictEqual(joined.renderFrame(2).tag, '0001');
assert.strictEqual(listed.hasHome, true);
assert.ok(listed.paletteNames.includes('bufh.pal'));
assert.ok(!listed.paletteNames.includes('bufv.pal'));

console.log('catalog', catalog.spfs.length, 'SPF groups,', catalog.anims.length, 'SPA animations');
console.log('banks', {
  sprites: spritesAnim.numFrames,
  puck: puckAnim.numFrames,
  zam: zamAnim.numFrames,
  crowd: crowdAnim.numFrames
});
console.log('parse-frames and small ANIM banks match ANIM-To-BMP');
