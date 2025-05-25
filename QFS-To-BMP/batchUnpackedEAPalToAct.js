const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

// Define an array of root directories to process
const rootDirs = [
  './Unpack/NHL95QFS',
  './Unpack/NHL94QPP'
];

// Process each root directory
rootDirs.forEach(processRootDirectory);

function processRootDirectory(root) {
  console.log(`Processing directory: ${root}`);
  
  fs.readdir(root, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${root}:`, err);
      return;
    }

    for (const file of files) {
      const fullPath = path.join(root, file);
      fs.stat(fullPath, (err, stat) => {
        if (err) {
          console.error(`Error getting stats for ${fullPath}:`, err);
          return;
        }

        if (stat.isDirectory()) {
          fs.readdir(fullPath, (err, subFiles) => {
            if (err) {
              console.error(`Error reading subdirectory ${fullPath}:`, err);
              return;
            }

            for (const subFile of subFiles) {
              // Check if file starts with "!" and has no extension
              if(subFile.startsWith("!") && path.extname(subFile) === "") {
                const subFilePath = path.join(fullPath, subFile);
                runPalToAct(subFilePath);
              }
            }
          });
        }
      });
    }
  });
}

function runPalToAct(file) {
  console.log(`Running palToAct on ${file}`);
  execSync(`node ..\\PAL-To-ACT\\palToAct ${file}`, { stdio: 'inherit' });
}
