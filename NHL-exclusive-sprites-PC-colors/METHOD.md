# Exclusive animation frames: 94 Genesis vs 95 PC, and NHLPA 93 vs 94G/95 PC

Built 27 Nov 2026. Scripts are in `tools/` (inputs are set in `tools/paths.py`; no game data is stored here).

## Definitions
- **94G only**: a NHL 94 Genesis sprite frame that no 95 PC frame shows in the same pose or animation frame. Any facing counts, including mirrored frames.
- **93 only**: a NHLPA 93 Genesis frame that matches no 94G frame and no 95 PC frame.
- **Uncertain**: there is a 95 PC frame with a similar pose, but I couldn't confirm it is the same frame. These are listed separately and not counted as exclusive.
- **Frame numbers**: Genesis frames (93, 94G) count from 1, as in the disassemblies. 95 PC frames count from 0, as the game, NHL9X Studio and the platform census count them (`nearest_pc` and every "PC n" in this folder; relabelled 27 Nov 2026, before that PC was listed one higher). 94G frame N is usually the same pose as PC frame N-1.
- **Scope**: every frame in the main sprite bank of each game. That covers skaters, goalies, refs, fights, injuries, celebrations, and small items such as arrows, stars, the puck, the goal, the siren and broken glass. It does not include the side archives (face-off close-ups, crowd, Zamboni, title art).

## Data (decoded from the game data, nothing redrawn)
- 94G: frames decoded from the NHL94Genesis disassembly build (`lst/nhl94.bin`) (tiles at 0x5DE84, frame table at 0x9E726).
- 93G: frames decoded from `NHLPA93Genesis/Extracted/Graphics/Sprites.anim`.
- 95 PC: `lib.frame` from EA-NHL-Tools sprite-textures.
- All three were decoded once into a frame cache (the D165 platform census cache) that the tools read through `NHL_FRAMES_PKL`.
- Animation names are the SPF labels and SPA lists parsed from each disassembly.

## Matching
1. I started from the existing D165 census, `sprite-textures/docs/platform-census/frames_matrix.csv`.
   - Each frame was scored against every other set: a mask plus luminance grid, then pixel alignment with mirroring, scaling and shifting.
   - A pair scoring 0.80 or more is a match. A pair scoring 0.65 or more is ambiguous.
2. Candidates:
   - every 94G frame whose 95 PC class is not "match" (256 frames);
   - every 93 frame that matches neither 94G nor 95 PC (24 frames);
   - the 12 bloody NHLPA 93 injury frames 633–644 (added later, see 7).
3. **Slot correspondence** (new in this pass):
   - 95 PC kept the 94G frame table.
   - For 94G frames 1 to 538, 95 PC slot N is the same animation frame. 469 of the 565 confident matches sit at the same slot.
   - From 94G 563 onward, the slot is N-8, because 95 PC dropped 8 of the 94G `gready` frames.
   - I put each ambiguous or unmatched 94G frame in that range next to its 95 PC slot frame and looked at the pair.
   - The skate, stop, Stanley Cup, siren and broken-glass frames, plus the arrows, stars, puck, goal and injury1 648, are the same frame redrawn or recoloured in 95 PC. That gives **54 resolved as not exclusive**.
   - Frames 838 to 845 are unused copies of the arrow and star frames 384 to 391.
4. Uncertain frames:
   - **wallleft 381 to 383**: the 95 PC slot holds a different pose.
   - **gready 539 and 541 to 562**: 95 PC has its own redrawn ready set in 95 PC 538 to 553. That set has 2 frames per facing, against 3 in 94G.
5. Frames 658 onward come from SPAs that are new in 94: `ghigh*`, `gstick2*`, `gslam*`, `slambot`, `board*`, `benchcheck*` and `crosscheck`. 95 PC has none of these animations.
   - If the best 95 PC score is below 0.65, the frame is **exclusive**.
   - Otherwise it is **uncertain**, and the CSV names the 95 PC frame with the similar pose.
