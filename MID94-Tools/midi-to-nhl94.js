const fs = require('fs').promises;
const path = require('path');
const midiParser = require('midi-parser-js');

// Configuration
const NHL94_HEADER = [0x00, 0xC0, 0x0B, 0x01, 0x00, 0xC1, 0x08, 0x01, 0x00, 0xC2, 0x04, 0x01, 0x00, 0xC3, 0x0B, 0x01, 0x00, 0xC6, 0x08, 0x01, 0x00, 0xC7, 0x0B, 0x01];
const NHL94_FOOTER = [0xFF, 0x2F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; // This is a placeholder - actual footer should be extracted from the ROM

// Instrument mapping - MIDI program to NHL94 instrument
const INSTRUMENT_MAP = {
  0: 0x00,  // Acoustic Grand Piano
  4: 0x04,  // Electric Piano
  8: 0x08,  // Celesta
  9: 0x08,  // Glockenspiel
  10: 0x0B, // Music Box
  11: 0x0B, // Vibraphone
  12: 0x0B, // Marimba
  13: 0x0B, // Xylophone
  14: 0x0B, // Tubular Bells
  19: 0x14, // Church Organ
  20: 0x14, // Reed Organ
  21: 0x14, // Accordion
  22: 0x14, // Harmonica
  23: 0x14, // Tango Accordion
  // Add more mappings as discovered
};

// Channel configuration from NHL 94 - matching mid94-to-midi.js
const CHANNELS = {
  0: { instrument: 0x0B, pitchRange: [40, 49], timingFactor: 1.0 }, // Channel 0: 0B (chorus synth)
  1: { instrument: 0x08, pitchRange: [50, 59], timingFactor: 0.5 }, // Channel 1: 08 (brassy sound) - slower (bass?)
  2: { instrument: 0x04, pitchRange: [60, 69], timingFactor: 1.0 }, // Channel 2: 04
  3: { instrument: 0x0B, pitchRange: [70, 79], timingFactor: 1.0 }, // Channel 3: 0B
  6: { instrument: 0x08, pitchRange: [80, 89], timingFactor: 1.0 }, // Channel 6: 08
  7: { instrument: 0x0B, pitchRange: [90, 99], timingFactor: 1.0 }  // Channel 7: 0B
};

// Function to display usage information
function showUsage() {
  const scriptName = path.basename(process.argv[1]);
  console.log(`
NHL '94 MIDI Converter - Converts MIDI files to NHL '94 music format

Usage:
  node ${scriptName} [options] <midiFile> <romFile>

Arguments:
  midiFile            Path to the input MIDI file (required)
  romFile             Path to the output ROM file or patch file (required)

Options:
  --help, -h          Show this help message
  --offset, -o        Target ROM offset for insertion (default: 0x4507A)
  --channel-map, -c   Map MIDI channel to NHL94 channel (format: midi:nhl94, e.g., 0:1)
  --timing-factor, -t Adjust timing factor for a channel (format: channel:factor, e.g., 1:0.5)
  --footer, -f        Specify custom footer file or ROM path to extract footer
  --verbose, -v       Enable verbose output

Examples:
  node ${scriptName} song.mid nhl94_patched.bin
  node ${scriptName} --offset 0x45000 song.mid nhl94.bin
  node ${scriptName} --channel-map 0:1 --channel-map 1:3 song.mid nhl94.bin
  node ${scriptName} --timing-factor 1:0.5 song.mid nhl94.bin
  node ${scriptName} --footer nhl94.bin song.mid nhl94_patched.bin
  `);
}

// Function to parse command-line arguments
function parseArgs() {
  const args = {
    midiPath: null,
    romPath: null,
    targetOffset: 0x4507A, // Default NHL94 theme location
    channelMap: {},
    timingFactors: {},
    footerPath: null,
    footerOffset: 0x46D82, // Default footer offset
    verbose: false,
    showHelp: false
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
            args.targetOffset = parseInt(offsetValue.startsWith('0x') ? offsetValue : `0x${offsetValue}`, 16);
          }
          break;
        case '--channel-map':
        case '-c':
          if (i + 1 < cliArgs.length) {
            const mapValue = cliArgs[++i];
            const [midi, nhl94] = mapValue.split(':');
            if (midi !== undefined && nhl94 !== undefined) {
              args.channelMap[parseInt(midi)] = parseInt(nhl94);
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
              args.timingFactors[channelNum] = timingFactor;
            }
          }
          break;
        case '--footer':
        case '-f':
          if (i + 1 < cliArgs.length) {
            args.footerPath = cliArgs[++i];
          }
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
      if (args.midiPath === null) {
        args.midiPath = arg;
      } else if (args.romPath === null) {
        args.romPath = arg;
      }
    }
  }

  return args;
}

// Extract footer from a ROM file
async function extractFooter(romPath, footerOffset = 0x46D82, verbose = false) {
  try {
    const romBuffer = await fs.readFile(romPath);
    const footerData = romBuffer.slice(footerOffset, footerOffset + 10);
    
    if (verbose) {
      console.log(`Extracted footer from ${romPath} at offset 0x${footerOffset.toString(16).toUpperCase()}`);
      console.log(`Footer data: ${Buffer.from(footerData).toString('hex').toUpperCase()}`);
    }
    
    return footerData;
  } catch (error) {
    console.error(`Error extracting footer: ${error.message}`);
    return Buffer.from(NHL94_FOOTER); // Fallback to default footer
  }
}

