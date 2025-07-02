const fs = require('fs');

const buffer = fs.readFileSync('c:/repository/NHLHockey/nhl92retail.bin');
const offset = 0x24214;

console.log('Data at offset 0x24214:');
for (let i = 0; i < 32; i++) {
  const byte = buffer[offset + i];
  process.stdout.write(byte.toString(16).padStart(2, '0') + ' ');
  if ((i + 1) % 8 === 0) console.log('');
}
console.log('\n');

// Read as big-endian values
const paletteOffset = buffer.readUInt32BE(offset);
const mapOffset = buffer.readUInt32BE(offset + 4);
const numberOfTiles = buffer.readUInt16BE(offset + 8);

console.log('Palette Section Offset:', '0x' + paletteOffset.toString(16), '(' + paletteOffset + ')');
console.log('Map Section Offset:', '0x' + mapOffset.toString(16), '(' + mapOffset + ')');
console.log('Number of Tiles (16-bit):', numberOfTiles);

// Calculate expected palette offset for .map.jim
const expectedPaletteOffset = 10 + (numberOfTiles * 32);
console.log('Expected Palette Offset for .map.jim:', '0x' + expectedPaletteOffset.toString(16), '(' + expectedPaletteOffset + ')');
console.log('Match:', expectedPaletteOffset === paletteOffset ? 'YES' : 'NO');

// Check if offsets are valid relative to file
console.log('\nValidation checks:');
console.log('File length:', buffer.length, '(0x' + buffer.length.toString(16) + ')');
console.log('offset + paletteOffset:', offset + paletteOffset, '(0x' + (offset + paletteOffset).toString(16) + ')');
console.log('offset + mapOffset:', offset + mapOffset, '(0x' + (offset + mapOffset).toString(16) + ')');
console.log('paletteOffset < mapOffset:', paletteOffset < mapOffset);
console.log('paletteOffset > 10:', paletteOffset > 10);
