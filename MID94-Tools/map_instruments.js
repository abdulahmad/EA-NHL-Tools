#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const MidiWriter = require('midi-writer-js');
const { spawn } = require('child_process');

/**
 * This script generates a comprehensive reference of NHL 94 instruments by creating
 * MIDI files with different instrument values across the entire 0x00-0xFF range.
 * It's useful for discovering and documenting the full range of sounds available
 * in the NHL 94 sound bank.
 */

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'instrument_samples');
const DEFAULT_ROM_PATH = path.join(__dirname, 'nhl94retail.bin');

// Sequence of notes to play for each instrument
const TEST_SEQUENCE = [
  { pitch: 'C4', duration: 'Q' },
  { pitch: 'E4', duration: 'Q' },
  { pitch: 'G4', duration: 'Q' },
  { pitch: 'C5', duration: 'Q' },
  { pitch: 'G4', duration: 'Q' },
  { pitch: 'E4', duration: 'Q' },
  { pitch: 'C4', duration: 'H' }
];

// NHL 94 known instruments mapping
const KNOWN_INSTRUMENTS = {
  0x00: 'Unknown/Silence',
  0x03: 'Organ Sound 1',
  0x04: 'Honky-tonk Piano/Organ Sound 2',
  0x08: 'Clavinet/Brassy Sound',
  0x0B: 'Music Box/Chorus Synth',
  0x14: 'Rubber Band Pluck',
  0x18: 'Sitar-like Sound'
};

async function main() {
  console.log('NHL 94 Instrument Mapper');
  console.log('========================');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let romPath = DEFAULT_ROM_PATH;
  let startInstrument = 0x00;
  let endInstrument = 0x1F; // Default range to test
  let mode = 'batch'; // 'batch' or 'individual'

  // Process arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--rom' && i + 1 < args.length) {
      romPath = args[++i];
    } else if (arg === '--start' && i + 1 < args.length) {
      startInstrument = parseInt(args[++i], 16);
    } else if (arg === '--end' && i + 1 < args.length) {
      endInstrument = parseInt(args[++i], 16);
    } else if (arg === '--mode' && i + 1 < args.length) {
      mode = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      return;
    }
  }

  // Validate ROM file exists
  try {
    await fs.access(romPath);
  } catch (err) {
    console.error(`Error: ROM file not found: ${romPath}`);
    console.log(`Using default ROM: ${DEFAULT_ROM_PATH}`);
    romPath = DEFAULT_ROM_PATH;
  }

  // Create output directory
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating output directory: ${err.message}`);
      process.exit(1);
    }
  }

  // Generate MIDI files
  if (mode === 'batch') {
    // Generate a single MIDI file with all instruments in sequence
    await generateBatchFile(startInstrument, endInstrument);
  } else {
    // Generate individual MIDI files for each instrument
    await generateIndividualFiles(startInstrument, endInstrument);
  }

  // Generate a markdown reference file
  await generateMarkdownReference(startInstrument, endInstrument);

  console.log('\nAll instrument samples generated!');
  console.log(`Files are in: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. Convert the MIDI files to NHL 94 format using midi-to-nhl94.js');
  console.log('2. Play the files and take notes on the sound characteristics');
  console.log('3. Update the KNOWN_INSTRUMENTS object in this script with your findings');
  console.log('4. Update the instrument mappings in mid94-to-midi.js and midi-to-nhl94.js');
}

async function generateBatchFile(startInstrument, endInstrument) {
  console.log(`Generating batch file with instruments 0x${startInstrument.toString(16).toUpperCase()} to 0x${endInstrument.toString(16).toUpperCase()}...`);

  const batchTrack = new MidiWriter.Track();
  
  // Add text event with information
  batchTrack.addEvent(new MidiWriter.MetaEvent({
    data: Buffer.from(`NHL 94 Instrument Test - Range 0x${startInstrument.toString(16).toUpperCase()} to 0x${endInstrument.toString(16).toUpperCase()}`),
    type: 'text'
  }));

  // For each instrument, add a text marker and play the test sequence
  for (let instrument = startInstrument; instrument <= endInstrument; instrument++) {
    // Add text marker with instrument info
    const instrumentName = KNOWN_INSTRUMENTS[instrument] || 'Unknown';
    batchTrack.addEvent(new MidiWriter.MetaEvent({
      data: Buffer.from(`Instrument 0x${instrument.toString(16).toUpperCase()} (${instrumentName})`),
      type: 'marker'
    }));

    // Change to this instrument
    batchTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument }));

    // Add a rest for separation
    batchTrack.addEvent(new MidiWriter.NoteEvent({
      pitch: ['C0'],
      duration: 'Q',
      velocity: 0
    }));

    // Play test sequence
    batchTrack.addEvent(new MidiWriter.NoteEvent({
      pitch: TEST_SEQUENCE.map(note => note.pitch),
      duration: TEST_SEQUENCE.map(note => note.duration),
      velocity: 100
    }));

    // Add a longer rest between instruments
    batchTrack.addEvent(new MidiWriter.NoteEvent({
      pitch: ['C0'],
      duration: 'H',
      velocity: 0
    }));
  }

  // Write the MIDI file
  const writer = new MidiWriter.Writer(batchTrack);
  const outputFile = path.join(OUTPUT_DIR, 'instrument_batch.mid');
  await fs.writeFile(outputFile, Buffer.from(writer.buildFile()));
  console.log(`✓ Generated ${outputFile}`);
}

