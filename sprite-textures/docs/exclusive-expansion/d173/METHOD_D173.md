# D173: full skeleton for Genesis exclusives + skeleton-driven per-bone warp (Abdul pt996u)

## Skeleton (`skel173.py`, sheet `skelsheet173.py`)
- **Parts:** head, neck, chest, belly, pelvis; L/R shoulder, elbow, wrist, glove, hip, knee, ankle, skate; stick butt, heel, toe. That makes 19 bones, including the shaft and blade.
- **Prior:** the D163 PC skeleton (skel_ok) of the best-matching pose. Candidates are the 150 PC frames nearest by bbox and area, scored by silhouette IoU with mirror and offset search. Mirrored priors swap L and R.
- **Snapping (D162-style):** each joint goes to the nearest pixel of its own part label if one is within 3 px, otherwise to the nearest body pixel.
  - A bone that collapses to under 50% of its prior length gets its child joint put back on the transferred prior position.
  - Stick: butt = largest stick component's pixel nearest the gloves; toe = farthest pixel; heel = the pixel farthest from the butt-toe chord.
- **Loose-equipment frames** (no body, e.g. 93G 353): each glove blob is a hand bone and each stick blob a shaft, both along the blob's principal axis.
- **Sanity checks:** bone length 0.5x-2x the prior; elbow/knee angle >= 25 deg; L/R length ratio <= 2.2.
- **Flags:**
  - 24 of 40 frames have a geometric flag: G93 353 355 357 359 361 364 368 369 371-376; G94 739 740 741 744 745 748-751 753.
  - 35 of 40 have prior IoU < 0.7. These poses are exclusive, so no PC pose matches them well.
  - **These skeletons are approximate.**
- **Runs on any exclusive:** `skeleton(g, lab)`.

## Warp (`warp173.py`, `run173.py`)
- **Pixel assignment:** each pixel goes to the nearest bone compatible with its part label.
- **Fit per bone:** one affine per bone, so texture rows and columns stay straight within the bone. Candidate inits:
  - bone-axis inits, where the segment's extent along the bone maps to the zone rows and the extent across it to a zone column span;
  - a pipeline least-squares init.
  The best candidate is refined on the family objective, with a joint-continuity penalty.
- **Outline ruling (b):** still applied (179 px).

## Results (11,318 px)
| | D172 | D173 |
|---|---|---|
| Errors | 1,284 | **1,938** |
| Nudges | 1,243 | **1,080** |
| Exact warp | 8,651 | 8,046 |
| Unfilled landings | 321 | 452 |

- **93G 353:** 0 errors, 8 nudges (D172: 36).
- **Errors are worse than D172.** Nearest-bone assignment cuts the torso and limbs at wrong places when a skeleton is off, and most skeletons rest on weak priors.
- **Coherence:** limbs are somewhat better. 94G 739's arms show columns running along the arm, and 93G 353 is cleaner. Torsos are slightly worse than D172.
- **Next lever:** better joints for the 24 flagged frames, either by Abdul's review or by fitting joints jointly with the warp.
