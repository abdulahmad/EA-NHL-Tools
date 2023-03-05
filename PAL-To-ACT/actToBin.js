// First step -- compile NHL palette

const execSync = require('child_process').execSync;
const fs = require('fs');

const baseDir = '.\\Unpack';
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

const teamName95 = {
  0: 'BOS',
  1: 'BUF',
  2: 'CGY',
  3: 'CHI',
  4: 'DET',
  5: 'EDM',
  6: 'HFD',
  7: 'LA',
  8: 'MIN',
  9: 'MTL',
  10: 'NJ',
  11: 'NYI',
  12: 'NYR',
  13: 'OTT',
  14: 'PHI',
  15: 'PIT',
  16: 'QUE',
  17: 'STL',
  18: 'SJ',
  19: 'TB',
  20: 'TOR',
  21: 'VAN',
  22: 'WSH',
  23: 'WPG',
  24: 'ANA',
  25: 'FLA',
  26: 'ASW',
  27: 'ASE',
}

const teamName = {
  0: 'BOS',
  1: 'BUF',
  2: 'CGY',
  3: 'CHI',
  4: 'DET',
  5: 'EDM',
  6: 'CAR',
  7: 'LA',
  8: 'MIN',
  9: 'MTL',
  10: 'NJ',
  11: 'NYI',
  12: 'NYR',
  13: 'OTT',
  14: 'PHI',
  15: 'PIT',
  16: 'COL',
  17: 'STL',
  18: 'SJ',
  19: 'TB',
  20: 'TOR',
  21: 'VAN',
  22: 'WSH',
  23: 'WPG',
  24: 'ANA',
  25: 'FLA',
  26: 'PAC',
  27: 'MET',
  28: 'DAL',
  29: 'ARI',
  30: 'NSH',
  31: 'CBJ',
  32: 'VGK',
  33: 'SEA',
  34: 'CEN',
  35: 'ATL',
}

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
  let currentTeam = teamName95[teamIndex];

  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(`${baseDir}\\${currentTeam}-04-teamPal.ACT`, teamPalette);

  // Merge Rink Pal with Team Pal
  execSync(`node mergePal rinkpal.act ${baseDir}\\${currentTeam}-04-teamPal.ACT 128 ${baseDir}\\${currentTeam}-03-gamePal.ACT`, { stdio: 'inherit' });
  // Open Merged Team Pal
  const teamPaletteMerged = fs.readFileSync(`${baseDir}\\${currentTeam}-03-gamePal.ACT`);
  
  console.log('START COLOR MAPPING');
  const colorMapping = new Buffer(PALETTE_SIZE);
  let j=COLOR_MAPPING_DATA_START_IN_MAPBIN;
  for(let i = COLOR_MAPPING_DATA_START_IN_HOMEPALS; i<TEAM_DATA_SIZE; i++) {
    const currentColorMapping = inputBuffer.readUInt8(CURRENT_TEAM_DATA_START+i);
    console.log('colorMappingIndex',j,currentColorMapping)
    colorMapping.writeUInt8(currentColorMapping, j++);
  }
  fs.writeFileSync(`${baseDir}\\${currentTeam}-04-colorMapping.bin`, colorMapping);

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

  const createJersey = fs.readFileSync('createjersey.act');

  const spritePaletteStart = spritePalette.slice(0, 753);
  const spritePaletteEnd = createJersey.slice(753, 768);
  
  fs.writeFileSync(`${baseDir}\\${currentTeam}-02-teamEditPal.ACT`, Buffer.concat([spritePaletteStart, spritePaletteEnd]));
  // fs.writeFileSync(`${baseDir}\\${currentTeam}-02-teamEditPal.ACT`, spritePalette);

  // Merge Rink pal with final pal
  execSync(`node mergePal createjersey.act ${baseDir}\\${currentTeam}-02-teamEditPal.ACT 144 ${baseDir}\\${currentTeam}-01-createPal.ACT`, { stdio: 'inherit' });
}
