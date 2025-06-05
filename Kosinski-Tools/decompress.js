const fs = require('fs');

// Function to convert hex string to Buffer
function hexToBuffer(hexString) {
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16));
  }
  return Buffer.from(bytes);
}

// Compressed Ron Barr .map.jim hex data (as provided)
const compressedHex = `000004C400000544803D3166006530550065304403654777778D043166315531443F779B1F00185100885100928A2031110E2228822233322234443298229998888920001130770199886804981118778134119CFF0182878280006130550721444443217777738E048FD48B043877007183B85E0071808F0011CC03888922185808998888811188111118481289AB11ACCDDC18BDDDDD8ADDEEEE99981188818180AD061888889A9AABBC30CC00CD33DD04FF66FEEFF6CCE03704988889ACCA30CC00CBE1185804DEDCDEEEEDC05907FFFFFEDD1881177780401377A8822177B8112117CA811217CBA11211DCA1115800113F77377700176B8FF48B04E2C39B03008C30DD009A80B300895F02DDDE8A79038BCDEEDCC02DF66FF306600DE30EE34DD800905EEEFDEEEFFFF811400FD81E703FFEEDE821E811205EEFEFFF66FFE032802202FFFD30CC03DDC911115800815B00ED5900DC5A00CA801001CC917802CDA11181C45A808D99038BB001199158017AC15900CA580079590278CB9C8065109CDCA9889CDBADDCBDDCDBA1CDDDCA48BC801400AB30DD00BA809E0DCFFDDDC818CCDDCCA18CDED111958051849CD6DDCA5801DCCB7900DB581CCCBA9999BB981888C9818BEDC9A1111AC9A68196CD9CCDDCCBCDCC80D809CCCD9111C9DC5800BD58018CAC5801E02CAACDE5804BCEFECBABCE0B9440ACADDF666DACDE666EACDDF5806CCDEEDCABCDDEC580DCDCBBA9BBCBB6FDCCD665812DE6FCDDEFEDB9CABCCC9CCA811BCDDCBA9BC802B0BC9CDDDDCDEEF6DDCCDF66800901FFBA809304ABCDDACDAC80B701BCDE80C307DDDC9CFFDCBACDFE5800DD5A00ED58C403CCBAC9DD5800775A02DCCCBA82B400873F77A840007259002181A4077798BBCB7788BABC581F8AAC77388A9B723188A9214888AA1143888ABB199999BC924555BCACAAACCCADD02DDFECCDD05DDCCBBBB9DDC60019ACD601199BB91CC553219CCACDDBDDEDCADDCAAD80BC02CCCCCA5004CDCBCDDED7802CBA9775803A877CBBAE06504B98877AAA8590A989127AA898112A89AC2113F77E8090027580165478A04007258087221654221116541115B80C3585001723011713F110644A888113628A858112A8A1126429A111464981113662911114642581436649ACDEEEE89BCDDEE98ABCCCA8A99ABAB8A88883089068111988899992930880FFFFCCCAFFEDCC99AACCC989BAAB989A318804188898899802130881A9289AB22119AAB4311AAA26311A9C462119A265111A246311124648062006331110027E0A3603F114402777773E0C15800275901122758021111235900135F85E89A839F800126665800165D0014590013590011E09B011136811D004280C901642958006661026665358026531117001118C700199BCE01D012488C0055689924666825066B1145805BB81466CBA980090062E04D006159808C01663158006480B681F78017001180174187CC98838FDC5D30228340998031223411001559E0D90011E3698C2006311899BC11189A580088580B18288ABC266289CB264188AA852017CA98156CAA88124AB881212AB813321AA124442A11466438520005159808F0011E14880B1437A87808FD85A3022822FE0080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E080E0000044406660AAA0CCC0EEE0840000400060008002A024C068C08AE0ACE0008000960006001600260036004600560016006600760086009600A600B600C600D600E6007600F60106011601260136014600E600760156016601760186019601A600E6007601B601C601D601E601F6020600E6007602160226023602460256026600E6027602760286029602A602B602C602D602E602F60306031603260336034603060356036603760386039603A603B6037603CFFFFFFFF`;
const compressedData = hexToBuffer(compressedHex.replace(/\s/g, ''));

