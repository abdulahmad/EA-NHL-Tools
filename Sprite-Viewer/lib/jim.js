/**
 * Draw an uncompressed NHL 92 .map.jim (big-endian header, row-major 4bpp
 * tiles, four Genesis palettes, map words). NHLPA 93 and later pack the
 * tiles; those files are refused rather than shown with the wrong pixels.
 */
(function (root, factory) {
  const anim = typeof module === 'object' && module.exports ? require('./anim') : root.Nhl92Anim;
  const api = factory(anim);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Nhl92Jim = api;
})(typeof self !== 'undefined' ? self : this, function (anim) {
  function pictureAnim(width, height, pixels, colors) {
    const frame = {
      frame: 1,
      index: 0,
      picture: true,
      opaque: true,
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
      opaque: true,
      combined: colors,
      renderFrame: function () { return frame; }
    };
  }

  function decodeJim(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 16) throw new Error('JIM is too small');
    const palOff = view.getUint32(0);
    const mapOff = view.getUint32(4);
    const tiles = view.getUint16(8);
    if (!tiles || tiles > 4096) throw new Error('JIM tile count is not usable');
    if (palOff !== 10 + tiles * 32) throw new Error('This picture is compressed');
    if (palOff + 128 > bytes.length || mapOff + 4 > bytes.length) throw new Error('JIM offsets run past the file');
    const mapW = view.getUint16(mapOff);
    const mapH = view.getUint16(mapOff + 2);
    if (!mapW || !mapH || mapW > 1024 || mapH > 1024) throw new Error('JIM map is ' + mapW + ' by ' + mapH);
    const colors = [];
    for (let p = 0; p < 4; p++) colors.push.apply(colors, anim.decodePaletteFile(bytes.subarray(palOff + p * 32, palOff + (p + 1) * 32)));
    const width = mapW * 8;
    const height = mapH * 8;
    const pixels = new Uint8Array(width * height);
    const tileBase = 10;
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const entry = view.getUint16(mapOff + 4 + (ty * mapW + tx) * 2);
        const tile = entry & 0x7ff;
        const hFlip = (entry >>> 11) & 1;
        const vFlip = (entry >>> 12) & 1;
        const pal = (entry >>> 13) & 3;
        if (tile >= tiles) continue;
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const sx = hFlip ? 7 - x : x;
            const sy = vFlip ? 7 - y : y;
            const byte = bytes[tileBase + tile * 32 + sy * 4 + (sx >> 1)];
            const index = (sx & 1) ? byte & 0x0f : byte >>> 4;
            pixels[(ty * 8 + y) * width + tx * 8 + x] = index + pal * 16;
          }
        }
      }
    }
    return pictureAnim(width, height, pixels, colors);
  }

  return { decodeJim, pictureAnim };
});
