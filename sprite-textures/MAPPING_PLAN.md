# Sprite mapping plan: posed-3D, per-segment, per-pixel (texture coordinate + shade)

Status: PLAN ONLY, nothing implemented yet. Pixels are square everywhere; there is no aspect compensation.
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
| 95-only frames 889–904 (crosscheck): forearms labelled glove; goalie hands found in only 91/253 frames | Zone indices are shared/reused and wrong in places | Zone indices are evidence, never truth. Segmentation must be reviewable and overridable |
| Goalie gear used bounding-box UV | No gear geometry | Gear gets its own simple 3D proxies (slabs and shells), not boxes |

## 1. Frame structure to exploit
- **Group frames into animation × direction × phase.**
  - Parse the SPA animation scripts (HOCKEY.EXE table at 0x110471, already documented in `Sprite-Viewer/data/frames95pc.asm`).
  - This gives each frame (anim, dir d0..d7, phase). d0 = north (back to camera), clockwise.
  - Where the scripts don't cover a frame (UI, ref, extras), fall back to a manual table.
- **Directional consistency.**
  - Within one (anim, phase), the 8 directions are the same 3D pose viewed with body yaw = dir×45° (plus small per-direction art fixes).
  - So annotate the pose once per (anim, phase), as a 3D pose with joint angles. Each direction then only needs a residual 2D correction.
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

## 4. Pose estimation: manual keyframes plus propagation
Fully automatic 2D pose estimation on 20–40 px sprites is unreliable, and errors here are exactly the flicker and L/R bugs we already have. So:

- **Annotation tool:**
  - Small and local: Python with a tiny web/Tk UI, or a page in Sprite-Viewer.
  - Shows a frame at 8–12× plus its neighbours and the other 7 directions.
  - The user clicks 2D keypoints: head top, neck, pelvis, shoulders, elbows, wrists, hips, knees, ankles, stick butt and blade.
  - Each keypoint gets a front/back (depth-order) toggle. Each limb pair gets an L/R tag.
- **Lifting to 3D:**
  - Bone lengths are known (section 2) and the camera is known.
  - Each bone's 2D projection fixes its 3D direction up to a depth-sign ambiguity. The front/back toggle and joint limits resolve it.
  - Solve for joint angles with a small least-squares fit: reprojection error + joint limits + smoothness.
- **Propagation:**
  - Annotate the d0 or d2 frame of each (anim, phase) key. Predict the other directions by yawing the 3D pose, then fit only the residual to the silhouette.
  - The residual fit maximises silhouette IoU and the rig-label/zone agreement.
  - Phases between keys are interpolated, then refined the same way.
- **Workload estimate:**
  - About 140 pose keys at about 1–2 min each, so about 3–5 h of clicking.
  - Plus review of the frames the propagation flags (expected 10–20 %).
  - Goalie (about 250 frames) and the 95-only sets are likely the bulk of the corrections.
- **Automatic help where it is safe:** the silhouette skeleton (medial axis) and the zone colours suggest keypoint positions for the user to accept.

## 5. Per-pixel texture coordinate
Each sprite pixel is mapped to (segment, face, u, v) by ray-casting the posed rig through the pixel centre.
- **Cylinders and limbs** (upper arm, forearm, thigh, shin, torso segments):
  - u = angle around the bone axis, measured from the segment's own front direction. u ∈ [0,1) wraps.
  - The texture's front half is used when the hit normal faces the camera side of the body front. The back half (the separate *_b textures for sleeves and socks) is used otherwise.
  - v = arc length along the bone, continuous across the joint between the two torso segments, so stripes stay straight on the body and bend only where the body bends.
  - Square-pixel orthographic projection means the foreshortening comes out naturally. A stripe that is 1 texel tall on the body is about 1 px on screen when the limb is side-on, and thinner when it points at the camera.
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

## 7. Shading
- The game's zone indices already carry light/medium/dark per region. Keep the original zone shade per pixel as the shading term; the shade factors are the current `shade_of`.
- **Option B (later):** compute N·L from the rig (light from the upper left, matching the EA art) and blend it with the zone shade where the zones are unreliable.
- **Output per pixel:** texture colour × shade, then snapped to the target palette (6-bit VGA or the custom build's palette).
- Palette budgeting per team is a separate later step.

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
1. **M0 (data):**
   - Parse the SPA scripts into the (anim, dir, phase) table.
   - Detect mirrored directions.
   - Measure rig proportions on about 10 clean frames.
2. **M1 (pilot, about 40 frames):**
   - Skating stride (all 8 dirs, 2–3 phases), goalie ready 407–428 (front and back masks, blocker, catcher), crosscheck 889–904.
   - Build the annotation tool, annotate, lift to 3D, render UV/checker sheets.
   - Go/no-go review with Abdul.
3. **M2:** propagation across directions and phases for the pilot animations, plus the metrics. Tune the residual fit.
4. **M3:** all skater animations, then goalies, then 95-only sets (boards, shotblock, goalie95), then extras/ref (ref only if wanted).
5. **M4:** shading pass, palette snap, per-team batch export, and the regression suite in CI (scripts only; renders stay local because they are retail-derived).

## 12. Open questions for Abdul
1. Is manual keyframe clicking (about 3–5 h, plus review) acceptable, or do you want more automation and accept more review?
2. Should shading keep the original zone light/medium/dark (faithful), or move to rig-based N·L (smoother, but less like EA's art)?
3. Should the outline index 0 always stay as drawn, or should texture colours override it in places (e.g. the mask cage)?
4. What is the target palette for the custom build: 6-bit VGA per team (as now), or a larger palette?
5. Should referee, UI and celebration frames get mapping too, or only skaters and goalies?
6. What is the crest policy at 5×4–8×7 px: hand-drawn per-team icons, or measured blobs?
