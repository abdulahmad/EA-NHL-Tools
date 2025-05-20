import { JimExtractor } from './JimExtractor';
import path from 'path';

async function main() {
    const basename = 'Title1';
    const inputFile = path.join('src', 'graphics', `${basename}.map.jim`);
    const outputFile = path.join('extracted_data', `${basename}.png`);

    try {
        const jim = await JimExtractor.fromFile(inputFile);
        
        // Print header info
        jim.printHeaderInfo();

        // Extract and build PNG
        await jim.buildPNG(outputFile);
        
    } catch (error) {
        console.error('Error processing file:', error);
    }
}

main();