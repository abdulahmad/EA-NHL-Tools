# v6: changes from Abdul's v5 review

## 1. Why the v5 fronts were worse than the backs (root cause)
The fronts and backs were built by two different methods:
- **Back (v4 spec):** column profiles at several clean x positions, then a majority vote, then band runs, then straight full-width rows sized by largest-remainder allocation. The output is perfectly straight rows in palette colours.
- **Front (v5):** a 2D k-means palette plus a per-cell mode over the raw photo crop. That picks up everything in the photo:
  - the faux perspective curve of the stripes, so one stripe spans two rows in some columns and one in others
  - seam lines, shading, and the sleeve/armpit wedges in the top corners
  - a left-to-right mirror that skipped the crest box (crest compensation). Because of the skip, the cells at the crest-box edge came from different sources on the two sides, which gave jagged steps.

Chicago (thin black/white/red bands plus the CHICAGO lettering) and Montreal (curved white/navy bands) showed it worst.

**Fix:** the band-team fronts (Montreal, Chicago, Florida, Wild) are now built by exactly the same function as the backs (`band_img(spec['front'])`). The mirror and the crest-box skip are gone. The only thing added on top is the photo's own crest pixels, at their true position in the photo's frame: no crop, no re-centring, no resizing. A cell gets the crest only where the photo cell is mostly non-band colour, or band colour inside the crest box. Chicago's 1-px CHICAGO lettering can't survive 12x15, so its front is the plain band stack, the same as its back.

## 2. Canadiens stripes
The photo draws the horizontal stripes with a faux perspective curve. In the texture they are straight horizontal rows, measured as band runs.

## 3. Goalie mask
Still symmetric. The bottom-middle chin texel is now the mask's orange.

## 4. Pad backs
New `pad_b` texture (19x21), measured from the Fuhr strap-side reference (`01M5MRFR9…`, left 156 px, rotated so the knee end is up). It has the navy ends, the straps/buckles in grey and the navy centre roll. For previews, its atlas slot is (288,368,96,128) in the 512 atlas (`v6_gear.py`). The sprite UV for the pad's back faces comes in the mapping phase.

## Stars and Thrashers
Both are unchanged from v5. They are shape/2D designs, sampled directly.

## Next phase: sprite mapping (not started)
Treat each sprite frame as a posed 3D model. For every frame, estimate segment angles for:
- head
- upper back (chest/shoulders) and lower back (waist)
- upper arms and forearms, left and right
- upper legs (thighs) and lower legs (shins/socks), left and right

Then map UVs per segment, using the segment axis plus the facing (front vs back, yaw and roll), instead of per-region heuristics. Stripes then follow each limb's true axis, and pad fronts and backs, or jersey fronts and backs, get picked from the facing.
