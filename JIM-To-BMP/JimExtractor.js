import fs from 'fs/promises';
import sharp from 'sharp';
import { Buffer } from 'buffer';

interface TileAttributes {
    tile_index: number;
    palette_line: number;
    priority: number;
    vflip: boolean;
    hflip: boolean;
}

export class JimExtractor {
    private data: Buffer;
    private palOffset: number;
    private mapOffset: number;
    private numStamps: number;

    constructor(data: Buffer) {
        this.data = data;
        this.extractHeader();
    }

    static async fromFile(filename: string): Promise<JimExtractor> {
        const data = await fs.readFile(filename);
        return new JimExtractor(data);
    }

    private readLong(offset: number): number {
        return this.data.readUInt32BE(offset);
    }

    private readWord(offset: number): number {
        return this.data.readUInt16BE(offset);
    }

    private extractHeader(): void {
        this.palOffset = this.readLong(0);
        this.mapOffset = this.readLong(4);
        this.numStamps = this.readWord(8);
    }

    public printHeaderInfo(): void {
        console.log("Header Information:");
        console.log(`├── Palette Offset: ${this.palOffset} (0x${this.palOffset.toString(16).toUpperCase()})`);
        console.log(`├── Map Offset: ${this.mapOffset} (0x${this.mapOffset.toString(16).toUpperCase()})`);
        console.log(`└── Stamps Offset: 10 to ${this.palOffset} (0x${this.palOffset.toString(16).toUpperCase()})`);
    }

    public extractPalette(): Array<[number, number, number]> {
        const colors: Array<[number, number, number]> = [];
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

    public extractStamps(): Buffer {
        return this.data.slice(10, this.palOffset);
    }

    public extractMap(): [number, number, Buffer] {
        const width = this.readWord(this.mapOffset);
        const height = this.readWord(this.mapOffset + 2);
        const mapData = this.data.slice(
            this.mapOffset + 4,
            this.mapOffset + 4 + (width * height * 2)
        );
        return [width, height, mapData];
    }

    public async buildPNG(outputFile: string): Promise<void> {
        const [mapWidth, mapHeight, mapData] = this.extractMap();
        const stampsData = this.extractStamps();
        const palette = this.extractPalette();

        // Create image dimensions
        const imageWidth = mapWidth * 8;
        const imageHeight = mapHeight * 8;

        // Create image buffer
        const imageBuffer = Buffer.alloc(imageWidth * imageHeight);
        const priorityBuffer = Buffer.alloc(imageWidth * imageHeight);

        // Helper function to decode tile attributes
        const decodeTileAttributes = (tileWord: number): TileAttributes => ({
            priority: (tileWord >> 15) & 1,
            palette_line: (tileWord >> 13) & 3,
            vflip: Boolean((tileWord >> 12) & 1),
            hflip: Boolean((tileWord >> 11) & 1),
            tile_index: tileWord & 0x7FF
        });

        // Helper function to decode 4bpp tile data
        const decodeTile = (tileData: Buffer, palLine: number): Buffer => {
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

        // Process each tile in the map
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const mapIndex = (y * mapWidth + x) * 2;
                const tileWord = mapData.readUInt16BE(mapIndex);
                const attrs = decodeTileAttributes(tileWord);

                if (attrs.tile_index * 32 >= stampsData.length) continue;

                const tileData = stampsData.slice(attrs.tile_index * 32, (attrs.tile_index + 1) * 32);
                const decodedTile = decodeTile(tileData, attrs.palette_line);

                // Apply tile to appropriate buffer
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

        // Combine layers (priority layer on top)
        for (let i = 0; i < imageBuffer.length; i++) {
            if (priorityBuffer[i] > 0) {
                imageBuffer[i] = priorityBuffer[i];
            }
        }

        // Convert palette to format expected by sharp
        const flatPalette = Buffer.alloc(768); // 256 colors * 3 bytes
        palette.forEach(([r, g, b], i) => {
            flatPalette[i * 3] = r;
            flatPalette[i * 3 + 1] = g;
            flatPalette[i * 3 + 2] = b;
        });

        // Create PNG using sharp
        await sharp(imageBuffer, {
            raw: {
                width: imageWidth,
                height: imageHeight,
                channels: 1
            }
        })
        .png({
            palette: flatPalette
        })
        .toFile(outputFile);

        console.log(`PNG created successfully: ${outputFile}`);
        console.log(`Dimensions: ${imageWidth}x${imageHeight}`);
        console.log(`Total tiles: ${stampsData.length / 32}`);
    }
}