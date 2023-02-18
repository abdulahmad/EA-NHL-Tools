const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');
const baseDir = process.cwd();

fs.readdir('./NHL95PPV', (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    if (file.endsWith('.PPV')) {
      const fileName = file.replace('.PPV', '');
      const dirPath = path.join('./Unpack', fileName);

      fs.mkdirSync(baseDir+"\\"+dirPath, { recursive: true });
      process.chdir(baseDir+"\\"+dirPath);

      execSync(`..\\..\\..\\3rdParty\\gfxpak\\gfxpak.exe -u ..\\..\\NHL95PPV\\${fileName}.PPV`, { stdio: 'inherit' });

    }
  });
});
