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

        execSync(`..\\..\\..\\..\\3rdParty\\gfxpak\\gfxpak.exe -u ..\\..\\..\\${directory}\\${fileName}.VIV`, { stdio: 'inherit' });

        if(file.startsWith('XBRUCE2.VIV')) {
          process.chdir(baseDir);
          const folderPath = 'Unpack/NHL95VIV/XBRUCE2';
          const extensions = ['.TEA', '.PEN', '.NUM', '.FRM', '.COR'];
          const headerPath = 'iff.head';

          fs.readdir(folderPath, (err, files) => {
            if (err) throw err;

            process.chdir(baseDir);
            files.forEach(file => {
              const extension = path.extname(file);
              if (extensions.includes(extension)) {
                const filePath = path.join(folderPath, file);
                const headerData = fs.readFileSync(headerPath);
                const fileData = fs.readFileSync(filePath);
                const newFilePath = `${filePath}.IFF`;
                const newFileData = Buffer.concat([headerData, fileData]);
                fs.writeFileSync(newFilePath, newFileData);
                fs.unlinkSync(filePath);
              }
            });
          });
        }
      }
    });
  });
});
