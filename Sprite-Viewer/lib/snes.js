/**
 * Draw NHLPA 93 SNES and NHL 94 SNES sprites.
 *
 * 93 keeps 15 frame sets. A piece is x, y, tile, attributes (4 bytes, or 6
 * for the crowd set). Tiles are 4bpp planar. Palette row 2 is the home jersey.
 * 94's main set at $828000 is a table of offsets, then frames whose pieces
 * are x, y, a tile word and a size byte, as DrawSprite reads them.
 *
 * Both return the same shape renderFrame does, so the stage can draw them.
 */
(function (root, factory) {
  const pak = typeof module === 'object' && module.exports ? require('./snespak') : root.Nhl92SnesPak;
  const api = factory(pak);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Nhl92Snes = api;
})(typeof self !== 'undefined' ? self : this, function (pak) {
  function snesRgb(v) {
    return [
      ((v & 31) * 255 / 31) | 0,
      (((v >> 5) & 31) * 255 / 31) | 0,
      (((v >> 10) & 31) * 255 / 31) | 0
    ];
  }

  function decodeBgr555(bytes, offset, count) {
    const colors = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < count; i++) {
      colors.push(snesRgb(view.getUint16(offset + i * 2, true)));
    }
    return colors;
  }

  function decodeTeamPalette(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const colors = [];
    for (let i = 0; i < 16; i++) {
      const v = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
      const bgr = ((v & 0xf) << 1) | (((v >> 4) & 0xf) << 6) | (((v >> 8) & 0xf) << 11);
      colors.push(snesRgb(bgr));
    }
    return colors;
  }

  function decodeRinkPalette(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const colors = decodeBgr555(bytes, 0, Math.min(128, bytes.length >> 1));
    while (colors.length < 128) colors.push([0, 0, 0]);
    return colors;
  }

  function tilePixel(tiles, t, x, y) {
    const b = t * 32;
    if (b < 0 || b + 32 > tiles.length) return 0;
    const bit = 7 - (x & 7);
    const p0 = tiles[b + 2 * y] || 0;
    const p1 = tiles[b + 2 * y + 1] || 0;
    const p2 = tiles[b + 16 + 2 * y] || 0;
    const p3 = tiles[b + 16 + 2 * y + 1] || 0;
    return ((p0 >> bit) & 1) | (((p1 >> bit) & 1) << 1) | (((p2 >> bit) & 1) << 2) | (((p3 >> bit) & 1) << 3);
  }

  function signedByte(v) {
    return (v << 24) >> 24;
  }

  function read93Pieces(rom, set, index) {
    const start = set.starts[index];
    const end = set.starts[index + 1];
    const pieces = [];
    for (let p = start; p < end; p++) {
      const o = set.pieces + p * set.pieceSize;
      let x;
      let y;
      let tile;
      let attr;
      if (set.pieceSize === 6) {
        const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
        x = view.getInt16(o, true);
        y = view.getInt16(o + 2, true);
        tile = rom[o + 4];
        attr = rom[o + 5];
      } else {
        x = signedByte(rom[o]);
        y = signedByte(rom[o + 1]);
        tile = rom[o + 2];
        attr = rom[o + 3];
      }
      pieces.push({
        x,
        y,
        tile: tile | ((attr & 3) << 8),
        pal: (attr >> 2) & 7,
        size: attr & 0x20 ? 16 : 8,
        hFlip: attr & 0x40,
        vFlip: attr & 0x80
      });
    }
    return pieces;
  }

  function blitPieces(pieces, tiles, keepPaletteZero) {
    if (!pieces.length) {
      return {
        width: 0, height: 0, minX: 0, minY: 0, pixels: new Uint8Array(0)
      };
    }
    let minX = 0;
    let minY = 0;
    let maxX = 1;
    let maxY = 1;
    for (const piece of pieces) {
      if (piece.x < minX) minX = piece.x;
      if (piece.y < minY) minY = piece.y;
      if (piece.x + piece.size > maxX) maxX = piece.x + piece.size;
      if (piece.y + piece.size > maxY) maxY = piece.y + piece.size;
    }
    const width = maxX - minX;
    const height = maxY - minY;
    const pixels = new Uint8Array(width * height);
    if (keepPaletteZero) pixels.fill(255);
    for (let n = pieces.length - 1; n >= 0; n--) {
      const piece = pieces[n];
      for (let y = 0; y < piece.size; y++) {
        for (let x = 0; x < piece.size; x++) {
          const sx = piece.hFlip ? piece.size - 1 - x : x;
          const sy = piece.vFlip ? piece.size - 1 - y : y;
          const color = tilePixel(tiles, piece.tile + (sy >> 3) * 16 + (sx >> 3), sx & 7, sy & 7);
          // Sprites drop color 0 on every row. Pictures keep palette 0's color 0
          // and leave the other rows' color 0 as the clear sentinel.
          if (!color && (!keepPaletteZero || piece.pal)) continue;
          const px = piece.x - minX + x;
          const py = piece.y - minY + y;
          if (px >= 0 && py >= 0 && px < width && py < height) {
            pixels[py * width + px] = color + piece.pal * 16;
          }
        }
      }
    }
    return { width, height, minX, minY, pixels };
  }

  function hotOf(rom, spec, frame) {
    if (!spec.hotlist) return { x: 0, y: 0 };
    let index = frame;
    if (frame >= spec.hotCut) index = frame - spec.hotSkip;
    index -= 1;
    if (index < 0 || index * 2 + 1 >= spec.hotBytes) return { x: 0, y: 0 };
    return {
      x: signedByte(rom[spec.hotlist + index * 2]),
      y: signedByte(rom[spec.hotlist + index * 2 + 1])
    };
  }

  function frameRecord(frame, art, hot) {
    return {
      frame,
      index: frame - 1,
      width: art.width,
      height: art.height,
      canvasWidth: art.width,
      canvasHeight: art.height,
      minX: art.minX,
      minY: art.minY,
      hotspotX: hot.x,
      hotspotY: hot.y,
      hotspotPxX: hot.x - art.minX,
      hotspotPxY: hot.y - art.minY,
      numSprites: art.count,
      sprites: art.sprites,
      pixels: art.pixels
    };
  }

  function spriteRow(piece) {
    return {
      xpos: piece.x,
      ypos: piece.y,
      dimensions: { width: piece.size / 8, height: piece.size / 8 },
      tileIndex: piece.tile,
      hFlip: piece.hFlip ? 1 : 0,
      vFlip: piece.vFlip ? 1 : 0,
      paletteIndex: piece.pal
    };
  }

  function load93Sets(rom, spec) {
    let base = 1;
    return spec.sets.map((set) => {
      const starts = [];
      const table = set.pieces - (set.frames + 1) * 2;
      const view = new DataView(rom.buffer, rom.byteOffset, rom.byteLength);
      for (let i = 0; i < set.frames + 1; i++) starts.push(view.getUint16(table + i * 2, true));
      const loaded = {
        frames: set.frames,
        base,
        pieces: set.pieces,
        pieceSize: set.pieceSize,
        starts,
        tiles: rom.subarray(set.pieces + set.pieceCount * set.pieceSize, set.pieces + set.pieceCount * set.pieceSize + set.tiles * 32)
      };
      base += set.frames;
      return loaded;
    });
  }

  function parse93(romBytes, spec, rinkColors) {
    const rom = romBytes instanceof Uint8Array ? romBytes : new Uint8Array(romBytes);
    const sets = load93Sets(rom, spec);
    const numFrames = sets.reduce((sum, set) => sum + set.frames, 0);
    const cache = new Map();
    function renderFrame(frame) {
      if (cache.has(frame)) return cache.get(frame);
      const set = sets.find((item) => frame >= item.base && frame < item.base + item.frames);
      if (!set) return null;
      const pieces = read93Pieces(rom, set, frame - set.base);
      const art = blitPieces(pieces, set.tiles);
      art.count = pieces.length;
      art.sprites = pieces.map(spriteRow);
      const record = frameRecord(frame, art, hotOf(rom, spec, frame));
      cache.set(frame, record);
      return record;
    }
    return {
      numFrames,
      combined: rinkColors || grey(128),
      renderFrame
    };
  }

  function grey(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
      const c = (i % 16) * 17;
      colors.push([c, c, c]);
    }
    return colors;
  }

  function u16(rom, addr) {
    const o = pak.lorom(addr);
    return rom[o] | (rom[o + 1] << 8);
  }

  function s16(rom, addr) {
    const v = u16(rom, addr);
    return v & 0x8000 ? v - 0x10000 : v;
  }

  function parse94(romBytes, spec, rinkColors) {
    const rom = romBytes instanceof Uint8Array ? romBytes : new Uint8Array(romBytes);
    const base = spec.base;
    const first = u16(rom, base) | (u16(rom, base + 2) << 16);
    const numFrames = (first / 4) | 0;
    const cache = new Map();
    function renderFrame(frame) {
      if (frame < 1 || frame > numFrames) return null;
      if (cache.has(frame)) return cache.get(frame);
      const n = frame - 1;
      const rel = u16(rom, base + n * 4) | (u16(rom, base + n * 4 + 2) << 16);
      const record = draw94(rom, base + rel);
      record.frame = frame;
      record.index = n;
      cache.set(frame, record);
      return record;
    }
    return { numFrames, combined: rinkColors || grey(128), renderFrame };
  }

  function draw94(rom, addr) {
    const count = rom[pak.lorom(addr)] || 0;
    const flags = rom[pak.lorom(addr + 1)] || 0;
    const s1 = u16(rom, addr + 0x0c);
    const s2 = u16(rom, addr + 0x0e);
    const tileOff = u16(rom, addr + 0x10);
    const vram = new Uint8Array(0x2000);
    const src = addr + tileOff;
    for (let i = 0; i < s1 && i < vram.length; i++) vram[i] = rom[pak.lorom(src + i)] || 0;
    if (flags & 0x80) {
      const t2 = ((((s1 >> 1) & 0xff00) | 0x100) >> 4);
      for (let i = 0; i < s2 && t2 * 32 + i < vram.length; i++) {
        vram[t2 * 32 + i] = rom[pak.lorom(src + s1 + i)] || 0;
      }
    }
    const pieces = [];
    for (let p = 0; p < count; p++) {
      const q = addr + 0x16 + p * 7;
      const tileWord = u16(rom, q + 4);
      const sizeByte = rom[pak.lorom(q + 6)] || 0;
      pieces.push({
        x: s16(rom, q),
        y: s16(rom, q + 2),
        tile: tileWord & 0x1ff,
        pal: (tileWord >> 9) & 7,
        size: sizeByte ? 16 : 8,
        hFlip: tileWord & 0x4000,
        vFlip: tileWord & 0x8000
      });
    }
    const art = blitPieces(pieces, vram);
    art.count = pieces.length;
    art.sprites = pieces.map(spriteRow);
    return frameRecord(0, art, { x: 0, y: 0 });
  }

  function pictureFromPixels(width, height, pixels, colors) {
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
      pixels,
      colors
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

  function renderMap(mapBytes, tiles, colors, mapW, mapH, remap) {
    const width = mapW * 8;
    const height = mapH * 8;
    const pixels = new Uint8Array(width * height);
    const view = new DataView(mapBytes.buffer, mapBytes.byteOffset, mapBytes.byteLength);
    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const o = (ty * mapW + tx) * 2;
        if (o + 1 >= mapBytes.length) continue;
        const entry = view.getUint16(o, true);
        const tile = entry & 0x3ff;
        const pal = (entry >> 10) & 7;
        const hFlip = entry & 0x4000;
        const vFlip = entry & 0x8000;
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const sx = hFlip ? 7 - x : x;
            const sy = vFlip ? 7 - y : y;
            let color = tilePixel(tiles, tile, sx, sy);
            if (remap && color < remap.length) color = remap[color];
            pixels[(ty * 8 + y) * width + tx * 8 + x] = color + pal * 16;
          }
        }
      }
    }
    return pictureFromPixels(width, height, pixels, colors);
  }

  function screen93(rom, image, rinkColors) {
    const packed = rom.subarray(image.start, image.end);
    const data = pak.unpack93(packed, 0);
    const mapW = image.mapW;
    const mapH = image.mapH;
    const mapBytes = data.subarray(0, image.mapSize);
    const tiles = data.subarray(image.tiles);
    let colors;
    if (image.palFrom) {
      const blob = pak.unpack93(rom.subarray(image.palFrom.start, image.palFrom.end), 0);
      colors = decodeBgr555(blob, image.palFrom.offset, image.palFrom.count || 128);
    } else if (image.noPal) colors = grey(128);
    else if (image.useRink) colors = rinkColors || grey(128);
    else colors = decodeBgr555(data, image.pal, 128);
    while (colors.length < 128) colors.push([0, 0, 0]);
    return renderMap(mapBytes, tiles, colors, mapW, mapH);
  }

  function tileSheet(tiles, columns, colors, remap) {
    const count = (tiles.length / 32) | 0;
    const cols = columns || 16;
    const rows = Math.max(1, Math.ceil(count / cols));
    const width = cols * 8;
    const height = rows * 8;
    const pixels = new Uint8Array(width * height);
    for (let t = 0; t < count; t++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          let color = tilePixel(tiles, t, x, y);
          if (remap && color < remap.length) color = remap[color];
          pixels[((t / cols) | 0) * 8 * width + y * width + (t % cols) * 8 + x] = color;
        }
      }
    }
    return pictureFromPixels(width, height, pixels, colors || grey(16));
  }

  function fontStrip(rom, tiles, image, colors) {
    const columns = image.columns || 76;
    const top = rom.subarray(image.mapStart, image.mapStart + columns * 2);
    const bottomAt = image.mapStart + (image.bottom == null ? columns * 2 : image.bottom);
    const bot = rom.subarray(bottomAt, bottomAt + columns * 2);
    const map = new Uint8Array(columns * 4);
    for (let i = 0; i < columns; i++) {
      map[i * 2] = top[i * 2];
      map[i * 2 + 1] = top[i * 2 + 1];
      map[(columns + i) * 2] = bot[i * 2];
      map[(columns + i) * 2 + 1] = bot[i * 2 + 1];
    }
    return renderMap(map, tiles, colors, columns, 2, image.remap);
  }

  function font93(rom, image, rinkColors) {
    const data = pak.unpack93(rom.subarray(image.start, image.end), 0);
    const colors = rinkColors || grey(16);
    if (image.mapStart != null) return fontStrip(rom, data, image, colors);
    return tileSheet(data, image.columns || 16, colors, image.remap);
  }

  function map93(rom, image, rinkColors) {
    const tiles = image.rawTiles
      ? rom.subarray(image.tilesStart, image.tilesEnd)
      : pak.unpack93(rom.subarray(image.tilesStart, image.tilesEnd), 0);
    const mapBytes = rom.subarray(image.mapStart, image.mapStart + image.mapSize);
    return renderMap(mapBytes, tiles, rinkColors || grey(128), image.mapW, image.mapH, image.remap);
  }

  function frames93(rom, image, rinkColors) {
    const tiles = image.rawTiles
      ? rom.subarray(image.tilesStart, image.tilesEnd)
      : pak.unpack93(rom.subarray(image.tilesStart, image.tilesEnd), 0);
    const colors = rinkColors || grey(128);
    const records = [];
    for (let i = 0; i < image.frames; i++) {
      const at = image.mapStart + i * image.frameBytes;
      const mapBytes = rom.subarray(at, at + image.frameBytes);
      records.push(renderMap(mapBytes, tiles, colors, image.mapW, image.mapH).renderFrame(1));
    }
    return pictureAnim(records);
  }

  function playoff93(rom, image) {
    const data = pak.unpack93(rom.subarray(image.tilesStart, image.tilesEnd), 0);
    const colors = decodeBgr555(data, 0, 128);
    while (colors.length < 128) colors.push([0, 0, 0]);
    const tiles = data.subarray(256);
    const mapBytes = rom.subarray(image.mapStart, image.mapStart + image.mapSize);
    return renderMap(mapBytes, tiles, colors, image.mapW, image.mapH);
  }

  function linearToPlanar(data) {
    const count = (data.length / 32) | 0;
    const out = new Uint8Array(count * 32);
    for (let t = 0; t < count; t++) {
      for (let y = 0; y < 8; y++) {
        const planes = [0, 0, 0, 0];
        for (let x = 0; x < 8; x++) {
          const b = data[t * 32 + y * 4 + (x >> 1)];
          const nibble = x & 1 ? b & 15 : b >> 4;
          if (nibble & 8) planes[1] |= 0x80 >> x;
          if (nibble & 4) planes[0] |= 0x80 >> x;
          if (nibble & 2) planes[3] |= 0x80 >> x;
          if (nibble & 1) planes[2] |= 0x80 >> x;
        }
        out[t * 32 + 2 * y] = planes[0];
        out[t * 32 + 2 * y + 1] = planes[1];
        out[t * 32 + 16 + 2 * y] = planes[2];
        out[t * 32 + 17 + 2 * y] = planes[3];
      }
    }
    return out;
  }

  function snesLong(rom, addr) {
    const o = pak.lorom(addr);
    return (rom[o] | (rom[o + 1] << 8) | ((rom[o + 2] || 0) << 16) | 0x800000) >>> 0;
  }

  function bufferView(buf) {
    return {
      u8: function (o) { return buf[o] || 0; },
      u16: function (o) { return (buf[o] || 0) | ((buf[o + 1] || 0) << 8); },
      s16: function (o) {
        const v = this.u16(o);
        return v & 0x8000 ? v - 0x10000 : v;
      },
      bytes: function (o, n) {
        const out = new Uint8Array(n);
        for (let i = 0; i < n; i++) out[i] = buf[o + i] || 0;
        return out;
      }
    };
  }

  function romAddrView(rom, base) {
    function at(rel) { return pak.lorom((base + rel) >>> 0); }
    return {
      u8: function (rel) { return rom[at(rel)] || 0; },
      u16: function (rel) {
        const o = at(rel);
        return (rom[o] || 0) | ((rom[o + 1] || 0) << 8);
      },
      s16: function (rel) {
        const v = this.u16(rel);
        return v & 0x8000 ? v - 0x10000 : v;
      },
      bytes: function (rel, n) {
        const out = new Uint8Array(n);
        for (let i = 0; i < n; i++) out[i] = rom[at(rel + i)] || 0;
        return out;
      }
    };
  }

  function readSpriteSet(view) {
    const first = view.u8(0) | (view.u8(1) << 8) | (view.u8(2) << 16);
    const numFrames = (first / 4) | 0;
    const frames = [];
    for (let n = 0; n < numFrames; n++) {
      const o = view.u8(4 * n) | (view.u8(4 * n + 1) << 8) | (view.u8(4 * n + 2) << 16);
      const count = view.u8(o);
      const flags = view.u8(o + 1);
      const s1 = view.u16(o + 0x0c);
      const s2 = view.u16(o + 0x0e);
      const src = o + view.u16(o + 0x10);
      const vram = new Uint8Array(0x2000);
      const firstTiles = view.bytes(src, s1);
      for (let i = 0; i < firstTiles.length && i < vram.length; i++) vram[i] = firstTiles[i];
      if (flags & 0x80) {
        const t2 = ((((s1 >> 1) & 0xff00) | 0x100) >> 4);
        const second = view.bytes(src + s1, s2);
        const dest = t2 * 32;
        for (let i = 0; i < second.length && dest + i < vram.length; i++) vram[dest + i] = second[i];
      }
      const pieces = [];
      for (let p = 0; p < count; p++) {
        const q = o + 0x16 + p * 7;
        const tileWord = view.u16(q + 4);
        pieces.push({
          x: view.s16(q),
          y: view.s16(q + 2),
          tile: tileWord & 0x1ff,
          pal: (tileWord >> 9) & 7,
          size: view.u8(q + 6) ? 16 : 8,
          hFlip: tileWord & 0x4000,
          vFlip: tileWord & 0x8000
        });
      }
      frames.push(blitPieces(pieces, vram, true));
    }
    return frames;
  }

  function greyRows(rows) {
    const colors = [];
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < 16; i++) colors.push([i * 17, i * 17, i * 17]);
    }
    return colors;
  }

  function spritePicture(art, colors) {
    const width = Math.max(1, art.width || 0);
    const height = Math.max(1, art.height || 0);
    const pixels = art.width && art.height ? art.pixels : new Uint8Array(width * height);
    return {
      picture: true,
      opaque: false,
      rowTransparent: true,
      clearIndex: 255,
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
      pixels,
      colors
    };
  }

  function pictureAnim(records) {
    records.forEach((frame, index) => {
      frame.frame = index + 1;
      frame.index = index;
    });
    return {
      numFrames: records.length,
      picture: true,
      combined: (records[0] && records[0].colors) || grey(16),
      renderFrame: function (frame) { return records[frame - 1] || null; }
    };
  }

  function paletteTable(rom, table, count) {
    const pals = [];
    for (let n = 0; n < count; n++) {
      const ptr = snesLong(rom, table + n * 4);
      const colors = decodeBgr555(rom, pak.lorom(ptr), 16);
      while (colors.length < 16) colors.push([0, 0, 0]);
      pals.push(colors);
    }
    return pals;
  }

  // $9B85C2 turns a decompressed player card into SNES 4bpp tiles. The source
  // words are pixel bits, not planar rows, which is why reading them as tiles
  // only made stripes. Output is 36 tiles, a 48×48 picture.
  function expandCardTiles(src) {
    const code = [
      0xa6,0x00,0x8b,0xe2,0x20,0xa5,0x0e,0x48,0xc2,0x20,0xab,0x64,0x04,0xa9,0xfe,0xff,
      0x85,0x06,0xa5,0x00,0x4a,0x4a,0x85,0x00,0x80,0x0c,0x8a,0x4a,0x4a,0x4a,0x4a,0xf0,
      0x54,0xaa,0xc8,0xc8,0x80,0x0c,0xa2,0x80,0x00,0x64,0x14,0x64,0x16,0xa5,0x04,0x0a,
      0x0a,0xa8,0xb1,0x0c,0xf0,0xe4,0xeb,0xa8,0x98,0x0a,0x90,0x05,0xa8,0x8a,0x04,0x15,
      0x98,0x0a,0x90,0x05,0xa8,0x8a,0x04,0x14,0x98,0x0a,0x90,0x05,0xa8,0x8a,0x04,0x17,
      0x98,0x0a,0x90,0x05,0xa8,0x8a,0x04,0x16,0x98,0xa8,0x8a,0x4a,0xaa,0xe0,0x10,0x00,
      0xb0,0xd6,0xe0,0x00,0x00,0xf0,0x0e,0xe0,0x08,0x00,0x90,0xcc,0xa5,0x04,0x0a,0x0a,
      0xa8,0xc8,0xc8,0x80,0xbd,0xa5,0x06,0x1a,0x1a,0xa8,0x29,0x10,0x00,0xf0,0x06,0x98,
      0x18,0x69,0x10,0x00,0xa8,0x84,0x06,0xa5,0x16,0x91,0x10,0x98,0x18,0x69,0x10,0x00,
      0xa8,0xa5,0x14,0x91,0x10,0xe6,0x04,0xc6,0x00,0x10,0x8b,0xab,0x6b
    ];
    const mem = new Uint8Array(32);
    const set16 = (addr, value) => {
      mem[addr] = value & 255;
      mem[addr + 1] = (value >> 8) & 255;
    };
    const get16 = (addr) => mem[addr] | (mem[addr + 1] << 8);
    set16(0, src.length);
    let A = 0;
    let X = src.length;
    let Y = 0;
    let C = 0;
    let N = 0;
    let Z = 1;
    let pc = 0;
    const out = new Uint8Array(36 * 32);
    function setNZ(value) {
      const bits = value & 0xffff;
      N = (bits & 0x8000) !== 0;
      Z = bits === 0;
      return bits;
    }
    function imm() {
      const value = code[pc] | (code[pc + 1] << 8);
      pc += 2;
      return value;
    }
    for (let steps = 0; steps < 60000; steps++) {
      const op = code[pc++];
      if (op === 0xa6) { X = setNZ(get16(code[pc++])); }
      else if (op === 0x8b || op === 0xab || op === 0x48) { /* bank and stack around the data bank */ }
      else if (op === 0xe2 || op === 0xc2) pc++;
      else if (op === 0xa5) A = setNZ(get16(code[pc++]));
      else if (op === 0x64) { const addr = code[pc++]; mem[addr] = 0; mem[addr + 1] = 0; }
      else if (op === 0xa9) A = setNZ(imm());
      else if (op === 0x85) set16(code[pc++], A);
      else if (op === 0x84) set16(code[pc++], Y);
      else if (op === 0x4a) { C = A & 1; A = setNZ(A >> 1); }
      else if (op === 0x0a) { C = (A >> 15) & 1; A = setNZ((A << 1) & 0xffff); }
      else if (op === 0x80) { const rel = code[pc++]; pc += (rel << 24) >> 24; }
      else if (op === 0x8a) A = setNZ(X);
      else if (op === 0x98) A = setNZ(Y);
      else if (op === 0xf0) { const rel = code[pc++]; if (Z) pc += (rel << 24) >> 24; }
      else if (op === 0xaa) X = A;
      else if (op === 0xa8) Y = A;
      else if (op === 0xc8) Y = (Y + 1) & 0xffff;
      else if (op === 0xa2) X = imm();
      else if (op === 0xb1) {
        pc++;
        const i = Y & 0xffff;
        A = setNZ((src[i] || 0) | ((src[i + 1] || 0) << 8));
      } else if (op === 0xeb) A = setNZ(((A & 255) << 8) | ((A >> 8) & 255));
      else if (op === 0x90) { const rel = code[pc++]; if (!C) pc += (rel << 24) >> 24; }
      else if (op === 0x04) {
        const addr = code[pc++];
        const old = get16(addr);
        setNZ(old & A);
        set16(addr, old | A);
      } else if (op === 0xe0) {
        const value = imm();
        C = X >= value;
        setNZ((X - value) & 0xffff);
      } else if (op === 0xb0) { const rel = code[pc++]; if (C) pc += (rel << 24) >> 24; }
      else if (op === 0x29) A = setNZ(A & imm());
      else if (op === 0x18) C = 0;
      else if (op === 0x69) {
        const sum = A + imm();
        C = sum > 0xffff;
        A = setNZ(sum);
      } else if (op === 0x91) {
        pc++;
        const i = Y & 0xffff;
        if (i + 1 < out.length) {
          out[i] = A & 255;
          out[i + 1] = (A >> 8) & 255;
        }
      } else if (op === 0xe6) { const addr = code[pc++]; set16(addr, setNZ((get16(addr) + 1) & 0xffff)); }
      else if (op === 0xc6) { const addr = code[pc++]; set16(addr, setNZ((get16(addr) - 1) & 0xffff)); }
      else if (op === 0x10) { const rel = code[pc++]; if (!N) pc += (rel << 24) >> 24; }
      else if (op === 0x1a) A = setNZ((A + 1) & 0xffff);
      else if (op === 0x6b) return out;
      else throw new Error('card expand stopped at $' + op.toString(16));
    }
    throw new Error('card expand did not finish');
  }

  // $9DCD53 is 26 teams by 28 pictures. Most roster slots share a placeholder,
  // so the filmstrip keeps each distinct picture once, in first-seen order.
  function cards94(rom) {
    const table = pak.lorom(0x9DCD53);
    const gray = decodeBgr555(pak.unpack94(rom, pak.lorom(0x9AE884)), 0, 16);
    const seen = new Set();
    const records = [];
    for (let i = 0; i < 26 * 28; i++) {
      const o = table + i * 4;
      const ptr = (rom[o] | (rom[o + 1] << 8) | ((rom[o + 2] || 0) << 16) | 0x800000) >>> 0;
      if (seen.has(ptr)) continue;
      seen.add(ptr);
      const tiles = expandCardTiles(pak.unpack94(rom, pak.lorom(ptr)));
      records.push(tileSheet(tiles, 6, gray).renderFrame(1));
    }
    return pictureAnim(records);
  }

  function sprites94(rom, image, rinkColors) {
    const view = image.packed
      ? bufferView(pak.unpack94(rom, pak.lorom(image.addr)))
      : romAddrView(rom, image.addr);
    const arts = readSpriteSet(view);
    const table = image.palTable ? paletteTable(rom, image.palTable, arts.length) : null;
    const shared = table ? null : (rinkColors || greyRows(image.palRows || 1));
    const records = arts.map((art, index) => spritePicture(art, table ? table[index] : shared));
    return pictureAnim(records);
  }

  function tiles94(rom, image, rinkColors) {
    const tiles = pak.unpack94(rom, pak.lorom(image.tiles));
    let colors;
    if (image.palette) {
      const block = pak.unpack94(rom, pak.lorom(image.palette));
      colors = decodeBgr555(block, 0, Math.min(128, block.length >> 1));
      while (colors.length < 16) colors.push([0, 0, 0]);
    } else if (image.useRink) {
      colors = rinkColors || grey(128);
    } else {
      colors = grey(16);
    }
    return tileSheet(tiles, image.columns || 16, colors);
  }

  function screen94(rom, image, rinkColors) {
    let tiles = pak.unpack94(rom, pak.lorom(image.tiles));
    if (image.linear) tiles = linearToPlanar(tiles);
    const packed = pak.unpack94(rom, pak.lorom(image.map));
    const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
    const mapW = image.mapW || view.getUint16(0, true);
    const mapH = image.mapH || view.getUint16(2, true);
    const mapBytes = packed.subarray(6, 6 + mapW * mapH * 2);
    let colors;
    if (image.palette) {
      const block = pak.unpack94(rom, pak.lorom(image.palette));
      const count = image.paletteCount || 128;
      colors = decodeBgr555(block, 0, Math.min(count, block.length >> 1));
      while (colors.length < count) colors.push([0, 0, 0]);
      if (image.palette2) {
        const extraBlock = pak.unpack94(rom, pak.lorom(image.palette2));
        const extra = decodeBgr555(extraBlock, 0, image.palette2Count || 16);
        const at = image.palette2At || 0;
        for (let i = 0; i < extra.length && at + i < colors.length; i++) colors[at + i] = extra[i];
      }
    } else {
      colors = rinkColors || grey(128);
    }
    return renderMap(mapBytes, tiles, colors, mapW, mapH);
  }

  function centerIce94(rom, rinkColors) {
    const colors = rinkColors && rinkColors.length ? rinkColors : grey(128);
    const records = [];
    for (let i = 0; i < 28; i++) {
      const base = 0x9C83B7 + i * 8;
      const tiles = linearToPlanar(pak.unpack94(rom, pak.lorom(snesLong(rom, base))));
      const mapAt = pak.lorom(snesLong(rom, base + 4));
      const mapW = rom[mapAt] | (rom[mapAt + 1] << 8);
      const mapH = rom[mapAt + 2] | (rom[mapAt + 3] << 8);
      const mapBytes = rom.subarray(mapAt + 6, mapAt + 6 + mapW * mapH * 2);
      records.push(renderMap(mapBytes, tiles, colors, mapW, mapH).renderFrame(1));
    }
    return pictureAnim(records);
  }

  function openImage(rom, image, spec, rinkColors) {
    if (image.kind === 'snes93-screen') return screen93(rom, image, rinkColors);
    if (image.kind === 'snes93-map') return map93(rom, image, rinkColors);
    if (image.kind === 'snes93-font') return font93(rom, image, rinkColors);
    if (image.kind === 'snes93-frames') return frames93(rom, image, rinkColors);
    if (image.kind === 'snes93-playoff') return playoff93(rom, image);
    if (image.kind === 'snes94-rink') return rink94(rom, spec, rinkColors);
    if (image.kind === 'snes94-sprites') return sprites94(rom, image, image.useRink ? rinkColors : null);
    if (image.kind === 'snes94-screen') return screen94(rom, image, rinkColors);
    if (image.kind === 'snes94-tiles') return tiles94(rom, image, rinkColors);
    if (image.kind === 'snes94-cards') return cards94(rom);
    if (image.kind === 'snes94-center') return centerIce94(rom, rinkColors);
    throw new Error('Unknown picture ' + image.label);
  }

  function rink94(rom, spec, rinkColors) {
    const tiles = pak.unpack94(rom, pak.lorom(spec.rinkTiles));
    const packed = pak.unpack94(rom, pak.lorom(spec.rinkMap));
    const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
    const mapW = view.getUint16(0, true) || 48;
    const mapH = view.getUint16(2, true) || 1;
    const mapBytes = packed.subarray(6, 6 + mapW * mapH * 2);
    return renderMap(mapBytes, tiles, rinkColors || grey(128), mapW, mapH);
  }

  return {
    decodeTeamPalette,
    decodeRinkPalette,
    parse93,
    parse94,
    openImage,
    tilePixel,
    snesRgb
  };
});
