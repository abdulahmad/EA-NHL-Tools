import { readFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import reduceColors from './colorReduction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert a BMP file to JIM format with optional color reduction
 * 
 * @param {string} inputPath - Path to the input BMP file
 * @param {string} outputPath - Path to the output JIM file
 * @param {Object} options - Options for color reduction
 * @param {boolean} options.useColorReduction - Whether to use color reduction
 * @param {string} options.colorReductionMethod - Method to use for color reduction ('cluster' or 'quadrant')
 * @param {string} options.balanceStrategy - Strategy for quadrant balancing ('count', 'entropy', 'importance', 'area')
 * @param {boolean} options.optimizePalettes - Whether to optimize palettes for better color distribution
 * @returns {Object} Result object with conversion information
 */
async function convertToJimWithColorOptimization(inputPath, outputPath, options = {}) {
    // Default options
    const opts = {
        useColorReduction: options.useColorReduction !== false,
        colorReductionMethod: options.colorReductionMethod || 'quadrant',
        balanceStrategy: options.balanceStrategy || 'count',
        optimizePalettes: options.optimizePalettes !== false,
        ...options
    };
    
    if (opts.useColorReduction) {
        console.log('Using color reduction before JIM conversion');
        
        // Create temporary files for color reduction
        const tempDir = dirname(outputPath);
        const baseName = basename(inputPath, '.bmp');
        const reducedJsonPath = join(tempDir, `${baseName}_reduced.json`);
        const reducedBmpPath = join(tempDir, `${baseName}_reduced.bmp`);
        
        // Perform color reduction
        const reductionResult = reduceColors(inputPath, reducedJsonPath, {
            method: opts.colorReductionMethod,
            balanceStrategy: opts.balanceStrategy,
            optimizePalettes: opts.optimizePalettes,
            verbose: opts.verbose
        });
        
        // The reduced BMP file will be saved automatically with the same base name
        
        // Now convert the reduced BMP to JIM format
        // You'll need to import the actual bmpToJim function here
        // For now, we'll just simulate it
        console.log(`Converting reduced BMP to JIM: ${reducedBmpPath} -> ${outputPath}`);
        
        // Import the actual bmpToJim conversion function
        // This is a placeholder - you need to replace this with the actual import
        const { convertBmpToJim } = await import('./bmpToJim.js');
        
        // Call the conversion function with the reduced BMP
        return convertBmpToJim(reducedBmpPath, outputPath);
    } else {
        // If not using color reduction, just convert directly
        console.log('Converting BMP to JIM without color reduction');
        
        // Import the actual bmpToJim conversion function
        // This is a placeholder - you need to replace this with the actual import
        const { convertBmpToJim } = await import('./bmpToJim.js');
        
        // Call the conversion function with the original BMP
        return convertBmpToJim(inputPath, outputPath);
    }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.length < 4) {
        console.log('Usage: node bmpToJimWithColorOptimization.js <input.bmp> <output.jim> [options]');
        console.log('Options:');
        console.log('  --use-reduction=<true|false>    Use color reduction (default: true)');
        console.log('  --method=<cluster|quadrant>     Color reduction method (default: quadrant)');
        console.log('  --balance=<count|entropy|importance|area>  Balance strategy (default: count)');
        console.log('  --optimize=<true|false>         Optimize palettes (default: true)');
        process.exit(1);
    }
    
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];
    
    // Parse additional options
    const options = {};
    for (let i = 4; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith('--use-reduction=')) {
            options.useColorReduction = arg.substring(16) === 'true';
        } else if (arg.startsWith('--method=')) {
            options.colorReductionMethod = arg.substring(9);
        } else if (arg.startsWith('--balance=')) {
            options.balanceStrategy = arg.substring(10);
        } else if (arg.startsWith('--optimize=')) {
            options.optimizePalettes = arg.substring(11) === 'true';
        }
    }
    
    // Run conversion
    convertToJimWithColorOptimization(inputPath, outputPath, options)
        .then(() => console.log('Conversion complete!'))
        .catch(error => console.error('Error during conversion:', error));
}

export default convertToJimWithColorOptimization;
