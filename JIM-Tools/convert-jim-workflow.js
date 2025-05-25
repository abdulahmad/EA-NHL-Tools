// Full JIM conversion workflow script
// This script runs the entire workflow for working with JIM files:
// 1. Color reduce a BMP file to Genesis palette using genesis-color-reduce.js
// 2. Rebuild the reduced BMP into a JIM file using fixed-rebuildJim.js
// 3. Extract the JIM file back to BMPs using fixed-extractJimFull-v2.js
// 4. Compare the original reduced BMP with the extracted BMP to verify accuracy

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    // Use fixed versions of scripts (if false, uses the original versions)
    useFixedVersions: true,
    
    // Color reduction options
    colorReduction: {
        strategy: 'count',         // 'count', 'entropy', 'importance', 'area'
        optimizePalettes: true,
        palettes: [0, 1, 2, 3]     // Default to all 4 palettes
    },
    
    // Run comparison at the end
    runComparison: true
};

// Parameters for this run
const inputFile = process.argv[2] || 'mcdavidtouch3.bmp';
const outputDir = `build/${path.basename(inputFile, '.bmp')}-${CONFIG.colorReduction.strategy}-pal${CONFIG.colorReduction.palettes.join('-')}`;
const jimFileName = 'rebuilt.jim';

// Utility function to run a command and log its output
function runCommand(command, description) {
    console.log(`\n==== ${description} ====`);
    console.log(`Running: ${command}`);
    
    try {
        const output = execSync(command, { encoding: 'utf8' });
        console.log(output);
        return true;
    } catch (error) {        console.error(`Error: ${error.message}`);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        return false;
    }
}

// Make sure directories exist
if (!fs.existsSync('Extracted/rebuilt/comparison')) {
    fs.mkdirSync('Extracted/rebuilt/comparison', { recursive: true });
}

// Start the workflow
console.log(`\n=============== JIM CONVERSION WORKFLOW ===============`);
console.log(`Input file: ${inputFile}`);
console.log(`Strategy: ${CONFIG.colorReduction.strategy}`);
console.log(`Palettes: ${CONFIG.colorReduction.palettes.join(', ')}`);
console.log(`Using fixed tools: ${CONFIG.useFixedVersions ? 'Yes' : 'No'}`);

// Step 1: Color Reduction - Process the BMP file
console.log("Step 1: Color Reduction - Processing the BMP file");
const colorReduceArgs = [
    `"${inputFile}"`,
    `--strategy=${CONFIG.colorReduction.strategy}`,
    CONFIG.colorReduction.optimizePalettes ? '--optimize-palettes' : '--no-optimize-palettes',
    `--palettes=${CONFIG.colorReduction.palettes.join(',')}`
].join(' ');

const colorReduceResult = runCommand(
    `node genesis-color-reduce.js ${colorReduceArgs}`,
    "Color Reduction"
);

if (!colorReduceResult) {
    console.error("Color reduction failed. Exiting workflow.");
    process.exit(1);
}

// Step 2: Rebuild JIM - Convert the color-reduced BMP to JIM format
console.log("\nStep 2: Rebuild JIM - Converting to JIM format");
const metadataPath = path.join(outputDir, 'metadata.json');
const rebuildScript = CONFIG.useFixedVersions ? 'fixed-rebuildJim.js' : 'rebuildJim.js';
const rebuildResult = runCommand(
    `node ${rebuildScript} "${metadataPath}"`,
    "Rebuild JIM"
);

if (!rebuildResult) {
    console.error("Rebuilding JIM failed. Exiting workflow.");
    process.exit(1);
}

// Step 3: Extract JIM - Convert back to BMP for verification
console.log("\nStep 3: Extract JIM - Extracting back to BMP");
const jimPath = path.join(outputDir, jimFileName);
const extractScript = CONFIG.useFixedVersions ? 'fixed-extractJimFull-v5.js' : 'extractJimFull.js';
const extractResult = runCommand(
    `node ${extractScript} "${jimPath}"`,
    "Extract JIM"
);

if (!extractResult) {
    console.error("Extracting JIM failed. Exiting workflow.");
    process.exit(1);
}

// Step 4: Compare the original reduced BMP with the extracted BMP
if (CONFIG.runComparison) {
    console.log("\nStep 4: Comparing BMPs to verify conversion accuracy");
    const originalReducedBmp = path.join(outputDir, path.basename(inputFile, '.bmp') + '-reduced.bmp');
    const extractedBmp = 'Extracted/rebuilt/full_map.bmp';

    const compareResult = runCommand(
        `node simple-bmp-compare.js "${originalReducedBmp}" "${extractedBmp}"`,
        "BMP Comparison"
    );

    if (!compareResult) {
        console.error("BMP comparison failed, but the workflow completed.");
    }
}

// Step 5: Verify results
console.log("\nStep 5: Verification");
console.log("Conversion process completed. Please check the following files:");
console.log(`1. Original BMP: ${inputFile}`);
console.log(`2. Color-reduced BMP: ${path.join(outputDir, path.basename(inputFile, '.bmp') + '-reduced.bmp')}`);
console.log(`3. Rebuilt JIM file: ${jimPath}`);
console.log(`4. Extracted BMP: Extracted/rebuilt/full_map.bmp`);
console.log(`5. Comparison results: Extracted/rebuilt/comparison/differences.bmp`);
console.log(`6. Detailed analysis: Extracted/rebuilt/comparison/comparison-results.json`);

console.log(`\n=============== WORKFLOW COMPLETED ===============`);
console.log(`See the files listed above for results.`);

console.log("\n==== Workflow Summary ====");
console.log("The JIM format conversion workflow is complete!");
console.log("If the comparison shows minimal or no differences in the top third of the image,");
console.log("then the palette mapping issues have been successfully fixed.");
console.log("Check the comparison report and differences image for details.");

// Return success
process.exit(0);
console.log(`3. Rebuilt JIM file: ${jimPath}`);
console.log(`4. Extracted BMP: ${path.join('Extracted', 'rebuilt', 'full_map.bmp')}`);

// Success!
console.log("\nConversion workflow completed successfully!");
