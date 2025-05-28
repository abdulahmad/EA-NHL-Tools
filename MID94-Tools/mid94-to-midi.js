const fs = require('fs').promises;
const MidiWriter = require('midi-writer-js');
const path = require('path');

// Configuration based on forum post
const ROM_OFFSET = 0x4507A; // Start of NHL '94 theme
const FOOTER_OFFSET = 0x46D82; // Start of 10-byte footer
const FOOTER_END = 0x46D8B;    // End of the footer
const FOOTER_LENGTH = 10;      // Footer size in bytes

// Instrument mapping based on thread analysis
// Note: NHL 94 uses a custom sound bank that doesn't directly map to standard MIDI
// See http://www.music.mcgill.ca/~ich/classes/mumt306/StandardMIDIfileformat.html#BMA1_4 for standard MIDI instruments
const INSTRUMENTS = {
  0x0B: 'Music Box',      // Chromatic Percussion (chorus synth)
  0x08: 'Clavinet',       // Piano (brassy sound)
  0x04: 'Honky-tonk Piano',
  // Add more instruments as discovered
};

// Channel configuration from NHL 94
const CHANNELS = {
  0: { instrument: 0x0B, pitchRange: [40, 49], timingFactor: 1.0 }, // timing 1.0 Channel 0: 0B (chorus synth)
  1: { instrument: 0x08, pitchRange: [50, 59], timingFactor: 0.01 }, // 2.0 Channel 1: 08 (brassy sound) - slower (bass?)
  2: { instrument: 0x04, pitchRange: [60, 69], timingFactor: 0.01 }, // 2 or 3 Channel 2: 04
  3: { instrument: 0x0B, pitchRange: [70, 79], timingFactor: 0.01 }, // empty? Channel 3: 0B
  6: { instrument: 0x08, pitchRange: [80, 89], timingFactor: 0.01 }, // 1 or 1.5 Channel 6: 08
  7: { instrument: 0x0B, pitchRange: [90, 99], timingFactor: 0.01 }  // 1 Channel 7: 0B
};

// Function to display usage information
function showUsage() {
  const scriptName = path.basename(process.argv[1]);
  console.log(`
NHL '94 Music Extractor - Converts NHL '94 music data to MIDI format

Usage:
  node ${scriptName} [options] <romFile> [outputFile]

Arguments:
  romFile          Path to the NHL '94 ROM file (required)
  outputFile       Path to the output MIDI file (default: <romFile-basename>_theme.mid)

Options:
  --help, -h             Show this help message
  --offset, -o           Specify custom ROM offset for music data (default: 0x4507A)
  --footer, -f           Specify custom footer offset (default: 0x46D82)
  --instrument, -i       Change instrument for a channel (format: channel:instrument, e.g., 0:0x0B)
  --timing-factor, -t    Adjust timing factor for a channel (format: channel:factor, e.g., 1:0.5)
  --list-instruments, -l List known instruments
  --verbose, -v          Enable verbose output

Examples:
  node ${scriptName} nhl94.bin
  node ${scriptName} nhl94.bin custom_output.mid
  node ${scriptName} --offset 0x45000 nhl94.bin
  node ${scriptName} -o 0x45000 -f 0x46D00 nhl94.bin output.mid
  node ${scriptName} -i 0:0x0C -i 1:0x09 nhl94.bin custom_instruments.mid
  node ${scriptName} -t 0:1.0 -t 1:0.5 nhl94.bin timing_adjusted.mid
  node ${scriptName} --list-instruments
  `);
}

