# Audit: what is still wrong with the per-pixel UV renders (2026-10-23)

## How this was measured
- `audit.py` computes per-frame metrics over all 1134 frames. `audit_stats.py` summarises them.
- Configurations compared:
  - `before`: v2 UV with the torso-only wrap at ELEV 35.
  - `fix2`: limb wrap, sleeve/sock side fix, temporal front/back vote, ELEV 40.
- Evidence images use the aligned layout: columns centred on the game's per-frame draw anchor (`-minX,-minY`, the feet), and rows share the anchor y. They are `progress/18_…` to `progress/32_…`, generated locally because they are retail-derived.

## Results, ranked by severity

| # | Issue | Severity | Before | After / status | Evidence |
|---|---|---|---|---|---|
| 1 | Front/back misdetection and flicker: one frame of a run flips to back, so the crest vanishes and the stripes swap. The detector also leans heavily to front: 785 front vs 144 back torsos. | High | 32 flips in 232 near-identical consecutive pairs | 0 (chain majority vote; verified by eye on 100–107). The front bias is NOT fixed. | 18, 20 |
| 2 | Sleeve/sock stripes straight along vertical limbs, i.e. no wrap | High | 122/646 straight | 49/732 | 19 |
| 3 | Thin trim dropout: a band 1–3 % of V is under 1 px on a 12–15 px torso | High | Hem trim band had 0 px in 141/857 frames | Capacity textures give every band ≥1 texel, and render3 draws an isoline fallback when a band is still lost. Adjacent thin bands now overwrite each other (e.g. Oilers orange/white/orange collapses). | 25, 26 |
| 4 | Crest legibility. The crest zone is 5×4 px (median), at most 8×7. | High (physical limit) | LANCZOS blur | Quantised 6×(aspect) pixel crest. Only colour blobs are readable; the shapes are not. Hand-drawn 6×4 icons are needed for legibility. | 25, 26 |
| 5 | 95-only crosscheck frames (889–904): forearms holding the stick are labelled glove | High (those frames) | — | NOT fixed | 21 |
| 6 | Sleeve L/R in back views put player-right on screen-left | Medium | Wrong on back views | Fixed, with the side derived from the facing. 4 label flips remain in consecutive pairs. | 18 |
| 7 | Torso stripe flat on upright frames (frame 200) | Medium | 107/422 flat | 6/434 (earlier fix); 18/553 nearly straight with the PCA-axis wrap | 17 |
| 8 | Camera angle guess | Medium | 35° guessed | Rink faceoff circles in the rink art measure h/w 0.61–0.63 (37.5–39°). Rink length/width ratio gives 0.667 (≈42°). Now 40°. | — |
| 9 | Torso V non-uniform: EA's yoke zones cover the shoulders, so ~35 % of torso pixels have V<0.2 | Medium | — | NOT fixed. Designs must keep shoulder bands narrow (Oilers yoke 0.16 painted half the torso orange). | 31 |
| 10 | Silhouette-anchored U makes edge columns dominant: 1-texel side piping covers ~2/12 of the torso width (Thrashers looks red-sided) | Medium | — | NOT fixed | 25 |
| 11 | Pants are one region: in 18–20 stride frames a pants stripe can't follow each leg | Medium | 18 | NOT fixed | 24 |
| 12 | Arms crossing in front of the torso (60 frames): stripe continuity breaks at the occlusion | Low | 60 | Unchanged | 23 |
| 13 | Goalie mapping | Medium | Coverage 0.974 | Pads now use knee→toe geodesic UV, and the back-of-mask is swapped to the helmet colour. Catcher and blocker are still a bounding box, and hands are found in only 91/253 frames. | 22, 29 |
| 14 | Temporal jitter of the torso V=0.5 isoline (relative row) | Low | median 0.042, p90 0.169 | median 0.045, p90 0.169: NOT improved | 20 |
| 15 | UV coverage (skaters 0.66) | Info | — | The uncovered part is mostly skin, outline and black gear, by design | — |
