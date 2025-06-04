const fs = require('fs').promises;
const path = require('path');

async function copyAndRenameBmpFiles() {
  try {
    // Get all subdirectories in the current directory
    const currentDir = process.cwd();
    const dirents = await fs.readdir(currentDir, { withFileTypes: true });
    const subdirs = dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Process each subdirectory
    for (const subdir of subdirs) {
      const subdirPath = path.join(currentDir, subdir);
      const files = await fs.readdir(subdirPath);

      // Filter for .bmp files
      const bmpFiles = files.filter(file => path.extname(file).toLowerCase() === '.bmp');

      // Copy and rename each .bmp file
      for (const file of bmpFiles) {
        const sourcePath = path.join(subdirPath, file);
        const newFileName = `${subdir}_${file}`;
        const destinationPath = path.join(currentDir, newFileName);

        await fs.copyFile(sourcePath, destinationPath);
        console.log(`Copied: ${file} from ${subdir} to ${newFileName}`);
      }
    }

    console.log('All .bmp files have been copied and renamed.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
copyAndRenameBmpFiles();