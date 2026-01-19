let d0, d1, d2, d3, d4;
let a0, a1, a2, a3, a4, a5, a6;
function startDecompression(jimDataPtr, data) {
    var pos = jimDataPtr;
    let paletteOffset = readl(pos); pos = incl(pos);
    let tileMapHeaderOffset = readl(pos); pos = incl(pos);
    decompressGraphics(pos, data);
}

function decompressGraphics(jimDataPtr, data) {
    a2 = jimDataPtr;
    let tileOffset = 0;
    d4 = tileOffset;

    a0 = a2; // current position in data
    d1 = d4; // tile offset in bytes
    d1 = d1 * 32; // converts tile number → byte offset in VRAM
    d0 = readw(a0, data); // read header (80 3D)
    a0 = incw(a0); // advance data pointer
    if (d0 ===0) { // if command == 0 → end of stream → finish decompression
        return;
    } else if (d0 < 0) { //if < 0 (i.e. bit 15 is set) → special decompression mode
        // Compressed block
        const decompressed = decompress(data, a0, d0);
        // Write decompressed data to appropriate location
    }
    // → advance current tile index by this many tiles
    // (basically "skip writing this many tiles")
    d4 = d4 + d0;
    // each tile is 32 bytes, but DMA often transfers in words
    d0 = d0 * 16;
    
    // Push return address = end of decompression
    // pea     (_enddecompression).l TODO

    // Check if there's a custom DMA callback function set
    // tst.l   (callbackPtr).w TODO

    // If callbackPtr == 0 → use normal/default DMA routine
    // beq.w   DoDMApro TODO

    // a1 = callback function pointer
    // movea.l (callbackPtr).w,a1 TODO

    // Jump to routine that will:
    // • probably convert tile number → VRAM address
    // • call the callback (which usually does DMA/upload)
    // bra.w   ConvertAndWriteToVDP TODO
}

function decompress(data, pos) {
    d0 = -d0; // make positive, number of tiles to decompress
    console.log(`Compressed block: ${d0} tiles expected`);

    d4 = d4+d0; // advance tile index by this many tiles
    decompressBytecode(data, pos);
}

function decompressBytecode(data, pos) {
    a1 = -1;
    a3 = -1;
    d3 = d1; // (tile byte offset)
    d1 = 0;
    d2 = 0;

    // Main decompression loop
}

function readb(pos) { //1 byte, 8 bits
    return;
}
function readw(pos) { //2 bytes, 16 bits
    return;
}
function readl(pos) { //4 bytes, 32 bits
    return;
}
function incb(pos) {
    return pos + 1;
}
function incw(pos) {
    return pos + 2;
}
function incl(pos) {
    return pos + 4;
}