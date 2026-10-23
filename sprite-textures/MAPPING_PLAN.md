# Sprite mapping plan: posed-3D, per-segment, per-pixel (texture coordinate + shade)

Status: PLAN ONLY, nothing implemented yet. **No implementation starts until Abdul has reviewed and approved this plan.** Pixels are square everywhere; there is no aspect compensation.

**Decisions from Abdul (2026-10-23), which override anything below:**
1. **Pose estimation is automatic.** There is no manual keypoint clicking or review pass, at most small exception queues (§4).
2. **Shading** keeps the original colour-zone light/medium/dark. There is no rig lighting (§7).
3. **Black outlines:** undecided. A comparison of 3 treatments is rendered locally (§6b).
4. **No palette.** Outputs are RGB textures and colours. The 6-bit VGA snap used in v4–v12 stops from here on.
5. **Scope:** every PLAYER sprite (skaters and goalies, including player celebrations, the Cup, bench, line change, boards, shot block). Referee, UI, arrows, puck, net, glass and siren frames are excluded.
6. **Crests:** the first pass is resampled from the input texture (the photo) and hand-refined later.
Inputs are the textures in `textures/v12` (gear) and `textures/v7` (jerseys), plus the 1134 NHL 95 PC frames (`data/frames.bin`, `frames.json` = [n,w,h,offset,anchorX,anchorY]).

## 0. What the current pipeline got wrong, and the lessons
Sources: AUDIT.md, FINDINGS.md, FIX_RESULTS_V4–V10.

| Problem today | Root cause | Lesson for the new design |
|---|---|---|
| Front/back flicker and front bias (785 front vs 144 back torsos) | Facing is guessed per frame from the 2D zone layout | Facing must come from a pose that is consistent across the animation and the 8 directions, never from one frame alone |
| L/R sleeves swapped in back views | Side picked by screen position | Each limb gets a fixed anatomical identity (player-left/right), carried by the skeleton |
| Thin trim dropout; flat stripes on upright frames; non-uniform torso V (the yoke zones cover ~35 % of the torso) | V comes from a harmonic fill between silhouette edges | V must come from 3D arc length along the body, not from where the zones end |
| 1-texel side piping covers ~2/12 of the torso width | U is anchored to the silhouette | U must be a cylinder angle: edge columns are foreshortened (cos falloff), so piping naturally shrinks to almost nothing |
| Pants are one region; arms crossing the torso break stripes | No per-limb segmentation and no depth order | Segment per limb, and build an explicit depth order between segments |
| 95-only frames 889–904 (crosscheck): forearms labelled glove; goalie hands found in only 91/253 frames | Zone indices are shared/reused and wrong in places | Zone indices are evidence, never truth. The solver weighs them as soft votes (§4.1) |
| Goalie gear used bounding-box UV | No gear geometry | Gear gets its own simple 3D proxies (slabs and shells), not boxes |

## 1. Frame structure to exploit
- **Group frames into animation × direction × phase.**
  - Parse the SPA animation scripts (HOCKEY.EXE table at 0x110471, already documented in `Sprite-Viewer/data/frames95pc.asm`).
  - This gives each frame (anim, dir d0..d7, phase). d0 = north (back to camera), clockwise.
  - Where the scripts don't cover a frame (UI, ref, extras), assign by hash-matching to scripted frames, or solve as single-frame groups (refs and UI are out of scope anyway).
- **Directional consistency.**
  - Within one (anim, phase), the 8 directions are the same 3D pose viewed with body yaw = dir×45° (plus small per-direction art fixes).
  - So solve ONE 3D pose per (anim, phase), jointly over its directions (§4).
  - This is the main lever that turns about 1134 frames into roughly 1134/8 ≈ 140 pose keys, fewer still because some poses repeat.
- **Temporal consistency.**
  - Joint angles across the phases of one animation are smooth or periodic (strides).
  - Interpolate keyframes and flag any frame whose residual jumps.
