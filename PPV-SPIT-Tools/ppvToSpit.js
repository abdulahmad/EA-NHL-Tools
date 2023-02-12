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

    //   fs.mkdir(dirPath, { recursive: true }, (mkdirError) => {
    //     if (mkdirError) throw mkdirError;
        
    //     console.log('changing to', baseDir+"\\"+dirPath);
    //     process.chdir(baseDir+"\\"+dirPath);
    //     console.log('current dir is',process.cwd());
    //     console.log('running gfxpak on ',fileName);
    //     exec(`..\\..\\gfxpak\\gfxpak.exe -u ${fileName}.PPV`, (error, stdout, stderr) => {
    //       if (error) {
    //         console.error(`exec error: ${error}`);
    //         return;
    //       }
    //       console.log(`stdout: ${stdout}`);
    //       console.error(`stderr: ${stderr}`);
    //       console.log(process.cwd());
    
        fs.mkdirSync(baseDir+"\\"+dirPath, { recursive: true });
        process.chdir(baseDir+"\\"+dirPath);

        execSync(`..\\..\\gfxpak\\gfxpak.exe -u ..\\..\\NHL95PPV\\${fileName}.PPV`, { stdio: 'inherit' });
        // });
    //   });
    }
  });
});
