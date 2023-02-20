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
  // console.log(`Running spitToBmp on ${file}`);
  execSync(`node ..\\SPIT-To-BMP\\spitToBmp ${file}`, { stdio: 'inherit' });
}
