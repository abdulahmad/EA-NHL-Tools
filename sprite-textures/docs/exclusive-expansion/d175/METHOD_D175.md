# D175 — shade groups collapsed in the 94G control (pt1005u)

Ruling: shading is not a separate colour zone. Each shade group is one control zone, and shading inside a group counts as a match.

| Shade group | Indices | Control index |
|---|---|---|
| white | 43/44/45 | 44 |
| navy | 40/41/42 | 42 |
| pants | 35/36/37 | 36 |
| skin | 38/39 | 39 |

Black 33 and 34 stay separate.

- `tex175ctl.py` -> `tex175_ctl.json`: the same build as D169/D174 (281 aligned pairs, row bands, gap fill), voting on the collapsed zones. Vote agreement is 80.9% (D174 index texture: 55.9%).
- `opt175.py`: the D174 joint+warp coordinate descent against the collapsed control. Init = D174 joints. It also keeps the palette-zone hard constraint (`palzone174.json`).
- `run175.py` -> `final175.json`; `cmpsheet175.py` makes the comparison sheets; `texsheet175.py` makes the texture image.
- `warp173.py`: `IdxKey(..., allrows=True)` lets the group match apply in every row. The previous behaviour is unchanged.

## Results (40 exclusives)

| | D174 | D175 |
|---|---|---|
| control mismatches | 3,604 (index key) | 800 / 11,318 body px |
| Leafs-family errors | 1,645 | 708 (258 of them unfilled texels) |
| nudges | 1,076 | 1,180 |

- Smooth-warp placements (Leafs family, in zone, no nudge): 8,795.
- Not 0 errors. The 601 PC frames were not checked because the exclusives are not yet solid.
- The Abdul-layout render is improved but still not coherent: the bands are broken up and scattered on most frames.
