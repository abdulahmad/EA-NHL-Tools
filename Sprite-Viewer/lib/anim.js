/**
 * Decode an NHL 92 Genesis .ANIM file (Alice animation).
 *
 * Layout is documented in ANIM-To-BMP/README.md and matched to the
 * blit in animToBmp.js: 4bpp tiles, column-major within a sprite,
 * nibble 0 transparent, four 16-color Genesis CRAM palettes.
 *
 * Frame numbers are 1-based, the same values SPF symbols use.
 * The canvas size is the int16 pair at 0x06 and 0x08, each stored as
 * twice the pixel size. The registration offset is SprStrhot+12/+14
 * (file offsets 0x18 and 0x1A), which GetHot in logic.asm reads.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92Anim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SIZE_TAB = [1, 2, 3, 4, 2, 4, 6, 8, 3, 6, 9, 12, 4, 8, 12, 16];
  const DIMENSIONS = [
    { width: 1, height: 1 }, { width: 1, height: 2 }, { width: 1, height: 3 }, { width: 1, height: 4 },
    { width: 2, height: 1 }, { width: 2, height: 2 }, { width: 2, height: 3 }, { width: 2, height: 4 },
    { width: 3, height: 1 }, { width: 3, height: 2 }, { width: 3, height: 3 }, { width: 3, height: 4 },
    { width: 4, height: 1 }, { width: 4, height: 2 }, { width: 4, height: 3 }, { width: 4, height: 4 }
  ];

  function expandChannel(c) {
    // Spread the 3-bit CRAM channel across 8 bits (0 → 0, 7 → 255).
    return (c << 5) | (c << 2) | (c >> 1);
  }

  function decodeCram(view, offset) {
    const colors = [];
    for (let i = 0; i < 16; i++) {
      const color = view.getUint16(offset + i * 2);
      const blue = (color >> 9) & 7;
      const green = (color >> 5) & 7;
      const red = (color >> 1) & 7;
      colors.push([expandChannel(red), expandChannel(green), expandChannel(blue)]);
    }
    return colors;
  }

  function parseSprite(view, offset) {
    const ypos = view.getInt16(offset);
    const sizetab = view.getUint16(offset + 2);
    const tileLoc = view.getUint16(offset + 4);
    const xpos = view.getInt16(offset + 6);
    const sizeIndex = (sizetab >>> 8) & 0xf;
    return {
      xpos,
      ypos,
      sizeIndex,
      tileCount: SIZE_TAB[sizeIndex],
      dimensions: DIMENSIONS[sizeIndex],
      tileIndex: ((sizetab & 0xf000) >>> 1) | (tileLoc & 0x07ff),
      hFlip: (tileLoc >>> 11) & 1,
      vFlip: (tileLoc >>> 12) & 1,
      paletteIndex: (tileLoc >>> 13) & 3,
      priority: (tileLoc >>> 15) & 1
    };
  }

  function parseAnim(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 6) throw new Error('ANIM file is too small');
    const fileType = String.fromCharCode(bytes[0], bytes[1]);
    if (fileType !== 'AA') throw new Error('expected Alice "AA" header, got ' + fileType);
    const numFrames = view.getInt16(2) + 1;
    const unknownCount = view.getInt16(4) + 1;
    const frames = [];
    let cursor = 6;
    for (let n = 0; n < numFrames; n++) {
      if (cursor + 38 > bytes.length) throw new Error('frame ' + (n + 1) + ' header runs past end of file');
      const header = String.fromCharCode(bytes[cursor], bytes[cursor + 1]);
      const numSprites = view.getInt16(cursor + 0x24) + 1;
      const sprites = [];
      const spriteBase = cursor + 0x26;
      for (let s = 0; s < numSprites; s++) {
        sprites.push(parseSprite(view, spriteBase + s * 8));
      }
      frames.push({
        frame: n + 1,
        index: n,
        header,
        numSprites,
        canvasWidth: view.getInt16(cursor + 0x06) / 2,
        canvasHeight: view.getInt16(cursor + 0x08) / 2,
        hotspotX: view.getInt16(cursor + 0x18),
        hotspotY: view.getInt16(cursor + 0x1a),
        sprites
      });
      cursor = spriteBase + numSprites * 8;
    }
    const tileHeader = String.fromCharCode(bytes[cursor], bytes[cursor + 1]);
    if (tileHeader !== 'CC') throw new Error('expected "CC" tile header at ' + cursor + ', got ' + tileHeader);
    const numTiles = view.getUint16(cursor + 2);
    const tileStart = cursor + 4;
    const tileBytes = bytes.subarray(tileStart, tileStart + numTiles * 32);
    if (tileBytes.length !== numTiles * 32) throw new Error('tile data is truncated');
    let palCursor = tileStart + numTiles * 32;
    const palHeader = String.fromCharCode(bytes[palCursor], bytes[palCursor + 1]);
    if (palHeader !== 'PP') throw new Error('expected "PP" palette header, got ' + palHeader);
    palCursor += 2;
    const palettes = [];
    for (let p = 0; p < 4; p++) {
      palettes.push(decodeCram(view, palCursor));
      palCursor += 32;
    }
    const combined = palettes.flat();
    return {
      fileType,
      numFrames,
      unknownCount,
      numTiles,
      frames,
      palettes,
      combined,
      tileBytes
    };
  }

  function decodePaletteFile(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length !== 32) throw new Error('palette file must be 32 bytes, got ' + bytes.length);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return decodeCram(view, 0);
  }

  function renderFrame(anim, frameNumber) {
    const meta = anim.frames[frameNumber - 1];
    if (!meta) throw new Error('frame ' + frameNumber + ' is out of range');
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const sprite of meta.sprites) {
      const w = sprite.dimensions.width * 8;
      const h = sprite.dimensions.height * 8;
      if (sprite.xpos < minX) minX = sprite.xpos;
      if (sprite.ypos < minY) minY = sprite.ypos;
      if (sprite.xpos + w > maxX) maxX = sprite.xpos + w;
      if (sprite.ypos + h > maxY) maxY = sprite.ypos + h;
    }
    if (!meta.sprites.length) {
      return {
        ...meta,
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        offsetX: 0,
        offsetY: 0,
        pixels: new Uint8Array(0),
        hotspotPxX: meta.hotspotX,
        hotspotPxY: meta.hotspotY
      };
    }
    const offsetX = -minX;
    const offsetY = -minY;
    const width = maxX - minX;
    const height = maxY - minY;
    const pixels = new Uint8Array(width * height);
    const tiles = anim.tileBytes;
    for (const sprite of meta.sprites) {
      const dim = sprite.dimensions;
      let idx = sprite.tileIndex * 32;
      if (idx < 0 || idx + dim.width * dim.height * 32 > tiles.length) {
        throw new Error('frame ' + frameNumber + ' tile index ' + sprite.tileIndex + ' is outside the tile bank');
      }
      const palShift = 16 * sprite.paletteIndex;
      for (let col = 0; col < dim.width; col++) {
        for (let row = 0; row < dim.height; row++) {
          for (let ty = 0; ty < 8; ty++) {
            for (let tx = 0; tx < 4; tx++) {
              const pixelXInSprite = col * 8 + tx * 2;
              const pixelYInSprite = row * 8 + ty;
              const flippedX = sprite.hFlip ? (dim.width * 8 - pixelXInSprite - 2) : pixelXInSprite;
              const flippedY = sprite.vFlip ? (dim.height * 8 - pixelYInSprite - 1) : pixelYInSprite;
              const y = sprite.ypos + offsetY + flippedY;
              const x = sprite.xpos + offsetX + flippedX;
              const byte = tiles[idx++];
              const upper = (byte >>> 4) & 0x0f;
              const lower = byte & 0x0f;
              if (y < 0 || x < 0 || y >= height || x + 1 >= width) {
                throw new Error('frame ' + frameNumber + ' blit fell outside the canvas');
              }
              const rowBase = y * width;
              if (sprite.hFlip) {
                if (lower) pixels[rowBase + x] = lower + palShift;
                if (upper) pixels[rowBase + x + 1] = upper + palShift;
              } else {
                if (upper) pixels[rowBase + x] = upper + palShift;
                if (lower) pixels[rowBase + x + 1] = lower + palShift;
              }
            }
          }
        }
      }
    }
    return {
      ...meta,
      width,
      height,
      minX,
      minY,
      offsetX,
      offsetY,
      pixels,
      hotspotPxX: meta.hotspotX + offsetX,
      hotspotPxY: meta.hotspotY + offsetY
    };
  }

  return { parseAnim, renderFrame, decodePaletteFile, expandChannel, SIZE_TAB, DIMENSIONS };
});
