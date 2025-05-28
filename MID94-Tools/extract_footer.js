#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

/**
 * This script analyzes NHL 94 ROM files to find and extract footer data
 * that controls music looping. This helps ensure proper looping when
 * creating custom music.
 */

// Default settings
const DEFAULT_ROM_PATH = path.join(__dirname, 'nhl94retail.bin');
const DEFAULT_FOOTER_OFFSET = 0x46D82;
const DEFAULT_FOOTER_LENGTH = 10; // standard footer size

async function main() {
  console.log('NHL 94 Music Footer Analyzer');
  console.log('===========================');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let romPath = DEFAULT_ROM_PATH;
  let footerOffset = DEFAULT_FOOTER_OFFSET;
  let footerLength = DEFAULT_FOOTER_LENGTH;
  let scanMode = false;
  
  // Process arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--rom' && i + 1 < args.length) {
      romPath = args[++i];
    } else if (arg === '--offset' && i + 1 < args.length) {
      footerOffset = parseInt(args[++i], 16);
    } else if (arg === '--length' && i + 1 < args.length) {
      footerLength = parseInt(args[++i]);
    } else if (arg === '--scan') {
      scanMode = true;
    } else if (arg === '--help' || arg === '-h') {
      showUsage();
      return;
    }
  }

  try {
    // Read ROM file
    const romBuffer = await fs.readFile(romPath);
    console.log(`ROM file size: ${romBuffer.length} bytes`);
    
    if (scanMode) {
      // Scan ROM for potential footer patterns
      await scanForFooters(romBuffer);
    } else {
      // Extract footer at specified offset
      await extractFooter(romBuffer, footerOffset, footerLength);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function extractFooter(romBuffer, offset, length) {
  console.log(`\nExtracting footer at offset 0x${offset.toString(16).toUpperCase()} (length: ${length} bytes):`);
  
  if (offset + length > romBuffer.length) {
    console.error(`Error: Offset + length exceeds ROM size`);
    return;
  }

  // Extract footer
  const footerData = romBuffer.slice(offset, offset + length);
  
  // Print footer in different formats
  console.log('\nFooter Data:');
  console.log(`Hex: ${Buffer.from(footerData).toString('hex').toUpperCase()}`);
  
  console.log('\nByte Array:');
  const byteArray = Array.from(footerData).map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(', ');
  console.log(`[${byteArray}]`);
  
  console.log('\nDecimal Values:');
  console.log(Array.from(footerData).join(', '));
  
  // Save footer to file
  const footerPath = path.join(__dirname, 'extracted_footer.bin');
  await fs.writeFile(footerPath, footerData);
  console.log(`\nFooter saved to ${footerPath}`);
  
  // Generate usage examples
  console.log('\nTo use this footer in midi-to-nhl94.js:');
  console.log(`node midi-to-nhl94.js --footer "${path.basename(footerPath)}" song.mid nhl94.bin`);
  
  console.log('\nTo add this footer directly in your code:');
  console.log(`const NHL94_FOOTER = [${byteArray}];`);
}

async function scanForFooters(romBuffer) {
  console.log('\nScanning ROM for potential footer patterns...');
  
  // Common patterns in NHL 94 music footer
  const patterns = [
    { pattern: Buffer.from([0xFF, 0x2F, 0x00]), name: 'End of track marker' },
    { pattern: Buffer.from([0x00, 0x00, 0x00, 0x00]), name: 'Zero padding' }
  ];
  
  const results = [];
  
  // Scan for each pattern
  for (const { pattern, name } of patterns) {
    console.log(`\nLooking for "${name}" pattern: ${Buffer.from(pattern).toString('hex').toUpperCase()}`);
    
    // Scan ROM buffer for pattern
    for (let i = 0; i <= romBuffer.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (romBuffer[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        // Found a match, look at surrounding bytes
        const startOffset = Math.max(0, i - 5);
        const endOffset = Math.min(romBuffer.length, i + pattern.length + 5);
        const context = romBuffer.slice(startOffset, endOffset);
        
        results.push({
          offset: i,
          pattern: name,
          context: context
        });
        
        console.log(`Found at offset: 0x${i.toString(16).toUpperCase()}`);
        
        // Skip to end of this match
        i += pattern.length - 1;
      }
    }
  }
  
  // Analyze results to find likely footers
  console.log(`\nFound ${results.length} potential footer locations`);
  
  if (results.length > 0) {
    console.log('\nTop candidates for footer locations:');
    
    // Sort by offset for easier reading
    results.sort((a, b) => a.offset - b.offset);
    
    // Group close matches (likely part of the same footer)
    const groupedResults = [];
    let currentGroup = [results[0]];
    
    for (let i = 1; i < results.length; i++) {
      if (results[i].offset - results[i-1].offset < 20) {
        // Close to previous result, add to current group
        currentGroup.push(results[i]);
      } else {
        // Start a new group
        groupedResults.push(currentGroup);
        currentGroup = [results[i]];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groupedResults.push(currentGroup);
    }
    
    // Display top candidates
    const candidateCount = Math.min(5, groupedResults.length);
    for (let i = 0; i < candidateCount; i++) {
      const group = groupedResults[i];
      const startOffset = group[0].offset;
      const endOffset = group[group.length - 1].offset + group[group.length - 1].context.length;
      
      console.log(`\nCandidate ${i+1}:`);
      console.log(`Range: 0x${startOffset.toString(16).toUpperCase()} - 0x${endOffset.toString(16).toUpperCase()}`);
      console.log(`Patterns: ${group.map(r => r.pattern).join(', ')}`);
      
      // Extract potential footer (use reasonable size)
      const footerSize = Math.min(endOffset - startOffset, 20);
      const potentialFooter = romBuffer.slice(startOffset, startOffset + footerSize);
      console.log(`Data: ${Buffer.from(potentialFooter).toString('hex').toUpperCase()}`);
      
      // Suggest command to extract this footer
      console.log(`\nTo extract this footer, run:`);
      console.log(`node extract_footer.js --rom "${path.basename(romBuffer.path || 'nhl94.bin')}" --offset 0x${startOffset.toString(16).toUpperCase()} --length ${footerSize}`);
    }
  }
}

function showUsage() {
  console.log(`
NHL 94 Music Footer Analyzer - Extract and analyze music footer data

Usage:
  node extract_footer.js [options]

Options:
  --rom <path>     Path to the NHL 94 ROM file (default: nhl94retail.bin)
  --offset <hex>   Footer offset in hex (default: 0x46D82)
  --length <num>   Footer length in bytes (default: 10)
  --scan           Scan the ROM for potential footer locations
  --help, -h       Show this help message

Examples:
  node extract_footer.js
  node extract_footer.js --rom custom_rom.bin
  node extract_footer.js --offset 0x46D00 --length 16
  node extract_footer.js --scan
  `);
}

// Run the script
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
