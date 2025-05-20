const fs = require('fs');
const path = require('path');
const bmp = require('bmp-js');

function readUInt32BE(buf, offset) {
    return buf.readUInt32BE(offset);
}
function readUInt16BE(buf, offset) {
    return buf.readUInt16BE(offset);
}

function genesisColorToRGB(word) {
    // Genesis color: 0b0000BBBBGGGGRRRR (each 0-7)
    const r = (word & 0x00E) >> 1;
    const g = (word & 0x0E0) >> 5;
    const b = (word & 0xE00) >> 9;
    // Scale 0-7 to 0-255
    return [
        Math.floor((r / 7) * 255),
        Math.floor((g / 7) * 255),
        Math.floor((b / 7) * 255)
    ];
}

function extractJim(jimPath) {
    const outDir = path.join(path.dirname(jimPath), 'Extracted');
    const tilesDir = path.join(outDir, 'tiles');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    if (!fs.existsSync(tilesDir)) fs.mkdirSync(tilesDir);

    const buf = fs.readFileSync(jimPath);

    // Header
    const paletteOffset = readUInt32BE(buf, 0x00);
    const mapOffset = readUInt32BE(buf, 0x04);
    const numTiles = readUInt16BE(buf, 0x08);

    // Tile Data
    const tileDataOffset = 0x10;
    const tileSize = 32; // 8x8, 4bpp = 32 bytes
    const tiles = [];
    for (let i = 0; i < numTiles; i++) {
        const tileBuf = buf.slice(tileDataOffset + i * tileSize, tileDataOffset + (i + 1) * tileSize);
        tiles.push(tileBuf);
    }

    // Palette Data (Genesis: 4 palettes x 16 colors, 2 bytes per color = 128 bytes)
    const paletteDataOffset = paletteOffset;
    const paletteData = buf.slice(paletteDataOffset, paletteDataOffset + 128);

    // Parse all 4 palettes
    const palettes = [];
    for (let p = 0; p < 4; p++) {
        const pal = [];
        for (let i = 0; i < 16; i++) {
            const colorWord = paletteData.readUInt16BE((p * 16 + i) * 2);
            pal.push(genesisColorToRGB(colorWord));
        }
        palettes.push(pal);
    }

    // Map Section
    const mapWidth = readUInt16BE(buf, mapOffset);
    const mapHeight = readUInt16BE(buf, mapOffset + 2);
    const mapDataOffset = mapOffset + 4;
    const mapLayout = [];
    const mapPaletteLines = [];
    for (let y = 0; y < mapHeight; y++) {
        const row = [];
        const palRow = [];
        for (let x = 0; x < mapWidth; x++) {
            const entryOffset = mapDataOffset + 2 * (y * mapWidth + x);
            const entry = readUInt16BE(buf, entryOffset);
            const tileIndex = entry & 0x7FF; // bits 0-10
            const paletteLine = (entry >> 13) & 0x3; // bits 13-14
            row.push(tileIndex);
            palRow.push(paletteLine);
        }
        mapLayout.push(row);
        mapPaletteLines.push(palRow);
    }

    // Write metadata.json
    const metadata = {
        numTiles,
        mapWidth,
        mapHeight,
        mapLayout
    };
    fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // Export each tile as BMP (using palette 0)
    for (let t = 0; t < tiles.length; t++) {
        const tileBuf = tiles[t];
        const pixels = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const byteIndex = y * 4 + Math.floor(x / 2);
                const byte = tileBuf[byteIndex];
                const colorIdx = (x % 2 === 0) ? (byte >> 4) : (byte & 0x0F);
                const [r, g, b] = palettes[0][colorIdx];
                pixels.push({ r, g, b, a: 255 });
            }
        }
        // BMP expects bottom-up rows
        const bmpData = Buffer.alloc(8 * 8 * 4);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const srcIdx = (7 - y) * 8 + x;
                const dstIdx = (y * 8 + x) * 4;
                const px = pixels[srcIdx];
                bmpData[dstIdx] = px.r;
                bmpData[dstIdx + 1] = px.g;
                bmpData[dstIdx + 2] = px.b;
                bmpData[dstIdx + 3] = px.a;
            }
        }
        const bmpImage = bmp.encode({
            width: 8,
            height: 8,
            data: bmpData
        });
        fs.writeFileSync(path.join(tilesDir, `tile_${t}.bmp`), bmpImage.data);
    }

    // Export full map as BMP (using correct palette for each tile)
    const mapW = mapWidth * 8;
    const mapH = mapHeight * 8;
    const mapBmpData = Buffer.alloc(mapW * mapH * 4);

    for (let my = 0; my < mapHeight; my++) {
        for (let mx = 0; mx < mapWidth; mx++) {
            const tileIndex = mapLayout[my][mx];
            const paletteLine = mapPaletteLines[my][mx];
            if (tileIndex >= tiles.length) continue;
            const tileBuf = tiles[tileIndex];
            for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                    const byteIndex = ty * 4 + Math.floor(tx / 2);
                    const byte = tileBuf[byteIndex];
                    const colorIdx = (tx % 2 === 0) ? (byte >> 4) : (byte & 0x0F);
                    const [r, g, b] = palettes[paletteLine][colorIdx];
                    // BMP is bottom-up, so invert Y
                    const px = {
                        r, g, b, a: 255
                    };
                    const pxX = mx * 8 + tx;
                    const pxY = mapH - 1 - (my * 8 + ty);
                    const dstIdx = (pxY * mapW + pxX) * 4;
                    mapBmpData[dstIdx] = px.r;
                    mapBmpData[dstIdx + 1] = px.g;
                    mapBmpData[dstIdx + 2] = px.b;
                    mapBmpData[dstIdx + 3] = px.a;
                }
            }
        }
    }
    const mapBmpImage = bmp.encode({
        width: mapW,
        height: mapH,
        data: mapBmpData
    });
    fs.writeFileSync(path.join(outDir, 'full_map.bmp'), mapBmpImage.data);

    console.log(`Extraction complete. Output in: ${outDir}`);
}

// Usage: node extract-jim.js path/to/file.jim
if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('Usage: node extract-jim.js <path-to-.jim>');
        process.exit(1);
    }
    extractJim(process.argv[2]);
}