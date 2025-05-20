import { JimExtractor } from './JimExtractor.js';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    // Get filename from command line arguments
    const filename = process.argv[2];
    
    if (!filename) {
        console.error('Please provide a .map.jim file path');
        console.error('Usage: node JimTool.js <path/to/file.map.jim>');
        process.exit(1);
    }

    // Extract basename without extension
    const basename = path.basename(filename, '.map.jim');
    const outputDir = 'extracted_data';
    const outputFile = path.join(outputDir, `${basename}.png`);

    try {
        // Create output directory if it doesn't exist
        await fs.mkdir(outputDir, { recursive: true });
        
        const jim = await JimExtractor.fromFile(filename);
        
        // Print header info
        jim.printHeaderInfo();

        // Extract and build PNG
        await jim.buildPNG(outputFile);
        
    } catch (error) {
        console.error('Error processing file:', error);
        process.exit(1);
    }
}

main();