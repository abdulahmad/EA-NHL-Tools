const fs = require('fs').promises;
const path = require('path');
const crc32 = require('crc-32'); // Requires 'crc-32' package: npm install crc-32

// Asset definitions from the .lst file
const assets = [
    // { name: 'EALogo.bin', folder: 'NHL96/Graphics', start: 0x00000306, end: 0x00001164 },
    { name: 'anah.pal', folder: 'NHL96/Graphics/Pals', start: 0x7FA, end: 0x81A },
    { name: 'anav.pal', folder: 'NHL96/Graphics/Pals', start: 0x81A, end: 0x83A }, // 0x2A4 until next pal
    { name: 'Bruinsh.pal', folder: 'NHL96/Graphics/Pals', start: 0xAF8, end: 0xB18 },
    { name: 'Bruinsv.pal', folder: 'NHL96/Graphics/Pals', start: 0xB18, end: 0xB38 }, // 0x2BA until next pal
    { name: 'sabresh.pal', folder: 'NHL96/Graphics/Pals', start: 0xDE0, end: 0xE00 },
    { name: 'sabresv.pal', folder: 'NHL96/Graphics/Pals', start: 0xE00, end: 0xE00 },
    { name: 'flamesh.pal', folder: 'NHL96/Graphics/Pals', start: 0x000010D0, end: 0x000010F0 },
    { name: 'flamesv.pal', folder: 'NHL96/Graphics/Pals', start: 0x000010F0, end: 0x00001110 },
    // { name: 'blackhawksh.pal', folder: 'NHL96/Graphics/Pals', start: 0x000015BC, end: 0x000015DC },
    // { name: 'blackhawksv.pal', folder: 'NHL96/Graphics/Pals', start: 0x000015DC, end: 0x000015FC },
    // { name: 'Redwingsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001716, end: 0x00001736 },
    // { name: 'Redwingsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001736, end: 0x00001756 },
    // { name: 'oilersh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001878, end: 0x00001898 },
    // { name: 'oilersv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001898, end: 0x000018B8 },
    // { name: 'whalersh.pal', folder: 'NHL96/Graphics/Pals', start: 0x000019C8, end: 0x000019E8 },
    // { name: 'whalersv.pal', folder: 'NHL96/Graphics/Pals', start: 0x000019E8, end: 0x00001A08 },
    // { name: 'Kingsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001B00, end: 0x00001B20 },
    // { name: 'Kingsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001B20, end: 0x00001B40 },
    // { name: 'northstarsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001C52, end: 0x00001C72 },
    // { name: 'northstarsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001C72, end: 0x00001C92 },
    // { name: 'canadiensh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001DA8, end: 0x00001DC8 },
    // { name: 'canadiensv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001DC8, end: 0x00001DE8 },
    // { name: 'devilsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001EEA, end: 0x00001F0A },
    // { name: 'devilsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00001F0A, end: 0x00001F2A },
    // { name: 'islandersh.pal', folder: 'NHL96/Graphics/Pals', start: 0x0000203C, end: 0x0000205C },
    // { name: 'islandersv.pal', folder: 'NHL96/Graphics/Pals', start: 0x0000205C, end: 0x0000207C },
    // { name: 'rangersh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002186, end: 0x000021A6 },
    // { name: 'rangersv.pal', folder: 'NHL96/Graphics/Pals', start: 0x000021A6, end: 0x000021C6 },
    // { name: 'flyersh.pal', folder: 'NHL96/Graphics/Pals', start: 0x000022D6, end: 0x000022F6 },
    // { name: 'flyersv.pal', folder: 'NHL96/Graphics/Pals', start: 0x000022F6, end: 0x00002316 },
    // { name: 'penguinsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x0000242A, end: 0x0000244A },
    // { name: 'penguinsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x0000244A, end: 0x0000246A },
    // { name: 'nordiquesh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002576, end: 0x00002596 },
    // { name: 'nordiquesv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002596, end: 0x000025B6 },
    // { name: 'Sharksh.pal', folder: 'NHL96/Graphics/Pals', start: 0x000026BE, end: 0x000026DE },
    // { name: 'Sharksv.pal', folder: 'NHL96/Graphics/Pals', start: 0x000026DE, end: 0x000026FE },
    // { name: 'bluesh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002806, end: 0x00002826 },
    // { name: 'bluesv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002826, end: 0x00002846 },
    // { name: 'mapleleafsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002946, end: 0x00002966 },
    // { name: 'mapleleafsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002966, end: 0x00002986 },
    // { name: 'canucksh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002A92, end: 0x00002AB2 },
    // { name: 'canucksv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002AB2, end: 0x00002AD2 },
    // { name: 'capitalsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002BEC, end: 0x00002C0C },
    // { name: 'capitalsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002C0C, end: 0x00002C2C },
    // { name: 'jetsh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002D30, end: 0x00002D50 },
    // { name: 'jetsv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002D50, end: 0x00002D70 },
    // { name: 'Campbellh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002E7E, end: 0x00002E9E },
    // { name: 'Campbellv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002E9E, end: 0x00002EBE },
    // { name: 'Walesh.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002FB8, end: 0x00002FD8 },
    // { name: 'Walesv.pal', folder: 'NHL96/Graphics/Pals', start: 0x00002FD8, end: 0x00002FF8 },
    // { name: 'Hockey.snd', folder: 'NHL96/Sound', start: 0x0000F4C8, end: 0x00024214 },
    // { name: 'GameSetUp.map.jim', folder: 'NHL96/Graphics', start: 0x00024214, end: 0x00025642 },
    // { name: 'Title1.map.jim', folder: 'NHL96/Graphics', start: 0x00025642, end: 0x0002ADF0 },
    // { name: 'Title2.map.jim', folder: 'NHL96/Graphics', start: 0x0002ADF0, end: 0x0002C0FE },
    // { name: 'NHLSpin.map.jim', folder: 'NHL96/Graphics', start: 0x0002C0FE, end: 0x0002E9EC },
    // { name: 'Puck.anim', folder: 'NHL96/Graphics', start: 0x0002E9EC, end: 0x0002F262 },
    // { name: 'Scouting.map.jim', folder: 'NHL96/Graphics', start: 0x0002F262, end: 0x00033590 },
    // { name: 'Framer.map.jim', folder: 'NHL96/Graphics', start: 0x00033590, end: 0x000336B0 },
    // { name: 'FaceOff.map.jim', folder: 'NHL96/Graphics', start: 0x000336B0, end: 0x00033AAE },
    // { name: 'IceRink.map.jim', folder: 'NHL96/Graphics', start: 0x00033AAE, end: 0x0003A3DC },
    // { name: 'Refs.map.jim', folder: 'NHL96/Graphics', start: 0x0003A3DC, end: 0x0003D5EE },
    // { name: 'Sprites.anim', folder: 'NHL96/Graphics', start: 0x0003D5EE, end: 0x0007216C },
    // { name: 'Crowd.anim', folder: 'NHL96/Graphics', start: 0x0007216C, end: 0x00075790 },
    // { name: 'FaceOff.anim', folder: 'NHL96/Graphics', start: 0x00075790, end: 0x0007716C },
    // { name: 'Zam.anim', folder: 'NHL96/Graphics', start: 0x0007716C, end: 0x000778D2 },
    // { name: 'BigFont.map.jim', folder: 'NHL96/Graphics', start: 0x000778D2, end: 0x00078C20 },
    // { name: 'SmallFont.map.jim', folder: 'NHL96/Graphics', start: 0x00078C20, end: 0x00079C2E },
    // { name: 'TeamBlocks.map.jim', folder: 'NHL96/Graphics', start: 0x00079C2E, end: 0x0007E79C },
    // { name: 'Arrows.map.jim', folder: 'NHL96/Graphics', start: 0x0007E79C, end: 0x0007EB12 },
    // { name: 'Stanley.map.jim', folder: 'NHL96/Graphics', start: 0x0007EB12, end: 0x0007FC20 },
    // { name: 'EASN.map.jim', folder: 'NHL96/Graphics', start: 0x0007FC20, end: 0x0007FE8A }
];

// Expected CRC32 checksum (996931775 in hexadecimal)
const EXPECTED_CRC32 = 0x8135702C;

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

async function extractAssets(romPath) {
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
        const baseDir = 'Extracted';
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
            console.log(`Extracted ${asset.name} to ${outputPath}`);
        }

        console.log('Extraction completed successfully.');
    } catch (error) {
        console.error(`Error during extraction: ${error.message}`);
    }
}

// Run the script with the provided ROM file
const romFile = process.argv[2];
if (!romFile) {
    console.error('Please provide the path to the NHL Hockey ROM file.');
    console.error('Usage: node script.js <rom_file_path>');
    process.exit(1);
}

extractAssets(romFile);