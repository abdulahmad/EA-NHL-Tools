#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

/**
 * This script generates multiple MIDI files with different timing factors
 * to help identify the correct timing settings for each channel.
 */

// Configuration
const DEFAULT_ROM_PATH = path.join(__dirname, 'nhl94.bin');
const OUTPUT_DIR = path.join(__dirname, 'timing_tests');
const CHANNELS_TO_TEST = [0, 1, 2, 3, 6, 7]; // Channels to test
const TIMING_FACTORS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0]; // Factors to test

async function main() {
  // Parse command line arguments
  const romPath = process.argv[2] || DEFAULT_ROM_PATH;
  
  if (!fs.existsSync(romPath)) {
    console.error(`Error: ROM file not found: ${romPath}`);
    console.log('Usage: node test-timing-factors.js [romPath]');
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating output directory: ${err.message}`);
      process.exit(1);
    }
  }
  
  console.log('Generating test files with different timing factors...');
  console.log(`ROM file: ${romPath}`);
  
  // Test normal extraction first (baseline)
  await runExtraction(romPath, 'baseline.mid', []);
  
  // Generate files for each channel and timing factor combination
  for (const channel of CHANNELS_TO_TEST) {
    for (const factor of TIMING_FACTORS) {
      const outputFile = `channel${channel}_factor${factor.toString().replace('.', '_')}.mid`;
      const args = [`-t`, `${channel}:${factor}`];
      
      await runExtraction(romPath, outputFile, args);
    }
  }
  
  // Generate files for common combinations (e.g., bass channel at half speed)
  await runExtraction(romPath, 'bass_half_speed.mid', ['-t', '1:0.5']);
  
  console.log('\nAll test files generated!');
  console.log(`Files are in: ${OUTPUT_DIR}`);
  console.log('\nTips for testing:');
  console.log('1. Start by comparing the baseline.mid with bass_half_speed.mid');
  console.log('2. If that doesn\'t sound right, try individual channel adjustments');
  console.log('3. When you find a good combination, use those timing factors in your final command');
}

async function runExtraction(romPath, outputFile, extraArgs) {
  const outputPath = path.join(OUTPUT_DIR, outputFile);
  const args = [
    path.join(__dirname, 'mid94-to-midi.js'),
    ...extraArgs,
    romPath,
    outputPath
  ];
  
  return new Promise((resolve, reject) => {
    console.log(`Generating ${outputFile}...`);
    
    const process = spawn('node', args);
    
    // Capture and ignore output to keep the console clean
    process.stdout.on('data', () => {});
    process.stderr.on('data', (data) => {
      console.error(`Error generating ${outputFile}: ${data}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Generated ${outputFile}`);
        resolve();
      } else {
        console.error(`✗ Failed to generate ${outputFile} (code: ${code})`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Run the script
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
