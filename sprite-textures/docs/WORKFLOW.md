# Sprite-textures workflow (how to resume)

This is the single entry point. Rulings are D-numbers. The full rulings log is in [`../EXPANDED_ZONES.md`](../EXPANDED_ZONES.md), and the narrative is in [`PROCESS_HISTORY.md`](PROCESS_HISTORY.md).

## Roadmap
1. **Expand the PC sprites.** Give every NHL95 PC frame an editable texel map and a 0-error control (the 38×32 skater layout, the 23×32 goalie layout).
2. **Add the Genesis frames missing from PC.** These are the Genesis exclusives (93G/94G). Expand them against the frozen D169 texture (see `exclusive-expansion/`).
3. **Convert the SNES exclusives** to the 94G style (see [`../../docs/snes-redraw/`](../../docs/snes-redraw/)).
4. **Expand the SNES sprites** (stretch goal).
5. **End-goal builds:** ROM/PC builds whose sprites are rendered from the editable textures for any team.
6. **SNES redraw goal:** every SNES frame redrawn in 94G proportions and style, with verbatim heads, same facing and no warping.

## Texture pipeline (D169–D175)
- **D169 straight bands.** Every row band (head / sleeve / torso / legs zone) takes the majority Genesis family. A column keeps its own family only if it disagrees strongly (only the navy yoke, cols 4 and 15). The texture is frozen as `texture_key_D169.json`.
- **D170 re-fit.** Each pixel is placed in its part's zone and moved to the nearest texel of its own family (column kept, row snapped first). **Pixels are never relabelled.**
- **D171/D172 warps.** One smooth affine per part segment, then per bone segment. **Outline ruling (b):** a black pixel whose body neighbours are mostly not black is an outline of their family (darkest shade). Black inside black areas (gloves, skates) stays black.
- **D173 joint + warp fit.** A 19-bone skeleton for the exclusives (the PC prior plus snapping, including the stick butt/heel/toe), then a skeleton-driven per-bone warp.
- **D174/D175 zone and part rule, shade groups collapsed.** Shading is not a zone: white 43/44/45 counts as 44, navy 40/41/42 as 42, pants 35/36/37 as 36, skin 38/39 as 39. Black 33 and 34 stay separate.
- **No snapping to fake results.** Snapping may only move a texel *choice*. It must never change the colour of a game pixel, and no frame is relabelled to reach 0.

## Editor
- **Launch:** run `python3 sprite-textures/editor/launch.py`. Use `--rebuild` to rebuild `editor/data/bundle.js` from your own ROM exports (gitignored), and `--no-browser` to skip opening a browser. It serves on 127.0.0.1:8765.
- **Views:** Parts (the main view, PR #136), labels, skeleton, texture.
- **Keys:** A/D or the arrow keys go to the previous/next frame. O = labels, J = skeleton, N = skeleton part names (D179, on by default in both views; yellow = bone, white = joint; dark halo, placed to avoid overlap), Z = undo, S = save.
- **Fix queue:** worst frames first, with a live counter.
- **Saving:** edits go to `editor/edits/<kind>_edits.json`.
- **Not yet wired:** part/skeleton edits are saved but are **not yet fed back into the refit**.

## SNES pipeline (D176–D178, `docs/snes-redraw/`)
1. **Stages:** skeleton (19 bones, including the stick shaft and blade) → body part per pixel → scale to 94G proportions (≈ +8% height, +11% width) using skeleton and parts → smooth while keeping zones connected → colour by part and zone.
2. **Heads:** pasted verbatim from 94G/95PC, chosen by facing and score. Held-out animations are excluded from the head library.
3. **Smoothness:** steps of at most 1 px where the source contour is smooth. The jagged-step share is 0.144, against 0.152 for real 94G.
4. **Connectivity:** an automatic check that no contiguous colour zone is split. Any split is repaired.
5. **Same facing:** an 8-way classifier, verified against the reference. The nearest 94G pose is a reference only. **Never warp SNES to it.**
6. **Training:** train on matching pairs. Held-out animations (skatewp, hook, stop, duck) stay unseen. Report joint error, parts accuracy, and exact/family/silhouette agreement for **every iteration**, and state the plateau honestly (see `RULES_D177_D178.md`).

## Image and sheet conventions
- Skeleton columns use the editor's part names (`docs/snes-redraw/skel_labels.py`).
- At most 1000 px wide, with big labels, column headings centred over their columns, and a legend on every sheet.
- High contrast and colour-blind safe: no red next to green, and errors ringed in yellow.
- Show the texture used beside every texture preview.
- Look at every image before sending it.
- Images are never committed (no ROMs, no game data, no renders).

## PR rules
- One job at a time. Keep PRs small, one D-number per change, and merge normally.
- Never force-push. After each merge, verify with `git ls-remote origin main`.
- Report times in EDT, and report results honestly, including when something got worse.

## Status and open items (Oct 25, 2026)
- **D175:** about 800 pixels are in the wrong zone and still need fixing.
- **PC frames:** 601 have not yet been checked in the editor queue.
- **95PC analysis:** not done yet. 95PC is also a source of verbatim heads.
- **Goalie exclusives:** not expanded yet.
- **Editor:** skeleton parts are labelled (D179). Part edits are not wired into the refit yet.
- **Decision for Abdul:** stick on white (how the stick renders over white jersey areas).
- **Decision for Abdul:** the fix-queue threshold.
- **SNES converter:** the plateau is about 50.7% family / 33.9% exact on held-out frames (the previous result was 51.2% / 34.8% on the 71-pair set). The limit is the redraw pose gap, because warping is disallowed. Next ideas: an RF skeleton regressor, more GT from 95PC, and part-aware colouring.

## How to resume
1. `git pull`, then read this file, then the newest D-entries in `EXPANDED_ZONES.md`.
2. Rebuild local data: `editor/launch.py --rebuild`. For SNES, the scripts in `docs/snes-redraw/` read your local extracted ROM data (paths at the top of `common.py`).
3. Pick the next open item, give it a new D-number, and do it on a small branch, with a review sheet and the metrics before and after.
