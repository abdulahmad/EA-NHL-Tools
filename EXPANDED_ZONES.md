
## v5.4 — per-direction pose refinement + free yaw

Script: `sprite-textures/scripts/playerlayout/pose3d_v5.py`; outputs in `sprite-textures/playerlayout/pose3d_v54/`.

- Stage 1: one shared 3D pose per SPA, each frame's yaw fitted freely (weak prior to 45°×d, 0.3 per 10°). Yaw scan every 5° checks it's a real minimum.
- Stage 2: per frame, the shared pose is the prior; joints can move with a penalty of 0.8 per px and 0.12 per degree of bone-direction change. Stick is still fitted from drawn pixels.
- Sheets: 6 px padding plus columns sized to fit their labels (no clipping), split into `_a`/`_b`.

| frame | nominal | fitted yaw | scan best (err best / at nominal) | shared mean/max err | refined mean/max err | dev mean/max px | dev max bone ° |
|---|---|---|---|---|---|---|---|
| 42 | 0 | -2.5 | 0 | 1.23/5.27 | 0.60/2.08 | 0.72/2.98 | 8.8 |
| 47 | 45 | 32.3 | 30 (0.98/1.19) | 0.98/1.50 | 0.61/1.00 | 0.31/0.69 | 4.9 |
| 52 | 90 | 90.9 | 90 | 1.36/3.38 | 0.75/2.21 | 0.63/1.20 | 8.5 |
| 57 | 135 | 179.1 | 180 (1.60/2.40) | 1.60/5.28 | 1.17/4.42 | 0.51/1.30 | 9.0 |
| 62 | 180 | 179.0 | 180 | 1.53/3.73 | 0.94/3.04 | 0.68/1.35 | 6.2 |
| 67 | 225 | 224.2 | 220 | 2.85/6.41 | 1.66/4.11 | 1.00/3.11 | 13.1 |
| 72 | 270 | 274.5 | 275 | 1.36/4.08 | 0.72/2.05 | 0.72/2.26 | 6.6 |
| 77 | 315 | 289.6 | 290 (2.59/2.84) | 2.60/11.38 | 1.74/9.27 | 0.83/2.22 | 8.2 |
| 889 | 0 | -2.9 | 355 | 1.00/2.90 | 0.62/1.68 | 0.47/1.65 | 5.2 |
| 891 | 45 | 94.0 | 90 (2.89/4.28) | 2.88/10.49 | 1.67/5.52 | 1.07/4.48 | 11.9 |
| 893 | 90 | 93.2 | 95 | 2.02/4.21 | 1.12/2.97 | 0.71/2.47 | 5.7 |
| 895 | 135 | 142.3 | 140 | 1.41/2.86 | 0.78/1.36 | 0.62/1.95 | 5.6 |
| 897 | 180 | 174.3 | 170 | 0.77/1.57 | 0.47/1.03 | 0.38/0.82 | 2.9 |
| 899 | 225 | 210.8 | 210 (1.36/1.72) | 1.34/2.59 | 0.80/1.98 | 0.56/1.26 | 4.9 |
| 901 | 270 | 266.0 | 265 | 1.73/3.45 | 0.88/1.92 | 0.66/1.99 | 5.8 |
| 903 | 315 | 267.8 | 275 (2.81/3.58) | 2.85/8.45 | 1.61/4.51 | 1.09/4.63 | 13.8 |

Flags: 57, 891 and 903 snap to the neighbouring direction's yaw (about 180°, 93° and 268°). The art may really be drawn that way, or the 2D joints may not pin down the yaw, so check them by eye. Crosscheck yaws are 3–14° off the 45° grid. 77's stick butt is still the largest error (9.3 px). 62's torso still looks compact; that comes from the crouched front-on art.