- **Mirror pairs.** Check whether directions d1/d7, d2/d6 and d3/d5 are pixel mirrors (some EA sets are). Where they are, the 3D pose is the mirrored one *with L/R swapped*, which matters for asymmetric sleeves (Thrashers L/R).

## 2. Body model and camera
- **Rig:** a simple articulated rig (about 15 bones) made of capsules, tapered cylinders and boxes, each with radii:
  - pelvis
  - lower back and upper back (two torso segments, so bends and leans fold correctly)
  - neck and head (helmet/mask ellipsoid)
  - per side: upper arm, forearm, hand (glove or catcher/blocker), thigh, shin, skate
  - stick (rigid, parented to one or both hands)
- **Goalie extras:**
  - pads: thick slabs over shin+thigh, with front and back faces
  - blocker: a thin slab on one hand
  - catcher: a cupped shell on the other hand
  - mask: a front shell plus a back shell on the head (mask_b)
- **Camera:**
  - orthographic, elevation 40° (measured 37.5–42° from the rink art, AUDIT #8), square pixels
  - scale fixed per sprite set from the standing height in pixels; anchor = the game draw anchor (feet)
- **Proportions:** fit once from a few clean upright frames in each direction (torso height, limb lengths, girths in pixels). Goalies get a separate proportion set.

## 3. Segmentation (per-pixel body-part labels)
1. **Seed:** the existing `parts.py` labels plus the zone indices (`zn.json` light/medium/dark per region).
2. **Model-driven relabel:** rasterise the posed rig (section 4) to get, per pixel, the segment id and its depth. Label each sprite pixel with the front-most rig segment whose (slightly dilated) projection covers it.
3. **Agreement check per pixel:**
   - the zone index colour family must agree with the segment (sleeve zones on arms, sock zones on shins, and so on)
   - outline index 0 stays outline
   - black gloves/skates/tape are split by the rig, not by colour
4. **Disagreements are reported, not silently fixed.**
   - Classes: zone says sleeve but rig says torso, and the reverse; pixels nobody claims.
   - High-disagreement frames (expected: 889–904 and goalie95) go to the review queue.
5. **Validation:**
   - hand-label about 30 pilot frames fully in the tool and report per-segment IoU (target ≥ 0.9 on limbs, 0.95 on torso)
   - also report the share of pixels where zone and rig disagree, per animation

## 4. Pose estimation: automatic (analysis by synthesis)
No clicking. Each frame's pose is the rig configuration that, rendered through the known camera, best explains everything the sprite tells us. Robustness comes from solving many frames jointly with strong shared constraints, not from fitting each frame alone.

**4.1 Evidence per frame (precomputed, all square-pixel):**
- **Silhouette and parts.**
  - The sprite silhouette, plus its distance transform.
  - Zone evidence maps from `zn.json`, one per family (jersey/torso, sleeve/forearm, pants, sock, helmet/skin, stick 136, skate blade, goalie-gear indices). Each pixel is a soft vote, not a label.
  - Outline index 0 marks part boundaries. Interior outline strokes are strong evidence for limb edges and overlaps.
- **Shade direction.** Within each zone, the light/medium/dark gradient gives the surface normal's rough direction. This separates chest from back (the lit side flips) and the near limb from the far one.
- **Medial axis.** The skeletonised silhouette and each zone blob's principal axis give rough bone directions.

**4.2 Model:** the rig from §2, with per-sprite-set proportions. Per frame the unknowns are the root position and yaw, plus about 30 joint angles and the stick (2 hand grips or 1).

**4.3 Objective (differentiable soft rasteriser, or render-and-compare with a Gauss-Newton / CMA-ES fallback):**
- **Silhouette term:** IoU plus a chamfer distance between the rendered and sprite outlines.
- **Part term:** cross-entropy between each rendered segment and the zone votes (sleeve on arms, sock on shins, and so on).
- **Shade term:** sign agreement between the rendered N·(view-side) and the zone light/dark order.
- **Outline term:** rendered depth discontinuities should land on interior index-0 strokes.
- **Priors:** joint limits, symmetry of bone lengths, and a skating-pose prior (a small PCA/GMM over joint angles, learned from the solved frames of the first pass and then re-fitted).

**4.4 Shared constraints (the key to robustness):**
- **Grouping.** Parse the SPA animation scripts into (anim, dir, phase).
  - All 8 directions of one (anim, phase) share ONE 3D pose: yaw = dir×45° plus a small per-direction residual, penalised in the objective.
  - These 8 frames are solved jointly, so a pose that is ambiguous in one view (front vs back, which arm is near) is pinned by the other 7.
- **Mirrored directions.** Where d1/d7, d2/d6, d3/d5 are pixel mirrors (checked automatically), they are tied with an explicit L/R swap.
- **Time.** Joint angles across phases are smooth (or periodic for cyclic animations such as the stride). The solve uses a smoothness penalty over each animation, and a joint optimisation over (8 directions × phases).
- **Reuse.** The same picture used in several animations (identical pixels, detected by hash) gets one pose.

**4.5 Solving strategy:**
1. **Initialise.** Each (anim, phase) starts from a library of canonical poses (upright, stride, crouch, shoot, check, goalie ready, butterfly, sprawl). The silhouette's principal axes and the zone blobs pick the best few seeds.
2. **Coarse.** A multi-start solve on the 8-direction bundle (root, yaw, torso bend, limb directions only).
3. **Fine.** All joints, then temporal smoothing over the animation, then a final joint refine.
4. **Ambiguity handling.** Keep the top-2 hypotheses where scores are close (front/back of torso or head, near/far limb). Resolve them with the bundle and time terms; never with a per-frame coin flip.

**4.6 Self-consistency checks (automatic, these drive the exception queue):**
- Silhouette IoU below 0.9, or part agreement below 0.8.
- Direction-bundle residual yaw above 15°.
- A temporal joint-angle jump above 3σ of that animation.
- Front/back of torso or head flipping within a run without a matching yaw change.
- L/R swaps between neighbours.
- Hypothesis margin below a threshold.

Frames that fail are re-solved with the neighbours' poses as initialisation. Only the remainder (target under 3 % of player frames, expected around crosscheck 889–904, sprawls and dives) goes to the exception queue. Each queued frame gets an automatic best guess plus a picker over the top-2 hypotheses, which takes a few seconds per frame. Hand-placing keypoints is the last resort.

**4.7 Bootstrapping without ground truth:**
- **Synthetic sanity.** Render the rig in known poses into the game's zone vocabulary at sprite resolution, then re-solve. This measures the solver's error directly (target joint error under 1 px, 100 % correct front/back).
- **Pilot spot-check.** Abdul looks at UV/checker sheets of the pilot animations; nobody labels anything.

## 5. Per-pixel texture coordinate
Each sprite pixel is mapped to (segment, face, u, v) by ray-casting the posed rig through the pixel centre.
- **Cylinders and limbs** (upper arm, forearm, thigh, shin, torso segments):
  - u = angle around the bone axis, measured from the segment's own front direction. u ∈ [0,1) wraps.
  - The texture's front half is used when the hit normal faces the camera side of the body front. The back half (the separate *_b textures for sleeves and socks) is used otherwise.
  - v = arc length along the bone, continuous across the joint between the two torso segments, so stripes stay straight on the body and bend only where the body bends.
  - Square-pixel orthographic projection means the foreshortening comes out naturally. A stripe that is 1 texel tall on the body is about 1 px on screen when the limb is side-on, and thinner when it points at the camera.
- **Crest (decision 6):** the first pass is resampled from the reference photo crop into the crest's body-space rectangle, and hand-refined later.
- **Torso:**
  - Torso front/back come from the hit normal against the chest direction, not from per-frame guesses.
  - The crest is placed in body coordinates on the chest, so it rotates and foreshortens with the torso.
  - Collar/yoke bands follow the shoulder line.
  - L/R sleeves use anatomical identity.
- **Stick:** a 1-wide strip along the stick polyline, butt to blade. v = arc length; the blade sections use tape colours.
- **Head:**
  - Helmet ellipsoid, or for goalies the mask front shell and the mask_b back shell.
  - Front/back is picked by the head yaw (the angle between the facing direction and the camera). This is the key place the 5x6 mask_b and the 6x7 mask matter.
- **Goalie gear:**
  - pads: front face (pad texture) vs back/strap face (pad_b), chosen by the face normal
  - blocker/catcher: planar u,v on the slab or shell, oriented by the hand/forearm bone
- **Bleed and alpha (v12):**
  - Curved gear textures (mask, mask_b, blocker, catcher, gloves) have their background cells filled with the nearest gear texel.
  - The original shape is kept in `*_alpha.png`.
  - The mapper may sample bleed texels at silhouette edges, where the sprite pixel exists but the proxy hit lands just outside the true gear outline. This avoids background colour or black fringes.
  - The alpha tells it whether that happened, for metrics and for optional shading of rim pixels.
- **Sub-pixel accuracy:** cast 4 sub-samples per pixel and take the majority segment and face. For colour, take the texel under the centre, so there is no blur (the art stays pixel-crisp).

## 6. Occlusion and depth order
- A z-buffer from the rig handles arm-over-torso, stick in front of or behind legs, and crossing legs.
- The original sprite's outline index 0 between overlapping parts is kept: it is drawn ink and stays.
- Where an arm is in front of the torso, the torso stripe continues behind the arm.
- Per frame, the depth order is checked against the zone evidence. For example, sleeve zone pixels inside the torso outline mean the arm is in front.

## 6b. Black outlines (open, comparison rendered)
`local_outline_compare*.png` (local, retail-derived) shows the current mapping in 3 ways on pilot frames 1, 9, 17, 25, 13, 221, 343, 889 (skaters, Thrashers home) and 407, 416, 419, 428 (goalie, Fuhr gear):
- **A:** original black outlines kept.
- **B:** outline pixels replaced by the nearest texture colour.
- **C:** like B, darkened ×0.55.

Only pixels labelled outline are affected. Black gloves, skates and tape (also index 0) are untouched. The mapper will support all three per pixel class (exterior silhouette vs interior part boundary) until Abdul picks one.

## 7. Shading (decided: original zones)
- The shade comes only from the original colour zones: each sprite pixel's light/medium/dark factor (`shade_of`, from `zn.json`) multiplies the texture RGB.
- No rig lighting.
- Output is RGB with no palette snap (decision 4). Gear and jersey textures from v4–v12 were VGA-snapped. New texture builds will drop `M.vga` and keep the measured RGB medians.

## 8. Left/right and asymmetric designs
- L/R is anatomical (player-left/right), stored on the rig.
- Asymmetric designs (Thrashers sleeves, blocker vs catcher hand) follow the anatomical side, never the screen side.
- Mirrored-direction sprites swap L/R explicitly.

## 9. Stripe continuity and temporal stability
- **Metrics per animation (from v):**
  - Stripe row position along each segment (in texels), tracked across phases.
  - Report the jitter: median and p90 frame-to-frame Δ in body coordinates. Target: p90 < 0.5 texel, versus the current 0.169 relative ≈ 2 px.
  - Front/back flips per animation run (target 0, except real turns).
  - Number of thin bands lost (target 0; render a 1-px isoline fallback only when unavoidable, and log it).

## 10. Verification
- **Visual sheets:**
  - Every animation × 8 directions, with columns centred on the draw anchor and rows sharing the feet line (the existing `anchored`).
  - Panels: orig | segment labels | UV checker | candy-cane | team render.
  - Pilot sheets come first.
- **Numbers:**
  - Segmentation IoU vs hand labels.
  - Silhouette IoU of the rig vs the sprite (target > 0.9).
  - Zone/rig disagreement %.
  - Stripe jitter, flip count, band survival.
  - Coverage (pixels with a UV / non-skin, non-outline pixels).
- **Regression:** the frames from AUDIT (100–107, 200, 889–904, 407–428 and the goalie95 samples) are fixed checks in every run.

## 11. Milestones
0. **POC: proof of concept on a few frames (before the pilot).**
   - Run the automatic fit (§4) and texture mapping on about 5 frames:
     - skater stride d0 (back view)
     - skater stride d2 (side view)
     - a Cup or anthem frame (358–359 / 370–372)
     - goalie ready 407
     - crosscheck 889
   - Deliverables, all local because they are retail-derived:
     - per-frame sheets with centred columns: sprite | fitted rig overlay | UV checker | textured result (outline variants A/B/C)
     - fit metrics
   - **REVIEW GATE:** Abdul must approve the POC before anything is scaled up (M0 data tooling beyond what the POC needs, M1 pilot and later).
1. **M0 (data):**
   - Parse the SPA scripts into the (anim, dir, phase) table.
   - Detect mirrored directions.
   - Measure rig proportions on about 10 clean frames.
2. **M1 (pilot, about 40 frames):**
   - Skating stride (all 8 dirs, 2–3 phases), goalie ready 407–428 (front and back masks, blocker, catcher), crosscheck 889–904.
   - Build the automatic solver (§4), validate it on synthetic renders, then solve the pilot animations and render UV/checker sheets.
   - Go/no-go review with Abdul.
3. **M2:** propagation across directions and phases for the pilot animations, plus the metrics. Tune the residual fit.
4. **M3:** all skater animations, then goalies, then 95-only sets (boards, shotblock, goalie95), then the player extras (cup, faceoff, anthem, line change, bench, benchcheck, cheer, swat/hook/wobble/flip/injury). Ref and UI frames are excluded.
5. **M4:** zone-shading pass (RGB, no palette), per-team batch export, and the regression suite in CI (scripts only; renders stay local because they are retail-derived).

## 12. Open questions for Abdul
1. **Outlines:** A, B or C (see `local_outline_compare*.png`), or different rules for exterior silhouette and interior boundaries?
2. **Exception queue:** is a top-2 hypothesis picker (a few seconds per frame, target under 3 % of frames) acceptable as the only manual step?
3. **Goalie pose prior:** the goalie animations differ a lot from skaters. Should goalies be solved as a separate pass after skaters, so the skater prior isn't polluted?

## 13. Update 2026-10-23: per-pixel map (PoC2)
After PoC1 (fractional UV into a 512² atlas) missed ~20 % of pixels on 897/42, the texture was redesigned as a **per-pixel map**. Each texel row is one sprite-pixel band row of a game colour zone, and each column is one pixel around the body. Front and back halves are separate, and left/right limbs swap in back views. The layout is 225×46, sized from all 596 skater frames. See `PER_PIXEL_MAP.md`. v3: waist 1/2/3 aligned (shared columns, waist 1 merged), 225×54, all 11 test frames still diff 0; Chicago/Montreal rendered.
- Results: 370/889/897 diff 0. Skate d0–d7 frames miss only zones absent from the 370/889 sources (waist 1 hidden; pants stripe 1/2 per half), 1–8 px each, with evidence. With skate frames 43+58 added as sources, all 11 test frames diff 0 for both teams.
- Policy change: game-derived renders/textures may be committed (in `perpixel/`); ROMs and original game files still may not.

## 14. Expanded sub-zones (staged)
Every 370 pixel becomes its own colour sub-zone; other frames get a sub-zone map. Stage 1 (front torso) done — see
[EXPANDED_ZONES.md](EXPANDED_ZONES.md): 84 sub-zones, 0 diff on 370/897/57/62/67 and front halves of 52/72. Next stages
(back torso, then arms one at a time, pants, socks, helmet) pending review. Stage 1b: rectangular rows, strict 1:1 with texture expansion (18×17, 141 texels), 0 diff and 0 duplicates on all 11 test frames, 4 teams.
