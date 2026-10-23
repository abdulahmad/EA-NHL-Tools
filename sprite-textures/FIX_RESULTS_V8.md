# v8: blocker white design fix

The only change is `tex_gear_blocker.png`. All other gear is byte-identical to v7, and the Montreal crest is untouched.

## Root cause (evidence)
The source file is a 512x368 sheet that holds the blocker and the catcher side by side. v4–v7 used the box `(0,0,250,368)` for the blocker.

1. **Crop too loose.** The board itself only spans about x10–234 and y6–353. The old box also took in the navy background on the left, top and bottom, plus a strip of the white catcher at x234–250.
   - The raw v7 grid (before symmetry) shows this: column 0 is all navy, column 9 is all white (the catcher), and row 9 is all navy.
   - The whole design was shifted, and the "outline" was being measured from background.
2. **Mode per cell destroys thin graphics.** The stripes and the text are about 4 px lines inside cells of about 22x35 px. White covers 15–45% of each design cell, so the per-cell dominant material is always red.
   - Only 5 isolated white cells survived, at random positions.
3. **v5 `sym_gear` mirrored the left half onto the right.** The real design is not symmetric. The left ~25% of the board is plain red, and the logo, stripes and text are offset to the right.
   - The mirror turned the surviving specks into a fake symmetric "V" (row 5 `R R W R R W R R`, row 6 `W W` centred). It also threw away the right-hand data.
4. The white-ring override was right in spirit (the board has a white rolled edge all round). It only had to paint over the navy and catcher contamination left by the bad crop.

## Fix (`blocker_v8.py`)
- Crop tightly to the board, `BOARD=(10,6,234,353)`.
- No mirror for the blocker. The mask stays symmetric, as approved.
- Classify each cell by how much of it is white, instead of using the mode:
  - **≥30% white:** the white graphic's own median shade.
  - **15–30% white:** the true area mix (a pinkish red where thin lines and text partly cover the cell).
  - **Otherwise:** the red board's own median shade.
- Ring = the white edge, which is real and symmetric. The corners keep the v7 navy, because the rounded corners show background.

Result: plain red on the left and at the bottom, the REFLEX header row, the logo at rows 1–2 offset right, the stripe block at rows 3–5, and the SM‑FX3 text at row 6. This matches the reference layout.
