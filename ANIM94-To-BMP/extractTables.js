const fs = require('fs');

// ROM configuration
const ROM_CONFIG = {
  NHLPA93: {
    name: 'NHLPA93',
    addresses: {
      spaList: { start: 0x4D8E, end: 0x6446 },
      hotlistTable: { start: 0x743FC, end: 0x74910 },
    },
  },
  NHL94: {
    name: 'NHL94',
    addresses: {
      spaList: { start: 0x5B1C, end: 0x76B2 },
      hotlistTable: { start: 0xA44C8, end: 0xA4B54 },
    },
  },
};

function extractTables(romFile) {
  const romData = fs.readFileSync(romFile);
  const romSize = romData.length;
  const romType = romSize === 0x100000 ? 'NHLPA93' : 'NHL94'; // Adjust based on actual size
  const config = ROM_CONFIG[romType];
  console.log(`Processing ${romFile} as ${config.name}`);

  // Extract SPAList
  const spaList = [];
  for (let offset = config.addresses.spaList.start; offset < config.addresses.spaList.end; offset += 8) {
    if (offset + 8 <= config.addresses.spaList.end) {
      spaList.push({
        animId: romData.readUInt16BE(offset),
        frameCount: romData.readUInt16BE(offset + 2),
        startFrame: romData.readUInt16BE(offset + 4),
        timing: romData.readUInt16BE(offset + 6),
      });
    }
  }

  // Extract Hotlist Table
  const hotlistTable = [];
  for (let offset = config.addresses.hotlistTable.start; offset < config.addresses.hotlistTable.end; offset += 4) {
    hotlistTable.push({
      xHotspot: romData.readInt16BE(offset),
      yHotspot: romData.readInt16BE(offset + 2),
    });
  }

  // Output
  const output = {
    romFile,
    romType: config.name,
    spaList,
    hotlistTable,
  };
  fs.mkdirSync('Extracted', { recursive: true });
  fs.writeFileSync(`Extracted/${romFile.split('/').pop()}_tables.json`, JSON.stringify(output, null, 2));
  console.log(`Extracted tables to Extracted/${romFile.split('/').pop()}_tables.json`);
  console.log(`SPAList entries: ${spaList.length}, Hotlist Table entries: ${hotlistTable.length}`);
}

const romFile = process.argv[2];
if (!romFile) {
  console.error('Usage: node extractTables.js <romfile>');
  process.exit(1);
}
extractTables(romFile);