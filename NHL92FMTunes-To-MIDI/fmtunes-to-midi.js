const fs = require('fs');
const MidiWriter = require('midi-writer-js');

// Constants from disassembly
const FMTUNE_TABLE_OFFSET = 0x10294;
const NOTE_FREQ_TABLE_OFFSET = 0x1017A;
const NOTE_OCTAVE_TABLE_OFFSET = 0x101DA;
const ENVELOPE_TABLE_OFFSET = 0x1023A;
const INSTRUMENT_TABLE_OFFSET = 0x116A6;
const SOUND_BASE = 0xF4C8; // Sound code start for relative pointers

// Load ROM binary
function loadROM(filePath) {
  return fs.readFileSync(filePath);
}

// Utility: Read big-endian word/long from buffer
function readWord(buffer, offset) {
  return (buffer[offset] << 8) | buffer[offset + 1];
}
function readLong(buffer, offset) {
  return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
}

// Map YM freq to MIDI note (approximation; tuned to A4=440Hz)
function ymFreqToMidiNote(freqHigh, freqLow, pitchBend = 0) {
  const fnum = ((freqHigh & 0x07) << 8) | freqLow;
  const block = (freqHigh >> 3) & 0x07;
  const freqHz = (7670454 / 144 / 32) * fnum / (1 << (21 - block)); // YM2612 freq formula
  let midiNote = Math.round(69 + 12 * Math.log2(freqHz / 440));
  midiNote += Math.round(pitchBend / 8) * 500; // Apply bend approximation
  return Math.max(0, Math.min(127, midiNote));
}

// Simulate envelope with pitch bend events (basic linear ramp over duration)
function applyEnvelope(track, buffer, envelopePtr, level, durationTicks) {
  let envPos = envelopePtr;
  let bendValue = 8192; // Neutral
  const stepTicks = Math.floor(durationTicks / 10); // Arbitrary 10 steps for simulation
  while (true) {
    const envByte = buffer[envPos++];
    if (envByte === 0x84) break; // Loop/end marker
    const delta = (envByte << 24 >> 24) * level; // Signed
    bendValue = Math.max(-8192, Math.min(8191, bendValue + delta));
    track.addEvent(new MidiWriter.PitchBendEvent({value: bendValue + 8192})); // 0-16383 range
  }
}

