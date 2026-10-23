# v7: changes from Abdul's v6 review

## 1–2. Why the Chicago and Montreal fronts were still worse than the backs (root cause)
The fronts and backs were built by the same row code, but from **two different measured stripe specs**. The front spec (`spec['front']`) was itself mis-measured:

- **Different vertical frame.** The front is sampled from the collar top (y0=8) and the back from y0=46, so v positions don't correspond.
- **Front sample columns.** These are at x=112..163, the left side of the torso, right where the photo draws its faux perspective curve, and the inner ones run through the crest. Their vote sees stretched or split stripes.

Row dump (12x15) from the v6 specs:
```
Chicago   front rows: re re re WH WH bl bl wh re bl bl bl re bl bl   <- first white 2 rows (spec .242-.292, curve-stretched)
          back  rows: re re re re re WH bl bl wh re bl wh bl wh bl   <- every white 1 row
Montreal  front rows: ba ba ba ba wh ba na na ba ba ba wh na ba ba   <- white/navy/white split by a phantom babyblue row,
          back  rows: ba ba ba ba ba wh na na wh ba ba ba wh na ba      lower white missing (crest columns)
```
The real jersey has the same stripe set front and back. **Fix:** for Chicago and Montreal, the front stripe rows are the back's measured rows (`band_img(back)`). Check: Chicago front == back on 15/15 rows. Montreal is identical on all 15 rows outside the 16 crest cells.

The crest is overlaid only where a photo cell is ≥50% non-stripe colour. It is registered to the back frame by matching the stripe it sits on: the front navy chest band centre is mapped to the back navy band centre (dv=+0.048), so the CH sits on the navy band. Chicago's 1-px CHICAGO lettering doesn't survive 12x15, so the front equals the back there. Florida and Wild keep their own front specs: their real fronts differ from the backs (chest yoke and band).

The photo's faux curve is ignored: stripes are straight horizontal rows.

## 3. Why the goalie gear lost colour depth and the catcher lost its blue (root cause)
`gear_measure` built a palette with k-means **k=4–5**, then **merged clusters closer than ΔE 14** (the pad "speckle" fix). Every cell was then painted with one of those 3–4 flat palette colours (per-cell mode). Evidence, unique colours in v6 → v7:
- pad 4 → 124
- pad_b 3 → 165
- catcher 4 → 55
- blocker 3 → 15
- mask 4 → 9

The catcher's v6 palette was `[white, red, (61,53,65) dark mesh, grey]`: the navy pocket was absorbed into the dark-mesh cluster, so the texture had 0 blue cells.

**Fix:** `grid_shaded()`. Fine k-means (k=10, merge ΔE<6) is used **only to decide each cell's dominant material**. The cell colour is the median of that material's own photo pixels in the cell, snapped to the 6-bit VGA DAC. This keeps the photo's shading (the sprite's light/medium/dark zones are applied on top at render) and keeps small-area colours: the catcher's navy pocket is back.

The blocker outline is the photo's white rolled edge, symmetric on all four sides. The navy around it is background. The mask stays symmetric with an orange chin, and the gloves are unchanged.
