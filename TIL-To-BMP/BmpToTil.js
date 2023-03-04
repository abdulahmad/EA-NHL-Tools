// const fs = require('fs');

// const WIDTH = 384;
// const HEIGHT = 592;
// const TILE_SIZE = 8;

// // read the input file
// const buffer = fs.readFileSync('rink.raw');

// // create an output buffer for the .TIL file
// const numTilesWide = Math.ceil(WIDTH / TILE_SIZE);
// const numTilesHigh = Math.ceil(HEIGHT / TILE_SIZE);
// const tileBufferSize = numTilesWide * TILE_SIZE * numTilesHigh * TILE_SIZE;
// const tileBuffer = Buffer.alloc(tileBufferSize);

// // copy the image data to the output buffer in tiles
// let tileIndex = 0;
// for (let tileY = 0; tileY < numTilesHigh; tileY++) {
//   for (let tileX = 0; tileX < numTilesWide; tileX++) {
//     for (let y = 0; y < TILE_SIZE; y++) {
//       for (let x = 0; x < TILE_SIZE; x++) {
//         const pixelX = tileX * TILE_SIZE + x;
//         const pixelY = tileY * TILE_SIZE + y;
//         if (pixelX < WIDTH && pixelY < HEIGHT) {
//           const pixelIndex = pixelY * WIDTH + pixelX;
//           tileBuffer[tileIndex++] = buffer[pixelIndex];
//         } else {
//           // fill in empty space with black pixels
//           tileBuffer[tileIndex++] = 0;
//         }
//       }
//     }
//   }
// }

// // write the .TIL file
// fs.writeFileSync('rink.til', tileBuffer);

// // write the .MAP file
// const mapBuffer = Buffer.alloc(6 + numTilesWide * numTilesHigh * 2);
// mapBuffer.writeUInt16LE(numTilesWide, 0);
// mapBuffer.writeUInt16LE(numTilesHigh, 2);
// mapBuffer.writeUInt16LE(10, 4);
// let mapIndex = 6;
// for (let i = 0; i < numTilesWide * numTilesHigh; i++) {
//   mapBuffer.writeUInt16LE(i, mapIndex);
//   mapIndex += 2;
// }
// fs.writeFileSync('rink.map', mapBuffer);


// -- ABOVE WORKS but over 1024 messes up --
const fs = require('fs');

const WIDTH = 384;
const HEIGHT = 592;
const TILE_SIZE = 8;

// read the input file
const buffer = fs.readFileSync('rink.raw');

// calculate the number of tiles needed to cover the image, based on the tile size and image size
let numTilesWide = Math.ceil(WIDTH / TILE_SIZE);
let numTilesHigh = Math.ceil(HEIGHT / TILE_SIZE);
const numTiles = numTilesWide * numTilesHigh;

// limit the maximum number of tiles to 1024
if (numTiles > 1024) {
  if (numTilesWide > numTilesHigh) {
    numTilesWide = 1024;
    numTilesHigh = Math.ceil(numTiles / numTilesWide);
  } else {
    numTilesHigh = 1024;
    numTilesWide = Math.ceil(numTiles / numTilesHigh);
  }
  numTilesWide = Math.min(numTilesWide, Math.ceil(WIDTH / TILE_SIZE));
  numTilesHigh = Math.min(numTilesHigh, Math.ceil(HEIGHT / TILE_SIZE));
}

// create an output buffer for the .TIL file
const tileBufferSize = numTilesWide * TILE_SIZE * numTilesHigh * TILE_SIZE;
const tileBuffer = Buffer.alloc(tileBufferSize);

// copy the image data to the output buffer in tiles
let tileIndex = 0;
for (let tileY = 0; tileY < numTilesHigh; tileY++) {
  for (let tileX = 0; tileX < numTilesWide; tileX++) {
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const pixelX = tileX * TILE_SIZE + x;
        const pixelY = tileY * TILE_SIZE + y;
        if (pixelX < WIDTH && pixelY < HEIGHT) {
          const pixelIndex = pixelY * WIDTH + pixelX;
          tileBuffer[tileIndex++] = buffer[pixelIndex];
        } else {
          // fill in empty space with black pixels
          tileBuffer[tileIndex++] = 0;
        }
      }
    }
  }
}

// write the .TIL file
fs.writeFileSync('rink.til', tileBuffer);

// write the .MAP file
const maxNumTiles = numTilesWide * numTilesHigh;
const mapBufferSize = 6 + maxNumTiles * 2;
const mapBuffer = Buffer.alloc(mapBufferSize);
mapBuffer.writeUInt16LE(numTilesWide, 0);
mapBuffer.writeUInt16LE(numTilesHigh, 2);
mapBuffer.writeUInt16LE(10, 4);
let mapIndex = 6;
for (let i = 0; i < maxNumTiles; i++) {
  mapBuffer.writeUInt16LE(i, mapIndex);
  mapIndex += 2;
}
fs.writeFileSync('rink.map', mapBuffer);

