/**
 * Decode the player sprite sheet in an NHLPA 93, NHL 94 or NHL 95 ROM.
 *
 * The result matches what parseAnim returns, so renderFrame can draw it.
 * Record layouts follow addframe2:
 *   93/94  X word, Y word, tile word, attribute byte, size byte
 *   95     Y word, size/tile-high, tile/flags, X word  (same as NHL 92)
 * HotList is a signed byte pair per frame, indexed by frame * 2.
 */
(function (root, factory) {
  const anim = typeof module === 'object' && module.exports ? require('./anim') : root.Nhl92Anim;
  const api = factory(anim);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Nhl92Sheet = api;
})(typeof self !== 'undefined' ? self : this, function (anim) {
  const DIMENSIONS = anim.DIMENSIONS;
  const SIZE_TAB = anim.SIZE_TAB;

  function spriteFields(sizeIndex, tileIndex, hFlip, vFlip, paletteIndex, priority, xpos, ypos) {
    return {
      xpos,
      ypos,
      sizeIndex,
      tileCount: SIZE_TAB[sizeIndex],
      dimensions: DIMENSIONS[sizeIndex],
      tileIndex,
      hFlip,
      vFlip,
      paletteIndex,
      priority
    };
  }

  function parse94Sprite(view, offset) {
    const xpos = view.getInt16(offset);
    const ypos = view.getInt16(offset + 2);
    const tileIndex = view.getUint16(offset + 4);
    const flags = view.getUint8(offset + 6);
    const sizeIndex = view.getUint8(offset + 7) & 0x0f;
    return spriteFields(
      sizeIndex,
      tileIndex,
      (flags >>> 3) & 1,
      (flags >>> 4) & 1,
      (flags >>> 5) & 3,
      (flags >>> 7) & 1,
      xpos,
      ypos
    );
  }

  function parse95Sprite(view, offset) {
    const ypos = view.getInt16(offset);
    const sizetab = view.getUint16(offset + 2);
    const tileLoc = view.getUint16(offset + 4);
    const xpos = view.getInt16(offset + 6);
    const sizeIndex = (sizetab >>> 8) & 0x0f;
    return spriteFields(
      sizeIndex,
      ((sizetab & 0xf000) >>> 1) | (tileLoc & 0x07ff),
      (tileLoc >>> 11) & 1,
      (tileLoc >>> 12) & 1,
      (tileLoc >>> 13) & 3,
      (tileLoc >>> 15) & 1,
      xpos,
      ypos
    );
  }

  function signedByte(value) {
    return (value << 24) >> 24;
  }

  function decodeCram(view, offset) {
    const colors = [];
    for (let i = 0; i < 16; i++) {
      const color = view.getUint16(offset + i * 2);
      const blue = (color >> 9) & 7;
      const green = (color >> 5) & 7;
      const red = (color >> 1) & 7;
      colors.push([anim.expandChannel(red), anim.expandChannel(green), anim.expandChannel(blue)]);
    }
    return colors;
  }

  function parseSheet(buffer, profile) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const base = profile.sprites;
    if (base + 8 > bytes.length) throw new Error('ROM is shorter than the sprite header');
    const table = base + view.getUint32(base + 4);
    const tileStart = base + 0x0a;
    if (table <= tileStart || table > bytes.length) {
      throw new Error('frame table offset points outside the tile bank');
    }
    const bounds = view.getUint16(table + profile.boundsAt);
    const maxFrame = Math.floor((bounds - 1) / 2);
    const readSprite = profile.record === '95' ? parse95Sprite : parse94Sprite;
    const frames = [];
    for (let frame = 1; frame <= maxFrame; frame++) {
      const wordAt = table + frame * 2;
      if (wordAt + 4 > bytes.length) break;
      const start = view.getUint16(wordAt);
      const next = view.getUint16(wordAt + 2);
      const span = next - start;
      if (span < 0 || span % 8 !== 0 || span / 8 > 40) break;
      const count = span / 8;
      const data = table + start;
      if (data + count * 8 > bytes.length) break;
      const sprites = [];
      for (let s = 0; s < count; s++) sprites.push(readSprite(view, data + s * 8));
      let minX = 0;
      let minY = 0;
      let maxX = 1;
      let maxY = 1;
      for (const sprite of sprites) {
        const w = sprite.dimensions.width * 8;
        const h = sprite.dimensions.height * 8;
        if (sprite.xpos < minX) minX = sprite.xpos;
        if (sprite.ypos < minY) minY = sprite.ypos;
        if (sprite.xpos + w > maxX) maxX = sprite.xpos + w;
        if (sprite.ypos + h > maxY) maxY = sprite.ypos + h;
      }
      const hotAt = profile.hotlist + frame * 2;
      const hotspotX = hotAt + 1 < bytes.length ? signedByte(bytes[hotAt]) : 0;
      const hotspotY = hotAt + 1 < bytes.length ? signedByte(bytes[hotAt + 1]) : 0;
      frames.push({
        frame,
        index: frame - 1,
        header: 'SS',
        numSprites: count,
        canvasWidth: Math.max(1, maxX - minX),
        canvasHeight: Math.max(1, maxY - minY),
        hotspotX,
        hotspotY,
        sprites
      });
    }
    if (!frames.length) throw new Error('sprite sheet has no frames');
    const palettes = [];
    for (let p = 0; p < 4; p++) palettes.push(decodeCram(view, profile.palette + p * 32));
    return {
      fileType: 'SH',
      numFrames: frames.length,
      unknownCount: 0,
      numTiles: Math.floor((table - tileStart) / 32),
      frames,
      palettes,
      combined: palettes.flat(),
      tileBytes: bytes.subarray(tileStart, table)
    };
  }

  // Crowd, faceoff, zamboni and the title sprites are a packed (or raw) tile
  // bank plus a word table of frame offsets. Frame 0 is unused. Sprite bytes
  // are the 93/94 record: X, Y, tile, flags, size.
  function openFrames(buffer, jim, donorPalette, options) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 16 || !jim) throw new Error('Frame bank is too small');
    const record = (options && options.record) || '94';
    const readSprite = record === '95' ? parse95Sprite : parse94Sprite;
    const maxSpritesPerFrame = record === '95' ? 96 : 48;
    const noPalette = view.getUint32(0) === 0xffffffff;
    const palOff = noPalette ? 0 : view.getUint32(0);
    const table = view.getUint32(4);
    const tileWord = view.getUint16(8);
    const tiles = tileWord & 0x7fff;
    if (!tiles || tiles > 4096 || table < 12 || table >= bytes.length) throw new Error('Frame bank header is not usable');
    const tileBytes = (tileWord & 0x8000)
      ? jim.decompressBytecode(bytes, 10, tiles * 32)
      : bytes.subarray(10, 10 + tiles * 32);
    if (tileBytes.length < tiles * 32) throw new Error('Frame bank tiles are short');
    const frames = [];
    for (let frame = 1; frame < 128; frame++) {
      const wordAt = table + frame * 2;
      if (wordAt + 4 > bytes.length) break;
      const start = view.getUint16(wordAt);
      const next = view.getUint16(wordAt + 2);
      const span = next - start;
      if (span <= 0 || span % 8 !== 0 || span / 8 > maxSpritesPerFrame) break;
      if (start < (frame + 2) * 2) break;
      const data = table + start;
      const count = span / 8;
      if (data + count * 8 > bytes.length) break;
      const sprites = [];
      for (let s = 0; s < count; s++) sprites.push(readSprite(view, data + s * 8));
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const sprite of sprites) {
        const w = sprite.dimensions.width * 8;
        const h = sprite.dimensions.height * 8;
        if (sprite.xpos < minX) minX = sprite.xpos;
        if (sprite.ypos < minY) minY = sprite.ypos;
        if (sprite.xpos + w > maxX) maxX = sprite.xpos + w;
        if (sprite.ypos + h > maxY) maxY = sprite.ypos + h;
      }
      if (!sprites.length || minX === Infinity) break;
      frames.push({
        frame,
        index: frame - 1,
        header: 'SS',
        numSprites: count,
        canvasWidth: Math.max(1, maxX - minX),
        canvasHeight: Math.max(1, maxY - minY),
        hotspotX: 0,
        hotspotY: 0,
        sprites
      });
    }
    if (!frames.length) throw new Error('Frame bank has no frames');
    const colors = [];
    const donor = donorPalette
      ? (donorPalette instanceof Uint8Array ? donorPalette : new Uint8Array(donorPalette))
      : null;
    if (!noPalette && palOff + 128 <= bytes.length && palOff !== table) {
      for (let p = 0; p < 4; p++) colors.push.apply(colors, decodeCram(view, palOff + p * 32));
    } else if (donor && donor.length >= 128 && anim && anim.decodePaletteFile) {
      for (let p = 0; p < 4; p++) colors.push.apply(colors, anim.decodePaletteFile(donor.subarray(p * 32, (p + 1) * 32)));
    } else {
      for (let i = 0; i < 64; i++) {
        const ramp = i === 0 ? 0 : 32 + ((i * 37) % 224);
        colors.push([ramp, (i * 53) % 256, (i * 17) % 256]);
      }
    }
    return {
      fileType: 'FR',
      numFrames: frames.length,
      picture: false,
      frames,
      palettes: [],
      combined: colors,
      tileBytes: tileBytes.subarray(0, tiles * 32),
      renderFrame: function (frameNumber) { return anim.renderFrame(this, frameNumber); }
    };
  }

  return { parseSheet, parse94Sprite, parse95Sprite, openFrames };
});
