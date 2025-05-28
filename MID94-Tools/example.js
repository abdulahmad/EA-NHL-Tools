const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const ROM_FILE = path.resolve(__dirname, '../ANIM94-To-BMP/nhl94retail.bin');
const OUTPUT_DIR = path.resolve(__dirname, 'examples');
const NHL94_THEME_OFFSET = 0x4507A;
const NHL94_THEME_FOOTER = 0x46D82;

// Helper function to run shell commands
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, { stdio: 'inherit' });
    
    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    proc.on('error', err => {
      reject(err);
    });
  });
}

async function main() {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Path to output MIDI file
    const midiPath = path.join(OUTPUT_DIR, 'nhl94_theme.mid');
    
    console.log('=== NHL 94 Music Extraction Example ===');
    console.log(`ROM File: ${ROM_FILE}`);
    console.log(`Output Directory: ${OUTPUT_DIR}`);
    console.log();
    
    // Step 1: Extract the NHL94 theme to MIDI
    console.log('Step 1: Extracting NHL94 theme to MIDI...');
    await runCommand('node', [
      'mid94-to-midi.js',
      '--offset', `0x${NHL94_THEME_OFFSET.toString(16)}`,
      '--footer', `0x${NHL94_THEME_FOOTER.toString(16)}`,
      '--verbose',
      ROM_FILE,
      midiPath
    ]);
    console.log(`NHL94 theme extracted to: ${midiPath}`);
    console.log();
    
    // Step 2: List available instruments
    console.log('Step 2: Listing available instruments...');
    await runCommand('node', ['mid94-to-midi.js', '--list-instruments']);
    console.log();
    
    // Step 3: Create a version with custom instruments
    console.log('Step 3: Creating version with custom instruments...');
    const customMidiPath = path.join(OUTPUT_DIR, 'nhl94_theme_custom.mid');
    await runCommand('node', [
      'mid94-to-midi.js',
      '--offset', `0x${NHL94_THEME_OFFSET.toString(16)}`,
      '--footer', `0x${NHL94_THEME_FOOTER.toString(16)}`,
      '--instrument', '0:0x14',  // Change instrument on channel 0
      '--instrument', '1:0x18',  // Change instrument on channel 1
      ROM_FILE,
      customMidiPath
    ]);
    console.log(`Custom version saved to: ${customMidiPath}`);
    console.log();
    
    // Step 4: Convert a MIDI file back to NHL94 format (if a MIDI file exists)
    const exampleMidiFile = path.join(OUTPUT_DIR, 'example.mid');
    const patchedRomFile = path.join(OUTPUT_DIR, 'nhl94_patched.bin');
    
    // Check if we have an example MIDI file
    try {
      await fs.access(exampleMidiFile);
      
      console.log('Step 4: Converting MIDI back to NHL94 format...');
      
      // First make a copy of the ROM
      const romData = await fs.readFile(ROM_FILE);
      await fs.writeFile(patchedRomFile, romData);
      
      await runCommand('node', [
        'midi-to-nhl94.js',
        '--offset', `0x${NHL94_THEME_OFFSET.toString(16)}`,
        '--verbose',
        exampleMidiFile,
        patchedRomFile
      ]);
      
      console.log(`Patched ROM saved to: ${patchedRomFile}`);
    } catch (error) {
      console.log('Step 4: Skipped - No example MIDI file found.');
      console.log(`To convert a MIDI file to NHL94 format, place a MIDI file at: ${exampleMidiFile}`);
      console.log('Then run this example again.');
    }
    
    console.log();
    console.log('Example completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
