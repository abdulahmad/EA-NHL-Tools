const fs = require('fs');

if (process.argv.length !== 3) {
  console.error('Usage: node script.js <file>');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = `${inputFile}.act`;

fs.readFile(inputFile, (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    process.exit(1);
  }

  const outputData = data.slice(16).map((byte) => byte * 4); // multiply every byte by 4

  fs.writeFile(outputFile, Buffer.from(outputData), (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
      process.exit(1);
    }

    console.log(`Successfully wrote output to ${outputFile}`);
  });
});