// Main parser for a channel sequence
function parseChannelSequence(buffer, seqStart, durationMult, track) {
  let pos = seqStart;
  let currentDuration = durationMult; // Initial ticks (adjusted by commands)
  let instrument = -1;
  let envelopeId = 0;
  let pitchBend = 0;
  let modulationDepth = 0;
  let modulationDelay = 0;
  let flags = 0; // Bitflags for sustain, etc.
  let maxIterations = 10000; // Guard against infinite loops

  track.addTrackName('FM Channel');

  while (maxIterations-- > 0) {
    if (pos >= buffer.length) {
      console.warn('Sequence pointer out of bounds at', pos.toString(16));
      return;
    }
    const byte = buffer[pos++];
    if (byte < 0x80) {
      // Note or rest
      if (byte === 0x60) {
        // Rest: Advance time (no event)
      } else {
        // Note: Get freq from tables + adjustments
        const noteOffset = byte;
        const freqByte = buffer[NOTE_FREQ_TABLE_OFFSET + noteOffset];
        const octave = buffer[NOTE_OCTAVE_TABLE_OFFSET + noteOffset];
        const freqHigh = (freqByte & 0x38) | (octave >> 5);
        const freqLow = (freqByte & 0x07) | (octave << 3);
        const midiNote = ymFreqToMidiNote(freqHigh, freqLow, pitchBend);

        const noteDuration = Math.max(1, currentDuration);
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: midiNote,
          duration: `T${noteDuration}`,
          velocity: 127  // Max velocity for louder notes
        }));

        if (envelopeId > 0) {
          const envPtr = readLong(buffer, ENVELOPE_TABLE_OFFSET + envelopeId * 4) + SOUND_BASE;
          applyEnvelope(track, buffer, envPtr, 1, noteDuration); // Level=1 placeholder
        }
      }
    } else {
      switch (byte) {
        case 0x80: // Instrument
          instrument = buffer[pos++];
          // const patchOffset = INSTRUMENT_TABLE_OFFSET + instrument * 32;
          // const patchData = Array.from(buffer.slice(patchOffset, patchOffset + 32));
          // track.addEvent(new MidiWriter.Event({data: [0xF0, 0x43, 0x00, ...patchData, 0xF7]})); // Removed due to lack of support
          track.addEvent(new MidiWriter.ProgramChangeEvent({programNumber: instrument % 128})); // GM approx only
          break;
        case 0x81: // Modulation
          modulationDelay = buffer[pos++];
          modulationDepth = buffer[pos++];
          track.addEvent(new MidiWriter.ControllerEvent({controllerType: 1, value: modulationDepth})); // Mod wheel
          break;
        case 0x83: // Sustain flag
          flags |= 0x04;
          break;
        case 0x84: // Loop (simple unroll; revisit for full table)
          console.log('Loop at', pos.toString(16), '; unrolling once');
          pos = seqStart; // Basic reset; add loop count logic if needed
          break;
        case 0x85: // Stop
          return;
        case 0x86: // Envelope
          envelopeId = buffer[pos++];
          buffer[pos++]; // Level/time mode (ignored for now)
          break;
        case 0x87: // Clear envelope
          envelopeId = 0;
          break;
        case 0x88: // Pitch bend
          pitchBend = buffer[pos++]; // Signed
          track.addEvent(new MidiWriter.PitchBendEvent({value: 8192 + pitchBend * 64})); // Scaled
          break;
        case 0x89: // Key-off disable
          flags |= 0x08;
          break;
        case 0x8A: // Skip
          pos++;
          break;
        case 0x8B: // SFX trigger (ignore)
          pos++;
          break;
        default:
          if (byte >= 0xA0) {
            currentDuration = Math.max(1, (byte - 0xA0) * durationMult);
          } else {
            console.warn('Unknown command 0x' + byte.toString(16) + ' at pos 0x' + (pos - 1).toString(16));
          }
          break;
      }
    }
  }
  console.warn('Max iterations reached; possible infinite loop');
}

// Main conversion function
function convertTracks(romBuffer) {
  for (let trackId = 0; trackId <= 5; trackId++) {
    const tableOffset = FMTUNE_TABLE_OFFSET + trackId * 0x1A;
    const fmChannels = romBuffer[tableOffset];
    const durationMult = romBuffer[tableOffset + 1] || 6; // Default if 0
    const tracks = [];

    // Conductor track for meta
    const conductorTrack = new MidiWriter.Track();
    const bpm = Math.round(3600 / durationMult); // Approx BPM (60 Hz * 60 / ticks per beat)
    conductorTrack.setTempo(bpm);
    tracks.push(conductorTrack);

    for (let ch = 0; ch <= fmChannels; ch++) {
      const ptrOffset = tableOffset + 2 + ch * 4;
      const headerPtr = readLong(romBuffer, ptrOffset) + SOUND_BASE;
      const seqOffset = readWord(romBuffer, headerPtr) + SOUND_BASE; // Corrected: relative to base, no + headerPtr

      const track = new MidiWriter.Track();
      parseChannelSequence(romBuffer, seqOffset, durationMult, track);
      tracks.push(track);
    }

    const midi = new MidiWriter.Writer(tracks);
    fs.writeFileSync(`track${trackId}.mid`, midi.buildFile());
    console.log(`Converted track ${trackId} (BPM approx ${bpm})`);
  }
}

// Usage: node fmtunes-to-midi.js nhl92retail.bin
const romPath = process.argv[2] || './nhl92retail.bin';
const rom = loadROM(romPath);
convertTracks(rom);