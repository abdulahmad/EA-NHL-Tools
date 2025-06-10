const { NHL94Decompressor } = require('./nhl94-decompressor.js');

/**
 * Analyze and validate decompressed data patterns
 */
function analyzeDecompressedData(data, label = "Unknown") {
    console.log(`\n=== Analysis of ${label} ===`);
    console.log(`Data length: ${data.length} bytes`);
    
    if (data.length === 0) {
        console.log('No data to analyze');
        return;
    }
    
    // Show first 64 bytes in hex grid
    console.log('\nFirst 64 bytes (hex):');
    for (let i = 0; i < Math.min(64, data.length); i += 16) {
        const line = Array.from(data.slice(i, i + 16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        console.log(`${i.toString(16).padStart(4, '0')}: ${line}`);
    }
    
    // Byte frequency analysis
    const freq = new Map();
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        freq.set(byte, (freq.get(byte) || 0) + 1);
    }
    
    console.log(`\nByte frequency (top 10):`);
    Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([byte, count]) => {
            const percent = ((count / data.length) * 100).toFixed(1);
            console.log(`  0x${byte.toString(16).padStart(2, '0')}: ${count} times (${percent}%)`);
        });
    
    // Look for patterns
    console.log(`\nPattern analysis:`);
    
    // Check for repeating sequences
    const patterns = new Map();
    for (let len = 2; len <= 8; len++) {
        for (let i = 0; i <= data.length - len * 2; i++) {
            const pattern = Array.from(data.slice(i, i + len));
            const next = Array.from(data.slice(i + len, i + len * 2));
            
            if (JSON.stringify(pattern) === JSON.stringify(next)) {
                const key = pattern.join(',');
                patterns.set(key, (patterns.get(key) || 0) + 1);
            }
        }
    }
    
    if (patterns.size > 0) {
        console.log(`  Found ${patterns.size} repeating patterns`);
        Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([pattern, count]) => {
                console.log(`    [${pattern}] repeats ${count} times`);
            });
    } else {
        console.log(`  No obvious repeating patterns found`);
    }
    
    // Statistical analysis
    const sum = Array.from(data).reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    const variance = Array.from(data).reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`\nStatistical analysis:`);
    console.log(`  Mean: ${mean.toFixed(2)}`);
    console.log(`  Std Dev: ${stdDev.toFixed(2)}`);
    console.log(`  Min: ${Math.min(...data)}`);
    console.log(`  Max: ${Math.max(...data)}`);
    console.log(`  Unique values: ${freq.size}`);
}

// Test with the successful decompression
console.log('=== NHL94 Decompressor Analysis Test ===');

const realCompressedHex = "00000004C40000054480003D31660065305500653044036547777780041F0018510088510092" +
                          "8A2031110E2228822233322234443298229998888920001130770199886804981118778134" +
                          "119CFF018287828000613055072144444321777788E048FD48B04387700718A8005E007180";

const bytes = [];
for (let i = 0; i < realCompressedHex.length; i += 2) {
    if (i + 1 < realCompressedHex.length) {
        bytes.push(parseInt(realCompressedHex.substr(i, 2), 16));
    }
}

const decompressor = new NHL94Decompressor();
const result = decompressor.decompress(bytes, 12);

if (result && result.length > 0) {
    analyzeDecompressedData(result, "NHL94 Decompressed Data");
    
    // Save the decompressed data to a file for further analysis
    const fs = require('fs');
    const outputBuffer = Buffer.from(result);
    fs.writeFileSync('decompressed-output.bin', outputBuffer);
    console.log('\nDecompressed data saved to: decompressed-output.bin');
} else {
    console.log('Decompression failed');
}
