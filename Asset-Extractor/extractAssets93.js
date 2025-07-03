const fs = require('fs').promises;
const path = require('path');
const crc32 = require('crc-32'); // Requires 'crc-32' package: npm install crc-32

// Asset definitions from the .lst file
const assets = [
    // { name: 'EALogo.bin', folder: 'NHL93/Graphics', start: 0x00000306, end: 0x00001164 },
    { name: 'Bruinsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x972, end: 0x992 },
    { name: 'Bruinsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x992, end: 0x9B2 },
    { name: 'sabresh.pal', folder: 'NHL93/Graphics/Pals', start: 0xC58, end: 0xC78 },
    { name: 'sabresv.pal', folder: 'NHL93/Graphics/Pals', start: 0xC78, end: 0xC98 },
    { name: 'flamesh.pal', folder: 'NHL93/Graphics/Pals', start: 0xF46, end: 0xF66 },
    { name: 'flamesv.pal', folder: 'NHL93/Graphics/Pals', start: 0xF66, end: 0xF86 },
    { name: 'blackhawksh.pal', folder: 'NHL93/Graphics/Pals', start: 0x1240, end: 0x1260 },
    { name: 'blackhawksv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1260, end: 0x1280 },
    { name: 'Redwingsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x153A, end: 0x155A },
    { name: 'Redwingsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x155A, end: 0x157A },
    { name: 'oilersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x1854, end: 0x1874 },
    { name: 'oilersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1874, end: 0x1894 },
    // { name: 'whalersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x000019C8, end: 0x000019E8 },
    // { name: 'whalersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x000019E8, end: 0x00001A08 },
    { name: 'Kingsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x1E5E, end: 0x1E7E },
    { name: 'Kingsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1E7E, end: 0x1E9E },
    // { name: 'northstarsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x00001C52, end: 0x00001C72 },
    // { name: 'northstarsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x00001C72, end: 0x00001C92 },
    { name: 'canadiensh.pal', folder: 'NHL93/Graphics/Pals', start: 0x244A, end: 0x246A },
    { name: 'canadiensv.pal', folder: 'NHL93/Graphics/Pals', start: 0x246A, end: 0x248A },
    // { name: 'devilsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x00001EEA, end: 0x00001F0A },
    // { name: 'devilsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x00001F0A, end: 0x00001F2A },
    { name: 'islandersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x2A64, end: 0x2A84 },
    { name: 'islandersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x2A84, end: 0x2AA4 },
    { name: 'rangersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x2D68, end: 0x2D88 },
    { name: 'rangersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x2D88, end: 0x2DA8 },
    { name: 'flyersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3374, end: 0x3394 },
    { name: 'flyersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3394, end: 0x33B4 },
    { name: 'penguinsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3652, end: 0x3672 },
    { name: 'penguinsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3672, end: 0x3692 },
    // Senators
    { name: 'nordiquesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3948, end: 0x3968 },
    { name: 'nordiquesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3968, end: 0x3988 },
    { name: 'Sharksh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3C4E, end: 0x3C6E },
    { name: 'Sharksv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3C6E, end: 0x3C8E },
    // Lightning
    { name: 'bluesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3F3C, end: 0x3F5C },
    { name: 'bluesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3F5C, end: 0x3F7C },
    { name: 'mapleleafsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x4524, end: 0x4544 },
    { name: 'mapleleafsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x4544, end: 0x4564 },
    { name: 'canucksh.pal', folder: 'NHL93/Graphics/Pals', start: 0x4828, end: 0x4848 },
    { name: 'canucksv.pal', folder: 'NHL93/Graphics/Pals', start: 0x4848, end: 0x4868 },
    { name: 'capitalsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x4E08, end: 0x4E28 },
    { name: 'capitalsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x4E28, end: 0x4E48 },
    { name: 'jetsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x4B16, end: 0x4B36 },
    { name: 'jetsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x4B36, end: 0x4B56 },
    { name: 'Campbellh.pal', folder: 'NHL93/Graphics/Pals', start: 0x38A, end: 0x3AA },
    { name: 'Campbellv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3AA, end: 0x3CA },
    { name: 'Walesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x680, end: 0x6A0 },
    { name: 'Walesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x6A0, end: 0x6C0 },
    { name: 'Unknown1.map.jzip', folder: 'NHL93/Graphics', start: 0x2e1fc, end: 0x2efa6 },
    { name: 'Unknown2.map.jzip', folder: 'NHL93/Graphics', start: 0x2f0b0, end: 0x3128c },
    { name: 'Unknown3.map.jzip', folder: 'NHL93/Graphics', start: 0x32860, end: 0x3338c },
    { name: 'Unknown4.map.jzip', folder: 'NHL93/Graphics', start: 0x33864, end: 0x3890a },
    { name: 'Unknown5.map.jzip', folder: 'NHL93/Graphics', start: 0x7c946, end: 0x7cf22 },
    // { name: 'Hockey.snd', folder: 'NHL93/Sound', start: 0x0000F4C8, end: 0x00024214 },
    // { name: 'GameSetUp.map.jim', folder: 'NHL93/Graphics', start: 0x00024214, end: 0x00025642 },
    // { name: 'Title1.map.jim', folder: 'NHL93/Graphics', start: 0x00025642, end: 0x0002ADF0 },
    // { name: 'Title2.map.jim', folder: 'NHL93/Graphics', start: 0x0002ADF0, end: 0x0002C0FE },
    // { name: 'NHLSpin.map.jim', folder: 'NHL93/Graphics', start: 0x0002C0FE, end: 0x0002E9EC },
    // { name: 'Puck.anim', folder: 'NHL93/Graphics', start: 0x0002E9EC, end: 0x0002F262 },
    // { name: 'Scouting.map.jim', folder: 'NHL93/Graphics', start: 0x0002F262, end: 0x00033590 },
    // { name: 'Framer.map.jim', folder: 'NHL93/Graphics', start: 0x00033590, end: 0x000336B0 },
    // { name: 'FaceOff.map.jim', folder: 'NHL93/Graphics', start: 0x000336B0, end: 0x00033AAE },
    // { name: 'IceRink.map.jim', folder: 'NHL93/Graphics', start: 0x00033AAE, end: 0x0003A3DC },
    // { name: 'Refs.map.jim', folder: 'NHL93/Graphics', start: 0x0003A3DC, end: 0x0003D5EE },
    // { name: 'Sprites.anim', folder: 'NHL93/Graphics', start: 0x0003D5EE, end: 0x0007216C },
    // { name: 'Crowd.anim', folder: 'NHL93/Graphics', start: 0x0007216C, end: 0x00075790 },
    // { name: 'FaceOff.anim', folder: 'NHL93/Graphics', start: 0x00075790, end: 0x0007716C },
    // { name: 'Zam.anim', folder: 'NHL93/Graphics', start: 0x0007716C, end: 0x000778D2 },
    { name: 'BigFont.map.jim', folder: 'NHL93/Graphics', start: 0x000795B8, end: 0x0007A286 },
    // { name: 'SmallFont.map.jim', folder: 'NHL93/Graphics', start: 0x00078C20, end: 0x00079C2E },
    // { name: 'TeamBlocks.map.jim', folder: 'NHL93/Graphics', start: 0x00079C2E, end: 0x0007E79C },
    // { name: 'Arrows.map.jim', folder: 'NHL93/Graphics', start: 0x0007E79C, end: 0x0007EB12 },
    // { name: 'Stanley.map.jim', folder: 'NHL93/Graphics', start: 0x0007EB12, end: 0x0007FC20 },
    // { name: 'EASN.map.jim', folder: 'NHL93/Graphics', start: 0x0007FC20, end: 0x0007FE8A }
];

// Expected CRC32 checksum (996931775 in hexadecimal)
const EXPECTED_CRC32 = 0x2641653F;

async function verifyCRC32(filePath) {
    try {
        const data = await fs.readFile(filePath);
        const calculatedCRC = crc32.buf(data) >>> 0; // Convert to unsigned 32-bit integer
        console.log('Caclulated CRC32:', calculatedCRC, EXPECTED_CRC32);
        return calculatedCRC === EXPECTED_CRC32;
    } catch (error) {
        console.error(`Error reading ROM file for CRC32 check: ${error.message}`);
        return false;
    }
}

async function extractAssets(romPath, options = {}) {
    // Set default options
    const extractOptions = {
        outputDir: options.outputDir || 'Extracted',
        verbose: options.verbose || false
    };
    
    try {
        // Verify CRC32
        const isValid = await verifyCRC32(romPath);
        if (!isValid) {
            console.error('CRC32 checksum mismatch. Expected 3B6BF8BF. Aborting extraction.');
            return;
        }

        // Read the ROM file
        const romData = await fs.readFile(romPath);

        // Create base Extracted directory
        const baseDir = extractOptions.outputDir;
        await fs.mkdir(baseDir, { recursive: true });

        // Extract each asset
        for (const asset of assets) {
            // Create output directory
            const outputDir = path.join(baseDir, asset.folder);
            await fs.mkdir(outputDir, { recursive: true });

            // Extract data
            const assetData = romData.slice(asset.start, asset.end);

            // Write to file
            const outputPath = path.join(outputDir, asset.name);
            await fs.writeFile(outputPath, assetData);
            
            if (extractOptions.verbose) {
                console.log(`Extracted ${asset.name} (${assetData.length} bytes) from offset 0x${asset.start.toString(16)} to 0x${asset.end.toString(16)}`);
                console.log(`Saved to ${outputPath}`);
            } else {
                console.log(`Extracted ${asset.name} to ${outputPath}`);
            }
        }

        console.log('Extraction completed successfully.');
        console.log(`Extracted ${assets.length} assets from NHL 92 ROM.`);
    } catch (error) {
        console.error(`Error during extraction: ${error.message}`);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        romFile: null,
        outputDir: 'Extracted',
        verbose: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-h' || arg === '--help') {
            displayHelp();
            process.exit(0);
        } else if (arg === '-v' || arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '-o' || arg === '--output') {
            if (i + 1 < args.length) {
                options.outputDir = args[++i];
            } else {
                console.error('Error: Output directory not specified');
                displayHelp();
                process.exit(1);
            }
        } else if (!options.romFile) {
            options.romFile = arg;
        }
    }

    return options;
}

// Display help information
function displayHelp() {
    console.log(`
NHL 93 Asset Extractor
======================

This script extracts assets from NHLPA Hockey 93 ROM files.

Usage: node extractAssets93.js [options] <rom_file_path>

Options:
  -h, --help              Display this help message
  -v, --verbose           Display detailed extraction information
  -o, --output <dir>      Specify output directory (default: 'Extracted')

Notes:
  - This script extracts all known assets from the NHL 92 ROM
  - ROM checksums are verified to ensure correct ROM is used

Examples:
  node extractAssets93.js nhl93retail.bin
  node extractAssets93.js --verbose --output NHL93Assets nhl93retail.bin
    `);
}

// Main execution
const options = parseArgs();

if (!options.romFile) {
    console.error('Error: ROM file path not provided');
    displayHelp();
    process.exit(1);
}

console.log(`Extracting assets from: ${options.romFile}`);
console.log(`Output directory: ${options.outputDir}`);
if (options.verbose) {
    console.log('Verbose mode enabled');
}

extractAssets(options.romFile, {
    outputDir: options.outputDir,
    verbose: options.verbose
});