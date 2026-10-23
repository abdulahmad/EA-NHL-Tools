# Jersey / gear texture fix (v4): measured specs instead of hand-guessed

All 7 steps of FIX_PLAN executed. Pipeline: `scripts/v4/measure_ref.py` (reference photos, local only) → `specs/<team>.json`
→ `scripts/v4/build_v4.py` → `textures/v4/`. Check with `scripts/v4/metrics_v4.py` and `scripts/v4/dropped_v4.py`.

## What changed
- **P1 band overlap:** `jerseys.bands()` and `build_v4.alloc()` now use non-overlapping largest-remainder allocation over gap-filled bands. Every band keeps ≥1 row, and this covers the vertical side pipes too.
- **P2/P3 stripe layout:** measured per team from the photos: majority vote over parallel sample lines, ΔE nearest-seed classification and run-length merge. Front, back, sleeve and sock each get their own spec, and the back has its own spec.
- **P4 crests:** tight box with the background masked (band colours under the crest, border-connected), a k-means palette and a per-cell mode. Each crest is centred on the measured chest-band V. The Blackhawks get a 1-row wordmark.
- **P5 colours:** sampled as the median of member pixels, then snapped to the 6-bit VGA DAC.
- **P6 Stars:** 2D-measured body with a white outline (single, not double black), plus a diagonal sleeve split (separate u0/u1 band sets).
- **P7 gear:** Fuhr pads, blocker, catcher and mask, 3 gloves and the McDavid CCM JetSpeed stick are each measured from their own photo. Before measuring, specular glare is removed from the stick shaft (253 px replaced).
- **P8 Thrashers:** the side pipe is now an overlay with a proper column allocation.

## Metrics (before → after)
- Dropped bands: **9 → 0** (dropped_v4.py: `dropped: 0`)
- Row accuracy vs measured spec (front+sleeve+sock, 219 rows): **70.3% → 84.9%**
- Stripe edges within ±1 px of ideal: **68/77**. Max error is 1.875 px, caused by thin bands being forced to ≥1 row.

| team | colour ΔE max (hand-typed → palette-snapped) | crest top-3 ΔE | rows ok |
|---|---|---|---|
| canadiens_babyblue | 20.7 → 0.95 | 43.4 → 0.7 | 27 → 36 / 39 |
| wild_home | 7.1 → 1.7 | 50.4 → 2.0 | 28 → 34 / 39 |
| blackhawks_alt | 6.6 → 0.57 | – → wordmark | 23 → 30 / 39 |
| panthers_home | 17.9 → 1.77 | 50.5 → 1.2 | 25 → 33 / 39 |
| stars_alt | 6.3 → 1.2 | 28.0 → 1.6 | 18 → 22 / 24 |
| thrashers_home | 19.0 → 1.92 | 27.7 → 1.4 | 33 → 31 / 39 |

Thrashers rows drop slightly (33 → 31) because its 9-band sock must fit 10 rows.

Not committed (local only): reference photos, `*_compare.png` (contain reference crops), and `*_grid_v4.png` (rendered on retail sprites).
