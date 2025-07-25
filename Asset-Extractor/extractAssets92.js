const fs = require('fs').promises;
const path = require('path');
const crc32 = require('crc-32'); // Requires 'crc-32' package: npm install crc-32

// Asset definitions from the .lst file
const assets = [
    { name: 'EALogo.bin', folder: 'NHL92/Graphics', start: 0x00000306, end: 0x00001164 },
    { name: 'EALogo.WordmarkAnimationTable.bin', folder: 'NHL92/Graphics', start: 0x00000D58, end: 0x0000D61 },
    { name: 'EALogo.WordmarkPositionTable.bin', folder: 'NHL92/Graphics', start: 0x00000D61, end: 0x0000D7C },
    { name: 'EALogo.WordmarkOffsetTable.bin', folder: 'NHL92/Graphics', start: 0x00000D7C, end: 0x0000D85 },
    { name: 'EALogo.WordmarkFadeTable.bin', folder: 'NHL92/Graphics', start: 0x00000D85, end: 0x0000D8E },
    { name: 'EALogo.LogoAnimationTable.bin', folder: 'NHL92/Graphics', start: 0x00000D8E, end: 0x00001164 },
    { name: 'Bruinsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x000011DA, end: 0x000011FA },
    { name: 'Bruinsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x000011FA, end: 0x0000121A },
    { name: 'sabresh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001320, end: 0x00001340 },
    { name: 'sabresv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001340, end: 0x00001360 },
    { name: 'flamesh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001466, end: 0x00001486 },
    { name: 'flamesv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001486, end: 0x000014A6 },
    { name: 'blackhawksh.pal', folder: 'NHL92/Graphics/Pals', start: 0x000015BC, end: 0x000015DC },
    { name: 'blackhawksv.pal', folder: 'NHL92/Graphics/Pals', start: 0x000015DC, end: 0x000015FC },
    { name: 'Redwingsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001716, end: 0x00001736 },
    { name: 'Redwingsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001736, end: 0x00001756 },
    { name: 'oilersh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001878, end: 0x00001898 },
    { name: 'oilersv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001898, end: 0x000018B8 },
    { name: 'whalersh.pal', folder: 'NHL92/Graphics/Pals', start: 0x000019C8, end: 0x000019E8 },
    { name: 'whalersv.pal', folder: 'NHL92/Graphics/Pals', start: 0x000019E8, end: 0x00001A08 },
    { name: 'Kingsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001B00, end: 0x00001B20 },
    { name: 'Kingsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001B20, end: 0x00001B40 },
    { name: 'northstarsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001C52, end: 0x00001C72 },
    { name: 'northstarsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001C72, end: 0x00001C92 },
    { name: 'canadiensh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001DA8, end: 0x00001DC8 },
    { name: 'canadiensv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001DC8, end: 0x00001DE8 },
    { name: 'devilsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001EEA, end: 0x00001F0A },
    { name: 'devilsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00001F0A, end: 0x00001F2A },
    { name: 'islandersh.pal', folder: 'NHL92/Graphics/Pals', start: 0x0000203C, end: 0x0000205C },
    { name: 'islandersv.pal', folder: 'NHL92/Graphics/Pals', start: 0x0000205C, end: 0x0000207C },
    { name: 'rangersh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002186, end: 0x000021A6 },
    { name: 'rangersv.pal', folder: 'NHL92/Graphics/Pals', start: 0x000021A6, end: 0x000021C6 },
    { name: 'flyersh.pal', folder: 'NHL92/Graphics/Pals', start: 0x000022D6, end: 0x000022F6 },
    { name: 'flyersv.pal', folder: 'NHL92/Graphics/Pals', start: 0x000022F6, end: 0x00002316 },
    { name: 'penguinsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x0000242A, end: 0x0000244A },
    { name: 'penguinsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x0000244A, end: 0x0000246A },
    { name: 'nordiquesh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002576, end: 0x00002596 },
    { name: 'nordiquesv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002596, end: 0x000025B6 },
    { name: 'Sharksh.pal', folder: 'NHL92/Graphics/Pals', start: 0x000026BE, end: 0x000026DE },
    { name: 'Sharksv.pal', folder: 'NHL92/Graphics/Pals', start: 0x000026DE, end: 0x000026FE },
    { name: 'bluesh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002806, end: 0x00002826 },
    { name: 'bluesv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002826, end: 0x00002846 },
    { name: 'mapleleafsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002946, end: 0x00002966 },
    { name: 'mapleleafsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002966, end: 0x00002986 },
    { name: 'canucksh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002A92, end: 0x00002AB2 },
    { name: 'canucksv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002AB2, end: 0x00002AD2 },
    { name: 'capitalsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002BEC, end: 0x00002C0C },
    { name: 'capitalsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002C0C, end: 0x00002C2C },
    { name: 'jetsh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002D30, end: 0x00002D50 },
    { name: 'jetsv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002D50, end: 0x00002D70 },
    { name: 'Campbellh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002E7E, end: 0x00002E9E },
    { name: 'Campbellv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002E9E, end: 0x00002EBE },
    { name: 'Walesh.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002FB8, end: 0x00002FD8 },
    { name: 'Walesv.pal', folder: 'NHL92/Graphics/Pals', start: 0x00002FD8, end: 0x00002FF8 },
    { name: 'Hockey.snd', folder: 'NHL92/Sound', start: 0x0000F4C8, end: 0x00024214 },
    { name: 'GameSetUp.map.jim', folder: 'NHL92/Graphics', start: 0x00024214, end: 0x00025642 },
    { name: 'Title1.map.jim', folder: 'NHL92/Graphics', start: 0x00025642, end: 0x0002ADF0 },
    { name: 'Title2.map.jim', folder: 'NHL92/Graphics', start: 0x0002ADF0, end: 0x0002C0FE },
    { name: 'NHLSpin.map.jim', folder: 'NHL92/Graphics', start: 0x0002C0FE, end: 0x0002E9EC },
    { name: 'Puck.anim', folder: 'NHL92/Graphics', start: 0x0002E9EC, end: 0x0002F262 },
    { name: 'Scouting.map.jim', folder: 'NHL92/Graphics', start: 0x0002F262, end: 0x00033590 },
    { name: 'Framer.map.jim', folder: 'NHL92/Graphics', start: 0x00033590, end: 0x000336B0 },
    { name: 'FaceOff.map.jim', folder: 'NHL92/Graphics', start: 0x000336B0, end: 0x00033AAE },
    { name: 'IceRink.map.jim', folder: 'NHL92/Graphics', start: 0x00033AAE, end: 0x0003A3DC },
    { name: 'Refs.map.jim', folder: 'NHL92/Graphics', start: 0x0003A3DC, end: 0x0003D5EE },
    { name: 'Sprites.anim', folder: 'NHL92/Graphics', start: 0x0003D5EE, end: 0x0007216C },
    { name: 'Crowd.anim', folder: 'NHL92/Graphics', start: 0x0007216C, end: 0x00075790 },
    { name: 'FaceOff.anim', folder: 'NHL92/Graphics', start: 0x00075790, end: 0x0007716C },
    { name: 'Zam.anim', folder: 'NHL92/Graphics', start: 0x0007716C, end: 0x000778D2 },
    { name: 'BigFont.map.jim', folder: 'NHL92/Graphics', start: 0x000778D2, end: 0x00078C20 },
    { name: 'SmallFont.map.jim', folder: 'NHL92/Graphics', start: 0x00078C20, end: 0x00079C2E },
    { name: 'TeamBlocks.map.jim', folder: 'NHL92/Graphics', start: 0x00079C2E, end: 0x0007E79C },
    { name: 'Arrows.map.jim', folder: 'NHL92/Graphics', start: 0x0007E79C, end: 0x0007EB12 },
    { name: 'Stanley.map.jim', folder: 'NHL92/Graphics', start: 0x0007EB12, end: 0x0007FC20 },
    { name: 'EASN.map.jim', folder: 'NHL92/Graphics', start: 0x0007FC20, end: 0x0007FE8A }
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
NHL 92 Asset Extractor
======================

This script extracts assets from NHL Hockey (1991/1992) ROM files.

Usage: node extractAssets92.js [options] <rom_file_path>

Options:
  -h, --help              Display this help message
  -v, --verbose           Display detailed extraction information
  -o, --output <dir>      Specify output directory (default: 'Extracted')

Notes:
  - This script extracts all known assets from the NHL 92 ROM
  - ROM checksums are verified to ensure correct ROM is used

Examples:
  node extractAssets92.js nhl92retail.bin
  node extractAssets92.js --verbose --output NHL92Assets nhl92retail.bin
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