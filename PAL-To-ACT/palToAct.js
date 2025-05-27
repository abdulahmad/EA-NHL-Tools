const fs = require('fs');
const path = require('path');

/**
 * PAL-To-ACT: Converts NHL95 PC QFS Palette format to ACT format
 * 
 * This script extracts and converts the NHL95 PC QFS Palette format to Adobe Color Table (.ACT) format
 * by removing the 16 byte header and multiplying all color values by 4.
 * 
 * Usage:
 *   node palToAct.js <filePath>
 * 
 * Arguments:
 *   filePath - Path to the NHL95 PC palette file to convert
 * 
 * Example:
 *   node palToAct.js RINKPAL.PAL
 * 
 * Output:
 *   Creates a new file with the same name plus .act extension
 */

// Get script name for usage display
const scriptName = path.basename(process.argv[1]);

if (process.argv.length !== 3) {
  console.error(`
Error: Missing required argument

Usage: node ${scriptName} <filePath>

Arguments:
  filePath - Path to the NHL95 PC palette file to convert

Example:
  node ${scriptName} RINKPAL.PAL
`);
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
