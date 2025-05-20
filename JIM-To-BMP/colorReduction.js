import './colorReduce.js';  // Import for side effects
import { convertToGenesisFormatWithOptions as quadrantColorReduce } from './quadrantColorReduce.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, basename, join } from 'path';

// Reference the colorReduce function directly since it doesn't use named exports
const clusterColorReduce = (inputPath, outputPath) => {
    // Call the colorReduce.js script directly as a workaround
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
        const process = spawn('node', ['./colorReduce.js', inputPath, outputPath]);
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve({ message: 'Cluster-based color reduction completed successfully' });
            } else {
                reject(new Error(`Cluster-based color reduction failed with code ${code}`));
            }
        });
    });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Unified color reduction interface
 * 
 * @param {string} inputPath - Path to the input BMP file
 * @param {string} outputPath - Path to the output JSON file (BMP file will be saved with the same name but .bmp extension)
 * @param {Object} options - Options for color reduction
 * @param {string} options.method - Method to use ('cluster' or 'quadrant')
 * @param {string} options.balanceStrategy - Strategy for quadrant balancing ('count', 'entropy', 'importance', 'area')
 * @param {boolean} options.optimizePalettes - Whether to optimize palettes for better color distribution
 * @param {boolean|string} options.verbose - Verbosity level (true, false, or 'full')
 * @returns {Object} Result object with color reduction information
 */
function reduceColors(inputPath, outputPath, options = {}) {
    // Default options
    const opts = {
        method: options.method || 'quadrant',
        balanceStrategy: options.balanceStrategy || 'count',
        optimizePalettes: options.optimizePalettes !== false,
        verbose: options.verbose !== false,
        ...options
    };
    
    console.log(`Using ${opts.method} method for color reduction`);
    
    if (opts.method === 'cluster') {
        return clusterColorReduce(inputPath, outputPath);
    } else if (opts.method === 'quadrant') {
        return quadrantColorReduce(inputPath, outputPath, {
            balanceStrategy: opts.balanceStrategy,
            optimizePalettes: opts.optimizePalettes,
            verbose: opts.verbose
        });
    } else {
        throw new Error(`Unknown color reduction method: ${opts.method}`);
    }
}

// Run as a command-line tool if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    // Parse command line arguments
    if (process.argv.length < 4) {
        console.log('Usage: node colorReduction.js <input.bmp> <output.json> [options]');
        console.log('Options:');
        console.log('  --method=<cluster|quadrant>  Method to use (default: quadrant)');
        console.log('  --balance=<count|entropy|importance|area>  Balance strategy (default: count)');
        console.log('  --optimize=<true|false>  Optimize palettes (default: true)');
        console.log('  --verbose=<true|false|full>  Verbosity level (default: true)');
        process.exit(1);
    }
    
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];
    
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
    
    // Run color reduction
    reduceColors(inputPath, outputPath, options);
}

// Export the function for use in other scripts
export default reduceColors;
