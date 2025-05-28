const fs = require('fs').promises;
const MidiWriter = require('midi-writer-js');
const path = require('path');

// Create a directory to store instrument samples
const SAMPLES_DIR = path.resolve(__dirname, 'instrument_samples');

// Generate a MIDI file for a specific instrument
async function generateInstrumentSample(instrument, outputPath) {
  // Create a new MIDI track
  const track = new MidiWriter.Track();
  
  // Set the instrument
  track.addEvent(new MidiWriter.ProgramChangeEvent({
    instrument: instrument
  }));
  
  // Add a scale of notes (C major scale)
  const pitches = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5
  
  // Add notes with varying velocity
  for (const pitch of pitches) {
    track.addEvent(new MidiWriter.NoteEvent({
      pitch: pitch,
      duration: '4', // Quarter note
      velocity: 100
    }));
  }
  
  // Add a chord
  track.addEvent(new MidiWriter.NoteEvent({
    pitch: ['C4', 'E4', 'G4'],
    duration: '2', // Half note
    velocity: 100
  }));
  
  // Create a MIDI file
  const writer = new MidiWriter.Writer(track);
  await fs.writeFile(outputPath, Buffer.from(writer.buildFile()));
}

// Main function
async function main() {
  try {
    // Create samples directory if it doesn't exist
    await fs.mkdir(SAMPLES_DIR, { recursive: true });
    
    console.log('Generating instrument samples...');
    console.log(`Output directory: ${SAMPLES_DIR}`);
    
    // Generate samples for instruments 0x00 to 0x1F
    for (let i = 0; i <= 0x1F; i++) {
      const instrumentHex = i.toString(16).padStart(2, '0').toUpperCase();
      const outputPath = path.join(SAMPLES_DIR, `instrument_${instrumentHex}.mid`);
      
      await generateInstrumentSample(i, outputPath);
      console.log(`Generated sample for instrument 0x${instrumentHex}`);
    }
    
    console.log('\nSample MIDI files created successfully!');
    console.log('Play these files to hear how each instrument sounds in NHL 94.');
    console.log('Use these samples to choose the right instruments for your custom music.');
    
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
