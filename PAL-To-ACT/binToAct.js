const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

/**
 * BIN-To-ACT: Converts NHL94/NHL95 PC HOMEPALS/AWAYPALS.BIN files to ACT files
 * 
 * This script processes the NHL94/NHL95 PC jersey palette files and creates Adobe Color Table (.ACT) 
 * files for each team. It extracts team colors, merges them with the rink palette,
 * and creates properly mapped palettes for sprite editing.
 * 
 * If NHL94PAL\HOMEPALS.BIN or NHL94PAL\AWAYPALS.BIN exist, they will be processed using
 * the NHL94 team names and count. If NHL95PAL\HOMEPALS.BIN or NHL95PAL\AWAYPALS.BIN exist,
 * they will be processed using the NHL95 team names and count.
 * 
 * Usage:
 *   node binToAct.js
 * 
 * Example:
 *   node binToAct.js
 * 
 * Output:
 *   Creates multiple .ACT files in the appropriate subdirectories under ./Unpack:
 *   - Unpack\NHL94PAL\HOMEPALS\<team>-04-teamPal.ACT   - Team palette for NHL94
 *   - Unpack\NHL94PAL\AWAYPALS\<team>-03-gamePal.ACT   - Game palette for NHL94
 *   - Unpack\NHL95PAL\HOMEPALS\<team>-04-teamPal.ACT   - Team palette for NHL95
 *   - Unpack\NHL95PAL\AWAYPALS\<team>-03-gamePal.ACT   - Game palette for NHL95
 */

// Get script name for usage display
const scriptName = path.basename(process.argv[1]);

// Constants for all versions
const TEAM_DATA_SIZE = 448;
const PALETTE_SIZE = 256;
const BIN_PALETTE_SIZE = 64;
const TEAM_PALETTE_REF_OFFSET = 384;
const COLOR_MAPPING_DATA_START_IN_HOMEPALS = 320;
const COLOR_MAPPING_DATA_START_IN_MAPBIN = 128;

// File and directory configuration
const NHL94_DIR = 'NHL94PAL';
const NHL95_DIR = 'NHL95PAL';
const HOME_FILE = 'HOMEPALS.BIN';
const AWAY_FILE = 'AWAYPALS.BIN';
const BASE_UNPACK_DIR = path.join('.', 'Unpack');

// The NHL95 version has 28 teams
const NHL95_TEAMS_COUNT = 28;

// The NHL94 version has more teams (check how many teams in teamName object)
const NHL94_TEAMS_COUNT = 36; // Based on the length of teamName object

// Team names for NHL95
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
};

// Team names for NHL94
const teamName94 = {
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
  24: 'ASW',
  25: 'ASE',
};

// Check for NHL94 and NHL95 directories and files
const nhl94HomeFilePath = path.join(NHL94_DIR, HOME_FILE);
const nhl94AwayFilePath = path.join(NHL94_DIR, AWAY_FILE);
const nhl95HomeFilePath = path.join(NHL95_DIR, HOME_FILE);
const nhl95AwayFilePath = path.join(NHL95_DIR, AWAY_FILE);

// Check if any of the potential files exist
const nhl94HomeExists = fs.existsSync(nhl94HomeFilePath);
const nhl94AwayExists = fs.existsSync(nhl94AwayFilePath);
const nhl95HomeExists = fs.existsSync(nhl95HomeFilePath);
const nhl95AwayExists = fs.existsSync(nhl95AwayFilePath);

if (!nhl94HomeExists && !nhl94AwayExists && !nhl95HomeExists && !nhl95AwayExists) {
  console.error(`
Error: No palette files found

Please make sure either NHL94PAL or NHL95PAL directories exist with HOMEPALS.BIN or AWAYPALS.BIN files.

Expected files:
  - ${nhl94HomeFilePath}
  - ${nhl94AwayFilePath}
  - ${nhl95HomeFilePath}
  - ${nhl95AwayFilePath}
`);
  process.exit(1);
}

// Process each file if it exists
if (nhl94HomeExists) {
  console.log(`Processing ${nhl94HomeFilePath}...`);
  processFile(nhl94HomeFilePath, 'HOMEPALS', NHL94_DIR, teamName94, NHL94_TEAMS_COUNT);
}

if (nhl94AwayExists) {
  console.log(`Processing ${nhl94AwayFilePath}...`);
  processFile(nhl94AwayFilePath, 'AWAYPALS', NHL94_DIR, teamName94, NHL94_TEAMS_COUNT);
}

if (nhl95HomeExists) {
  console.log(`Processing ${nhl95HomeFilePath}...`);
  processFile(nhl95HomeFilePath, 'HOMEPALS', NHL95_DIR, teamName95, NHL95_TEAMS_COUNT);
}

if (nhl95AwayExists) {
  console.log(`Processing ${nhl95AwayFilePath}...`);
  processFile(nhl95AwayFilePath, 'AWAYPALS', NHL95_DIR, teamName95, NHL95_TEAMS_COUNT);
}

/**
 * Processes a palette BIN file and converts it to ACT files
 * @param {string} filePath - Path to the BIN file
 * @param {string} fileType - Type of file (HOMEPALS or AWAYPALS)
 * @param {string} gameDir - Game directory (NHL94PAL or NHL95PAL)
 * @param {object} teamNameMap - Object mapping team indexes to team names
 * @param {number} teamCount - Number of teams to process
 */
