# Sprite Viewer

Browse NHL 92 Genesis sprite frames and the animations that play them.

The pictures come from the `.ANIM` files in `ANIM-To-BMP`. The names come from [`frames.asm`](data/frames.asm) in [NHL92Genesis](https://github.com/abdulahmad/NHL92Genesis): an **SPF** symbol is a run of frames, and an **SPA** entry is an 8-facing sequence of those frames. Pixels are decoded the same way as `ANIM-To-BMP` (4bpp column-major tiles, nibble 0 transparent, four Genesis palettes). Timing is in vblanks, 1/60 of a second. A negative time is the last step. Flags bit 0 is the loop bit from `updateanim`.

Facing 0 is north on a vertical rink (`dirtab` in `logic.asm`), then clockwise. A horizontal rink subtracts 2 from the facing before the lookup. Spin walks the compass where an animation actually has more than one sequence.

## Run

```
node server.js
```

Open http://localhost:8732

- **Frame** scrubs a bank by index. `Sprites.anim` frame 1 is docs index 0.
- **SPF** shows one named run. Runs laid out as eight facings get the compass.
- **SPA** plays a sequence. Q and E turn the facing, S spins.
- Jersey colors replace palette slot 2, same as passing a `.pal` to `animToBmp.js`.

`data/frames.asm` is a copy of NHL92Genesis `src/frames.asm`. `node test.js` checks the parser against that file and checks every decoded frame against BMPs written by `ANIM-To-BMP`.
