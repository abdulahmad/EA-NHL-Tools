const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');
const baseDir = process.cwd();

// Process command line arguments
const args = process.argv.slice(2);
const sourceDir = args[0] || './NHL95PPV';
const outputDir = args[1] || './Unpack';

// Display usage if the sourceDir doesn't exist and is not the default
if (args[0] && !fs.existsSync(args[0])) {
  console.log('Extract SPIT files from PPV archives\n');
  console.log('Usage: node ppvToSpit.js [sourceDir] [outputDir]\n');
  console.log('Parameters:');
  console.log('  sourceDir - Directory containing PPV files (default: \'./NHL95PPV\')');
  console.log('  outputDir - Directory to extract files to (default: \'./Unpack\')\n');
  console.log('Example:');
  console.log('  node ppvToSpit.js ./NHL95PPV ./Extracted\n');
  console.log('Requirements:');
  console.log('  - gfxpak.exe must be available in 3rdParty/gfxpak/');
  process.exit(1);
}

fs.readdir(sourceDir, (err, files) => {
  if (err) {
    console.log('Extract SPIT files from PPV archives\n');
    console.log(`Error reading directory ${sourceDir}:`, err);
    console.log('\nUsage: node ppvToSpit.js [sourceDir] [outputDir]\n');
    console.log('Parameters:');
    console.log('  sourceDir - Directory containing PPV files (default: \'./NHL95PPV\')');
    console.log('  outputDir - Directory to extract files to (default: \'./Unpack\')\n');
    console.log('Make sure the directory exists and contains PPV files.');
    process.exit(1);
  }

  let processCount = 0;
  files.forEach(file => {
    if (file.endsWith('.PPV')) {
      processCount++;
      const fileName = file.replace('.PPV', '');      const dirPath = path.join(outputDir, fileName);

      fs.mkdirSync(path.join(baseDir, dirPath), { recursive: true });
      process.chdir(path.join(baseDir, dirPath));

      try {
        console.log(`Extracting ${fileName}.PPV...`);
        execSync(`${path.join('..', '..', '..', '3rdParty', 'gfxpak', 'gfxpak.exe')} -u ${path.join('..', '..', sourceDir, fileName + '.PPV')}`, { stdio: 'inherit' });
      } catch (error) {
        console.error(`Error extracting ${fileName}.PPV:`, error.message);
      }
    }
  });
    if (processCount === 0) {
    console.log(`No PPV files found in ${sourceDir}`);
  } else {
    console.log(`Processed ${processCount} PPV files from ${sourceDir} to ${outputDir}`);
  }
  
  // Show usage information after processing
  console.log('\nUsage: node ppvToSpit.js [sourceDir] [outputDir]');
  console.log('\nParameters:');
  console.log('  sourceDir - Directory containing PPV files (default: \'./NHL95PPV\')');
  console.log('  outputDir - Directory to extract files to (default: \'./Unpack\')');
});
