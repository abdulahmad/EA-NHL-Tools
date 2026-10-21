/**
 * Crowd.anim over the rink (Nhl92Anim.crowdOnRink): every frame is the rink's crowd area with that frame's tiles laid on
 * it in rink-map pixels. Needs roms/nhl92.bin (not in the repo); skips without it.
 *
 *   node test-crowd.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const A = require('./lib/anim');
const J = require('./lib/jim');
const romPath = path.join(__dirname, 'roms', 'nhl92.bin');
if (!fs.existsSync(romPath)) { console.log('test-crowd: no roms/nhl92.bin, skipped'); process.exit(0); }
const rom = fs.readFileSync(romPath);
const rink = J.decodeJim(rom.subarray(0x33AAE, 0x3A3DC));
const rf = rink.renderFrame(1);
const crowd = A.parseAnim(rom.subarray(0x7216C, 0x75790));
const on = A.crowdOnRink(crowd, rf, rink.combined);
assert.strictEqual(on.numFrames, 62);
let changed = 0;
for (let n = 1; n <= on.numFrames; n++) {
  const f = on.renderFrame(n);
  assert.strictEqual(f.width, rf.width);
  assert.ok(f.height <= rf.height && f.colors.length === 128);
  const own = A.renderFrame(crowd, n);
  // each crowd pixel lands at its rink position with a crowd colour; everything else is the rink
  for (let y = 0; y < own.height; y++) for (let x = 0; x < own.width; x++) {
    const p = own.pixels[y * own.width + x];
    const at = (own.minY + y) * f.width + own.minX + x;
    if (p) assert.strictEqual(f.pixels[at], 64 + p);
  }
  for (let i = 0; i < f.pixels.length; i++) if (f.pixels[i] >= 64) changed++;
}
assert.ok(changed > 1000, 'crowd tiles drawn: ' + changed);
console.log('test-crowd: 62 Crowd.anim frames over the rink OK');
