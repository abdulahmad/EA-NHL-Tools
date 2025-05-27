const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const root = './Unpack/NHL95VIV';

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
            if(subFile.indexOf(".IFF") > 0) { // only run if .iff
              const subFilePath = path.join(fullPath, subFile);
              runIffToWav(subFilePath);
            }
          }
        });
      }
    });
  }
});

function runIffToWav(file) {
//   console.log(`process.cwd(), Running IffToWav on ${file}`);
  const iffToWavPath = path.join('..', 'IFF-To-WAV', 'iffToWav');
  const filePath = path.join('..', 'VIV-To-WAV', file);
  execSync(`node ${iffToWavPath} ${filePath}`, { stdio: 'inherit' });
}
