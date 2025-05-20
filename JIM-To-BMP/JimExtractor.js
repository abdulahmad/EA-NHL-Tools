import fs from 'fs/promises';
import sharp from 'sharp';

export class JimExtractor {
    constructor(data) {
        this.data = data;
        this.extractHeader();
    }

    static async fromFile(filename) {
        const data = await fs.readFile(filename);
        return new JimExtractor(data);
    }

    readLong(offset) {
        return this.data.readUInt32BE(offset);
    }

    readWord(offset) {
        return this.data.readUInt16BE(offset);
    }

    extractHeader() {
        this.palOffset = this.readLong(0);
        this.mapOffset = this.readLong(4);
        this.numStamps = this.readWord(8);
    }

    printHeaderInfo() {
        console.log("Header Information:");
        console.log(`├── Palette Offset: ${this.palOffset} (0x${this.palOffset.toString(16).toUpperCase()})`);
        console.log(`├── Map Offset: ${this.mapOffset} (0x${this.mapOffset.toString(16).toUpperCase()})`);
        console.log(`└── Stamps Offset: 10 to ${this.palOffset} (0x${this.palOffset.toString(16).toUpperCase()})`);
    }

    extractPalette() {
        const colors = [];
        const palData = this.data.slice(this.palOffset, this.palOffset + 128);

        for (let i = 0; i < 128; i += 2) {
            const color = palData.readUInt16BE(i);
            // Genesis format: 0000 bbb0 ggg0 rrr0
            const r = ((color & 0x000E) >> 1) * 32;
            const g = ((color & 0x00E0) >> 5) * 32;
            const b = ((color & 0x0E00) >> 9) * 32;
            colors.push([r, g, b]);
        }

        return colors;
    }

    extractStamps() {
        return this.data.slice(10, this.palOffset);
    }

    extractMap() {
        const width = this.readWord(this.mapOffset);
        const height = this.readWord(this.mapOffset + 2);
        const mapData = this.data.slice(
            this.mapOffset + 4,
            this.mapOffset + 4 + (width * height * 2)
        );
        return [width, height, mapData];
    }

    async buildPNG(outputFile) {
        const [mapWidth, mapHeight, mapData] = this.extractMap();
        const stampsData = this.extractStamps();
        const palette = this.extractPalette();

        const imageWidth = mapWidth * 8;
        const imageHeight = mapHeight * 8;

        const imageBuffer = Buffer.alloc(imageWidth * imageHeight);
        const priorityBuffer = Buffer.alloc(imageWidth * imageHeight);

        const decodeTileAttributes = (tileWord) => ({
            priority: (tileWord >> 15) & 1,
            palette_line: (tileWord >> 13) & 3,
            vflip: Boolean((tileWord >> 12) & 1),
            hflip: Boolean((tileWord >> 11) & 1),
            tile_index: tileWord & 0x7FF
        });

        const decodeTile = (tileData, palLine) => {
            const result = Buffer.alloc(64); // 8x8 pixels

            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    let pixel = 0;
                    for (let plane = 0; plane < 4; plane++) {
                        const bit = (tileData[y * 4 + plane] >> (7 - x)) & 1;
                        pixel |= bit << plane;
                    }
                    result[y * 8 + x] = pixel + (palLine * 16);
                }
            }

            return result;
        };

        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const mapIndex = (y * mapWidth + x) * 2;
                const tileWord = mapData.readUInt16BE(mapIndex);
                const attrs = decodeTileAttributes(tileWord);

                if (attrs.tile_index * 32 >= stampsData.length) continue;

                const tileData = stampsData.slice(attrs.tile_index * 32, (attrs.tile_index + 1) * 32);
                const decodedTile = decodeTile(tileData, attrs.palette_line);

                const targetBuffer = attrs.priority ? priorityBuffer : imageBuffer;
                for (let py = 0; py < 8; py++) {
                    for (let px = 0; px < 8; px++) {
                        let srcX = attrs.hflip ? 7 - px : px;
                        let srcY = attrs.vflip ? 7 - py : py;
                        
                        const targetX = x * 8 + px;
                        const targetY = y * 8 + py;
                        targetBuffer[targetY * imageWidth + targetX] = decodedTile[srcY * 8 + srcX];
                    }
                }
            }
        }

        for (let i = 0; i < imageBuffer.length; i++) {
            if (priorityBuffer[i] > 0) {
                imageBuffer[i] = priorityBuffer[i];
            }
        }

        const flatPalette = Buffer.alloc(768);
        palette.forEach(([r, g, b], i) => {
            flatPalette[i * 3] = r;
            flatPalette[i * 3 + 1] = g;
            flatPalette[i * 3 + 2] = b;
        });

        await sharp(imageBuffer, {
            raw: {
                width: imageWidth,
                height: imageHeight,
                channels: 1
            }
        })
        .png({
            colors: 64,  // Limit to 64 colors (Genesis palette size)
            palette: true  // Enable palette mode
        })
        .toFile(outputFile);

        console.log(`PNG created successfully: ${outputFile}`);
        console.log(`Dimensions: ${imageWidth}x${imageHeight}`);
        console.log(`Total tiles: ${stampsData.length / 32}`);
    }
}