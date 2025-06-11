// Let's decode some of the 68k assembly to understand the 0x80-0x8F commands
// From the hex: $1169A-$1197D

// Looking at the jump table structure and command dispatch
// The main decompression loop reads a command byte and dispatches to handlers

// For commands 0x80-0x8F, we need to find the specific handler
// Looking at the assembly pattern, it seems like:

// Key insight: Let me look at the expected behavior differently
// 8A 20 should result in adding just "77" to the output
// But 20 = 32 in decimal
// Maybe the command format is different than I thought

// Let me try a different interpretation:
// Perhaps 8A means: copy from offset -(lowNibble) and the parameter is the count?
// So 8A 20 would mean: copy from offset -10, count=32

const testData = [0x66, 0x66, 0x66, 0x66, 0x65, 0x55, 0x55, 0x55, 0x65, 0x44, 0x44, 0x44, 0x65, 0x47, 0x77, 0x77];
console.log('Test array length:', testData.length);
console.log('Test array:', testData.map(b => b.toString(16).padStart(2, '0')).join(' '));

// If we copy from offset -10 (which would be index 6 in a 16-byte array)
// that would be index testData.length - 10 = 16 - 10 = 6
// testData[6] = 0x55
// But the expected output is 0x77

// Let me try another interpretation:
// Maybe 8A means use the A (10) as some kind of parameter, and 20 is the main parameter
// Or maybe it's a different algorithm entirely

// Looking at the working case: 8D 04
// This correctly copies the last 4 bytes and repeats them 4 times
// So the interpretation for 8D seems right

// But for 8A, maybe it's different?
// Let me check if 8A has a different algorithm than 8D

console.log('\nLet me analyze the last 32 bytes before 8A 20:');
const last32 = [0x66, 0x66, 0x66, 0x66, 0x55, 0x55, 0x55, 0x55, 0x44, 0x44, 0x44, 0x44, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x77, 0x18, 0x77, 0x77, 0x18, 0x88, 0x77, 0x18, 0x88, 0x92];

console.log('Last 32 bytes:', last32.map(b => b.toString(16).padStart(2, '0')).join(' '));

// If we need to output just 0x77, where would that come from?
// Looking at the pattern, 0x77 appears frequently in the data
// Maybe the algorithm is:
// - Take some specific byte from the recent output
// - Repeat it some number of times

// Let me check what byte appears at different offsets
for (let offset = 1; offset <= 32; offset++) {
    const index = last32.length - offset;
    if (index >= 0) {
        console.log(`Offset -${offset}: 0x${last32[index].toString(16).padStart(2, '0')}`);
        if (last32[index] === 0x77) {
            console.log(`  ^^ This is 0x77!`);
        }
    }
}