// Function to read uint32 (big-endian)
function readUInt32(buffer, offset) {
  return (
    (buffer[offset] << 24) |
    (buffer[offset + 1] << 16) |
    (buffer[offset + 2] << 8) |
    buffer[offset + 3]
  );
}

// Function to read uint16 (big-endian)
function readUInt16(buffer, offset) {
  return (buffer[offset] << 8) | buffer[offset + 1];
}

// Decompression function
function decompressMapJim(compressed) {
  // Read header
  const paletteOffset = readUInt32(compressed, 0);
  const mapOffset = readUInt32(compressed, 4);
  const numTiles = readUInt16(compressed, 8);

  // Initialize output buffer (estimate size based on uncompressed data)
  const output = [];
  let inputPos = 10; // Start after header
  let tileBytesWritten = 0;

  // Decompress tile data
  while (inputPos < paletteOffset && tileBytesWritten < numTiles * 32) {
    const opcode = compressed[inputPos++];

    if (opcode >= 0x00 && opcode <= 0x3F) {
      // Single-byte repeat: (opcode & 0x3F) + 1 repetitions of next byte
      const count = (opcode & 0x3F) + 1;
      const value = compressed[inputPos++];
      for (let i = 0; i < count; i++) {
        output.push(value);
        tileBytesWritten++;
      }
    } else if (opcode >= 0x40 && opcode <= 0x7F) {
      // Sequence repeat: (opcode & 0x3F) + 1 repetitions of next 4 bytes
      const count = (opcode & 0x3F) + 1;
      const sequence = compressed.slice(inputPos, inputPos + 4);
      inputPos += 4;
      for (let i = 0; i < count; i++) {
        output.push(...sequence);
        tileBytesWritten += 4;
      }
    } else if (opcode >= 0x80 && opcode <= 0xBF) {
      // Literal copy: (opcode & 0x3F) + 1 bytes
      const count = (opcode & 0x3F) + 1;
      const bytes = compressed.slice(inputPos, inputPos + count);
      inputPos += count;
      output.push(...bytes);
      tileBytesWritten += count;
    } else if (opcode >= 0xC0 && opcode <= 0xDF) {
      // Extended count: Read next byte for additional count
      const extraCount = compressed[inputPos++];
      const count = ((opcode & 0x1F) << 8) + extraCount + 1;
      const value = compressed[inputPos++];
      for (let i = 0; i < count; i++) {
        output.push(value);
        tileBytesWritten++;
      }
    } else if (opcode >= 0xE0 && opcode <= 0xFF) {
      // Extended sequence repeat: Read next byte for additional count
      const extraCount = compressed[inputPos++];
      const count = ((opcode & 0x1F) << 8) + extraCount + 1;
      const sequence = compressed.slice(inputPos, inputPos + 4);
      inputPos += 4;
      for (let i = 0; i < count; i++) {
        output.push(...sequence);
        tileBytesWritten += 4;
      }
    }
  }

  // Copy palette and map data directly
  const paletteData = compressed.slice(paletteOffset, mapOffset);
  const mapData = compressed.slice(mapOffset);

  // Construct final output
  const header = Buffer.alloc(10);
  header.writeUInt32BE(paletteOffset, 0); // Palette offset (same as input)
  header.writeUInt32BE(mapOffset, 4);     // Map offset (same as input)
  header.writeUInt16BE(numTiles, 8);      // Number of tiles

  // Adjust offsets for uncompressed output
  const newPaletteOffset = 10 + numTiles * 32;
  const newMapOffset = newPaletteOffset + paletteData.length;
  header.writeUInt32BE(newPaletteOffset, 0);
  header.writeUInt32BE(newMapOffset, 4);

  // Combine all parts
  return Buffer.concat([
    header,
    Buffer.from(output),
    paletteData,
    mapData
  ]);
}

// Decompress and save to file
const decompressed = decompressMapJim(compressedData);
fs.writeFileSync('ron_barr_uncompressed.map.jim', decompressed);

// Verify output by comparing with provided uncompressed hex
const uncompressedHex = fs.readFileSync('ron_barr_uncompressed.map.jim').toString('hex');
// (Optional: Add comparison with provided uncompressed hex for verification)
console.log('Decompression complete. Output saved to ron_barr_uncompressed.map.jim');