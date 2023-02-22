const execSync = require('child_process').execSync;
const fs = require('fs');

const NUM_TEAMS = 28;
// const NUM_TEAMS = 1;
const TEAM_DATA_SIZE = 448;
const PALETTE_SIZE = 256;
const BIN_PALETTE_SIZE = 64;
const TEAM_PALETTE_REF_OFFSET = 384;
// const COLOR_MAPPING_DATA_START_IN_HOMEPALS = 336;
const COLOR_MAPPING_DATA_START_IN_HOMEPALS = 320;
// const COLOR_MAPPING_DATA_START_IN_MAPBIN = 144;
const COLOR_MAPPING_DATA_START_IN_MAPBIN = 128;
const fileName = process.argv[2];

const inputBuffer = fs.readFileSync(fileName);

for (let teamIndex = 0; teamIndex < NUM_TEAMS; teamIndex++) {
  const CURRENT_TEAM_DATA_START = teamIndex * TEAM_DATA_SIZE;
  console.log('team',teamIndex);
  const teamPalette = new Buffer(PALETTE_SIZE * 3);
  for (let i = 0; i < BIN_PALETTE_SIZE; i++) {
    const offset = CURRENT_TEAM_DATA_START + i * 3;
    const r = inputBuffer.readUInt8(offset)*4;
    const g = inputBuffer.readUInt8(offset + 1)*4;
    const b = inputBuffer.readUInt8(offset + 2)*4;
    console.log('team palette',offset/3,offset, r,g,b);
    teamPalette.writeUInt8(r, TEAM_PALETTE_REF_OFFSET+i*3);
    teamPalette.writeUInt8(g, TEAM_PALETTE_REF_OFFSET+i*3 + 1);
    teamPalette.writeUInt8(b, TEAM_PALETTE_REF_OFFSET+i*3 + 2);
  }
  fs.writeFileSync(`${teamIndex.toString().padStart(2, '0')}teamPal.ACT`, teamPalette);

  // Merge Rink Pal with Team Pal
  execSync(`node mergeRinkpal ${teamIndex.toString().padStart(2, '0')}teamPal.ACT`, { stdio: 'inherit' });
  // Open Merged Team Pal
  const teamPaletteMerged = fs.readFileSync(`${teamIndex.toString().padStart(2, '0')}teamPalMerged.ACT`);
  
  console.log('START COLOR MAPPING');
  const colorMapping = new Buffer(PALETTE_SIZE);
  let j=COLOR_MAPPING_DATA_START_IN_MAPBIN;
  for(let i = COLOR_MAPPING_DATA_START_IN_HOMEPALS; i<TEAM_DATA_SIZE; i++) {
    const currentColorMapping = inputBuffer.readUInt8(CURRENT_TEAM_DATA_START+i);
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
    const r = teamPaletteMerged.readUInt8(currentColorMapping*3);
    const g = teamPaletteMerged.readUInt8(currentColorMapping*3 + 1);
    const b = teamPaletteMerged.readUInt8(currentColorMapping*3 + 2);

    spritePalette.writeUInt8(r, spritePaletteOffset);
    spritePalette.writeUInt8(g, spritePaletteOffset + 1);
    spritePalette.writeUInt8(b, spritePaletteOffset + 2);
    console.log('colMappingidx',i,'currentColMapping',currentColorMapping,'teamPalette for spritePalIdx',r,g,b,'spritePalOffset',spritePaletteOffset);
    spritePaletteOffset+=3;
  }

  const spritePaletteStart = spritePalette.slice(0, 753);
  const spritePaletteEnd = teamPaletteMerged.slice(753, 768);
  
    // fs.writeFileSync(`${teamIndex.toString().padStart(2, '0')}.ACT`, spritePalette);
  fs.writeFileSync(`${teamIndex.toString().padStart(2, '0')}.ACT`, Buffer.concat([spritePaletteStart, spritePaletteEnd]));

  // Merge Rink pal with final pal
  execSync(`node mergeRinkpal ${teamIndex.toString().padStart(2, '0')}.ACT`, { stdio: 'inherit' });
}
