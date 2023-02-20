const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const root = './Unpack/NHL95QFS';

const palMapDef = {
  CREDIT: ['CREDIT00', 'CREDIT01', 'CREDIT02', 'CREDIT03', 'CREDIT04', 'CREDIT05', 'CREDIT06', 'CREDIT07', 'CREDIT08', 'CREDIT09', 'CREDIT10', 'CREDIT11', 'CREDIT12', 'CREDIT13', 'CREDIT14', 'CREDIT15', 'CREDIT16', 'CREDIT17', 'CREDIT18', 'CREDIT19'],
  HOMEPAL3: ['CTLOGO', 'SRLOGO'],
  CITY: ['CTTITLE','CTTITLE1','CTTITLE2','CTTITLE3','PSTATBAR'],
  DB_DBUT: ['DIALOGBX','EXHGAME2', 'PLAQUE', 'PLAYOFFS', 'SETTING', 'SETTINGS', 'SETTING2', 'SETTING3', 'SETTING4', 'SETTING5', 'SETTING6', 'SETTING7' ],
  EMBPAL: ['EMBANA', 'EMBASE', 'EMBASW', 'EMBBOS', 'EMBBUF', 'EMBCGY', 'EMBCHI', 'EMBDAL', 'EMBDET', 'EMBEAS', 'EMBEDM', 'EMBFLA', 'EMBLA', 'EMBMTL', 'EMBNHL', 'EMBNJ', 'EMBNYI', 'EMBNYR', 'EMBOTT', 'EMBPHI', 'EMBPIT', 'EMBQUE', 'EMBSCUP', 'EMBSJ', 'EMBSTL', 'EMBTB', 'EMBTOR', 'EMBVAN', 'EMBVAN', 'EMBWES', 'EMBWPG', 'EMBWSH'],
  RINKPAL: ['RINK'],
  SUMMARY: ['SUMMARY2']
}
const palLookup = flipMapping(palMapDef);

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

          let currentPalette = null;
          for (const subFile of subFiles) { // check this folder for default palette files
            if (subFile === '!pal' || subFile === '!p01' || subFile === '!pl1'|| subFile === '!pio') {
              currentPalette = subFile;
              break;
            }
          }
          console.log('AA TEST!!!',currentPalette);

          for (const subFile of subFiles) {
            if (subFile.indexOf('.') === -1 && subFile.indexOf('!') === -1) {
              const subFilePath = path.join(fullPath, subFile);

              // Check if there is a palette file with the same name as the subFile
              const paletteFileName = `!${subFile.substring(1)}`;
              if (subFiles.includes(paletteFileName)) {
                currentPalette = paletteFileName;
              }

              runSpitToBmp(subFilePath, currentPalette);
            }
          }
        });
      }
    });
  }
});

function runSpitToBmp(file, paletteFile) {
  console.log(`Running spitToBmp on ${file}`, process.cwd());
  const cmd = paletteFile ? `node ..\\PPV-SPIT-Tools\\spitToBmp ${file} ${paletteFile}` : `node ..\\PPV-SPIT-Tools\\spitToBmp ${file}`;
  execSync(cmd, { stdio: 'inherit' });
}

function flipMapping(mapping) {
  const flipped = {};
  for (const key in mapping) {
    for (const value of mapping[key]) {
      flipped[value] = key;
    }
  }
  return flipped;
}