6. 93: I compared all 24 candidates (the fights `fight/fgrab/fhigh/flow/fhitl/ffall` plus gloves 353 to 370, and the blood `finjury` 371 to 376) by eye against their nearest 94G and 95 PC frames. None of them is the same drawing. In 94G, slots 353 to 376 are blank.
7. **Bloody injury 633–644 (NHLPA 93).** The census matched these to 94G 641–652 and 95 PC 632–643, because the pose is the same. But the 93 frames carry blood (palette line 1, values 28/29, 10–41 px per frame), and both later games redrew them without it: all 12 of 94G 641–652 differ from 93 (e.g. 93 634 vs 94G 642: 66 px, 47 of them not blood), and 95 PC 632–643 is its own redraw (census scores 0.72–0.81, no blood). So the pose is not exclusive, but the bloody version exists only in 93; it is listed in the 93 section with that note. That brings 93 only to 36.

## Colour zones
- In these games, a zone is a palette index in the 16-colour sprite line, which is line 2: Genesis values 33 to 47 become indices 1 to 15.
- I worked out what each index is used for from where it lands on real frames. Here "team colour A/B/C" is the palette role. Using the Leafs home palette, A is the pants ramp, B and C are the stripe trims, and 11 to 13 are the jersey, helmet and sock ramp.
- The index's game colour is in `zone_palette.csv`.
- Black (2) is one index in the game, used for the outline, the gloves and the skate boots, so these can't be split apart.
- Display colours were picked by search, maximising contrast between zones that actually touch in these frames. Contrast was measured on L* lightness and the blue–yellow b* axis only, with the red–green axis ignored. There are no greens anywhere.
- The stick is natural wood colour. The outline is black.
- 93 frames also use colours outside the sprite line, each with its own display colour on the 93 sheet and in the `_blood_overlay` indexed file:
  - values 28/29 (line 1, idx 12/13): **blood** (dark reds);
  - values 1/2 (line 0, idx 1/2): **ice chips / spray** (an earlier version of the sheet wrongly called these blood);
  - values 17, 18, 19, 22, 23, 25 (line 1): an object drawn only in 93 frames 634 and 637 (44 px). What it is has not been worked out; it is labelled "unknown".

## Outputs
- `sheets/sheet_*.png`: labelled sheets at 4x, 1000 px wide, each with a legend.
- `indexed/indexed_*.png`: mode P, 16 unique palette entries, sprites at 1x in a grid. Index 0 is transparent, and index N is the sprite's own palette index.
- `indexed_93_only_blood_overlay.png`: same grid as `indexed_93_only.png`, holding only the off-line pixels: ice chips at 1 and 2, the unknown line-1 object at 3–8, blood at 12 and 13 (all 16 colours unique).
- `indexed_grid_order.csv`: each grid cell, its pixel x/y/w/h, and the game and frame in it.
- `exclusive_frames.csv`: every candidate frame with its section, animation, size, nearest 95 PC and 94G frame with score and mirror flag, near-duplicates in the same game, whether it is unused (no SPA reference), and a note.

## Abdul's PSD: rebuilding frames in place (`tools/recon.py`)
The PSD is a 400 × 400 board of frames, not one frame per layer. Several layers make one frame, some frames have more than one version, and reference layers sit on top of frame boxes. `status/psd_layout.png` shows every layer box with its number.