// Function to parse command-line arguments
function parseArgs() {
  const args = {
    romPath: null,
    outputPath: null,
    romOffset: ROM_OFFSET,
    footerOffset: FOOTER_OFFSET,
    verbose: false,
    showHelp: false,
    customInstruments: {},
    customTimingFactors: {},
    listInstruments: false
  };

  // Skip the first two arguments (node executable and script path)
  const cliArgs = process.argv.slice(2);
  
  for (let i = 0; i < cliArgs.length; i++) {
    const arg = cliArgs[i];
    
    // Handle options
    if (arg.startsWith('-')) {
      switch (arg) {
        case '--help':
        case '-h':
          args.showHelp = true;
          break;
        case '--offset':
        case '-o':
          if (i + 1 < cliArgs.length) {
            const offsetValue = cliArgs[++i];
            args.romOffset = parseInt(offsetValue.startsWith('0x') ? offsetValue : `0x${offsetValue}`, 16);
          }
          break;
        case '--footer':
        case '-f':
          if (i + 1 < cliArgs.length) {
            const offsetValue = cliArgs[++i];
            args.footerOffset = parseInt(offsetValue.startsWith('0x') ? offsetValue : `0x${offsetValue}`, 16);
          }
          break;
        case '--instrument':
        case '-i':
          if (i + 1 < cliArgs.length) {
            const instValue = cliArgs[++i];
            const [channel, instrument] = instValue.split(':');
            if (channel && instrument) {
              const channelNum = parseInt(channel);
              const instrumentNum = parseInt(instrument.startsWith('0x') ? instrument : `0x${instrument}`, 16);
              args.customInstruments[channelNum] = instrumentNum;
            }
          }
          break;
        case '--timing-factor':
        case '-t':
          if (i + 1 < cliArgs.length) {
            const factorValue = cliArgs[++i];
            const [channel, factor] = factorValue.split(':');
            if (channel && factor) {
              const channelNum = parseInt(channel);
              const timingFactor = parseFloat(factor);
              args.customTimingFactors[channelNum] = timingFactor;
            }
          }
          break;
        case '--list-instruments':
        case '-l':
          args.listInstruments = true;
          break;
        case '--verbose':
        case '-v':
          args.verbose = true;
          break;
        default:
          console.error(`Unknown option: ${arg}`);
          args.showHelp = true;
      }
    } else {
      // Handle positional arguments
      if (args.romPath === null) {
        args.romPath = arg;
      } else if (args.outputPath === null) {
        args.outputPath = arg;
      }
    }
  }

  // Set default output path if not specified
  if (args.romPath && !args.outputPath) {
    const romBasename = path.basename(args.romPath, path.extname(args.romPath));
    args.outputPath = `${romBasename}_theme.mid`;
  }

  return args;
}

// Function to determine MIDI channel based on pitch
function getChannelForPitch(pitch) {
  for (const [channel, config] of Object.entries(CHANNELS)) {
    const [min, max] = config.pitchRange;
    if (pitch >= min && pitch <= max) {
      return parseInt(channel);
    }
  }
  return 0; // Default to channel 0 if no match
}

