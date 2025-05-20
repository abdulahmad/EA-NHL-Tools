// test-color-reduce.js - Test script for the standalone Genesis color reducer
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processBmp } from './genesis-color-reduce.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Input image paths
const testImages = [
    join(__dirname, 'mcdavid2.bmp'),
    join(__dirname, 'bleg3x.bmp'),
    // Add other test images as needed
];

// Test with different balance strategies
const strategies = ['count', 'entropy', 'importance', 'area'];

async function runTests() {
    console.log('Starting test of Genesis color reducer...');
    console.log('===========================================');
    
    for (const imagePath of testImages) {
        console.log(`\nTesting image: ${imagePath}`);
        
        for (const strategy of strategies) {
            console.log(`\n  Testing with ${strategy} balance strategy...`);
            
            try {
                const result = processBmp(imagePath, { 
                    balanceStrategy: strategy,
                    verbose: true 
                });
                
                console.log(`  Success! Output saved to: ${result.outputDir}`);
                console.log(`  Reduced BMP: ${result.bmpOutputPath}`);
                console.log(`  Tiles directory: ${result.tilesDir}`);
                console.log(`  Split points - H: ${result.metadata.splits.horizontal}, V: ${result.metadata.splits.vertical}`);
                console.log(`  Palette usage: ${result.metadata.colorStats.palettePercentage.join('%, ')}%`);
            } catch (error) {
                console.error(`  Error processing with ${strategy} strategy:`, error);
            }
        }
    }
    
    console.log('\nAll tests completed!');
}

// Run the tests
runTests().catch(error => {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
});
