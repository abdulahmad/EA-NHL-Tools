const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { parseFrames } = require('./lib/parse-frames');
const { parseAnim, renderFrame } = require('./lib/anim');

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

console.log('catalog', catalog.spfs.length, 'SPF groups,', catalog.anims.length, 'SPA animations');
console.log('banks', {
  sprites: spritesAnim.numFrames,
  puck: puckAnim.numFrames,
  zam: zamAnim.numFrames,
  crowd: crowdAnim.numFrames
});
console.log('parse-frames and small ANIM banks match ANIM-To-BMP');
