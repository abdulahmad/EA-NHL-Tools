# D172: per-bone-segment warp + outline ruling (b) vs the frozen D169 texture

## Outline ruling (pt995s3501, option b)
- A Genesis black pixel whose body neighbours are mostly not black is an outline.
- Its family is the majority family of those neighbours. It maps to the texture and renders as that family's darkest shade: navy 40, white 45, skin 39.
- 179 px are outlines under this rule.
- Black inside black areas (gloves, skates) stays black.

## Method (`warp172.py`, `run172.py`)
- **Joints:** the D162 skeleton only exists for PC frames; Genesis exclusives have none. So joints are estimated from part-label boundaries: shoulder, wrist, hip, knee, ankle. Each sleeve component is split at the elbow, which is its midpoint along the principal axis; the upper arm is the half nearer the torso.
- **Segments and texture zones** (sleeve or body columns):
  | Segment | Zone | Rows |
  |---|---|---|
  | head | body | 0-5 |
  | torso | body | 6-16 |
  | upper arm | sleeve | 6-12 |
  | forearm | sleeve | 12-17 |
  | hand | sleeve | 17-20 |
  | thigh | body | 17-23 |
  | shin | body | 23-27 |
  | skate | body | 27-31 |
- **Warp:** one affine per segment, so texture rows and columns stay straight within the segment.
- **Joint continuity:** penalty 0.5 for each pixel whose texel jumps more than 1 from an already-fitted neighbouring segment. Fitting order: torso, head, upper arm, forearm, hand, thigh, shin, skate.
- **Objective:** family mismatch, plus landing outside the zone or on an unused texel (the D171 landings are now in the objective).
- **Detached segments** with no neighbouring segment and more than 50% errors may try the other zones. This is how 93G 353's loose gloves are handled; 23 px were re-zoned.
- **Nudge exception:** a texel of the pixel's family within 1 texel, in the zone.

## Results (11,318 coloured px)
| | D171 | D172 |
|---|---|---|
| Errors | 1,581 | 1,284 |
| Nudges | 1,986 | 1,243 |
| Exact warp | 7,751 | 8,651 |

Error detail:
| Type | Pixels |
|---|---|
| Unfilled texel | 321 (D171: 660) |
| Navy on white + white on navy | 452 |
| Skin on jersey | 270 |
| On black | 191 |
| Other | 50 |

- **93G 353:** 0 errors, 36 nudges (D171: 76 errors).
- A first version let every bad segment change zone. It reached 976 errors, but by mapping arms onto head texels, so I rejected it.

## Coherence (honest)
- Torso bands and columns are straighter, and 94G 739, 740 and 742 show continuous horizontal bands.
- Limbs are still broken up, and crossed or fight-pose arms remain noisy.
- The estimated elbow and part labels are the weak point. A real Genesis skeleton (hand-placed joints for these 40 frames) is the next lever.
