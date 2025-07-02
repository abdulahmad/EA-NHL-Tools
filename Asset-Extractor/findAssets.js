const fs = require('fs').promises;
const path = require('path');

// Try to use crc-32 if available, otherwise skip CRC verification
let crc32;
try {
    crc32 = require('crc-32');
} catch (e) {
    crc32 = null;
    console.warn('Warning: crc-32 package not found. CRC verification will be skipped.');
    console.warn('To enable CRC verification, install it with: npm install crc-32');
}

// Expected CRC32 checksum for NHL92 retail ROM
const EXPECTED_CRC32 = 0x2641653F;

// Asset definitions from NHL92 - same as extractAssets92.js
const nhl92Assets = [
    { name: 'EALogo.bin', folder: 'NHL92/Graphics', start: 0x00000306, end: 0x00001164 },
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

// Verify CRC32 checksum of NHL92 ROM
async function verifyCRC32(filePath) {
    if (!crc32) {
        return false; // CRC package not available
    }
    
    try {
        const data = await fs.readFile(filePath);
        const calculatedCRC = crc32.buf(data) >>> 0; // Convert to unsigned 32-bit integer
        return calculatedCRC === EXPECTED_CRC32;
    } catch (error) {
        console.error(`Error reading ROM file for CRC32 check: ${error.message}`);
        return false;
    }
}

// Load NHL92 reference ROM and extract asset data
async function loadReferenceAssets(nhl92RomPath) {
    try {
        const romData = await fs.readFile(nhl92RomPath);
        const referenceAssets = [];
        
        for (const asset of nhl92Assets) {
            const assetData = romData.slice(asset.start, asset.end);
            referenceAssets.push({
                name: asset.name,
                folder: asset.folder,
                size: asset.end - asset.start,
                data: assetData
            });
        }
        
        return referenceAssets;
    } catch (error) {
        throw new Error(`Error loading NHL92 reference ROM: ${error.message}`);
    }
}

// Search for exact byte matches of assets in target ROM
function findAssetInROM(assetData, targetRomData) {
    const matches = [];
    const assetSize = assetData.length;
    
    // Skip very small assets (less than 16 bytes) to avoid false positives
    if (assetSize < 16) {
        return matches;
    }
    
    // Search through the entire ROM for exact matches
    for (let offset = 0; offset <= targetRomData.length - assetSize; offset++) {
        if (targetRomData.slice(offset, offset + assetSize).equals(assetData)) {
            matches.push({
                offset: offset,
                hexOffset: '0x' + offset.toString(16).toUpperCase().padStart(8, '0')
            });
        }
    }
    
    return matches;
}

async function searchForAssets(targetRomPath, nhl92RomPath, options = {}) {
    const searchOptions = {
        verbose: options.verbose || false,
        outputMatches: options.outputMatches || false,
        outputDir: options.outputDir || 'FoundAssets'
    };
    
    try {
        console.log(`Loading NHL92 reference ROM: ${nhl92RomPath}`);
        
        // Verify reference ROM if CRC32 is available
        if (crc32) {
            const isValidReference = await verifyCRC32(nhl92RomPath);
            if (!isValidReference) {
                console.warn('Warning: Reference ROM CRC32 checksum mismatch. Continuing anyway...');
            } else {
                console.log('Reference ROM verified successfully.');
            }
        }
        
        const referenceAssets = await loadReferenceAssets(nhl92RomPath);
        
        console.log(`Loading target ROM: ${targetRomPath}`);
        const targetRomData = await fs.readFile(targetRomPath);
        
        console.log(`Searching for ${referenceAssets.length} NHL92 assets in target ROM...`);
        console.log(`Target ROM size: ${targetRomData.length} bytes (${(targetRomData.length / 1024 / 1024).toFixed(2)} MB)`);
        console.log('');
        
        const foundAssets = [];
        let totalMatches = 0;
        
        for (const asset of referenceAssets) {
            if (searchOptions.verbose) {
                process.stdout.write(`Searching for ${asset.name} (${asset.size} bytes)... `);
            }
            
            const matches = findAssetInROM(asset.data, targetRomData);
            
            if (matches.length > 0) {
                totalMatches += matches.length;
                foundAssets.push({
                    asset: asset,
                    matches: matches
                });
                
                if (searchOptions.verbose) {
                    console.log(`FOUND ${matches.length} match(es) at: ${matches.map(m => m.hexOffset).join(', ')}`);
                } else {
                    console.log(`✓ Found ${asset.name} (${matches.length} match(es)) at: ${matches.map(m => m.hexOffset).join(', ')}`);
                }
                
                // Optionally save found assets
                if (searchOptions.outputMatches) {
                    for (let i = 0; i < matches.length; i++) {
                        const match = matches[i];
                        const outputDir = path.join(searchOptions.outputDir, asset.folder || '');
                        await fs.mkdir(outputDir, { recursive: true });
                        
                        const filename = matches.length > 1 ? 
                            `${path.parse(asset.name).name}_${match.hexOffset}${path.parse(asset.name).ext}` : 
                            asset.name;
                        const outputPath = path.join(outputDir, filename);
                        
                        await fs.writeFile(outputPath, asset.data);
                        if (searchOptions.verbose) {
                            console.log(`  Saved to: ${outputPath}`);
                        }
                    }
                }
            } else {
                if (searchOptions.verbose) {
                    console.log('not found');
                }
            }
        }
        
        console.log('');
        console.log('=== SEARCH RESULTS ===');
        console.log(`Found ${foundAssets.length} different assets with ${totalMatches} total matches out of ${referenceAssets.length} NHL92 assets searched.`);
        
        if (foundAssets.length > 0) {
            console.log('');
            console.log('Assets found:');
            for (const found of foundAssets) {
                console.log(`  ${found.asset.name} (${found.asset.size} bytes) - ${found.matches.length} match(es)`);
                for (const match of found.matches) {
                    console.log(`    at ${match.hexOffset} (${match.offset})`);
                }
            }
            
            if (searchOptions.outputMatches) {
                console.log('');
                console.log(`Found assets saved to: ${searchOptions.outputDir}`);
            }
        } else {
            console.log('No NHL92 assets found in the target ROM.');
        }
        
    } catch (error) {
        console.error(`Error during search: ${error.message}`);
        process.exit(1);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        targetRom: null,
        nhl92Rom: null,
        verbose: false,
        outputMatches: false,
        outputDir: 'FoundAssets'
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '-h' || arg === '--help') {
            displayHelp();
            process.exit(0);
        } else if (arg === '-v' || arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '-s' || arg === '--save') {
            options.outputMatches = true;
        } else if (arg === '-o' || arg === '--output') {
            if (i + 1 < args.length) {
                options.outputDir = args[++i];
                options.outputMatches = true; // Imply save if output dir specified
            } else {
                console.error('Error: Output directory not specified');
                displayHelp();
                process.exit(1);
            }
        } else if (arg === '-r' || arg === '--reference') {
            if (i + 1 < args.length) {
                options.nhl92Rom = args[++i];
            } else {
                console.error('Error: NHL92 reference ROM path not specified');
                displayHelp();
                process.exit(1);
            }
        } else if (!options.targetRom) {
            options.targetRom = arg;
        } else if (!options.nhl92Rom) {
            options.nhl92Rom = arg;
        }
    }

    return options;
}

