const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');
const baseDir = process.cwd();

const directories = ['NHL95VIV'];

directories.forEach(directory => {
  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    files.forEach(file => {
      if (file.endsWith('.VIV')) {
        const fileName = file.replace('.VIV', '');
        const dirPath = path.join('./Unpack', directory, fileName);

        fs.mkdirSync(path.join(baseDir, dirPath), { recursive: true });
        process.chdir(path.join(baseDir, dirPath));

        console.log(process.cwd());
        console.log(`..\\..\\${directory}\\${fileName}.VIV`);

        execSync(`..\\..\\..\\..\\3rdParty\\gfxpak\\gfxpak.exe -u ..\\..\\..\\${directory}\\${fileName}.VIV`, { stdio: 'inherit' });
      }
    });
  });
});
