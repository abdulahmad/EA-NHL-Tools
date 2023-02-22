const fs = require('fs');

// get the filename of the second file from the command line arguments
const secondFileName = process.argv[2];

// read the first file and get the first 384 and last 15 bytes
const firstFile = fs.readFileSync('rinkpal.act');
const firstFileHeader = firstFile.slice(0, 384);
const firstFileFooter = firstFile.slice(753, 768);

// read the second file and get the next 369 bytes after the first 384 bytes
const secondFile = fs.readFileSync(secondFileName);
const secondFileContent = secondFile.slice(384, 753);

// concatenate the first file header, second file content, and first file footer
const mergedFileContent = Buffer.concat([firstFileHeader, secondFileContent, firstFileFooter]);

// generate the output filename based on the input filename
const outputFileName = secondFileName.replace(/\.ACT$/, 'Merged.ACT');

// write the merged content to the output file
fs.writeFileSync(outputFileName, mergedFileContent);
