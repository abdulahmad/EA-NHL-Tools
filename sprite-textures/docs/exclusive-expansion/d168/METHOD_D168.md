# D168: fixing D167 - pairing audit + colour-family 94G texture (Abdul pt991u)

## 1. Pairing audit (`align.py`, `overlay.py`)
I found no pairing bug.
- **PC frame ids:** all 881 frames in the 0-error skater export (`/tmp/sk_d163.json`) are byte-identical to the PC frames used for pairing (same n). There is no +8 shift or off-by-one.
- **Offset and mirror:** for every 94G/93G-to-PC candidate, I searched mirror and offset (±4 around the centroid offset). Results:
  - 817 of 1,358 candidates reach silhouette IoU >= 0.97;
  - every accepted pair's mirror flag agrees with the census flag;
  - the D167 bounding-box alignment was right for the pairs it used.
- Overlays: `align_overlays.png`.
- **What actually caused D167's low numbers:**
  - It compared exact Genesis shades.
  - It merged duplicate RGB slots (41 = 35, 42 = 36).
  - Genesis 40, the darkest navy, was effectively counted as black.
  - Ignoring shade and putting 40 in navy raises agreement from 0.54 to 0.885.

## 2. Colour-family texture (`fam.py`, `tex.py`)
- **Genesis families** (TORh, shade ignored): black 33/34, navy 35/36/37/40/41/42, skin 38/39, white 43/44/45. Stick 46 and shadow 47 are not textured.
- **PC families:** by index for outline, skin, helmet, stick, shadow and blade; otherwise by the Leafs texel colour.
- **Build:** 281 aligned 94G pairs with 0-error PC maps give 668 of 768 texels voted. 83 were gap-filled from unanimous neighbours, and 17 are still unfilled.
- **Agreement:** 0.885 across frames and 0.971 within a frame. This is **below the expected 0.95**.
- **Where the residual is:** almost all white<->navy, in socks, torso and arm stripes. The Genesis stripe rows and the PC map's stripe rows disagree by a row or two between poses.
- **93G:** same palette, and the 93G-built texture gives the same numbers.

## 3. Validation (family texture + shade level)
- Shade is mapped (family, PC index) -> majority Genesis index, learned from the aligned pairs.
- Family reproduced: 63,765 of 72,056 px (88.5%).
- Exact index reproduced: 39,570 of 72,056 px (54.9%).

## 4. Exclusives (93G 353-376, 94G 738-753)
- Pixels stay on the texel the translator and PC pipeline give them, so nothing is moved. A pixel whose family matches renders with its original shade.
- **Non-texture pixels** keep their game colour:
  - stick (574 px);
  - shadow (2,040 px);
  - 93G blood (183 px). Blood uses palette rows 0/1 (indices 1/2/28/29). It is a transient decal painted over the uniform, not a uniform colour, so it is not a texture colour.
- **Errors:** 1,559 of 11,318 px (13.8%). 94G alone: 595 of 4,467 px.
  - Family mismatch: 1,319 px, mostly white<->navy, which is the translator's sleeve/torso and stripe confusion from D166.
  - No texel: 240 px, of which 88 are G93 353 (gloves on the ice, no body).
- The PC Leafs, vertical and horizontal renders are still not coherent. The texture is now clean, so the limiting factor is the D166 translator/pipeline map for exclusive frames.

## Recommendation
- Use the family constraint during the fit. Snap stripe rows so the family matches, in the way D157 straightens columns, instead of after the fit.
- Add a skeleton-based sleeve/torso split.
