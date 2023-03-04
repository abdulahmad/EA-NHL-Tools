const fs = require('fs');
const path = require('path');
const crc = require('crc');

const folderPath = path.resolve(__dirname, '..', 'NHL94INST');
const crcFilePath = '!CRC94';

// Get a list of all files in the folder
const files = fs.readdirSync(folderPath);

console.log('Checking',folderPath,'for NHL 94 Game files');
// Calculate the CRC for each file
const crcs = {};
for (const file of files) {
  const filePath = path.join(folderPath, file);
  const data = fs.readFileSync(filePath);
  const checksum = crc.crc32(data);
  crcs[file] = checksum;
  console.log(file, checksum);
}

if (fs.existsSync(crcFilePath)) {
  // If the !CRC file exists, compare the CRCs in it to the ones we just calculated
  const crcFileData = fs.readFileSync(crcFilePath, 'utf8');
  const crcFileChecksums = JSON.parse(crcFileData);

  for (const [fileName, expectedChecksum] of Object.entries(crcFileChecksums)) {
    console.log('Checking',fileName,expectedChecksum,crcs[fileName]);
    if (crcs[fileName] !== expectedChecksum) {
      console.log(`ERROR: CRC mismatch for file "${fileName}"`);
    }
  }
  console.log('Completed CRC checks!');
} else {
  console.log('No CRC reference file found, writing a new one');
  // If the !CRC file doesn't exist, write one with the calculated CRCs
  const crcFileData = JSON.stringify(crcs, null, 2);
  fs.writeFileSync(crcFilePath, crcFileData);
}
