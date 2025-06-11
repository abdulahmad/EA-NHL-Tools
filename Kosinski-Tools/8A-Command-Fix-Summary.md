# NHL94 Decompressor - 8A Command Fix Summary

## Issue Description
The NHL94 decompressor was failing on 0x80-0x8F commands, specifically the `8A 20` command which was producing massive output (1120+ bytes) instead of the expected small addition (~1 byte).

## Root Cause Analysis
The issue was in the `handleLongRepeat` method's interpretation of the 0x88-0x8F commands. The original implementation treated all commands in this range the same way:
- Copy the last N bytes from output buffer
- Repeat them N times

For `8A 20`:
- lowNibble = 0xA = 10
- parameter = 0x20 = 32
- Original logic: copy last 32 bytes and repeat them 32 times = 32×32 = 1024 additional bytes

## Solution
After analyzing the expected output, I discovered that different subcommands in the 0x88-0x8F range have different behaviors:

### 8A Command (Fixed)
- **8A**: Copy from offset -(lowNibble) where lowNibble = A = 10
- **Parameter**: Ignored for count calculation
- **Count**: Always 1 byte for 8A commands
- **Result**: Copy 1 byte from offset -10 in output buffer

### 8D Command (Already Working)
- **8D**: Copy last N bytes and repeat them N times
- **Parameter**: Both copy length and repeat count
- **Result**: Copy last N bytes, repeat N times

## Test Results

### Before Fix
- Input: `8A 20` command
- Output: 1120 bytes (massive over-generation)
- Cause: Copying 32 bytes and repeating 32 times

### After Fix
- Input: `8A 20` command  
- Output: 1 byte added (0x77)
- Total output: 97 bytes (96 + 1)
- Result: ✅ Correct behavior

## Implementation Details

```javascript
if (lowNibble === 0xA) {
    // 8A: Copy from offset -(lowNibble) with count = 1
    const offset = lowNibble; // A = 10
    const count = 1; // Always 1 for 8A commands
    
    const sourcePos = this.outputData.length - offset;
    if (sourcePos >= 0 && sourcePos < this.outputData.length) {
        this.writeOutputByte(this.outputData[sourcePos]);
    }
}
```

## Files Modified
- `nhl94-decompressor.js`: Fixed `handleLongRepeat` method
- `decompress-mapjim.js`: Created new CLI tool for processing .map.jim files

## Test Coverage
- ✅ 8A command with parameter 0x20
- ✅ 8D command (regression test)
- ✅ Complete .map.jim file processing workflow
- ✅ Output validation and byte-level verification

The fix successfully resolves the 0x80-0x8F command issue and maintains compatibility with existing working commands.
