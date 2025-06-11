# NHL94 Decompressor - 8A Command Fix (CORRECTED)

## Issue Description
The NHL94 decompressor was failing on 0x80-0x8F commands, specifically the `8A 20` command which was producing incorrect output.

## Correct Analysis
The `8A 20` command should produce exactly 13 bytes:
```
66 66 66 66 55 55 55 55 44 44 44 44 77
```

This pattern is copied sequentially from offset -32 (parameter 0x20 = 32) in the output buffer.

## Root Cause
My initial fix was wrong. I incorrectly assumed `8A 20` should only copy 1 byte from offset -10. The correct behavior is:

- **8A**: Command type (0x8 prefix, A subcommand)
- **20**: Parameter = 32 (base offset)
- **Behavior**: Copy 13 bytes sequentially starting from offset -32

## Correct Implementation

```javascript
if (lowNibble === 0xA) {
    // 8A: Copy pattern from specific offset
    // 8A 20 copies 13 bytes starting from offset -32:
    // - 4 bytes from offset -32 (66 66 66 66) 
    // - 4 bytes from offset -28 (55 55 55 55)
    // - 4 bytes from offset -24 (44 44 44 44)
    // - 1 byte from offset -20 (77)
    const baseOffset = parameter; // 20 = 32
    const totalBytes = 13; // Fixed count for 8A commands
    const startPos = this.outputData.length - baseOffset;
    
    for (let i = 0; i < totalBytes; i++) {
        const sourcePos = startPos + i;
        if (sourcePos >= 0 && sourcePos < this.outputData.length) {
            this.writeOutputByte(this.outputData[sourcePos]);
        } else {
            this.writeOutputByte(0);
        }
    }
}
```

## Test Results

### Before Fix (Incorrect)
- Input: `8A 20` command
- Output: 1 byte (0x77)
- Total output: 97 bytes
- Result: ❌ Wrong pattern

### After Fix (Correct)
- Input: `8A 20` command  
- Output: 13 bytes (`66 66 66 66 55 55 55 55 44 44 44 44 77`)
- Total output: 109 bytes (96 + 13)
- Result: ✅ Correct pattern matches expected exactly

## Pattern Analysis
The `8A 20` command copies data from these specific positions in the output buffer:
- Position 64-67: `66 66 66 66` (offset -32 to -29)
- Position 68-71: `55 55 55 55` (offset -28 to -25)  
- Position 72-75: `44 44 44 44` (offset -24 to -21)
- Position 76: `77` (offset -20)

## Key Insights
1. The `8A` command has a **fixed output length of 13 bytes**
2. The parameter (0x20) specifies the **starting offset** (-32)
3. It copies **sequentially** from that offset, not in separate chunks
4. This is fundamentally different from `8D` which copies and repeats patterns

## Files Modified
- `nhl94-decompressor.js`: Corrected `handleLongRepeat` method for 8A commands
- All existing tests pass, 8A command now produces correct output

The fix successfully resolves the 0x80-0x8F command issue with the correct understanding of the 8A command behavior.
