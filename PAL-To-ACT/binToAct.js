const fs = require('fs');

const NUM_TEAMS = 28;
// const NUM_TEAMS = 1;
const TEAM_DATA_SIZE = 448;
const PALETTE_SIZE = 256;
const BIN_PALETTE_SIZE = 64;
const TEAM_PALETTE_START = 384;
const COLOR_MAPPING_START = 336;

const fileName = process.argv[2];

const inputBuffer = fs.readFileSync(fileName);

for (let teamIndex = 0; teamIndex < NUM_TEAMS; teamIndex++) {
  console.log('team',teamIndex);
  const teamPalette = new Buffer(PALETTE_SIZE * 3);
  for (let i = 0; i < BIN_PALETTE_SIZE; i++) {
    const offset = teamIndex * TEAM_DATA_SIZE + i * 3;
    const r = inputBuffer.readUInt8(offset)*4;
    const g = inputBuffer.readUInt8(offset + 1)*4;
    const b = inputBuffer.readUInt8(offset + 2)*4;
    console.log('team palette',offset/3,offset, r,g,b);
    teamPalette.writeUInt8(r, TEAM_PALETTE_START+i*3);
    teamPalette.writeUInt8(g, TEAM_PALETTE_START+i*3 + 1);
    teamPalette.writeUInt8(b, TEAM_PALETTE_START+i*3 + 2);
  }
  fs.writeFileSync(`${teamIndex.toString().padStart(2, '0')}teamPal.ACT`, teamPalette);

  console.log('START COLOR MAPPING');
  const colorMapping = new Buffer(PALETTE_SIZE);
  let j=144;
  for(let i = COLOR_MAPPING_START; i<TEAM_DATA_SIZE; i++) {
    const currentColorMapping = inputBuffer.readUInt8(i);
    console.log('colorMappingIndex',j,currentColorMapping)
    colorMapping.writeUInt8(currentColorMapping, j++);
  }
  fs.writeFileSync(`${teamIndex.toString().padStart(2, '0')}colorMapping.bin`, colorMapping);

  const spritePalette = new Buffer(PALETTE_SIZE * 3);
  let spritePaletteOffset = 0;
  console.log('START MAPPING TEAM PAL TO SPRITE PAL');
  console.log(colorMapping);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const currentColorMapping = colorMapping.readUInt8(i);
    const r = teamPalette.readUInt8(currentColorMapping*3);
    const g = teamPalette.readUInt8(currentColorMapping*3 + 1);
    const b = teamPalette.readUInt8(currentColorMapping*3 + 2);

    // let inputOffset = teamIndex * TEAM_DATA_SIZE + COLOR_MAPPING_START + i;
    
    // const teamPaletteIndex = inputBuffer.readUInt8(inputOffset);
    // const r = teamPalette.readUInt8(teamPaletteIndex * 3);
    // const g = teamPalette.readUInt8(teamPaletteIndex * 3 + 1);
    // const b = teamPalette.readUInt8(teamPaletteIndex * 3 + 2);
    spritePalette.writeUInt8(r, spritePaletteOffset);
    spritePalette.writeUInt8(g, spritePaletteOffset + 1);
    spritePalette.writeUInt8(b, spritePaletteOffset + 2);
    console.log('colMappingidx',i,'currentColMapping',currentColorMapping,'teamPalette for spritePalIdx',r,g,b,'spritePalOffset',spritePaletteOffset);
    spritePaletteOffset+=3;
  }

//   const outputBuffer = Buffer.concat([
//     new Buffer([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]), // ACT file header
//     spritePalette,
//   ]);
  fs.writeFileSync(`${teamIndex.toString().padStart(2, '0')}.ACT`, spritePalette);
}
