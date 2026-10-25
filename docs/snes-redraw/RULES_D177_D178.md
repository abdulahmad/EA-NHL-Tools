# D177–D178: SNES→94G converter, staged (Abdul pt1010u, t1012u–t1014u)

## Rules
- **D177a Verbatim heads.** The head is pasted unchanged from a 94G frame. Candidates must face the same way. Each candidate is scored against the converter output (exact + 0.5 × family, offsets of ±2 px). The held-out animations are excluded from the head library.
- **D177b Smooth edges.** A 2-pass majority filter is followed (it5) by a silhouette pass: holes with ≥5 filled neighbours are filled, and lone spurs with ≤1 neighbour are removed. Stick pixels are never removed.
- **D177c Connectivity.** No contiguous colour zone of the source may be split. The automatic check is `disconnected()`. Any split is repaired with a BFS path inside the source component. On held-out frames, frames with a split went from 20 to 0. S527's stick is whole.
- **D177d Same facing.** An 8-way facing classifier is trained on the direction tables (skatewp/skate (n−1)//5, turnl, swing, stop, skateb). The nearest 94G pose must have the same direction, and `d178_sheet_checks.json` verifies this. That pose is **only a reference** (head, facing). SNES frames are never warped to it (t1012u).
- **D178 Staged pipeline.**
  1. 19-bone skeleton: kNN pose retrieval plus snapping, including the stick shaft and blade.
  2. Body-part label for each SNES pixel: nearest bone, with a colour-family constraint.
  3. Scaling to 94G proportions (≈1.076 × taller, 1.106 × wider) by skeleton/part splat with depth order.
  4. Smoothing and connectivity repair.
  5. Colour by part and zone, plus the verbatim head.
- **Training and evaluation.** There are 134 training pairs and 31 held-out pairs (skatewp 13, duck 8, hook 7, stop 3). Held-out frames are never seen and never relabelled. Skeleton GT comes from the matched PC frame's editor skeleton (mask IoU ≥ 0.8), so it is only as good as that auto-fit.

## Iterations (31 held-out frames)
| iteration | joint err px | parts acc | exact | family | sil IoU | disconnected | jagged steps |
|---|---|---|---|---|---|---|---|
| PR #135 baseline (71-pair val) | – | – | 0.348 | 0.512 | 0.725 | 20 frames | 0.183 |
| D177 v2 (71-pair val) | – | – | 0.342 | 0.497 | 0.720 | 0 | 0.147 |
| it1 kNN k=1 | 4.36 | 0.523 | 0.336 | 0.498 | 0.738 | 0 | 0.183 |
| it2 k=3 + snap | 3.67 | 0.541 | 0.332 | 0.497 | 0.737 | 0 | 0.183 |
| it3 7×7 window | 3.67 | 0.541 | 0.332 | 0.499 | 0.738 | 0 | 0.183 |
| it4 k=5, 9×9 | 3.48 | 0.547 | 0.343 | 0.504 | 0.741 | 0 | 0.183 |
| **it5 = it4 + silhouette smoothing** | 3.48 | 0.547 | 0.339 | **0.507** | 0.741 | 0 | **0.144** (real 94G 0.152) |
| oracle (GT skeleton) | 0 | – | 0.357 | 0.525 | 0.744 | – | – |

**Plateau, stated honestly.** Pixel agreement stays at about 50% family / 34% exact. Even a perfect skeleton reaches only 52.5% family. The limit is that 94G is a redraw: pose and silhouette differ from SNES (IoU ≈ 0.74). Colouring each pixel cannot close that gap without warping, and warping is ruled out. Near-zero error is **not** reachable with this approach. The clear gains are structural: 0 split zones, edges as smooth as real 94G, same facing, and verbatim heads.
