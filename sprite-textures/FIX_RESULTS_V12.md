# v12: tight top crops, edge bleed plus alpha (the front-mask symmetric chin went in PR #30)

## Tight top crops
- **pad:** the photo's rows 0–85 are the knee block above the pad's top roll, so they are not pad. The crop is now (0,86,256,512), and the texture goes from 14x28 to **15x25** (square cells, same pixel budget).
- **catcher:** rows 0–7 are white page above the red outline. The crop is now (0,8,256,216); the texture stays 11x9, and its top row is now real glove.
- **pad_b:** unchanged. The navy at both ends is the pad's own navy end rolls, not background.

## Edge bleed and alpha (`bleed_v12.py`)
Applies to the curved gear: goalie_mask, mask_b, blocker, catcher and the 3 gloves.
- A cell is gear when at least 50 % of its reference pixels are inside the gear silhouette. The silhouette is everything except page/backdrop pixels connected to the image border, so the mask's eye and mouth holes count as gear.
- For goalie_mask and mask_b, black page texels touching the border are also background.
- Background cells get the nearest gear texel's colour, preferring a same-row neighbour on ties.
- `tex_gear_<name>_alpha.png` keeps the original shape (255 = gear, 0 = bled).
- See `bleed_compare.png` (texture only, no reference). The mapper's use of bleed and alpha is in MAPPING_PLAN.md §5.
