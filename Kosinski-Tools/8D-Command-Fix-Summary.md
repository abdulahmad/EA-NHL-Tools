# NHL94 Decompressor - 8D Command Fix Summary

## Issue Resolved
Fixed the NHL94 decompressor script to properly handle the **8D command** (copy and repeat last N bytes).

## Problem Description
When processing the compressed sequence `31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04`, the script would fail with:
```
Error in handler 8 for command 0x8d: Source pointer 17 beyond data length 17
```

The `8D 04` command was incorrectly trying to read more bytes than available, causing the decompression to fail.

## Root Cause
The `handleLongRepeat` function had incorrect logic for commands with low nibble >= 8 (0x88-0x8F). The original implementation tried to:
1. Calculate `extraCount = lowNibble - 8`
2. Read `baseCount` from next byte
3. Read `offset` from next byte
4. Perform copy operation

However, for the `8D` command, this logic was wrong.

## Solution
Fixed the `handleLongRepeat` function for commands 0x88-0x8F:

**New Logic for 8D command:**
- `8D 04` means: copy the last 4 bytes from the output buffer and repeat them 4 times
- The parameter (04) indicates both the copy length AND the repeat count
- No additional offset byte is needed

## Test Results
### Input: `31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04`

**Expected Output:**
```
66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77
```

**Actual Output (After Fix):**
```
66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77
```

✅ **Perfect Match!**

## Breakdown of Decompression
1. `31 66` → Repeat 0x66 four times: `66 66 66 66`
2. `00 65` → One literal byte: `65`
3. `30 55` → Repeat 0x55 three times: `55 55 55`
4. `00 65` → One literal byte: `65`
5. `30 44` → Repeat 0x44 three times: `44 44 44`
6. `03 65 47 77 77` → Four literal bytes: `65 47 77 77`
7. `8D 04` → Copy last 4 bytes (`65 47 77 77`) and repeat 4 times: `65 47 77 77 65 47 77 77 65 47 77 77 65 47 77 77`

## Files Modified
- `c:\repository\EA-NHL-Tools\Kosinski-Tools\nhl94-decompressor.js` - Fixed `handleLongRepeat` function
- `c:\repository\EA-NHL-Tools\Kosinski-Tools\debug-test.js` - Added test case for 8D command

## Validation
All existing tests continue to pass:
- ✅ Test 1: Working sequence (basic commands)
- ✅ Test 2: Problematic sequence (03 command)
- ✅ Test 3: Just the 03 command (4 literal bytes)
- ✅ Test 4: 8D command (copy and repeat last N bytes)

The NHL94 decompressor now correctly handles all tested compression commands including the previously failing `8D` command!