// Function to parse music data
async function parseMusicData(romBuffer, offset, footerOffset, options = {}) {
  const { verbose = false, customInstruments = {}, customTimingFactors = {} } = options;
  const tracks = {};
  let currentOffset = offset;
  
  // Get the footer data
  const loopFooter = romBuffer.slice(footerOffset, footerOffset + FOOTER_LENGTH);
  
  // Initialize tracks for each channel with correct instruments
  for (const channel of Object.keys(CHANNELS)) {
    const channelNum = parseInt(channel);
    tracks[channel] = new MidiWriter.Track();
    
    // Apply custom instrument if specified, otherwise use default
    const instrumentValue = customInstruments[channelNum] !== undefined ? 
      customInstruments[channelNum] : CHANNELS[channel].instrument;
    
    tracks[channel].addEvent(new MidiWriter.ProgramChangeEvent({
      instrument: instrumentValue
    }));
    
    if (verbose) {
      const instrumentName = INSTRUMENTS[instrumentValue] || `Unknown (0x${instrumentValue.toString(16).toUpperCase()})`;
      console.log(`Channel ${channel}: Using instrument ${instrumentValue} (${instrumentName})`);
    }
  }

  // Look for initialization section (C0 xx C1 xx pattern)
  let hasInitSection = false;
  let initSectionLength = 0;
  
  // Check for C0 xx pattern (channel setup)
  for (let i = 0; i < 20; i += 2) {
    const b1 = romBuffer.readUInt8(currentOffset + i);
    if ((b1 & 0xF0) === 0xC0) { // Check if it's a program change command (0xCn)
      hasInitSection = true;
      initSectionLength = Math.max(initSectionLength, i + 2);
    } else {
      break;
    }
  }
  
  if (hasInitSection && verbose) {
    console.log(`Found initialization section, length: ${initSectionLength} bytes`);
    // Skip initialization section
    currentOffset += initSectionLength;
  }

  // Parse note data until footer is reached
  let noteCount = 0;
  while (currentOffset < romBuffer.length - 4) {
    // Check for footer
    if (currentOffset + FOOTER_LENGTH <= romBuffer.length &&
        romBuffer.slice(currentOffset, currentOffset + FOOTER_LENGTH).equals(loopFooter)) {
      if (verbose) {
        console.log(`Found footer at offset 0x${currentOffset.toString(16).toUpperCase()}`);
      }
      break; // Stop at loop footer
    }

    // Parse 4-byte note structure based on forum findings
    const timingByte = romBuffer.readUInt8(currentOffset);
    const statusByte = romBuffer.readUInt8(currentOffset + 1);
    const pitch = romBuffer.readUInt8(currentOffset + 2);
    const velocity = romBuffer.readUInt8(currentOffset + 3);
    
    // Extract actual channel from status byte (0x90 = channel 0, 0x91 = channel 1, etc.)
    const isNoteOn = (statusByte & 0xF0) === 0x90;
    const isNoteOff = (statusByte & 0xF0) === 0x80;
    const midiChannel = statusByte & 0x0F;
    
    // Create the track for this channel if it doesn't exist
    if (!tracks[midiChannel]) {
      tracks[midiChannel] = new MidiWriter.Track();
      const instrumentValue = customInstruments[midiChannel] !== undefined ? 
        customInstruments[midiChannel] : (CHANNELS[midiChannel]?.instrument || 0x00);
      
      tracks[midiChannel].addEvent(new MidiWriter.ProgramChangeEvent({
        instrument: instrumentValue
      }));
    }
    
    if (isNoteOn) {
      // Get the timing factor for this channel (for speed adjustment)
      const defaultTimingFactor = CHANNELS[midiChannel]?.timingFactor || 1.0;
      const timingFactor = customTimingFactors[midiChannel] !== undefined ? 
        customTimingFactors[midiChannel] : defaultTimingFactor;
      
      // Apply timing factor to both duration and wait time
      const adjustedDuration = Math.round(velocity * timingFactor);
      const adjustedWait = Math.round(timingByte * timingFactor);
      
      // For Note-On events
      const noteEvent = new MidiWriter.NoteEvent({
        pitch: pitch,
        duration: `T${adjustedDuration}`, // MIDI ticks with timing adjustment
        velocity: 100, // Use a standard velocity for consistent volume
        wait: `T${adjustedWait}` // Wait time with timing adjustment
      });
      tracks[midiChannel].addEvent(noteEvent);
      noteCount++;
      
      if (verbose && timingFactor !== 1.0) {
        if (noteCount === 1) {
          console.log(`Applying timing factor of ${timingFactor} to channel ${midiChannel}`);
        }
      }
    }
    // Note: We're ignoring Note-Off events as NoteEvent handles duration

    currentOffset += 4; // Move to next note
    
    if (verbose && noteCount % 100 === 0) {
      console.log(`Processed ${noteCount} notes...`);
    }
  }

  if (verbose) {
    console.log(`Total notes processed: ${noteCount}`);
    console.log(`Music data processed from 0x${offset.toString(16).toUpperCase()} to 0x${currentOffset.toString(16).toUpperCase()}`);
  }

  return tracks;
}

