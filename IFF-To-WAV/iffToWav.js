const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Buffer } = require('buffer');

// Set the path to the IFF file
const filePath = path.join(__dirname, process.argv[2]);

// Read the file into a buffer
const fileBuffer = fs.readFileSync(filePath);

// Find the index of the 'BODY' chunk
const bodyIndex = fileBuffer.indexOf('BODY');

// Extract the audio data from the 'BODY' chunk
const audioData = fileBuffer.slice(bodyIndex + 4);

// Find the index of the 'VHDR' chunk
const vhdrIndex = fileBuffer.indexOf('VHDR');

// Extract the playback parameters from the 'VHDR' chunk
const oneShotHiSamples = fileBuffer.readUInt32BE(vhdrIndex + 4);
const repeatHiSamples = fileBuffer.readUInt32BE(vhdrIndex + 8);
const samplesPerHiCycle = fileBuffer.readUInt32BE(vhdrIndex + 12);
// const samplesPerSec = fileBuffer.readUInt16BE(vhdrIndex + 16); <-- this was original header definition, but was clearly invalid
const samplesPerSec = fileBuffer.readInt16BE(vhdrIndex + 20)/2; // divide by two because the header says 22500 but these files seem to be 11250
const ctOctave = fileBuffer.readUInt8(vhdrIndex + 18);
const sCompression = fileBuffer.readUInt8(vhdrIndex + 19);
// const volume = fileBuffer.readInt16BE(vhdrIndex + 20);
const volume = fileBuffer.readInt16BE(vhdrIndex + 16); // Not sure if this is right, making the assumption that samplesPerSec and volume are swapped in the header for some reason.
console.log(oneShotHiSamples, repeatHiSamples, samplesPerHiCycle, samplesPerSec, ctOctave, sCompression, volume);

// Calculate the total number of audio samples
// const totalSamples = (oneShotHiSamples + repeatHiSamples) * Math.pow(2, ctOctave - 1); <-- this didn't work
const totalSamples = repeatHiSamples/2; // <-- not sure if this is right, could probably figure it out if I spent more time

// Create a new WAV file with the same audio data
// const wavBuffer = Buffer.alloc(44 + totalSamples * 2);
const wavBuffer = Buffer.alloc(44 + audioData.length*2);
wavBuffer.write('RIFF', 0);
wavBuffer.writeUInt32LE(36 + totalSamples * 2, 4);
wavBuffer.write('WAVE', 8); // FORMAT
wavBuffer.write('fmt ', 12); // subChunkId
wavBuffer.writeUInt32LE(16, 16); // SubChunkSize
wavBuffer.writeUInt16LE(1, 20); // Audio Format
wavBuffer.writeUInt16LE(1, 22); // Num Channels
wavBuffer.writeUInt32LE(samplesPerSec, 24); // Samples Per Sec
wavBuffer.writeUInt32LE(samplesPerSec * 2, 28); // Byte Rate
wavBuffer.writeUInt16LE(2, 32); // Block Align
wavBuffer.writeUInt16LE(16, 34); // Bits Per Sample
// wavBuffer.writeUInt16LE(1, 32); // Block Align <--- ideally should store in 8-bit wav format but when I do the file doesn't work? figuring this out might fix the audio issues
// wavBuffer.writeUInt16LE(8, 34); // Bits Per Sample <--- ideally should store in 8-bit wav format but when I do the file doesn't work? figuring this out might fix the audio issues

wavBuffer.write('data', 36);
wavBuffer.writeUInt32LE(totalSamples * 2, 40); // Sub Chunk 2 Size

// For debugging
let maxSample = 0;
let minSample = 99999;

// console.log(audioData.length);
// for (let i = 0; i < totalSamples; i++) {
for (let i = 0; i < audioData.length; i++) {
  const sample = audioData.readUInt8(i);
  // Just seems like the sample values needed to be on an exponential curve because they didn't sound right just multiplied up by 256 to account for 8-bit to 16-bit conversion.
  // It still doesn't sound right but it's clearer than any method I've tried.
  const n = (sample-128)*Math.abs(sample-127); 

  // For debugging
  if (n > maxSample) maxSample = n;
  if (n < minSample) minSample = n;

//   wavBuffer.writeInt8(n, 44 + i);
  wavBuffer.writeInt16LE(n, 44 + i * 2);
}

// Write the WAV file to disk
fs.writeFileSync(path.join(__dirname, 'output.wav'), wavBuffer);

// Output minsample/maxsample for debugging-- if these values aren't the same, tells you something went wrong with file
console.log('Conversion complete!', minSample, maxSample);