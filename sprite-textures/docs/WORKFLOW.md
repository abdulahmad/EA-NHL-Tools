# Sprite-textures workflow (how to resume)

This is the single entry point. Rulings are D-numbers. The full rulings log is in [`../EXPANDED_ZONES.md`](../EXPANDED_ZONES.md), and the narrative is in [`PROCESS_HISTORY.md`](PROCESS_HISTORY.md).

## The pipeline (canonical, Abdul t1023u)
One shared pipeline (steps 1–8 below) is used by four routes (Abdul t1024u). Every converter, check and editor feature follows these steps, in this order.

**Routes**
| Route | Pre-steps (route-specific) | Gap status |
|---|---|---|
| **R1 95PC → expanded** | none (native PC frames, 38×32 skater / 23×32 goalie layouts) | Most mature: steps 1–3 and 5–7 exist (PC 0-error control, stripe checks). Step 4 edits are not yet used for training; step 8 missing. |
| **R2 94G → expanded** | match to PC poses where they exist; Genesis exclusives use the frozen D169 texture (`exclusive-expansion/`) | Steps 1–3 partial (D173 skeleton, D174/D175 zone rule). Step 5 via D170 re-fit. Steps 6–7 not run on exclusives; step 8 missing. |
| **R3 94S → 94G/95PC art style → expanded** | redraw: scale to 94G proportions, smooth, keep zones connected, verbatim 94G heads (D176–D182, `docs/snes-redraw/`); then the R2 path | Pre-steps partial (it6 family 50%). Steps 1–4 partial (D180 skelcheck, D182 part check and edits wiring). Steps 5–8 not yet run on SNES output. |
| **R4 94S → expanded natively** | none. **No resizing; SNES proportions kept.** Needs an SNES-proportion texture layout. | Missing beyond steps 1–3 (shared skeleton and parts on raw SNES frames). Steps 4–8 not built. |


