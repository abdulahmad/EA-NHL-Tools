// This code reads in the file and identifies the data sections based on the minimum number of zero bytes between them. It then writes each data section to a separate WAV file, starting with "00.wav" and incrementing the number in the filename for each subsequent section.
// To write the WAV files, the code uses the `fs.createWriteStream()` method to create a writeable stream to the output file. It then pipes the stream through two transforms: `ToInt16LE`, which converts the little-endian 16-bit PCM audio data to a signed 16-bit integer array, and `fs.createWriteStream()`
// Note that this code assumes that the input file contains only 16-bit signed PCM audio data at a sample rate of 5500 Hz. If your data is different, you will need to modify the code accordingly.
const fs = require('fs');
const path = require('path');

const ZERO_CHUNK_SIZE = 64;
const BYTES_PER_SAMPLE = 2;
const SAMPLE_RATE = 5500;
const WAV_HEADER_SIZE = 44;

function identifyDataSections(file) {
  let startOffset = 0;
  let zeroChunkCount = 0;

  const buffer = fs.readFileSync(file);
  const dataSections = [];

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) {
      zeroChunkCount++;
      if (zeroChunkCount === ZERO_CHUNK_SIZE) {
        dataSections.push({ start: startOffset, end: i - ZERO_CHUNK_SIZE + 1 });
        zeroChunkCount = 0;
        startOffset = i + 1;
      }
    } else {
      zeroChunkCount = 0;
    }
  }

  // add the final data section
  if (zeroChunkCount >= ZERO_CHUNK_SIZE) {
    dataSections.push({ start: startOffset, end: buffer.length - zeroChunkCount });
  }

  return { buffer, dataSections };
}

function writeWavFile(sectionBuffer, outputFile) {
  const header = Buffer.alloc(WAV_HEADER_SIZE);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(sectionBuffer.length + WAV_HEADER_SIZE - 8, 4);
  header.write('WAVE', 8);

  // fmt subchunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk size
  header.writeUInt16LE(1, 20); // audio format (1 = PCM)
  header.writeUInt16LE(1, 22); // number of channels
  header.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
  header.writeUInt32LE(SAMPLE_RATE * BYTES_PER_SAMPLE, 28); // byte rate
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  header.write('data', 36);
  header.writeUInt32LE(sectionBuffer.length, 40);

  const outputBuffer = Buffer.concat([header, sectionBuffer]);
  fs.writeFileSync(outputFile, outputBuffer);
}

// Example usage:
const file = 'pcff001.dig';
const { buffer, dataSections } = identifyDataSections(file);

for (let i = 0; i < dataSections.length; i++) {
  const { start, end } = dataSections[i];
  const sectionBuffer = buffer.slice(start, end);
  const outputFile = path.join(__dirname, `${i.toString().padStart(2, '0')}.wav`);
  writeWavFile(sectionBuffer, outputFile);
}
