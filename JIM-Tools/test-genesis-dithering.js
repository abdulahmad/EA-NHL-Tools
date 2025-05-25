// test-genesis-dithering.js - Test script for dithering options in genesis-color-reduce.js
import { processBmp } from './genesis-color-reduce.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDitheringOptions() {
    // Test BMP file path - make sure this exists
    const inputPath = join(__dirname, 'test-image.bmp');
    
    // Create output directories
    const baseOutputDir = join(__dirname, 'dithering-test-output');
    
    // Test different dithering options
    const testConfigurations = [
        // No dithering (baseline)
        {
            name: 'no-dithering',
            options: {}
        },
        // Pattern dithering with different bit depths
        {
            name: 'pattern-4bit',
            options: {
                dither: 4,
                ditherType: 'pattern'
            }
        },
        {
            name: 'pattern-6bit',
            options: {
                dither: 6,
                ditherType: 'pattern'
            }
        },
        {
            name: 'pattern-8bit',
            options: {
                dither: 8,
                ditherType: 'pattern'
            }
        },
        // Noise dithering with different strengths
        {
            name: 'noise-6bit-low',
            options: {
                dither: 6,
                ditherType: 'noise',
                ditherStrength: 0.3
            }
        },
        {
            name: 'noise-6bit-medium',
            options: {
                dither: 6,
                ditherType: 'noise',
                ditherStrength: 0.7
            }
        },
        {
            name: 'noise-6bit-high',
            options: {
                dither: 6,
                ditherType: 'noise',
                ditherStrength: 1.0
            }
        },
        // Diffusion dithering with different strengths
        {
            name: 'diffusion-6bit-low',
            options: {
                dither: 6,
                ditherType: 'diffusion',
                ditherStrength: 0.5
            }
        },
        {
            name: 'diffusion-6bit-medium',
            options: {
                dither: 6,
                ditherType: 'diffusion',
                ditherStrength: 1.0
            }
        },
        {
            name: 'diffusion-6bit-high',
            options: {
                dither: 6,
                ditherType: 'diffusion',
                ditherStrength: 1.5
            }
        }
    ];
    
    // Process each configuration
    for (const config of testConfigurations) {
        console.log(`\n=============================================`);
        console.log(`Testing configuration: ${config.name}`);
        console.log(`=============================================\n`);
        
        const outputDir = join(baseOutputDir, config.name);
        
        // Process the BMP with the specified options
        await processBmp(inputPath, {
            ...config.options,
            outputDir,
            verbose: true
        });
    }
    
    console.log('\nAll dithering tests completed!');
}

// Run the test
testDitheringOptions().catch(error => {
    console.error('Error running dithering tests:', error);
    process.exit(1);
});
