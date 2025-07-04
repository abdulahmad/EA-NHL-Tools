const fs = require('fs').promises;
const path = require('path');
const crc32 = require('crc-32'); // Requires 'crc-32' package: npm install crc-32

// Asset definitions from the .lst file
const assets = [
    // { name: 'EALogo.bin', folder: 'NHL93/Graphics', start: 0x00000306, end: 0x00001164 },
    // { name: 'Walesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x680, end: 0x6A0 },
    // { name: 'Walesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x6A0, end: 0x6C0 },
    // { name: 'Campbellh.pal', folder: 'NHL93/Graphics/Pals', start: 0x38A, end: 0x3AA },
    // { name: 'Campbellv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3AA, end: 0x3CA },
    { name: 'Walesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x388, end: 0x3A8 }, // ASE
    { name: 'Walesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3A8, end: 0x3C8 },
    { name: 'Campbellh.pal', folder: 'NHL93/Graphics/Pals', start: 0x624, end: 0x644 }, // ASW
    { name: 'Campbellv.pal', folder: 'NHL93/Graphics/Pals', start: 0x644, end: 0x664 },
    { name: 'Bruinsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x8C4, end: 0x8E4 },
    { name: 'Bruinsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x8E4, end: 0x904 },
    { name: 'sabresh.pal', folder: 'NHL93/Graphics/Pals', start: 0xB7C, end: 0xB9C },
    { name: 'sabresv.pal', folder: 'NHL93/Graphics/Pals', start: 0xB9C, end: 0xBBC },
    { name: 'flamesh.pal', folder: 'NHL93/Graphics/Pals', start: 0xE3E, end: 0xE5E },
    { name: 'flamesv.pal', folder: 'NHL93/Graphics/Pals', start: 0xE5E, end: 0xE7E },
    { name: 'blackhawksh.pal', folder: 'NHL93/Graphics/Pals', start: 0x10E4, end: 0x1104 },
    { name: 'blackhawksv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1104, end: 0x1124 },
    { name: 'Redwingsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x13A4, end: 0x13C4 },
    { name: 'Redwingsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x13C4, end: 0x13E4 },
    { name: 'oilersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x165C, end: 0x167C },
    { name: 'oilersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x167C, end: 0x169C },
    { name: 'whalersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x190A, end: 0x192A },
    { name: 'whalersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x192A, end: 0x194A },
    { name: 'islandersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x1E88, end: 0x1EA8 }, // LI
    { name: 'islandersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1EA8, end: 0x1EC8 },
    { name: 'Kingsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x1BBE, end: 0x1BDE },
    { name: 'Kingsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1BDE, end: 0x1BFE },
    { name: 'northstarsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x1E88, end: 0x1EA8 },
    { name: 'northstarsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x1EA8, end: 0x1EC8 },
    { name: 'canadiensh.pal', folder: 'NHL93/Graphics/Pals', start: 0x23D6, end: 0x23F6 },
    { name: 'canadiensv.pal', folder: 'NHL93/Graphics/Pals', start: 0x23F6, end: 0x2416 },
    { name: 'devilsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x26AE, end: 0x26CE },
    { name: 'devilsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x26CE, end: 0x26EE },
    { name: 'rangersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x2966, end: 0x2986 },
    { name: 'rangersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x2986, end: 0x29A6 },
    { name: 'senatorsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x2C2E, end: 0x2C4E }, // OTT
    { name: 'senatorsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x2C4E, end: 0x2C6E },
    { name: 'flyersh.pal', folder: 'NHL93/Graphics/Pals', start: 0x2E4C, end: 0x2E6C },
    { name: 'flyersv.pal', folder: 'NHL93/Graphics/Pals', start: 0x2E6C, end: 0x2E8C },
    { name: 'penguinsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3108, end: 0x3128 },
    { name: 'penguinsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3128, end: 0x3148 },
    { name: 'nordiquesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x33AC, end: 0x33CC },
    { name: 'nordiquesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x33CC, end: 0x33EC },
    { name: 'Sharksh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3686, end: 0x36A6 },
    { name: 'Sharksv.pal', folder: 'NHL93/Graphics/Pals', start: 0x36A6, end: 0x36C6 },
    { name: 'bluesh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3940, end: 0x3960 },
    { name: 'bluesv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3960, end: 0x3980 },
    { name: 'lightningh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3BF6, end: 0x3C16 }, // TB
    { name: 'lightningv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3C16, end: 0x3C36 },
    { name: 'mapleleafsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x3E34, end: 0x3E54 },
    { name: 'mapleleafsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x3E54, end: 0x3E74 },
    { name: 'canucksh.pal', folder: 'NHL93/Graphics/Pals', start: 0x40EE, end: 0x410E },
    { name: 'canucksv.pal', folder: 'NHL93/Graphics/Pals', start: 0x410E, end: 0x412E },
    { name: 'jetsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x43A8, end: 0x43C8 },
    { name: 'jetsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x43C8, end: 0x43E8 },
    { name: 'capitalsh.pal', folder: 'NHL93/Graphics/Pals', start: 0x4666, end: 0x4686 },
    { name: 'capitalsv.pal', folder: 'NHL93/Graphics/Pals', start: 0x4686, end: 0x46A6 },
    // START OF DATA FILES
    { name: 'GameSetUp93.map.jzip', folder: 'NHL93/Graphics', start: 0x02E1FC, end: 0x02EFA6 }, // 1.0: ref@0x13A01; 1.1: starts: 0x02E22A ref@0x13A19
    { name: 'Unknown93-2.map.jzip2', folder: 'NHL93/Graphics', start: 0x02EFA6, end: 0x02F0B0 }, // ref is offset
    { name: 'Unknown93-3.map.jzip', folder: 'NHL93/Graphics', start: 0x02F0B0, end: 0x03128C }, // 1.0: ref@0x134E3; 1.1: starts: 0x02F0DE
    { name: 'Unknown93-4.map.jzip2', folder: 'NHL93/Graphics', start: 0x03128C, end: 0x031F14 }, // ref is offset
    { name: 'Unknown93-5.map.jzip2', folder: 'NHL93/Graphics', start: 0x031F14, end: 0x0322CE },
    { name: 'Unknown93-6.map.jzip2', folder: 'NHL93/Graphics', start: 0x0322CE, end: 0x032860 },
    { name: 'EABkgd93.map.jzip', folder: 'NHL93/Graphics', start: 0x032860, end: 0x03338C },
    { name: 'Framer93.map.jzip2', folder: 'NHL93/Graphics', start: 0x03338C, end: 0x033864 }, // theres more files in this area!
    { name: 'Unknown93-8.map.jzip', folder: 'NHL93/Graphics', start: 0x033864, end: 0x03890A }, // likely IceRank94.map.jzip2
    { name: 'Unknown93-9.map.jzip2', folder: 'NHL93/Graphics', start: 0x03890A, end: 0x039466 },
    { name: 'Unknown93-10.map.jzip2', folder: 'NHL93/Graphics', start: 0x039466, end: 0x03A37C },
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
    { name: 'Sprites93.anim', folder: 'NHL93/Graphics', start: 0x03A37C, end: 0x0748E6 },
    { name: 'Unknown93-1.anim', folder: 'NHL93/Graphics', start: 0x0748E6, end: 0x077174 }, // likely Crowd.anim
    { name: 'Unknown93-2.anim', folder: 'NHL93/Graphics', start: 0x077174, end: 0x0781E8 }, // likely FaceOff.anim
    { name: 'Unknown93-3.anim', folder: 'NHL93/Graphics', start: 0x0781E8, end: 0x078D02 }, // likely Zam.anim
    { name: 'Unknown93-11.jzip2', folder: 'NHL93/Graphics', start: 0x078D02, end: 0x0795B8 }, // likely BigFont93.map.jzip2
    // { name: 'Crowd.anim', folder: 'NHL93/Graphics', start: 0x0007216C, end: 0x00075790 },
    // { name: 'FaceOff.anim', folder: 'NHL93/Graphics', start: 0x00075790, end: 0x0007716C },
    // { name: 'Zam.anim', folder: 'NHL93/Graphics', start: 0x0007716C, end: 0x000778D2 },
    // { name: 'BigFont.map.jim', folder: 'NHL93/Graphics', start: 0x000778D2, end: 0x00078C20 },
    { name: 'SmallFont93.map.jim', folder: 'NHL93/Graphics', start: 0x0795B8, end: 0x07A286 },
    { name: 'Unknown93-12.map.jzip2', folder: 'NHL93/Graphics', start: 0x07A286, end: 0x07A375 },
    { name: 'Unknown93-13.map.jzip2', folder: 'NHL93/Graphics', start: 0x07A375, end: 0x07C552 },
    { name: 'Unknown93-14.map.jzip2', folder: 'NHL93/Graphics', start: 0x07C552, end: 0x07C7AD },
    { name: 'Unknown93-15.bin', folder: 'NHL93/Graphics', start: 0x07C7AD, end: 0x07C946 },
    { name: 'Ronbarr.map.jzip', folder: 'NHL93/Graphics', start: 0x07C946, end: 0x07CF22 },
    { name: 'Unknown93-16.map.jzip2', folder: 'NHL93/Graphics', start: 0x07CF22, end: 0x07D308 },
    { name: 'Unknown93-17.map.jzip2', folder: 'NHL93/Graphics', start: 0x07D308, end: 0x07F4F6 },
    { name: 'Unknown93-18.map.jzip2', folder: 'NHL93/Graphics', start: 0x07F4F6, end: 0x07FBCC },
    // { name: 'TeamBlocks.map.jim', folder: 'NHL93/Graphics', start: 0x00079C2E, end: 0x0007E79C },
    // { name: 'Arrows.map.jim', folder: 'NHL93/Graphics', start: 0x0007E79C, end: 0x0007EB12 },
    // { name: 'Stanley.map.jim', folder: 'NHL93/Graphics', start: 0x0007EB12, end: 0x0007FC20 },
    // { name: 'EASN.map.jim', folder: 'NHL93/Graphics', start: 0x0007FC20, end: 0x0007FE8A }
];

// Expected CRC32 checksum (996931775 in hexadecimal)
const EXPECTED_CRC32 = 0xCBBF4262;

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
        console.log(`Extracted ${assets.length} assets from NHLPA 93 ROM.`);
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