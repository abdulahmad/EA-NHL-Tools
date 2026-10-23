# v5: changes from Abdul's v4 review

The v4 backs and sleeves were approved and are unchanged. The exceptions are the collar fix below and the Thrashers sleeves.
Scripts: `scripts/v4/build_v5.py`, `v5_run.py`, `v5_gear.py`. Textures: `textures/v5/`.

1. **Fronts (all teams):** the whole torso is resampled directly from the reference photo. The pipeline crops the torso box centred on the crest, quantises it to a k-means palette snapped to the team palette, and takes the mode per cell. Crests are no longer cut out and re-pasted, and stripes are not re-laid. The crest falls where it falls. The back jersey overlaps the right side of the front in the photos, so that side is mirrored from the left, except inside the crest box. Sprite renders no longer overlay a separate crest.
2. **Socks (all teams):** resampled directly from the photo's sock. Each row takes one colour by mode, because the sock wraps the leg; this removes the garter tab and seam specks.
3. **Florida:** the white sliver at the top of the back (the collar, mis-read as a stripe) is dropped. The white at the top of the sock is gone because socks are now sampled from the photo.
4. **Stars:** front and back are resampled across the full width of the photo. The player name and number are blanked from the back.
5. **Thrashers:** separate left and right sleeves (`sleeve` = the player's left, i.e. the photo's right; `sleeve_b` = the player's right), each sampled from its own arm. Front and back are mirrored, so the navy side panels are symmetric. The back is the front with the crest removed. Socks are sampled from the photo.
6. **Wild:** front resampled. The wheat collar sliver at the top of the back is removed. The arm is unchanged.
7. **Blocker:** left half mirrored to the right, with a uniform outline ring on all four sides.
8. **Goalie mask:** left half mirrored onto the right (symmetric, like the original).

Gloves: the v4 measured gloves are kept (`tex_gear_glove_*`), and the first-iteration gloves are kept alongside them as an alternate in `textures/v5/gloves_alt_v1/`.
Thin stripes of 1–2 photo px (e.g. the Panthers' gold edges, the Wild's red sock stripe) can vanish at 6x10 / 12x15 capacity; leave those for manual cleanup.
