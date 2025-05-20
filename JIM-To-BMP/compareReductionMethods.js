import reduceColors from './colorReduction.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compare different color reduction methods on a single image
 * 
 * @param {string} inputPath - Path to the input BMP file
 * @param {string} outputDir - Directory to save the output files
 */
function compareReductionMethods(inputPath, outputDir) {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const baseName = path.basename(inputPath, '.bmp');
    
    console.log(`Comparing color reduction methods for ${baseName}...`);
    
    const methods = [
        {
            name: 'cluster',
            options: {
                method: 'cluster'
            }
        },
        {
            name: 'quadrant-count',
            options: {
                method: 'quadrant',
                balanceStrategy: 'count',
                optimizePalettes: true
            }
        },
        {
            name: 'quadrant-entropy',
            options: {
                method: 'quadrant',
                balanceStrategy: 'entropy',
                optimizePalettes: true
            }
        },
        {
            name: 'quadrant-importance',
            options: {
                method: 'quadrant',
                balanceStrategy: 'importance',
                optimizePalettes: true
            }
        }
    ];
    
    // Process each method
    for (const method of methods) {
        console.log(`Processing with ${method.name}...`);
        
        const outputPath = path.join(outputDir, `${baseName}_${method.name}.json`);
        
        try {
            reduceColors(inputPath, outputPath, method.options);
            console.log(`Completed ${method.name} method`);
        } catch (error) {
            console.error(`Error processing ${method.name}:`, error);
        }
    }
    
    console.log('Comparison complete!');
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.length < 4) {
        console.log('Usage: node compareReductionMethods.js <input.bmp> <outputDir>');
        process.exit(1);
    }
    
    const inputPath = process.argv[2];
    const outputDir = process.argv[3];
    
    compareReductionMethods(inputPath, outputDir);
}

export default compareReductionMethods;
