# column_map_v2 — Abdul's 38x32 layout (from 75x32 "wide" and original 54x32)

Source: Abdul's Photoshop edit 01M5NZHR29J1PAT765NX1WECR7.png (38x32 RGB, same 12-colour palette as the 75x32 diagnostic, no new colours).
Pipeline: original 54x32 -> widen.py (75x32, unchanged, regen diff 0 for diagnostic and Chicago) -> v2 rules below. Script: v2.py; per-texel map: column_map_v2.json.

## Region moves (old-wide cols -> new cols, shift)
| rows | zone | old 75 cols | new cols | shift |
|---|---|---|---|---|
| 0-20 | front arm R (+forearm/glove) | 0-3 | 0-3 | 0 |
| 0-16 | front head/torso | 5-18 | 3-16 | -2 |
| 0-20 | front arm L | 20-23 | 16-19 | -4 |
| 0-20 | back arm L | 25-28 | 20-23 | -5 |
| 0-16 | back head/torso | 31-43 | 23-35 | -8 |
| 0-20 | back arm R | 45-48 | 34-37 | -11 |
| 17-22 | side pants panel -> front pants | 50-62 (54: 29-41) | 3-15 | -47 |
| 17-22 | side pants panel -> back pants | 63-73 (54: 42-52) | 24-34 | -39 |
| 23-31 | front legs/socks/skates | 0-23 | -2..21 | -2 |
| 23-31 | back legs/socks/skates | 25-48 | 17-40 | -8 |
(only non-magenta source texels are moved; no two sources land on the same new texel — asserted.)

## Dropped pant stripe
Old side-panel col 74 (54-layout col 53) removed. In ALL 10 textures, col 53 == col 29 for rows 17-23 → it was the wrap-around duplicate of the panel's first column. Truly redundant: no information lost.

## Added texels (fill rule = extend the zone's edge texel outward in the same row)
- Gloves, rows 18-20: one outer column per glove, 2 -> 3 wide: new col 0 <- col 1 (front R), col 19 <- col 18 (front L), col 20 <- col 21 (back L), col 37 <- col 36 (back R). 12 texels/jersey.
- Torso/arm widening (88 texels) comes from widen.py, already edge-replication (edge texel copied outward per row; exception: if the edge texel is a shoulder patch/yoke corner, the next inward body colour is used).

## Texels not carried over (126 per jersey)
- Figure pants rows 17-22: 54 front + 54 back — replaced by the side-pants panel (which now IS the figure's pants rows 17-22).
- Side panel row 23 (12 texels, hem pattern) — row 23 now comes from the figures.
- Side panel col 74 (6, rows 17-22) — the duplicate above.

## Verification
stripe_diagnostic regenerated via this mapping vs Abdul's file: 0 differing pixels (38x32).
