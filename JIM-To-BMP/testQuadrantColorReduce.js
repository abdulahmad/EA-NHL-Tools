import { convertToGenesisFormatWithOptions } from './quadrantColorReduce.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the quadrant color reduction with different strategies

// Input and output paths
const inputPath = join(__dirname, 'mcdavid2.bmp');
const outputDir = join(__dirname, 'test_output');

// Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Test each balance strategy
const strategies = ['count', 'entropy', 'importance', 'area'];

for (const strategy of strategies) {
    console.log(`Testing quadrant color reduction with ${strategy} strategy...`);
    
    const outputPath = join(outputDir, `bleg_quadrant_${strategy}.json`);
    
    try {
        const result = convertToGenesisFormatWithOptions(inputPath, outputPath, {
            balanceStrategy: strategy,
            optimizePalettes: true,
            verbose: true
        });
        
        console.log(`Successfully processed with ${strategy} strategy`);
        console.log(`Output saved to: ${outputPath}`);
        console.log(`Generated BMP saved with same base name`);
        console.log('--------------------------------------------------');
    } catch (error) {
        console.error(`Error processing with ${strategy} strategy:`, error);
    }
}

console.log('Testing completed!');
