# Sprite-to-3D findings: NHL 95 PC and NHL 96 PC

Notes from the 2026-11-16 experiment. No game data is in this repo; every number here was measured from the user's own game files.

## NHL 95 PC

- **Frame numbering.** The sprite-textures scripts count frames from 1. Frame 370 is the front-facing standing control and 185 the back-facing one (369 / 184 zero-based).
- **Direction order.** In the 8-direction animation tables (`Sprite-Viewer/data/frames95pc.asm`), d0 faces away from the camera and d4 faces it; yaw advances 45 degrees per direction with the player's right on screen right at d0.
- **Camera.** Orthographic fits well. Upright frames fit a pitch of about 25 degrees (15 to 35 scans equally well). Lying-flat frames in SPAfallfwd / SPAfallback are drawn as if from about 55 degrees (46 to 61 measured from body foreshortening). The art does not share one camera.
- **Not rigid renders.** The same animation frame in two directions is not the same 3D pose: silhouette carving from the 8 directions gives a blurred blob, and the stick is drawn differently in every direction. The sprites are at least partly hand drawn. A jointed template with a per-frame pose is needed.
- **Shading does not carry between angles.** Flatten each palette zone's light / medium / dark to one value before comparing or voting, and re-apply shading from the surface normal afterwards.
- **Palette zones** (from `zn.json`): sleeves 144-158 (forearm, three stripes, upper arm, 3 shades each), yoke / jersey / waist 159-176, pants 177-180, socks 181-189, helmet 190-191, skin 133 / 134 / 135 / 140, stick 136, crest 192-196 / 208-212 / 224-228 / 240-244.
- **Front control rows (frame 370).** Helmet rows 0-2, face rows 3-5 (eyes are index 140 at the two columns either side of centre), crest rows 10-13, hem rows 14-16 (blue, white, blue from the top: waist 1, 2, 3), pants from row 17. Sleeve: upper arm rows 8-11, stripes rows 12, 13, 14, forearm rows 15-17.
- **Best limb references.** SPAfallfwd and SPAfallback have limbs clear of the body.
- **Stick.** It must be read from its own pixels (index 136 shaft, black blade pixels); fitting it as a template part fails.
- **Hand-set sizes.** The fit drives limbs too thin, so minimum limb radii, chest depth, head height and stick length are set by hand in `tmpl.py`.

## NHL 96 PC

- **Where the sprites are.** `DATA\GAMEART.VIV` is a BIGF archive: `TOTAL.ref` (player sprites), `fight.ref`, `cup.ref`, `oldshp.qfs`, `rinkpal.qfs`, `newpal.qfs`, `teampal.qda`.
- **`TOTAL.ref`** is an uncompressed SHPI directory of 2,829 frames. Each frame has a 16-byte header (type 0xFB, 3 bytes unused, then u16 width, height, x anchor, y anchor, x position, y position) followed by a RefPack (`10 FB`) stream of width x height bytes padded to 4. Index 255 is transparent.
- **Frame names** are `FFDD`: frame number within the animation and direction 0-7. The name restarts at `0000` for each animation; there are 115 groups.
- **Palettes.** `newpal.qfs` (RefPack-compressed SHPI) holds one 256-colour 6-bit palette per team and side, named `!` + team + `h` / `a` (`!bfh` is Buffalo home). Applying it directly to the sprite indices gives the in-game colours.
- **Palette layout of a player sprite.** Indices 4-147 are 36 zones of 4 shades each (dark to light); zone = index >> 2. 148-150 dark (stick blade), 151-153 black (gloves, skates), 154-156 white (skate blade), 157-159 stick shaft, 166-173 skin, 3 eyes.
- **Crest and number are texel maps** (from `SetPlayerSpriteColors` / `MakeJerseyNumber` in NHL96PC `player_art.asm`). The crest is a 6x6 grid: texel (row, col) is palette entry 160 + 16 row + col. The jersey number is a 7x5 grid (two 3x5 digits with a gap column): texel (row, col) is entry 182 + 16 row + col. Digit bitmaps are 15 bytes each, value 2 = number colour (palette entry 2), 1 = jersey colour (entry 1). So a sprite pixel with one of these indices names an exact spot on the model, which gives point matches between views. See `nhl96/num96.py`.
- **The sprites are renders of a 3D model.** One animation frame is one rigid pose seen from 8 yaw angles 45 degrees apart; d0 is the back view. Orthographic projection with a pitch of about 13 degrees reproduces the outlines. Stored anchors are off by up to 1.5 pixels per view and need per-view calibration (`nhl96/cal2.py`).
- **Carving works.** Intersecting the 8 outlines gives a recognisable player directly. Stick pixels must count as "inside" when carving, because the stick hides body pixels.
- **Scores for the standing pose** (frames 8-15, about 700 body pixels per frame, flattened shades, stick ignored): plain hull with voted colours 21% wrong; voxels tuned by hill-climbing on the wrong-pixel count 3.4% wrong at the 8 game angles, but noisy at in-between angles (overfit); smoothed shape and colours 21.6% wrong.
- **Why a smooth voxel model stalls.** Stripes are one pixel wide and a hull from 8 outlines is not accurate to half a pixel.
- **Open idea.** Four shades per zone suggests flat-shaded polygons: a patch of one shade is one face and the shade gives its facing. Recovering the low-poly mesh should be cleaner than voxels.
