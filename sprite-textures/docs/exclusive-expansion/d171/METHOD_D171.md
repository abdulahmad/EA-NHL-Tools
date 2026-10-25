# D171: smooth per-part warp vs the frozen D169 texture (Abdul pt995u)

## Method (`warp171.py`, `run171.py`)
- **Segments:** each sprite is split into body-part segments using the D166 skeleton/part labels: torso, sleeve/arm, legs (pants/sock/skate), head.
  - Each zone is split into 8-connected components, so each arm and each leg is its own segment.
  - Unlabelled body pixels join the nearest labelled pixel's part.
- **Warp:** one 6-parameter affine per segment, mapping sprite (x, y) to texel (u, v).
  - Straight texture rows and columns stay straight, continuous lines on the sprite, so the D157 rule holds within a segment.
  - Init: least squares on the pipeline texels that are in the zone.
  - No init (93G 353 gloves): the zone centre at 1 texel per pixel.
- **Objective:** family mismatches + out-of-zone texels, plus 0.5 x drift of the offsets from the init. Fitted by coordinate search over offsets (+-8), scales and shears, 5 sweeps.
- **Exceptions:** a pixel whose warped texel is wrong may take a texel of its family within 1 texel, if one exists. Counted as an exception.

## Results (11,318 coloured px)
| | Pixels |
|---|---|
| Exact warp | 7,751 |
| Exceptions (1-texel local snap) | 1,986 |
| Errors after warp | 1,581 |

Errors by type:
| Type | Pixels |
|---|---|
| Unfilled / outside texel | 660 |
| White/navy mismatch | 390 |
| Black px on navy/white | 237 (mostly Genesis outlines, which have no texture equivalent) |
| Skin px on jersey | 230 |
| Other | 64 |

- D170 had 0 errors, but only because it snapped pixel by pixel.
- Stick 574, shadow 2,040 and blood 183 keep their game colour.
- No pixels relabelled.

## Coherence (honest)
- Better than D170: the horizontal test now shows stripe bands across torsos (e.g. 94G 739, 740, 742).
- Still not clean:
  - the vertical test is only partly continuous;
  - arms and legs in crossed/fight poses get poor fits;
  - 93G 353 (gloves on the ice, no body) fails: 76 errors out of 88 px.
- One affine per segment cannot bend at the elbow or knee.
- Next steps: piecewise-affine per bone using the skeleton joints, and a ruling on Genesis black outline pixels.
