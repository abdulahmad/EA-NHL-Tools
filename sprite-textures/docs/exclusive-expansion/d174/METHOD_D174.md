# D174 — joint + warp fit, palette-index key, palette-zone constraint

Rulings: t996s3513 option (a) fit joints and warp together; pt997u Abdul test texture + palette-zone rule;
pt999u palette-index texture as primary key; pt1002u collapse helmet/skin shading; pt1003u aim for 0 errors on the index key.

## Palette-zone table (pt997u)
`palzone174.py` -> `palzone174.json`, sheet `d174_palette_zones.png` (94G 738-753 in one distinct colour per index).
A body part is allowed for an index if at least 2% (and at least 3 px) of that index's 94G pixels carry it. Upperarm is allowed wherever forearm is, because the sleeve top is rarely labelled separately.

| index | allowed parts |
|---|---|
| 33, 34 | hand, skate |
| 35, 37 | thigh |
| 36 | thigh, torso |
| 38, 39 | head |
| 40, 42 | forearm, shin, thigh, torso, upperarm |
| 41 | forearm, shin, torso, upperarm |
| 43, 44 | forearm, head, shin, torso, upperarm |
| 45 | forearm, hand, head, torso, upperarm |
| 46 stick, 47 shadow | unconstrained (game colour) |

This is a hard constraint in `warp173.py` (`PALZ`): bones outside an index's allowed set get infinite distance. It is off by default, so D173 is unchanged.

## Index texture (pt999u, pt1002u)
`tex174idx.py` -> `tex174_idx.pkl/json`, image `d174_index_texture.png`. It is built like D169 (281 aligned pairs, row-band majority, gap fill), but votes on the palette index.
In head rows 0-5, the helmet shades 43/44/45 become 44 and the skin shades 38/39 become 39. The face/helmet boundary is kept per texel, and any shade in the group counts as a match.

Vote agreement:
- overall 55.9% (51.5% before the collapse)
- head 96.4%
- torso 50.6%, sleeve 52.2%, legs 51.7%

The body bands still split between shades of one family (white 43/44/45, pants 35/36/37, navy 40/41/42). Indices 35, 37 and 40 never win a band.

## Fit
`opt174.py`: coordinate descent on the 19 joints (±1/±2 px). Each move refits the per-bone warp (2 sweeps, final 6).
Objective: index-key errors + 0.5×nudges + plausibility (length vs prior, angle ≥ 25°, L/R ≤ 2.2, bone on body).
Inits: the D173 joints, plus the 2 best alternative PC poses for flagged frames. D172 had no explicit joints, so it could not be used as an init.
Stick pixels are game colour; shaft/blade assignment is nominal.
Note: the joint fit ran on the index key before the pt1002u head collapse. The final scoring (`run174.py`) uses the collapsed key.
A family-key run of the same optimiser is kept in `skel174_famkey.json` (warp-time family errors 570 vs 4,302 with the index key).

## Results (40 exclusives, run174.py)
- Leafs-family errors 1,645 (D172 1,284; D173 1,938), of which 488 are unfilled texels
- nudges 1,076 (D172 1,243; D173 1,080)
- index-key mismatches 3,604 of 11,318 body px
- smooth-warp exact 5,905
- frames still flagged: 1 (93G 353, loose equipment)

The 0-error goal on the index key is NOT met. The vertical, horizontal and Abdul-layout test renders are not coherent; they show scattered texels.
