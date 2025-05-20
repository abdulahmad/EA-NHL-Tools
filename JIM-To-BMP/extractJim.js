const fs = require('fs');
const path = require('path');
const bmp = require('bmp-js');

function readUInt32BE(buf, offset) {
    return buf.readUInt32BE(offset);
}
function readUInt16BE(buf, offset) {
    return buf.readUInt16BE(offset);
}

// Correct Genesis color extraction: 0b0000BBBBGGGGRRRR (each 0-7)
function genesisColorToRGB(word) {
    // Genesis color: 0000 bbb0 ggg0 rrr0
    const r = ((word & 0x000E) >> 1); // bits 1-3
    const g = ((word & 0x00E0) >> 5); // bits 5-7
    const b = ((word & 0x0E00) >> 9); // bits 9-11
    // Scale 0-7 to 0-255
    return [
        Math.floor((r / 7) * 255),
        Math.floor((g / 7) * 255),
        Math.floor((b / 7) * 255)
    ];
}

function decodeGenesisTile(tileBuf) {
    // tileBuf: 32 bytes, 4bpp planar format
    // Returns: Uint8Array[64] (row-major, top-down)
    const pixels = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let color = 0;
            // Process 4 bitplanes
            for (let plane = 0; plane < 4; plane++) {
                const planeByte = tileBuf[y * 4 + plane];
                const bit = (planeByte >> (7 - x)) & 1;
                color |= (bit << plane);
            }
            // Store in row-major order, no vertical flip needed
            pixels[y * 8 + x] = color;
        }
    }
    return pixels;
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
    const tileSize = 32; // 8x8, 4bpp planar = 32 bytes
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
        const pixels = decodeGenesisTile(tileBuf);
        // BMP expects bottom-up rows, so flip vertically
        const bmpData = Buffer.alloc(8 * 8 * 4);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const srcIdx = (7 - y) * 8 + x; // flip vertically for BMP
                const dstIdx = (y * 8 + x) * 4;
                const colorIdx = pixels[srcIdx];
                const [r, g, b] = palettes[0][colorIdx];
                bmpData[dstIdx] = r;
                bmpData[dstIdx + 1] = g;
                bmpData[dstIdx + 2] = b;
                bmpData[dstIdx + 3] = 255;
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
            const pixels = decodeGenesisTile(tileBuf);
            for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                    // BMP is bottom-up, so invert Y for the whole image
                    const pxX = mx * 8 + tx;
                    const pxY = mapH - 1 - (my * 8 + ty);
                    const dstIdx = (pxY * mapW + pxX) * 4;
                    const colorIdx = pixels[ty * 8 + tx];
                    const [r, g, b] = palettes[paletteLine][colorIdx];
                    mapBmpData[dstIdx] = r;
                    mapBmpData[dstIdx + 1] = g;
                    mapBmpData[dstIdx + 2] = b;
                    mapBmpData[dstIdx + 3] = 255;
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