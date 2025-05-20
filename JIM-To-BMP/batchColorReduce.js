import reduceColors from './colorReduction.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Process all BMP files in a directory with color reduction
 * 
 * @param {string} inputDir - Directory containing BMP files to process
 * @param {string} outputDir - Directory to save the output files
 * @param {Object} options - Options for color reduction
 */
function batchProcessFiles(inputDir, outputDir, options = {}) {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get all BMP files in the input directory
    const files = fs.readdirSync(inputDir)
        .filter(file => file.toLowerCase().endsWith('.bmp'));
    
    console.log(`Found ${files.length} BMP files to process`);
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i+1}/${files.length}: ${file}`);
        
        const inputPath = path.join(inputDir, file);
        const outputBaseName = path.basename(file, '.bmp');
        const outputPath = path.join(outputDir, `${outputBaseName}.json`);
        
        try {
            reduceColors(inputPath, outputPath, options);
            console.log(`Successfully processed ${file}`);
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }
    
    console.log('Batch processing complete!');
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.length < 4) {
        console.log('Usage: node batchColorReduce.js <inputDir> <outputDir> [options]');
        console.log('Options:');
        console.log('  --method=<cluster|quadrant>  Method to use (default: quadrant)');
        console.log('  --balance=<count|entropy|importance|area>  Balance strategy (default: count)');
        console.log('  --optimize=<true|false>  Optimize palettes (default: true)');
        console.log('  --verbose=<true|false|full>  Verbosity level (default: true)');
        process.exit(1);
    }
    
    const inputDir = process.argv[2];
    const outputDir = process.argv[3];
    
    // Parse additional options
    const options = {};
    for (let i = 4; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith('--method=')) {
            options.method = arg.substring(9);
        } else if (arg.startsWith('--balance=')) {
            options.balanceStrategy = arg.substring(10);
        } else if (arg.startsWith('--optimize=')) {
            options.optimizePalettes = arg.substring(11) === 'true';
        } else if (arg.startsWith('--verbose=')) {
            const verboseValue = arg.substring(10);
            options.verbose = verboseValue === 'true' ? true : (verboseValue === 'false' ? false : verboseValue);
        }
    }
    
    batchProcessFiles(inputDir, outputDir, options);
}

export default batchProcessFiles;
