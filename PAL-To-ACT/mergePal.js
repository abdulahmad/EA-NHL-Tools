const fs = require('fs');
const path = require('path');

/**
 * Merge Rink Palette Tool
 * 
 * Merges two palette files by taking colors from both files.
 * When using with rinkpal, it copies over the last 5 colors as well.
 * 
 * Usage:
 *   node mergePal.js <firstPalette> <secondPalette> <colorsFromFirst> <outputFile>
 * 
 * Arguments:
 *   firstPalette   - The first palette file (.act) to take colors from
 *   secondPalette  - The second palette file (.act) to take colors from
 *   colorsFromFirst - Number of colors to take from the first palette file
 *   outputFile     - Name of the output palette file
 * 
 * Example:
 *   node mergePal.js rinkpal.act BOSTON-04-teamPal.ACT 128 BOSTON-03-gamePal.ACT
 */

// Get script name for usage display
const scriptName = path.basename(process.argv[1]);

// Check if all required arguments are provided
if (process.argv.length !== 6) {
  console.error(`
Error: Missing required arguments

Usage: node ${scriptName} <firstPalette> <secondPalette> <colorsFromFirst> <outputFile>

Arguments:
  firstPalette    - The first palette file (.act) to take colors from
  secondPalette   - The second palette file (.act) to take colors from
  colorsFromFirst - Number of colors to take from the first palette file
  outputFile      - Name of the output palette file

Example:
  node ${scriptName} rinkpal.act BOSTON-04-teamPal.ACT 128 BOSTON-03-gamePal.ACT
`);
  process.exit(1);
}

// get the filename of the second file from the command line arguments
const firstFileName = process.argv[2];
const secondFileName = process.argv[3];
const colorsFromFirstFile = parseInt(process.argv[4], 10);
const outputFileName = process.argv[5];
const bytesFromFirstFile = colorsFromFirstFile * 3;

let endOfSecondFile = 768;
if (firstFileName.indexOf('rinkpal') > -1) { // rinkpal file, copy over last 5 colours as well
    endOfSecondFile = 753;
}

// read the first file and get the first 384 and last 15 bytes
const firstFile = fs.readFileSync(firstFileName); // Use rinkpalShadowfixed if you want shadows to look right for players-- will potentially mess up any crowd & rink art that uses the palette colours that get overwritten
const firstFileHeader = firstFile.slice(0, bytesFromFirstFile);
const firstFileFooter = firstFile.slice(endOfSecondFile, 768);

// read the second file and get the next 369 bytes after the first 384 bytes
const secondFile = fs.readFileSync(secondFileName);
const secondFileContent = secondFile.slice(bytesFromFirstFile, endOfSecondFile);


// concatenate the first file header, second file content, and first file footer
const mergedFileContent = Buffer.concat([firstFileHeader, secondFileContent, firstFileFooter]);
// const mergedFileContent = Buffer.concat([firstFileHeader, secondFileContent]);

// write the merged content to the output file
fs.writeFileSync(outputFileName, mergedFileContent);