Layer types:
| type | example | what it is | how it is used |
|---|---|---|---|
| finished injury | `IF0000 - 632` … `IF0011 - 643` | expanded frame. Most pixels are grey (k,k,k) = **95 PC index k**; some indices are painted in the guide colours instead. White = transparent. The number is 0-based, so `- 632` is 93 frame 633 | decoded to indices |
| `GEN PAL` | `IF0012 GEN PAL` | the Genesis original, in Genesis colours | checked: 0 95 PC pixels in all 10 |
| `PC PAL` | `IF0012 PC PAL` | the same frame painted in Abdul's guide palette (the BMP's colours = 95 PC indices) | decoded through the BMP palette |
| plain, hidden | `IF0012` | the same frame as grey = index (only IF0012 has one); it is more complete (99.4%) than its `PC PAL` (94.8%) | decoded; the better version wins |
| `offset`, hidden | `IF0012 offset` | only the blue star backdrop (5 colours) under the lower part of the frame box; no sprite pixels | ignored (its colours are treated as background) |
| unfinished | `IF0021?`, `Layer 24` … `Layer 36`, `fighting sticks` | Genesis-coloured captures on a cyan / star background | lined up and measured |
| overlay | `PC Head`, `PC Crest` and copies | a 95 PC head or crest pasted on top of an unfinished frame | **composited in place** onto the frame under it (any later, smaller layer whose box sits inside a frame's box in the same group) |
| reference | `idle95pc`, `pc edit pal front/side`, `pc edit goalb`, `comparison`, `color guide PC` … | 95 PC / 94 SNES frames for comparison | not frames; several overlap frame boxes (`pc edit goalb` over IF0011, `pc edit pal side` over IF0020, `pc edit pal front` over IF0021?, `comparison back` over Layers 30/31), which is why the board looks stacked |
| snes | `SNES0000` (+ copy, crest, `PCHead DL`) | a 94 SNES frame experiment | out of scope |

Steps:
1. Build each frame: base layer + its overlays at their real positions (RGBA, layer alpha respected).
2. Separate the frame from its background: white, the cyan (144,252,252), the canvas green and the star colours.
3. Line it up on every NHLPA 93 candidate (353–376, 633–644), both facings, every offset, scored by silhouette overlap. Ties are broken by the layer name (`IF00xx - N` = frame N+1), by PSD left-to-right order for Layers 27–32 (371–376; retail 373 and 376 are identical), and for Genesis-coloured layers by exact Genesis colour agreement.
4. Classify every pixel of the retail frame's silhouette by its actual colour:
   - **PC**: a guide-palette colour, or grey (k,k,k) where k is an index the 95 PC sprites use, and not equal to the Genesis colour at that pixel;
   - **shared**: black — Genesis black and 95 PC index 0 are the same;
   - **Genesis**: equal to the Genesis colour of that pixel's value, or any Genesis colour seen in the captures;
   - **off-palette**: anything else (e.g. (0,170,0), (160,96,96): near guide colours but not in the BMP);
   - **hole**: transparent or background where the retail frame has a pixel.
   The Genesis colours are learned from the `GEN PAL` and unfinished layers (most common colour per Genesis value).
5. Status from the pixels, not the layer names: **FULL** = all 95 PC/shared; **PARTIAL** = some 95 PC, some not (% = 95 PC + shared share); **NONE** = no 95 PC pixel. Where a name disagrees with the pixels it is flagged (`IF0021 PC PAL` is pure Genesis colours).
6. Foreground outside the retail silhouette is reported as detached parts (e.g. a 52-px blood splat in `IF0011 - 643` at x −21…−8, off the canvas edge, not part of retail frame 644 at that spot).

## Zone check (`tools/zonecheck.py`, `tools/answerkey.py`)
- Answer key: 817 frame pairs where a 94G/93G frame and its 95 PC redraw line up (silhouette overlap ≥ 0.97) give, for each Genesis value, which 95 PC indices the 95 PC artists used there (`status/answerkey_cooc.json`). E.g. Genesis 47 (shadow) → 88 in 98.7%; 35–37 (pants) → 177/180 (pants dark/medium); 38/39 (skin) → 133–136; 46 (stick) → 136 (66%) or 0.
- Each 95 PC pixel in the frames that are 80%+ done is checked against its Genesis zone family (pants → pants/socks/jersey, skin → skin/stick, shadow → shadow, black/blade → 0/8/28/31 …). 8,188 pixels checked; 228 (2.8%) cross families. Most are jersey pixels turned black (136; the 95 PC artists do the same at outlines), stripes on the stick index 136 (14), jersey → shadow 88 (12) and jersey → skin 140 (9). A few use indices outside the BMP (17, 22, 30, 86, 109); those need a look.

## Abdul's palette BMP
`abdul/abdul_palette.bmp` is a 20 × 36 front-facing skater whose pixel values are real 95 PC indices (0, 1, 8, 28, 88, 133–140, 144–191, crest 192–196/208–212/224–228/240–244, 255) and whose palette paints each zone in a guide colour. So his indices already are the 95 PC zone indices; no remapping is needed. Zone names for 144–191 and the crest come from NHL9XStudio `lib/pc-jersey.js`; the others are marked as guesses in `status/abdul_palette_indices.csv`.
