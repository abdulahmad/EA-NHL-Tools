const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

// Process command line arguments
const args = process.argv.slice(2);
const root = args[0] || './Unpack';
const palettePath = args[1] || null;

fs.readdir(root, (err, files) => {
  if (err) {
    console.error(`Error reading directory ${root}:`, err);
    console.log('\nCommand line options:');
    console.log('  node batchUnpackedSpitToBmp.js [directory] [palettePath]');
    console.log('\nParameters:');
    console.log('  directory   - Directory containing unpacked SPIT files (default: \'./Unpack\')');
    console.log('  palettePath - Optional path to a palette file (.act or EA palette)');
    return;
  }

  if (files.length === 0) {
    console.log(`No files found in ${root}`);
    console.log('\nCommand line options:');
    console.log('  node batchUnpackedSpitToBmp.js [directory] [palettePath]');
    console.log('\nParameters:');
    console.log('  directory   - Directory containing unpacked SPIT files (default: \'./Unpack\')');
    console.log('  palettePath - Optional path to a palette file (.act or EA palette)');
    return;
  }

  let processCount = 0;
  let processedDirs = 0;
  let totalFiles = 0;

  for (const file of files) {
    
    const fullPath = path.join(root, file);
    fs.stat(fullPath, (err, stat) => {
      if (err) {
        console.error(err);
        return;
      }

      if (stat.isDirectory()) {
        processedDirs++;
        fs.readdir(fullPath, (err, subFiles) => {
          if (err) {
            console.error(err);
            return;
          }

          let fileCount = 0;
          for (const subFile of subFiles) {
            if(subFile.indexOf(".") == -1) { // only run if no extension
              const subFilePath = path.join(fullPath, subFile);
              runSpitToBmp(subFilePath);
              processCount++;
              fileCount++;
            }
          }
          
          totalFiles += fileCount;
          
          // When processing is complete, show usage info
          if (processedDirs === files.length) {
            console.log(`\nProcessed ${processCount} SPIT files from ${processedDirs} directories.`);
            console.log('\nCommand line options:');
            console.log('  node batchUnpackedSpitToBmp.js [directory] [palettePath]');
            console.log('\nParameters:');
            console.log('  directory   - Directory containing unpacked SPIT files (default: \'./Unpack\')');
            console.log('  palettePath - Optional path to a palette file (.act or EA palette)');
            console.log('\nExample:');
            console.log('  node batchUnpackedSpitToBmp.js ./Unpack ./Palettes/nhl.pal');
          }
        });
      }
    });
  }
});

function runSpitToBmp(file) {
  try {
    // Check if palette exists if specified
    if (palettePath && !fs.existsSync(palettePath)) {
      console.warn(`Warning: Specified palette file does not exist: ${palettePath}`);
      console.warn('Will fall back to grayscale palette');
    }
      const paletteArg = palettePath ? `"${palettePath}"` : '';
    console.log(`Converting ${file} with palette: ${palettePath || 'None (using grayscale)'}`);
    const spitToBmpPath = path.join('..', 'SPIT-To-BMP', 'spitToBmp');
    execSync(`node ${spitToBmpPath} "${file}" ${paletteArg}`.trim(), { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error processing file ${file}: ${error.message}`);
  }
}
