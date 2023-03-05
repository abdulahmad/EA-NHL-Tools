const fs = require('fs');

// get the filename of the second file from the command line arguments
const firstFileName = process.argv[2];
const secondFileName = process.argv[3];
const colorsFromFirstFile = process.argv[4];
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
