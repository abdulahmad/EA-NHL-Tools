// Let's analyze what 0x51 should have done vs what it actually did
// From the verbose output, 0x51 copied 3 bytes from "recent output position"
// And it worked correctly, producing "77 77 18"

// Let's trace through the output at the point where 0x51 was executed
// The output before the first 0x51 command was after the 0x9B command
// which would have been around position ~98 bytes

// From the expected output, the first 0x51 should produce "77 77 18"
// This suggests 0x51 (lowNibble=1, count=3) copies the pattern [77, 77, 18]

// But wait, let me check the actual behavior by looking at the expected output sequence:
const expectedFull = `66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 77 66 66 66 66 55 55 55 55 44 44 44 44 77 77 77 77 77 77 77 77 77 77 77 18 77 77 18 88 77 18 88 92`.split(' ').map(s => parseInt(s, 16));

console.log("Around the first 77 77 18 pattern:");
const pattern = [0x77, 0x77, 0x18];
for (let i = 0; i <= expectedFull.length - 3; i++) {
    if (expectedFull[i] === 0x77 && expectedFull[i+1] === 0x77 && expectedFull[i+2] === 0x18) {
        console.log(`Found [77, 77, 18] at position ${i}`);
        console.log(`Context: ${expectedFull.slice(Math.max(0, i-5), i+8).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    }
}

// It seems like both 0x51 and 0x5E use pattern repetition
// 0x51 repeats [77, 77, 18] for 3 bytes
// 0x5E repeats [77, 77, 77, 18] for 14 bytes

// The pattern seems to be based on the recent sequence that was just output
// Let me check if there's a relationship with how many bytes back to look

console.log("\nAnalyzing pattern sources:");
console.log("For 0x51 (count=1+2=3), pattern should be [77, 77, 18]");
console.log("For 0x5E (count=14), pattern should be [77, 77, 77, 18]");

// Maybe the pattern length is related to the command byte in some way?
// Or maybe it looks for the most recent 3-4 byte pattern that would make sense to repeat?
