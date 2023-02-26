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
            if(subFile.indexOf("!") > -1) { // only run if no extension
              const subFilePath = path.join(fullPath, subFile);
              runPalToAct(subFilePath);
            }
          }
        });
      }
    });
  }
});

function runPalToAct(file) {
  console.log(`Running palToAct on ${file}`);
  execSync(`node ..\\PAL-To-ACT\\palToAct ${file}`, { stdio: 'inherit' });
}
