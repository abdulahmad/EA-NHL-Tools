const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const root = './Unpack';

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

          for (const subFile of subFiles) {
            console.log(subFile);
            if(subFile.indexOf(".") == -1) { // only run if no extension
              const subFilePath = path.join(fullPath, subFile);
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