async function generateIndividualFiles(startInstrument, endInstrument) {
  console.log(`Generating individual files for instruments 0x${startInstrument.toString(16).toUpperCase()} to 0x${endInstrument.toString(16).toUpperCase()}...`);

  for (let instrument = startInstrument; instrument <= endInstrument; instrument++) {
    const track = new MidiWriter.Track();
    
    // Add text event with information
    const instrumentName = KNOWN_INSTRUMENTS[instrument] || 'Unknown';
    track.addEvent(new MidiWriter.MetaEvent({
      data: Buffer.from(`NHL 94 Instrument 0x${instrument.toString(16).toUpperCase()} (${instrumentName})`),
      type: 'text'
    }));

    // Set instrument
    track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument }));

    // Play test sequence
    track.addEvent(new MidiWriter.NoteEvent({
      pitch: TEST_SEQUENCE.map(note => note.pitch),
      duration: TEST_SEQUENCE.map(note => note.duration),
      velocity: 100
    }));

    // Write the MIDI file
    const writer = new MidiWriter.Writer(track);
    const outputFile = path.join(OUTPUT_DIR, `instrument_${instrument.toString(16).padStart(2, '0').toUpperCase()}.mid`);
    await fs.writeFile(outputFile, Buffer.from(writer.buildFile()));
    console.log(`✓ Generated ${outputFile}`);
  }
}

async function generateMarkdownReference(startInstrument, endInstrument) {
  console.log('Generating markdown reference...');

  const lines = [
    '# NHL 94 Instrument Reference',
    '',
    'This document contains a reference of known instruments in the NHL 94 sound bank.',
    'Each instrument is documented with its hexadecimal value and a description of its sound characteristics.',
    '',
    '| Hex Value | Description | Notes |',
    '|-----------|-------------|-------|'
  ];

  for (let instrument = startInstrument; instrument <= endInstrument; instrument++) {
    const hexValue = `0x${instrument.toString(16).padStart(2, '0').toUpperCase()}`;
    const description = KNOWN_INSTRUMENTS[instrument] || 'Unknown';
    lines.push(`| ${hexValue} | ${description} | |`);
  }

  lines.push('');
  lines.push('## How to Use This Reference');
  lines.push('');
  lines.push('When extracting music from NHL 94, you can specify custom instruments using the `--instrument` option:');
  lines.push('');
  lines.push('```bash');
  lines.push('node mid94-to-midi.js -i 0:0x0B -i 1:0x08 nhl94.bin custom_instruments.mid');
  lines.push('```');
  lines.push('');
  lines.push('When creating custom music, you can use these instrument values to achieve the authentic NHL 94 sound.');

  const outputFile = path.join(OUTPUT_DIR, 'instrument_reference.md');
  await fs.writeFile(outputFile, lines.join('\n'));
  console.log(`✓ Generated ${outputFile}`);
}

function showUsage() {
  console.log(`
NHL 94 Instrument Mapper - Generates reference files for NHL 94 instruments

Usage:
  node map_instruments.js [options]

Options:
  --rom <path>       Path to NHL 94 ROM file (default: nhl94retail.bin)
  --start <hex>      Start instrument in hex (default: 0x00)
  --end <hex>        End instrument in hex (default: 0x1F)
  --mode <mode>      'batch' for a single file with all instruments, 
                     'individual' for separate files (default: batch)
  --help, -h         Show this help message

Examples:
  node map_instruments.js
  node map_instruments.js --rom custom_rom.bin
  node map_instruments.js --start 0x00 --end 0xFF
  node map_instruments.js --mode individual
  `);
}

// Run the script
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
