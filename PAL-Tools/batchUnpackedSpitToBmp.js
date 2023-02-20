const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const root = './Unpack/NHL95QFS';

fs.readdir(root, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  for (const file of files) {
   console.log(file);
    const fullPath = path.join(root, file);
    fs.stat(fullPath, (err, stat) => {
      if (err) {
        console.error(err);
        return;
      }

      if (stat.isDirectory()) {
        fs.readdir(fullPath, (err, subFiles) => {
          if (err) {
            console.error(err);
            return;
          }

          // CHATGPT TODO: Check if Folder has palette files -- default names are !pal and !p01, if so, set to default palette
          let useDefaultPalette = false;
          for (const subFile of subFiles) {
            if (subFile === '!pal' || subFile === '!p01') {
              useDefaultPalette = true;
              break;
            }
          }

          for (const subFile of subFiles) {
            if(subFile.indexOf(".") == -1 && subFile.indexOf("!") == -1) { // only run if no extension && not pal file

              // CHATGPT TODO: check if this file has a palette mapping, if so, set to current palette
              // CHATGPT TODO: else if check if this file has a palette file, if so, set to current palette
              // CHATGPT TODO: else if check if this folder has a default palette that we set earlier, if so, set to current palette

              const subFilePath = path.join(fullPath, subFile);
              // CHATGPT TODO: if there is a current palette, pass it as well to runSpitToBmp
              runSpitToBmp(subFilePath);
            }
          }
        });
      }
    });
  }
});

function runSpitToBmp(file) {
  console.log(`Running spitToBmp on ${file}`, process.cwd());
  execSync(`node ..\\PPV-SPIT-Tools\\spitToBmp ${file}`, { stdio: 'inherit' });
}