// Convert MIDI events to NHL94 format
async function convertMidiToNHL94(midiPath, options = {}) {
  const { 
    verbose = false, 
    channelMap = {},
    timingFactors = {},
    footerPath = null,
    footerOffset = 0x46D82
  } = options;
  
  try {
    // Read MIDI file
    const midiBuffer = await fs.readFile(midiPath);
    const midiBase64 = midiBuffer.toString('base64');
    const midiData = midiParser.parse(midiBase64);
    
    if (verbose) {
      console.log(`MIDI format: ${midiData.formatType}`);
      console.log(`MIDI tracks: ${midiData.tracks.length}`);
      console.log(`MIDI timing: ${midiData.timeDivision}`);
    }
    
    // Create NHL94 header
    const nhl94Data = [...NHL94_HEADER];
    
    // Process MIDI tracks
    for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
      const track = midiData.tracks[trackIndex];
      
      if (verbose) {
        console.log(`Processing track ${trackIndex + 1} with ${track.length} events`);
      }
      
      // Process MIDI events
      for (let i = 0; i < track.length; i++) {
        const event = track[i];
        
        // Handle note on/off events
        if (event.type === 9 || event.type === 8) { // Note On or Note Off
          const midiChannel = event.channel;
          const nhl94Channel = channelMap[midiChannel] !== undefined ? channelMap[midiChannel] : midiChannel;
          const pitch = event.data[0];
          const velocity = event.data[1];
          
          // Apply timing factor to deltaTime
          const defaultTimingFactor = CHANNELS[nhl94Channel]?.timingFactor || 1.0;
          const timingFactor = timingFactors[nhl94Channel] !== undefined ? 
            timingFactors[nhl94Channel] : defaultTimingFactor;
          
          // For NHL94, we need to reverse the timing factor calculation
          // If we're halving the speed in mid94-to-midi (0.5), we need to double (1/0.5 = 2.0) here
          const inverseTimingFactor = timingFactor !== 0 ? (1.0 / timingFactor) : 1.0;
          
          // Apply inverse timing factor to deltaTime
          const adjustedDeltaTime = Math.round(event.deltaTime * inverseTimingFactor);
          
          // Cap at 255 (1 byte)
          const deltaTime = Math.min(adjustedDeltaTime, 0xFF);
          
          if (verbose && i === 0 && timingFactor !== 1.0) {
            console.log(`Channel ${nhl94Channel}: Applying inverse timing factor of ${inverseTimingFactor} (from ${timingFactor})`);
          }
          
          // Create NHL94 note event (4 bytes: time, status, pitch, velocity)
          const statusByte = (event.type === 9 ? 0x90 : 0x80) | nhl94Channel;
          
          nhl94Data.push(
            deltaTime & 0xFF,     // Timing byte (with timing factor applied)
            statusByte,           // Status byte (note on/off + channel)
            pitch,                // Pitch
            velocity              // Velocity/duration
          );
        }
        // Ignoring other MIDI events for simplicity
      }
    }
    
    // Add footer - either extracted from ROM or default
    let footer = Buffer.from(NHL94_FOOTER);
    if (footerPath) {
      footer = await extractFooter(footerPath, footerOffset, verbose);
    }
    
    nhl94Data.push(...footer);
    
    if (verbose) {
      console.log(`Generated ${nhl94Data.length} bytes of NHL94 music data`);
    }
    
    return Buffer.from(nhl94Data);
  } catch (error) {
    console.error(`Error converting MIDI: ${error.message}`);
    throw error;
  }
}

// Patch ROM file with NHL94 music data
async function patchRomFile(romPath, nhl94Data, targetOffset, verbose = false) {
  try {
    // Read ROM file
    const romBuffer = await fs.readFile(romPath);
    
    if (verbose) {
      console.log(`ROM file size: ${romBuffer.length} bytes`);
      console.log(`Writing ${nhl94Data.length} bytes at offset 0x${targetOffset.toString(16).toUpperCase()}`);
    }
    
    // Ensure target offset is valid
    if (targetOffset + nhl94Data.length > romBuffer.length) {
      throw new Error(`Target offset + data size exceeds ROM size`);
    }
    
    // Create a copy of the ROM buffer
    const newRomBuffer = Buffer.from(romBuffer);
    
    // Write NHL94 data to the ROM
    nhl94Data.copy(newRomBuffer, targetOffset);
    
    // Generate output filename
    const parsedPath = path.parse(romPath);
    const outputPath = `${parsedPath.dir}/${parsedPath.name}_patched${parsedPath.ext}`;
    
    // Write modified ROM
    await fs.writeFile(outputPath, newRomBuffer);
    
    if (verbose) {
      console.log(`Patched ROM saved to ${outputPath}`);
    }
    
    return outputPath;
  } catch (error) {
    console.error(`Error patching ROM: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  const args = parseArgs();
  
  if (args.showHelp || !args.midiPath || !args.romPath) {
    showUsage();
    process.exit(args.showHelp ? 0 : 1);
  }
  
  try {
    // Convert MIDI to NHL94 format
    const nhl94Data = await convertMidiToNHL94(args.midiPath, {
      verbose: args.verbose,
      channelMap: args.channelMap,
      timingFactors: args.timingFactors,
      footerPath: args.footerPath,
      footerOffset: args.footerOffset
    });
    
    // Patch ROM file
    const outputPath = await patchRomFile(args.romPath, nhl94Data, args.targetOffset, args.verbose);
    
    console.log(`Successfully patched ROM with custom music: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to convert or patch: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
