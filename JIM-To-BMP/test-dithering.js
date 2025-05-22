// test-dithering.js
// Test script to show different dithering options

import { exec } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to test image - update with the path to a test BMP
const testImage = process.argv[2] || 'test-sample.bmp';

// Define the different dithering levels to test
const ditherLevels = ['4bit', '5bit', '6bit', '7bit', '8bit'];

// Run basic conversion first (no dithering)
console.log(`Running basic 3-bit conversion on ${testImage}`);
exec(`node bmp3bitConverter.js "${testImage}"`, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
    }
    
    console.log(stdout);
    
    // Now run each dithering level
    ditherLevels.forEach((level, index) => {
        console.log(`Running 3-bit conversion with ${level} dithering on ${testImage}`);
        
        // Slight delay between executions to avoid file conflicts
        setTimeout(() => {
            exec(`node bmp3bitConverter.js "${testImage}" -dither=${level}`, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error with ${level}: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`stderr with ${level}: ${stderr}`);
                }
                
                console.log(stdout);
            });
        }, index * 500); // 500ms delay between each execution
    });
});