function processFile(filePath, fileType, gameDir, teamNameMap, teamCount) {
  // Create output directory
  const outputDir = path.join(BASE_UNPACK_DIR, gameDir, fileType);
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const inputBuffer = fs.readFileSync(filePath);

    for (let teamIndex = 0; teamIndex < teamCount; teamIndex++) {
      const currentTeam = teamNameMap[teamIndex];
      if (!currentTeam) {
        console.warn(`Warning: No team name defined for index ${teamIndex}, skipping`);
        continue;
      }
      
      console.log(`Processing team ${teamIndex}: ${currentTeam}`);
      const CURRENT_TEAM_DATA_START = teamIndex * TEAM_DATA_SIZE;      const teamPalette = new Buffer(PALETTE_SIZE * 3);
      
      // Extract team palette from the BIN file
      for (let i = 0; i < BIN_PALETTE_SIZE; i++) {
        const offset = CURRENT_TEAM_DATA_START + i * 3;
        const r = inputBuffer.readUInt8(offset) * 4;
        const g = inputBuffer.readUInt8(offset + 1) * 4;
        const b = inputBuffer.readUInt8(offset + 2) * 4;
        
        console.log(`Team palette ${i}, offset ${offset}, RGB: ${r},${g},${b}`);
        
        teamPalette.writeUInt8(r, TEAM_PALETTE_REF_OFFSET + i * 3);
        teamPalette.writeUInt8(g, TEAM_PALETTE_REF_OFFSET + i * 3 + 1);
        teamPalette.writeUInt8(b, TEAM_PALETTE_REF_OFFSET + i * 3 + 2);
      }
      
      // Generate file paths for this team
      const teamPalPath = path.join(outputDir, `${currentTeam}-04-teamPal.ACT`);
      const gamePalPath = path.join(outputDir, `${currentTeam}-03-gamePal.ACT`);
      const colorMapPath = path.join(outputDir, `${currentTeam}-04-colorMapping.bin`);
      const teamEditPalPath = path.join(outputDir, `${currentTeam}-02-teamEditPal.ACT`);
      const createPalPath = path.join(outputDir, `${currentTeam}-01-createPal.ACT`);
      
      // Save team palette
      fs.writeFileSync(teamPalPath, teamPalette);
      
      // Merge rink palette with team palette
      execSync(`node mergePal rinkpalShadowfixed.act "${teamPalPath}" 128 "${gamePalPath}"`, { stdio: 'inherit' });
      
      // Open merged team palette
      const teamPaletteMerged = fs.readFileSync(gamePalPath);
      
      // Generate color mapping
      console.log('START COLOR MAPPING');
      const colorMapping = new Buffer(PALETTE_SIZE);
      let j = COLOR_MAPPING_DATA_START_IN_MAPBIN;
      
      for (let i = COLOR_MAPPING_DATA_START_IN_HOMEPALS; i < TEAM_DATA_SIZE; i++) {
        const currentColorMapping = inputBuffer.readUInt8(CURRENT_TEAM_DATA_START + i);
        console.log(`Color mapping index ${j}: ${currentColorMapping}`);
        colorMapping.writeUInt8(currentColorMapping, j++);
      }
      
      fs.writeFileSync(colorMapPath, colorMapping);
      
      // Map team palette to sprite palette
      const spritePalette = new Buffer(PALETTE_SIZE * 3);
      let spritePaletteOffset = 0;
      
      console.log('START MAPPING TEAM PAL TO SPRITE PAL');
      
      for (let i = 0; i < PALETTE_SIZE; i++) {
        const currentColorMapping = colorMapping.readUInt8(i);
        const r = teamPaletteMerged.readUInt8(currentColorMapping * 3);
        const g = teamPaletteMerged.readUInt8(currentColorMapping * 3 + 1);
        const b = teamPaletteMerged.readUInt8(currentColorMapping * 3 + 2);
        
        spritePalette.writeUInt8(r, spritePaletteOffset);
        spritePalette.writeUInt8(g, spritePaletteOffset + 1);
        spritePalette.writeUInt8(b, spritePaletteOffset + 2);
        
        console.log(`Color mapping idx ${i}, mapping ${currentColorMapping}, RGB: ${r},${g},${b}`);
        spritePaletteOffset += 3;
      }
      
      // Read create jersey palette
      const createJersey = fs.readFileSync('createjerseyShadowfixed.act');
      
      // Merge sprite palette with create jersey palette
      const spritePaletteStart = spritePalette.slice(0, 753);
      const spritePaletteEnd = createJersey.slice(753, 768);
      
      fs.writeFileSync(teamEditPalPath, Buffer.concat([spritePaletteStart, spritePaletteEnd]));
      
      // Merge rink palette with final palette
      execSync(`node mergePal createjerseyShadowfixed.act "${teamEditPalPath}" 144 "${createPalPath}"`, { stdio: 'inherit' });
      
      console.log(`Completed processing team ${currentTeam}\n`);
    }
    
    console.log(`Finished processing ${filePath}`);
    
  } catch (err) {
    console.error(`Error processing file ${filePath}: ${err.message}`);
  }
}