// Display help information
function displayHelp() {
    console.log(`
NHL Asset Finder
================

This script searches for NHL92 assets in another ROM file by comparing byte patterns.

Usage: node findAssets.js [options] <target_rom> [nhl92_reference_rom]

Arguments:
  target_rom              The ROM file to search for NHL92 assets
  nhl92_reference_rom     The NHL92 ROM file to use as reference (optional if using -r)

Options:
  -h, --help              Display this help message
  -v, --verbose           Display detailed search information
  -s, --save              Save found assets to disk
  -o, --output <dir>      Specify output directory for found assets (implies --save)
  -r, --reference <file>  Specify NHL92 reference ROM file

Notes:
  - The script performs byte-for-byte comparison to find exact matches
  - Small assets (< 16 bytes) are skipped to avoid false positives
  - Multiple matches of the same asset will be reported if found
  - The NHL92 reference ROM is needed to extract the asset data for comparison

Examples:
  node findAssets.js nhl93.bin nhl92retail.bin
  node findAssets.js --verbose --save nhl94.bin -r nhl92retail.bin
  node findAssets.js -o FoundAssets nhl95.bin nhl92retail.bin
    `);
}

// Main execution
const options = parseArgs();

if (!options.targetRom) {
    console.error('Error: Target ROM file path not provided');
    displayHelp();
    process.exit(1);
}

if (!options.nhl92Rom) {
    console.error('Error: NHL92 reference ROM file path not provided');
    displayHelp();
    process.exit(1);
}

console.log(`NHL Asset Finder`);
console.log(`Target ROM: ${options.targetRom}`);
console.log(`Reference ROM: ${options.nhl92Rom}`);
if (options.verbose) {
    console.log('Verbose mode enabled');
}
if (options.outputMatches) {
    console.log(`Output directory: ${options.outputDir}`);
}
console.log('');

searchForAssets(options.targetRom, options.nhl92Rom, {
    verbose: options.verbose,
    outputMatches: options.outputMatches,
    outputDir: options.outputDir
});
