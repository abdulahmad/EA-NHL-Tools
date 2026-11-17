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
- **The palette is the texture sheet.** Shown 16 wide, the player palette is laid out as textures: rows 0-5 hold four vertical strips of
  4 shades each (zone = row * 4 + column): columns 0 and 1 are the sleeve stripes (zones 4/5, 8/9, 12/13, 16/17, 20/21, then forearm 24/25; the
  two columns are the inner and outer half of the arm), column 2 the six hem bands top to bottom (zones 2, 6, 10, 14, 18, 22), column 3 the sock
  stripes top to bottom (3, 7, 11, 15, 19, 23). Then yoke 26 and its trim 27, pants 28 with stripes 29 and 30, collar 31, helmet 33, jersey 34,
  knee 35, shoulders 1 / 36. The crest grid sits at the bottom left and the number grid beside it.
- **Number texels are sparse on rows 1 and 3.** The model only has number texels in columns 0, 2, 4, 6 on those rows; plain jersey shows between
  them. Each number texel is about 1.2 pixels wide and 2 tall on the standing sprite; each crest texel about 1.4 by 1.2.
- **The standing pose leans forward.** The hem ring is about 3.5 pixels higher at the back than at the front, and the chest is turned toward the
  stick side, so rings and grids must be fitted with a tilt rather than assumed level.
- **Scores, standing pose, later the same day.** Low-poly mesh with one zone per face: 13.6% wrong at 600 faces, 7.0% at about 1,000 (crest and
  number flat). Rule-based clean texture on that mesh: 17.2%. Per-voxel tuning reached 3.4% but only by overfitting the 8 views.
- **The 96 sprites look point-sampled.** Rendering the clean model with one sample at each pixel centre scores 11.6% wrong on the standing pose;
  2x2 supersampling scores 25 to 27% and 3x3 15 to 20% depending on the coverage rule (`nhl96/ss96.py`). The shape was tuned with centre
  sampling, so this favours it, but the sprites also contain no blended colours.
- **95 and 96 proportions differ.** At NHL 95 size (scale about 0.65) and the 95 camera, the 96 model is slimmer with a smaller head than the
  95 sprite, which is drawn stockier (`nhl96/cmp95.py`).

## NHL 96 PC: symmetric rules and shading (`nhl96/final96.py`, `nhl96/shade96.py`)

- Symmetric stripes: both sleeves share one set of stripe widths, both legs another; only the starting offset along each limb is per side (it absorbs the pose). Cost on the standing pose: 11.6% -> 12.5% wrong pixels (flattened shades, stick ignored).
- Shading: the 4 shades per palette zone follow a light fixed to the player, not to the camera (a camera-fixed light fits worse in every test). Best fit, in model axes (x right, y up, z front): shade = clip(round(-0.20 nx + 3.90 ny - 0.53 nz + 1.85), 0, 3), on face normals smoothed once. So the light is almost straight overhead, a little behind the player, and the response is steep and clipped: up-facing surfaces are the lightest shade, down-facing the darkest.
- How well it fits: where the model has the right zone, the exact shade matches on 46.8% of pixels and is within one shade on 84.5%. A constant shade gets 36%. The sprite shading is mottled at pixel scale (it follows the original model's flat faces, which this mesh does not have), so the fitted light gives the right look but not the right pixels.

## NHL 96 PC: second pose and a first rig (`nhl96/rig96.py`, `nhl96/joint96.py`)

- Rig: the standing mesh is cut by palette zone into 11 rigid parts (pelvis, chest, head, upper arms, forearms, thighs, shins) with joints at the borders between parts, smooth weights near the joints. A pose is 3 numbers for position and 3 angles per part.
- Held-out test on bank frames 0-7 (crouched, bent at the waist, both hands on the stick), with shape, texture rules and light exactly as fitted on the standing pose and only the joint angles fitted: 42.2% wrong pixels (standing pose: 12.5%). The body bend, legs and head land well; about half the error is the arms. In the standing mesh the arms hang against the body and are only an outer shell, so they cannot swing forward as limbs.
- Fitting one rest shape to both poses at once (10 minutes of vertex moves, rules fixed): second pose 33.0%, standing pose 13.7%. The limbs start to separate, but the arms still do not reach the stick.
- Supersampling picture: 2x renders reduced to sprite size are about twice as wrong as one sample per pixel (24.6% against 12.5%); stripes and number strokes thicken or drop out.

## NHL 96 PC: modelled helmet, gloves and skates (`nhl96/parts96.py`, `nhl96/export_parts96.py`)

- The carved head, gloves and skates were shapeless at any size above the sprite's. They are replaced by simple solids: head = one egg whose helmet part is pushed out slightly (straight brim over the eyes, down over the ears, round the back), a neck, eyes as two dark rectangles; glove = flared cuff + padded hand + thumb; skate = boot (foot + ankle shaft) on a thin white blade.
- Each part has a few numbers (position, direction, sizes, brim / ear / back lines) tuned on the wrong-pixel count against the 8 standing sprites, within limits that keep the shape recognisable.
- Cost: 12.5% -> 14.9% wrong pixels per frame (104 of 700). The carved blobs had been moved vertex by vertex to suit these 8 views, so part of their lower score was fit to the views rather than to the object.
- `hires96.py` draws the model at any size for looking at it (not used for scoring).

## NHL 96 PC: modelled arms and pants, rig on the parts, more poses (`nhl96/rigparts96.py`, `nhl96/joint2_96.py`)

- Arms are now two capsules per side (shoulder-elbow, elbow-wrist) with the glove on the end; pants are a hip block plus two thigh capsules. Sleeve stripes and the pant stripe come from the same texture rules as before. Only the chest and the shins are still carved. Standing pose: 18.4% wrong pixels (carved-everything model: 12.5%).
- Rig: every solid is one rigid part and the joints are where the capsules meet. Fitting only joint angles: crouch (frames 0-7) 40.5% (first rig: 42.2%); the arms now reach the stick and missed-outline pixels fall by a third, but colour errors stay at about 25% of the body because stripes, crest and number land a pixel or two off on a bent torso.
- Shared fit: one set of part sizes tuned on standing + crouch + a skating stride (frames 16-23), with upright-with-stick (frames 144-151) kept back. The kept-back pose did not move: 43.8% before, 43.8% after. Part sizes are not what limits other poses.
- What limits them is the pose search. It walks joint angles downhill on the wrong-pixel count and gets stuck: on the stride it never finds the leg stretched out behind (58.4%). A better start is needed, e.g. find the gloves, skates and helmet (their colours are unique) in all 8 views, triangulate them to 3D and solve the limbs from those points.
