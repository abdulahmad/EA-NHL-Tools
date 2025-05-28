#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const midiParser = require('midi-parser-js');

/**
 * This script analyzes a MIDI file to identify potential bass channels
 * and suggest appropriate timing factors.
 */

// Configuration
const NOTE_RANGES = {
  BASS: [20, 48],      // Typical bass range (E0 to C3)
  MIDDLE: [48, 72],    // Middle range (C3 to C5)
  HIGH: [72, 96]       // High range (C5 to C8)
};

async function main() {
  // Parse command line arguments
  if (process.argv.length < 3) {
    console.log('Usage: node analyze-midi.js <midiFile>');
    process.exit(1);
  }
  
  const midiPath = process.argv[2];
  
  try {
    // Read MIDI file
    const midiBuffer = await fs.readFile(midiPath);
    const midiBase64 = midiBuffer.toString('base64');
    const midiData = midiParser.parse(midiBase64);
    
    console.log(`\nAnalyzing MIDI file: ${path.basename(midiPath)}`);
    console.log(`MIDI format: ${midiData.formatType}`);
    console.log(`Number of tracks: ${midiData.tracks.length}`);
    console.log(`Time division: ${midiData.timeDivision}`);
    
    // Analyze tracks
    const trackAnalysis = analyzeTracks(midiData);
    
    // Print analysis results
    console.log('\nTrack Analysis:');
    console.log('===============');
    
    let bassChannels = [];
    let otherChannels = [];
    
    for (const [trackIndex, analysis] of trackAnalysis.entries()) {
      console.log(`\nTrack ${trackIndex + 1}:`);
      
      // Print statistics for each track
      console.log(`  Total notes: ${analysis.totalNotes}`);
      console.log(`  Pitch range: ${analysis.minPitch} to ${analysis.maxPitch} (${getPitchName(analysis.minPitch)} to ${getPitchName(analysis.maxPitch)})`);
      console.log(`  Average pitch: ${analysis.avgPitch.toFixed(2)}`);
      console.log(`  Notes by range: Bass: ${analysis.notesByRange.bass}, Middle: ${analysis.notesByRange.middle}, High: ${analysis.notesByRange.high}`);
      
      // Identify potential bass tracks
      const bassPercentage = (analysis.notesByRange.bass / analysis.totalNotes) * 100;
      const middlePercentage = (analysis.notesByRange.middle / analysis.totalNotes) * 100;
      const highPercentage = (analysis.notesByRange.high / analysis.totalNotes) * 100;
      
      console.log(`  Range percentages: Bass: ${bassPercentage.toFixed(2)}%, Middle: ${middlePercentage.toFixed(2)}%, High: ${highPercentage.toFixed(2)}%`);
      
      // Classify the track
      let classification = '';
      if (analysis.totalNotes === 0) {
        classification = 'Empty track (no notes)';
      } else if (bassPercentage > 70) {
        classification = 'BASS track (primarily low notes)';
        bassChannels.push({ track: trackIndex, channel: analysis.primaryChannel });
      } else if (bassPercentage > 40 && bassPercentage > middlePercentage && bassPercentage > highPercentage) {
        classification = 'Likely BASS track (predominantly low notes)';
        bassChannels.push({ track: trackIndex, channel: analysis.primaryChannel });
      } else if (middlePercentage > 70) {
        classification = 'MID-RANGE track (primarily middle notes)';
        otherChannels.push({ track: trackIndex, channel: analysis.primaryChannel });
      } else if (highPercentage > 70) {
        classification = 'HIGH track (primarily high notes)';
        otherChannels.push({ track: trackIndex, channel: analysis.primaryChannel });
      } else {
        classification = 'MIXED track (notes across multiple ranges)';
        otherChannels.push({ track: trackIndex, channel: analysis.primaryChannel });
      }
      
      console.log(`  Classification: ${classification}`);
      console.log(`  Primary MIDI channel: ${analysis.primaryChannel}`);
    }
    
    // Generate timing factor recommendations
    console.log('\nTiming Factor Recommendations:');
    console.log('============================');
    
    if (bassChannels.length === 0) {
      console.log('No clear bass channels detected. Try the following general approach:');
      console.log('1. Start with all channels at normal speed (factor 1.0)');
      console.log('2. If channels seem out of sync, try setting channels with lower notes to 0.5');
    } else {
      console.log('Detected potential bass channels:');
      for (const { track, channel } of bassChannels) {
        console.log(`- Track ${track + 1}, Channel ${channel}`);
      }
      
      console.log('\nSuggested timing adjustments:');
      console.log('1. Set bass channel(s) to half speed:');
      
      let command = 'node mid94-to-midi.js';
      
      // Add timing factors for bass channels
      for (const { channel } of bassChannels) {
        command += ` -t ${channel}:0.5`;
      }
      
      // Add timing factors for other channels (if needed)
      for (const { channel } of otherChannels) {
        command += ` -t ${channel}:1.0`;
      }
      
      command += ' nhl94.bin output.mid';
      
      console.log(`   ${command}`);
      
      console.log('\nAlternative approach:');
      console.log('2. Set non-bass channels to double speed:');
      
      command = 'node mid94-to-midi.js';
      
      // Add timing factors for bass channels
      for (const { channel } of bassChannels) {
        command += ` -t ${channel}:1.0`;
      }
      
      // Add timing factors for other channels
      for (const { channel } of otherChannels) {
        command += ` -t ${channel}:2.0`;
      }
      
      command += ' nhl94.bin output.mid';
      
      console.log(`   ${command}`);
    }
    
    console.log('\nFine-tune these recommendations using the test-timing-factors.js script:');
    console.log('   node test-timing-factors.js nhl94.bin');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

function analyzeTracks(midiData) {
  const trackAnalysis = [];
  
  // Analyze each track
  for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
    const track = midiData.tracks[trackIndex];
    
    // Initialize analysis for this track
    const analysis = {
      totalNotes: 0,
      minPitch: Infinity,
      maxPitch: -Infinity,
      sumPitch: 0,
      avgPitch: 0,
      notesByRange: {
        bass: 0,
        middle: 0,
        high: 0
      },
      channelCounts: {},
      primaryChannel: null
    };
    
    // Process events in this track
    for (const event of track) {
      // Only process Note On events with non-zero velocity
      if (event.type === 9 && event.data[1] > 0) {
        const pitch = event.data[0];
        const channel = event.channel;
        
        // Update channel counts
        analysis.channelCounts[channel] = (analysis.channelCounts[channel] || 0) + 1;
        
        // Update note count
        analysis.totalNotes++;
        
        // Update pitch range
        analysis.minPitch = Math.min(analysis.minPitch, pitch);
        analysis.maxPitch = Math.max(analysis.maxPitch, pitch);
        
        // Update pitch sum (for average calculation)
        analysis.sumPitch += pitch;
        
        // Update note range counts
        if (pitch >= NOTE_RANGES.BASS[0] && pitch < NOTE_RANGES.BASS[1]) {
          analysis.notesByRange.bass++;
        } else if (pitch >= NOTE_RANGES.MIDDLE[0] && pitch < NOTE_RANGES.MIDDLE[1]) {
          analysis.notesByRange.middle++;
        } else if (pitch >= NOTE_RANGES.HIGH[0] && pitch < NOTE_RANGES.HIGH[1]) {
          analysis.notesByRange.high++;
        }
      }
    }
    
    // Calculate average pitch
    if (analysis.totalNotes > 0) {
      analysis.avgPitch = analysis.sumPitch / analysis.totalNotes;
    }
    
    // Handle empty tracks
    if (analysis.minPitch === Infinity) {
      analysis.minPitch = 0;
    }
    if (analysis.maxPitch === -Infinity) {
      analysis.maxPitch = 0;
    }
    
    // Determine primary channel
    let maxCount = 0;
    for (const [channel, count] of Object.entries(analysis.channelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        analysis.primaryChannel = parseInt(channel);
      }
    }
    
    // Add to overall analysis
    trackAnalysis.push(analysis);
  }
  
  return trackAnalysis;
}

function getPitchName(midiPitch) {
  if (midiPitch === 0) {
    return 'None';
  }
  
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = notes[midiPitch % 12];
  const octave = Math.floor(midiPitch / 12) - 1;
  
  return `${noteName}${octave}`;
}

// Run the script
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
