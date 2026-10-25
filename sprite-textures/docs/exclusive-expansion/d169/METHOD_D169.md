# D169: straight-band 94G Leafs family texture + gap fill (Abdul pt992u)

## Method (`tex169.py`)
- **Evidence:** 94G votes (Genesis family per PC texel) from every aligned pair with IoU >= 0.97 whose PC frame has a texel map. That is 281 pairs; the 817 count covers 93G and 94G. Shade is ignored, as in D168.
- **Zones:** taken from the 38x32 layout, using the PC Leafs magenta separators.
  - Rows 0-5: head. Kept per texel, because the face is real vertical structure.
  - Rows 6-20: sleeve (cols 0-4, 15-23, 34-37) and torso (cols 5-14, 24-33).
  - Rows 21-31: legs/socks.
- **Row bands:** every used texel in a (row, zone) gets the majority family of all votes in that band.
- **Vertical structure:** a column keeps its own family only if its own votes (>=70% confident) disagree with the band in >=60% of its zone rows, all in one family. Only cols 4 and 15 passed (navy yoke).
- **Gaps** (100 unvoted texels): row band 92, unanimous voted neighbour 4, PC Leafs family 4.

## Final bands
| Rows | Sleeve | Torso |
|---|---|---|
| 6 | navy | navy |
| 7-8 | white | navy |
| 9-11 | white | white |
| 12-13 | navy | white |
| 14 | white | white |
| 15-16 | white | navy |
| 17 | navy | navy |
| 18-20 | black | navy |

Legs: rows 21-23 navy, 24-25 white, 26 navy, 27 white, 28-31 black.

## Rows changed vs D168 (40 texels)
- 6-8: neck skin -> navy collar at cols 8-10. Some sleeve texels -> white.
- 13: cols 0-1 -> navy.
- 14: col 23 -> white.
- 17: 14 sleeve texels white -> navy.
- 18-20: cols 3 and 34 navy -> black.
- 24-25: four sock texels navy -> white.
- Full list: `tex169.json` `changed_rows`.

## Results
- Votes agreeing with the final texture: 0.866 (D168 per texel: 0.885).
- Validation: family 62,417 of 72,056 (86.6%); exact index 38,654 of 72,056 (53.6%).
- Fight frames: **1,805 errors out of 11,318 px** (D168: 1,559). Breakdown:
  - white on navy: 494
  - navy on white: 408
  - no texel: 240
  - skin: 390
  - on black: 235+
- Straight bands expose the pipeline texel maps. They put stripe pixels on the wrong texture rows, and the per-texel D168 texture had partly absorbed that. Next step: re-fit the exclusive texel maps against this fixed texture.
