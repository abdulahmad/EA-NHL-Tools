/**
 * Draw an NHL .map.jim: big-endian header, row-major 4bpp tiles, four
 * Genesis palettes, map words. NHL 92 stores the tiles raw. NHLPA 93 and
 * NHL 94 set bit 15 of the tile count and pack the tiles with the game's
 * bytecode decompressor. Player portraits pack each row of eight pixels
 * into three bytes.
 */
(function (root, factory) {
  const anim = typeof module === 'object' && module.exports ? require('./anim') : root.Nhl92Anim;
  const api = factory(anim);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Nhl92Jim = api;
})(typeof self !== 'undefined' ? self : this, function (anim) {
  // Map pixels are color + palette * 16. Palette 0 is an opaque picture
  // (color 0 is a real entry, usually the fill). Palettes 1, 2, and 3 use
  // color 0 as the transparent hole, the same way a Genesis tile does when
  // it is not on the backdrop row.
  function picturePixelHidden(index, clearIndex) {
    if (clearIndex != null && index === clearIndex) return true;
    const row = index >> 4;
    return (index & 15) === 0 && row !== 0;
  }

  function pictureAnim(width, height, pixels, colors) {
    const frame = {
      frame: 1,
      index: 0,
      picture: true,
      opaque: false,
      rowTransparent: true,
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      minX: 0,
      minY: 0,
      hotspotX: 0,
      hotspotY: 0,
      hotspotPxX: Math.floor(width / 2),
      hotspotPxY: Math.floor(height / 2),
      numSprites: 0,
      sprites: [],
      pixels
    };
    return {
      numFrames: 1,
      picture: true,
      opaque: false,
      rowTransparent: true,
      combined: colors,
      renderFrame: function () { return frame; }
    };
  }

  // DecompressBytecode in NHL94 video94.asm. A 256-byte ring is flushed to
  // the output every time the write index wraps, and opcode E with a zero
  // distance is the end code.
  function decompressBytecode(bytes, offset, expected) {
    const ring = new Uint8Array(256);
    const out = [];
    let pos = offset;
    let index = 0;

    function need(n) {
      if (pos + n > bytes.length) throw new Error('Compressed picture ran out of data');
    }

    function writeByte(value) {
      ring[index] = value & 255;
      index = (index + 1) & 255;
      if (index === 0) flush(256);
    }

    function flush(count) {
      for (let i = 0; i < count; i++) out.push(ring[i]);
    }

    function copyForward(count, distance) {
      let src = (index - distance) & 255;
      for (let i = 0; i < count; i++) {
        writeByte(ring[src]);
        src = (src + 1) & 255;
      }
    }

    function copyReverse(count, distance) {
      let src = (index - distance) & 255;
      for (let i = 0; i < count; i++) {
        writeByte(ring[src]);
        src = (src - 1) & 255;
      }
    }

    while (pos < bytes.length) {
      need(1);
      const command = bytes[pos++];
      const high = command >> 4;
      const low = command & 0x0f;
      if (high <= 1) {
        const count = (command & 0x1f) + 1;
        need(count);
        for (let i = 0; i < count; i++) writeByte(bytes[pos++]);
      } else if (high === 2) {
        for (let i = 0; i < low + 1; i++) writeByte(0);
      } else if (high === 3) {
        need(1);
        const fill = bytes[pos++];
        for (let i = 0; i < low + 3; i++) writeByte(fill);
      } else if (high >= 4 && high <= 7) {
        copyForward((command & 7) + 2, ((command >> 3) & 7) + 1);
      } else if (high === 8) {
        need(1);
        copyForward(low + 3, bytes[pos++]);
      } else if (high === 9 || high === 0xF) {
        need(1);
        const next = bytes[pos++];
        const mixed = ((command << 1) | (next >> 7)) & 0x1f;
        const count = mixed + 3;
        const distance = (next & 0x7f) + 1;
        if (high === 9) copyForward(count, distance);
        else copyReverse(count, distance);
      } else if (high === 0xA || high === 0xB) {
        need(1);
        const next = bytes[pos++];
        const packed = (command << 8) | next;
        const count = high === 0xA
          ? ((packed >> 6) & 0x3f) + 3
          : ((packed >> 5) & 0x7f) + 3;
        const distance = high === 0xA ? (next & 0x3f) + 1 : (next & 0x1f) + 1;
        copyForward(count, distance);
      } else if (high === 0xC || high === 0xD) {
        copyReverse((command & 3) + 2, ((command >> 2) & 7) + 1);
      } else {
        need(1);
        const distance = bytes[pos++];
        if (distance === 0) {
          if (index !== 0) flush(index);
          break;
        }
        copyReverse(low + 3, distance);
      }
      if (expected && out.length > expected + 256) break;
    }

    if (expected && out.length < expected) {
      throw new Error('Compressed picture produced ' + out.length + ' of ' + expected + ' bytes');
    }
    return Uint8Array.from(expected ? out.slice(0, expected) : out);
  }

  // UnpackPicture: each row of eight pixels is three bytes. Every pixel is
  // a 3-bit value plus 5, so the portrait colors sit in the middle of the palette.
  function unpackPortrait(bytes, offset, tiles) {
    const rows = tiles * 8;
    const need = rows * 3;
    if (offset + need > bytes.length) throw new Error('Portrait ran out of data');
    const tilesOut = new Uint8Array(tiles * 32);
    let src = offset;
    let dst = 0;
    for (let row = 0; row < rows; row++) {
      const bits = (bytes[src] << 16) | (bytes[src + 1] << 8) | bytes[src + 2];
      src += 3;
      for (let pair = 0; pair < 4; pair++) {
        const left = ((bits >> (21 - pair * 6)) & 7) + 5;
        const right = ((bits >> (18 - pair * 6)) & 7) + 5;
        tilesOut[dst++] = (left << 4) | right;
      }
    }
    return tilesOut;
  }

  function rawTiles(bytes, tiles) {
    const end = 10 + tiles * 32;
    if (end > bytes.length) throw new Error('JIM tile data runs past the file');
    return bytes.subarray(10, end);
  }

  function tileBytesFor(bytes, palOff, mapOff, tileWord, noPalette) {
    const packed = (tileWord & 0x8000) !== 0;
    const tiles = tileWord & 0x7fff;
    if (!tiles || tiles > 4096) throw new Error('JIM tile count is not usable');
    if (packed) return { tiles, tileBytes: decompressBytecode(bytes, 10, tiles * 32) };
    // A shared 6×6 card (both header longs are 0) and a card whose palette
    // sits right after the 3-byte rows are portraits. Arena graphics use the
    // same zero header with ordinary 32-byte tiles and no map.
    if (!noPalette && palOff === 10 + tiles * 24) {
      return { tiles, tileBytes: unpackPortrait(bytes, 10, tiles) };
    }
    if (!noPalette && palOff === 0 && mapOff === 0 && (tiles === 36 || tiles === 0x24)) {
      return { tiles, tileBytes: unpackPortrait(bytes, 10, tiles) };
    }
    if (noPalette || palOff === 0 || palOff === 10 + tiles * 32 || palOff === mapOff) {
      return { tiles, tileBytes: rawTiles(bytes, tiles) };
    }
    throw new Error('This picture is not a JIM');
  }

  function fallbackColors() {
    const colors = [];
    for (let i = 0; i < 64; i++) {
      const ramp = i === 0 ? 0 : 32 + ((i * 37) % 224);
      colors.push([ramp, (i * 53) % 256, (i * 17) % 256]);
    }
    return colors;
  }

  function decodeJim(buffer, donorPalette, options) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 12) throw new Error('JIM is too small');
    const noPalette = view.getUint32(0) === 0xffffffff;
    const palOff = noPalette ? 0 : view.getUint32(0);
    const mapOff = view.getUint32(4);
    const tileWord = view.getUint16(8);
    const shared = !noPalette && palOff === 0 && mapOff === 0;
    const decoded = tileBytesFor(bytes, palOff, mapOff, tileWord, noPalette);
    const tiles = decoded.tiles;
    const tileBytes = decoded.tileBytes;
    const face = shared && (tiles === 36 || tiles === 0x24);
    let mapW;
    let mapH;
    if (face) {
      mapW = 6;
      mapH = Math.ceil(tiles / mapW);
    } else if (shared) {
      mapW = Math.min(8, tiles);
      mapH = Math.ceil(tiles / mapW);
    } else {
      if (mapOff + 4 > bytes.length) throw new Error('JIM offsets run past the file');
      mapW = view.getUint16(mapOff);
      mapH = view.getUint16(mapOff + 2);
    }
    if (!mapW || !mapH || mapW > 1024 || mapH > 1024) throw new Error('JIM map is ' + mapW + ' by ' + mapH);
    if (!shared && mapOff + 4 + mapW * mapH * 2 > bytes.length) throw new Error('JIM map runs past the file');
    const colors = [];
    const opts = options || {};
    const donor = donorPalette ? (donorPalette instanceof Uint8Array ? donorPalette : new Uint8Array(donorPalette)) : null;
    // Player portraits unpack to nibbles 5–12. DrawPictureBox copies the 16
    // colors at palette+0x20 (the first row is a solid fill) into CRAM. The
    // same 16 colors are stored in every slot so a map palette bit still hits them.
    const portrait = face || (!noPalette && palOff === 10 + tiles * 24);
    let faceBytes = null;
    if (portrait && shared && donor && donor.length >= 64) faceBytes = donor.subarray(32, 64);
    else if (portrait && !shared && palOff + 64 <= bytes.length) faceBytes = bytes.subarray(palOff + 32, palOff + 64);
    const logo = !portrait && !noPalette && palOff !== 0 && palOff === mapOff;
    if (opts.forceDonor && donor && donor.length >= 128) {
      for (let p = 0; p < 4; p++) colors.push.apply(colors, anim.decodePaletteFile(donor.subarray(p * 32, (p + 1) * 32)));
    } else if (faceBytes || (logo && donor && donor.length >= 32)) {
      const row = faceBytes || donor.subarray(0, 32);
      const face = anim.decodePaletteFile(row);
      for (let p = 0; p < 4; p++) {
        for (const color of face) colors.push(color.slice());
      }
    } else if (donor && donor.length >= 128) {
      for (let p = 0; p < 4; p++) colors.push.apply(colors, anim.decodePaletteFile(donor.subarray(p * 32, (p + 1) * 32)));
    } else if (!shared && !noPalette && palOff !== mapOff && palOff + 128 <= bytes.length) {
      for (let p = 0; p < 4; p++) colors.push.apply(colors, anim.decodePaletteFile(bytes.subarray(palOff + p * 32, palOff + (p + 1) * 32)));
    } else {
      colors.push.apply(colors, fallbackColors());
    }
    const width = mapW * 8;
    const height = mapH * 8;
    const pixels = new Uint8Array(width * height);
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const entry = shared ? (ty * mapW + tx) : view.getUint16(mapOff + 4 + (ty * mapW + tx) * 2);
        const tile = entry & 0x7ff;
        const hFlip = (entry >>> 11) & 1;
        const vFlip = (entry >>> 12) & 1;
        const pal = (entry >>> 13) & 3;
        if (tile >= tiles) continue;
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const sx = hFlip ? 7 - x : x;
            const sy = vFlip ? 7 - y : y;
            const byte = tileBytes[tile * 32 + sy * 4 + (sx >> 1)];
            const index = (sx & 1) ? byte & 0x0f : byte >>> 4;
            pixels[(ty * 8 + y) * width + tx * 8 + x] = index + pal * 16;
          }
        }
      }
    }
    if (opts.remap) {
      for (let i = 0; i < pixels.length; i++) {
        const row = pixels[i] & ~15;
        const color = pixels[i] & 15;
        if (color < opts.remap.length) pixels[i] = row + opts.remap[color];
      }
    }
    return pictureAnim(width, height, pixels, colors);
  }

  return { decodeJim, pictureAnim, picturePixelHidden, decompressBytecode, unpackPortrait };
});
