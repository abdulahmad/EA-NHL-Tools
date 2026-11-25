# Kosinski-Tools

A Node.js port of the NHL94 (Sega Genesis) decompression routine for `.map.jim` images: `nhl94-decompressor.js`
(tests: `nhl94-decompressor.test.js`, `debug-test.js`). Where it stands, command by command:
[NHL94-Decompressor-Status.md](NHL94-Decompressor-Status.md).

## Command notes

### `8A` (long repeat, low nibble A)

`8A 20` writes a fixed 13 bytes, copied in order from offset -32 (the parameter, $20) of the output:
`66 66 66 66 55 55 55 55 44 44 44 44 77` in the test case. (An earlier fix that copied one byte from -10 was wrong.)
Handled in `handleLongRepeat` in `nhl94-decompressor.js`.

### `8D` (copy and repeat the last N bytes)

`8D 04` copies the last 4 output bytes and repeats them 4 times: the parameter is both the length and the count, and
no offset byte follows. Test input `31 66 00 65 30 55 00 65 30 44 03 65 47 77 77 8D 04` gives
`66 66 66 66 65 55 55 55 65 44 44 44 65 47 77 77` then `65 47 77 77` four times (test 4 in `debug-test.js`).

## Scratch notes (palette and tile bytes)

palette:
         2   3   5   6   7
80E 000 444 666 AAA CCC EEE 840 004 006 008 02A 24C 68C 8AE ACE
        72  108 180 216 252


66 66 66 66
6

01110111 01110111 01110111 01110111
01110110 01100110 01100110 01100110

77 77 77 77
76 66 66 66
76 55 55 55
76 5    

66 66 66 66
65 55 55 55
65 77 77 77
65 77 77 77 