// Main function to convert ROM to MIDI
async function convertRomToMidi(options) {
  const { romPath, outputPath, romOffset, footerOffset, verbose, customInstruments, customTimingFactors } = options;
  
  try {
    if (verbose) {
      console.log(`Reading ROM file: ${romPath}`);
      console.log(`Using ROM offset: 0x${romOffset.toString(16).toUpperCase()}`);
      console.log(`Using footer offset: 0x${footerOffset.toString(16).toUpperCase()}`);
      
      if (Object.keys(customInstruments).length > 0) {
        console.log('Using custom instruments:');
        for (const [channel, instrument] of Object.entries(customInstruments)) {
          const instrumentName = INSTRUMENTS[instrument] || `Unknown (0x${instrument.toString(16).toUpperCase()})`;
          console.log(`  Channel ${channel}: 0x${instrument.toString(16).toUpperCase()} (${instrumentName})`);
        }
      }
      
      if (Object.keys(customTimingFactors).length > 0) {
        console.log('Using custom timing factors:');
        for (const [channel, factor] of Object.entries(customTimingFactors)) {
          console.log(`  Channel ${channel}: ${factor}x`);
        }
      }
    }

    // Read ROM file
    const romBuffer = await fs.readFile(romPath);
    if (verbose) {
      console.log(`ROM file size: ${romBuffer.length} bytes`);
    }

    // Parse music data with options
    const tracks = await parseMusicData(romBuffer, romOffset, footerOffset, { 
      verbose, 
      customInstruments,
      customTimingFactors
    });

    // Create MIDI file
    const writer = new MidiWriter.Writer(Object.values(tracks).filter(track => track.events.length > 0));
    await fs.writeFile(outputPath, Buffer.from(writer.buildFile()));
    console.log(`MIDI file saved to ${outputPath}`);
    
    // Print summary of instruments used
    if (verbose) {
      console.log('\nInstrument Summary:');
      for (const [channel, track] of Object.entries(tracks)) {
        if (track.events.length > 0) {
          const programEvent = track.events.find(e => e.type === 'program');
          const instrument = programEvent ? programEvent.data.instrument : 'Unknown';
          const instrumentName = INSTRUMENTS[instrument] || `Unknown (0x${instrument.toString(16).toUpperCase()})`;
          const timingFactor = customTimingFactors[channel] !== undefined ? 
            customTimingFactors[channel] : (CHANNELS[channel]?.timingFactor || 1.0);
          console.log(`  Channel ${channel}: ${instrument} (${instrumentName}) - ${track.events.length} events - Timing: ${timingFactor}x`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = parseArgs();
  
  if (args.listInstruments) {
    listInstruments();
    return;
  }
  
  if (args.showHelp || !args.romPath) {
    showUsage();
    process.exit(args.showHelp ? 0 : 1);
  }
  
  await convertRomToMidi({
    romPath: args.romPath,
    outputPath: args.outputPath,
    romOffset: args.romOffset,
    footerOffset: args.footerOffset,
    verbose: args.verbose,
    customInstruments: args.customInstruments,
    customTimingFactors: args.customTimingFactors
  });
}

// Function to list available instruments
function listInstruments() {
  console.log('Available NHL 94 Instruments (based on current knowledge):');
  for (const [instrument, name] of Object.entries(INSTRUMENTS)) {
    console.log(`  0x${parseInt(instrument).toString(16).toUpperCase().padStart(2, '0')}: ${name}`);
  }
  console.log('\nNote: NHL 94 uses a custom sound bank that may not map directly to standard MIDI instruments.');
  console.log('Additional instruments may be available in the 0x00-0x1F range.');
  console.log('Use the --instrument option to experiment with different instrument values.');
  
  console.log('\nChannel Configuration:');
  for (const [channel, config] of Object.entries(CHANNELS)) {
    const instrumentValue = config.instrument;
    const instrumentName = INSTRUMENTS[instrumentValue] || `Unknown (0x${instrumentValue.toString(16).toUpperCase()})`;
    console.log(`  Channel ${channel}: Instrument 0x${instrumentValue.toString(16).toUpperCase()} (${instrumentName}), Timing Factor: ${config.timingFactor}x`);
  }
  
  console.log('\nTiming Factors:');
  console.log('  1.0 = Normal speed');
  console.log('  0.5 = Half speed (slower)');
  console.log('  2.0 = Double speed (faster)');
  console.log('\nNote: If one instrument (like bass) plays at normal speed while others play at twice the speed,');
  console.log('try setting the timing factor for the bass channel to 0.5 using the --timing-factor option.');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});