| # | Step | Status | Where / gap |
|---|------|--------|-------------|
| 1 | **Skeleton fit, validated against colour zones.** Flags: orphan pixels (too far from the skeleton), and skeleton not on pixels. | partial | `skelcheck.py` (D180) checks exist / zone / coverage and nudges joints. Gap: no separate orphan-distance and off-pixel flags in the editor or the sheets. |
| 2 | **Part identification** from colour zones plus skeleton. A part must be valid for both. | partial | `skel.py parts()` (skeleton + family whitelist) and editor `bpViol` (zone side). D182 adds an "arm part missing" flag. Gap: no check that a part sits on its own bone (skeleton side). |
| 3 | **Per-pixel part labels.** | exists | `PT` in the converter; `bp` in the editor Parts view (PR #136). |
| 4 | **Human in the loop.** Review examples with Abdul, or he corrects parts and joints in the editor. Saved `bp`/joint edits feed back into training and refits. | partial | D182: saved editor edits (`editor/edits/*_edits.json`) and reviewed fixes (`docs/snes-redraw/fixes_d182.json`) now override joints and parts in SNES refits (`refs.load_edits`). Gap: edits are not yet used to *train* the skeleton or part models, and not in the PC/Genesis texture refit. |
| 5 | **Map the texture onto the new sprite.** | partial | PC/Genesis: D169–D175 texel maps. Gap: SNES conversions are coloured by a learned colour model, not by mapping the texture. |
| 6 | **Control: round-trip** the original sprite through the texture. It must reproduce the original with 0 errors. | partial | Exists for PC (0-error control). Gap: not run for converted SNES frames or the exclusives. |
| 7 | **Line tests:** detailed vertical and horizontal line textures. Lines must have no kinks. | partial | `scripts/playerlayout/stripe_checks_v5.py` (kink / run / contiguity) on the PC layout. Gap: not on the exclusives or SNES conversions; no horizontal-line texture test. |
| 8 | **Optional: automatic kink adjustment** at the end. | missing | — |

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
- **Launch:** run `python3 sprite-textures/editor/launch.py` (`--sample` for the fixed 5% sample, `--rebuild` to rebuild from your own ROM exports, `--no-browser`). The build writes ONE self-contained file, `editor/data/sprite_editor.html` (sample: `editor/data/sprite_editor_sample.html`; gitignored, it holds game data) with CSS, JS and data inline. Open it straight from disk (file://, no server; Save then downloads `sprite_edits.json`) or through launch.py on 127.0.0.1:8765, where Save writes `editor/edits/`.
- **Committed editor (D188):** Rebuild and recommit both when the data changes: `python3 sprite-textures/editor/launch.py --rebuild` (and `--sample`), then commit `editor/data/sprite_editor.html` and `editor/data/sprite_editor_sample.html` (D188: these two built files are tracked on purpose; the rest of data/ stays ignored).
D190: all editor data is committed (bundles, `out/data/`, `editor/inputs/`). From a fresh clone, rebuild with `python3 sprite-textures/editor/build_bundle.py --from-inputs`, then `skc_sample.py`. No ROM or local assets are needed. A normal build refreshes `editor/inputs/`; commit it along with the bundles.
- **D189:** If the editor shows an orange STALE DATA banner, the open file's data predates the connected-skeleton build. Open `editor/data/sprite_editor.html` from git or rebuild. Every player frame now has both arms drawn on separate px and a hand on the shaft (`skeltree._grip_and_spread`).
- **Views:** Parts (the main view, PR #136), labels, skeleton, texture.
- **Keys:** A/D or the arrow keys go to the previous/next frame. O = labels, J = skeleton, N = skeleton tags (D181, on by default; only H, LH/RH hands, LK/RK knees, LF/RF feet, SHAFT, BLADE; small dark boxed tags placed to avoid overlap; legend under the editor and on the sheets), Z = undo, S = save.
- **Fix queue:** worst frames first, with a live counter.
- **Saving:** edits go to `editor/edits/<kind>_edits.json`.
- **D185 editor (Abdul t1036u item 2):** the editor now uses the NHL9x Studio look (same colours, header, panels and buttons as NHL9XStudio `public/viewer.css`). Redo: the button, Ctrl+Y, Ctrl+Shift+Z or Shift+Z; undo is Ctrl+Z or Z. Every joint has a short code (H NK CH BY PV, LS/RS shoulders, LE/RE elbows, LW/RW wrists, LH/RH hands, LP/RP hips, LK/RK knees, LA/RA ankles, LF/RF feet, BT/HL/TO stick butt/heel/toe; SHAFT and BLADE on the stick bones). All codes are in the legend, and hovering a joint shows its full name. Texture-preview fix: unmapped px now keep the game colour under a light hatch, where they were drawn as black hatch before; the card shows how many px are mapped. Connected skeleton: a hand within 1.5 px of the shaft holds the stick (dashed link). Dragging that hand slides it along the shaft, and dragging a stick joint carries the hand with the shaft (stick first). Alt-drag frees the hand. "Skeleton not one tree" and "stick not held" chips. No stick (K): a per-frame toggle saved with the edits (`nostick`), seeded from `docs/snes-redraw/nostick_d183.json`; it hides the stick joints and bones. Violations only (V): the sprite is greyed and only part/zone conflicts, orphan px (> 3 px from every bone), off-pixel joints and uncovered black (D184 rule) are shown; hovering one gives the part, its allowed zones and the rule.
- **D186 editor (Abdul pt1038u):** three texture dropdowns: Jersey (v2), Goalie equipment, Gloves (glove texels of a v2 texture). The texture preview is composed per part: pipeline-mapped px use their texel; px with no pipeline texel get an approximate per-part box fit (the part's sprite bbox stretched over that material's texel region, learnt from the skater maps; goalie equipment regions from g28export). Goalie body px are dressed from the jersey texture by body part (torso->torso, arms->sleeve, pelvis/thigh->pants, shin->sock, hand->gloves). The card lists jersey / goalie / gloves px and pipeline vs auto counts. Edit view: Scale slider 1-30x (same control as Studio's Scale) plus Ctrl+wheel; Labels opacity slider 0-100 (0 = raw pixels only). Joints, tags and hover use the current scale.
- **D187 (Abdul pt1039u):** frame 407 is a goalie (`scripts/parts.py` GOALIE range started at 408), so it is no longer exported as a skater. The editor is one self-contained HTML file. Every player frame gets one connected skeleton tree (`editor/skeltree.py`, run by build_bundle and skc_sample): head-neck-chest-belly-pelvis, shoulders off the chest, shoulder-elbow-wrist-hand, pelvis-hip-knee-ankle-foot, stick butt-heel-toe hanging off the nearest hand. Missing joints are inferred (interpolated along the chain, else extended, then snapped to a sprite px) and drawn blue; a missing stick is fitted from stick-labelled px, or the frame is flagged no-stick (auto) when it has none.
- **Windows rebuild (D185):** no hard-coded /tmp: derived files go to `tempfile.gettempdir()` (or `SPRITE_CACHE`), and paths use `os.path.join`. `editor/envcheck.py` stops with an install hint when numpy, pillow or scipy is missing (`pip install -r sprite-textures/requirements.txt`). It also stops with the `scripts/dump.js` steps (PowerShell, cmd and bash) when `sprite-textures/out/data` is missing. `dump.js` now prints usage, resolves paths with `path` and creates `out/data`.
- **Wiring (D182):** saved part/skeleton edits now override the SNES refit (`docs/snes-redraw/refs.py load_edits`). They are not yet used for training or for the PC/Genesis refit (pipeline step 4).

## SNES pipeline (D176–D178, D182, `docs/snes-redraw/`)
- **D182 references:** a reference is chosen among same-facing, same-class 94G frames by head clarity and neutrality (`refs.refscore`: no occlusion, upright, compact head, then pose). The head is pasted verbatim from that reference, anchored on the head joint; arm, hand and stick pixels are never overwritten. Pins: S196 → G222 (Abdul).
- **D183 hard fit rules (t1025u–t1032u, all platforms):** (1) *stick first*: shaft+blade fitted as a hard constraint from the stick zone plus collinear black (`limbfit.stickfit`: RANSAC line, longest unbroken run, blade = end farther from the body). (2) *black gate*: every black pixel must lie on a limb or blade bone (`blackcov.classify`); frames with >2 "other" uncovered black are listed, not shown. Exceptions (outline edge, helmet/head, skate/ice shadow, stick shaft, torso numbers) are allowed pending Abdul's ruling. (3) *one tree*: the nearest glove is moved onto the shaft (`limbfit.attach`, `tree_ok`); failures are reported. (4) *no-stick flag*: per frame, auto-detected, stored with the edits (`nostick_d183.json`, editor toggle later); when set, skip the stick fit and the blade rules. **95PC fact:** stick index 136 is also a skin shade (1090/6025 skin px), and the stick contains black. Shape-based stick-first scored worse than the hand skeletons (GT stick coverage 0.69 vs 0.94), so 95PC keeps its hand skeletons.
- **D184 black gate = outline rule b (Abdul t1036u):** uncovered black that borders a labelled part is that part's outline. It converts to the part's darkest shade and passes; the shaft border takes the stick's darkest, and skate/ice black takes the skate's. How the part is found: walk through black (8-connected) to the first labelled pixel. Labelled pixels are the non-black pixels plus the black already on a limb or blade bone, each labelled by its nearest bone. The part touched most wins. Flagged only: black islands that reach no part, or a tie between parts with different colour zones whose bones are also tied (< 0.75 px). Gate: > 2 flagged px fails the frame. Code: `blackcov.gate_b`, run `d184_run.py`. The D183 categories (outline edge, helmet/head, skate/ice shadow, stick shaft, torso) are no longer errors on their own.
- **D182 part preservation:** `stages.partcheck`. Every source part must survive scaling and colouring (≥ 50% of its expected pixels), and an arm part may not be missing on both sides. A failure is a hard red flag and goes into the fix queue; an arm missing on one side only is a review flag.
1. **Stages:** skeleton (19 bones, including the stick shaft and blade) → body part per pixel → scale to 94G proportions (≈ +8% height, +11% width) using skeleton and parts → smooth while keeping zones connected → colour by part and zone.
2. **Heads:** pasted verbatim from 94G/95PC, chosen by facing and score. Held-out animations are excluded from the head library.
3. **Smoothness:** steps of at most 1 px where the source contour is smooth. The jagged-step share is 0.144, against 0.152 for real 94G.
4. **Connectivity:** an automatic check that no contiguous colour zone is split. Any split is repaired.
5. **Same facing:** an 8-way classifier, verified against the reference. The nearest 94G pose is a reference only. **Never warp SNES to it.**
6. **Training:** train on matching pairs. Held-out animations (skatewp, hook, stop, duck) stay unseen. Report joint error, parts accuracy, and exact/family/silhouette agreement for **every iteration**, and state the plateau honestly (see `RULES_D177_D178.md`).

## Facing, constraints, sample (D180)
- **Facing:** taken from the animation tables (`docs/snes-redraw/dirmap.py`); 0 = N, counting clockwise. 94G covers 596/845 frames and 94S 687/976; the classifier is only a flagged fallback. SNES frame numbers diverge from 94G after 224.
- **References:** must have the same table direction and the same sprite class (skater or goalie).
- **Hard skeleton constraints** (`skelcheck.py`: exist, zone, cover) apply in the SNES converter and the editor bundle. Violations are flagged in the fix queue.
- **Sample:** work on the fixed ~5% sample `docs/snes-redraw/sample_d180.json` (`launch.py --sample`) until the method is settled. No full rebuilds.
- **Deep analysis and ranked next steps:** `docs/snes-redraw/ANALYSIS_D180.md`. Top item: the shape/scaling stage (silhouette oracle 68.6% family against 50.3% now).

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
- **Editor:** skeleton parts are tagged with 9 short tags (D181, replaces the D179 long names). Part edits are not wired into the refit yet.
- **Decision for Abdul:** stick on white (how the stick renders over white jersey areas).
- **Decision for Abdul:** the fix-queue threshold.
- **SNES converter:** the plateau is about 50.7% family / 33.9% exact on held-out frames (the previous result was 51.2% / 34.8% on the 71-pair set). The limit is the redraw pose gap, because warping is disallowed. Next ideas: an RF skeleton regressor, more GT from 95PC, and part-aware colouring.

## How to resume
1. `git pull`, then read this file, then the newest D-entries in `EXPANDED_ZONES.md`.
2. Rebuild local data: `editor/launch.py --rebuild`. For SNES, the scripts in `docs/snes-redraw/` read your local extracted ROM data (paths at the top of `common.py`).
3. Pick the next open item, give it a new D-number, and do it on a small branch, with a review sheet and the metrics before and after.
