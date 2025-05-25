// test-forced-palette.js
// Simple script to test the --forcepal feature in genesis-color-reduce.js

import { exec } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to test image - update with the path to a test BMP
const testImage = 'c:\\repository\\EA-NHL-Tools\\JIM-To-BMP\\test-images\\test-image.bmp';

// Path to sample ACT files - these could be created manually or copied from another project
const actFile0 = 'c:\\repository\\EA-NHL-Tools\\JIM-To-BMP\\test-palettes\\palette0.act';
const actFile1 = 'c:\\repository\\EA-NHL-Tools\\JIM-To-BMP\\test-palettes\\palette1.act';

// Construct the command
const command = `node genesis-color-reduce.js "${testImage}" --forcepal0="${actFile0}" --forcepal1="${actFile1}"`;

console.log(`Running command: ${command}`);

// Execute the command
exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
    }
    
    console.log(`stdout: ${stdout}`);
    console.log('Test completed. Check output directory for results.');
});
