# PLAN v2 — per-pixel UV + shade sprites for NHL Classic

Target: Abdul's engine (NHL Classic), true colour, no retail palette limits. (The v1 files in /workspace/out/zones/ were wiped from the box before this round; v2 is self-contained and regenerates everything from the retail ISO via `node dump.js`.)

## Data model (per frame)
| layer | type | meaning |
|---|---|---|
| `part` | u8 | id in a canonical part table (torso, sleeve L/R, pants, sock L/R, helmet, skin, glove, skate, blade, stick, goalie_mask, catcher, blocker, pad, crest, outline, shadow…) |
| `uv` | 2× u16 / float | coordinate inside that part's region of the **reference texture** (atlas) |
| `shade` | u8 / float | per-pixel shading multiplier (continuous, not 3 levels). Initial version derived from the original light/med/dark zone; artist-paintable |
| `flags` | u8 | trusted / auto / hand-fixed / broken-source |
Final pixel = `atlas[part.region](u,v) × shade`, with optional **vector features** (stripes defined as V-isolines with a fixed screen thickness, so a 1px stripe stays 1px in every frame).

Files: one RGBA16 PNG per frame (R=part, G=shade, B=U, A=V) + `parts.json` + `atlas.png` (team design) + `features.json` (stripes: region, v, thickness_px, colour).

## Pipeline
1. **Part segmentation** (parts.py): zone indices give evidence. Geometry decides the ambiguous cases: black index 0 → glove/skate/stick by connected component + which zones it touches. Goalie gear (it reuses arm/sock zones): pads = gear components below the pants median; hands = arm-zone pixels far from the torso by geodesic distance, blocker if touching the stick, else catcher; mask = 164 grown into the adjacent cage/helmet pixels.
2. **UV** (uv.py): harmonic (Laplace) interpolation inside each part, anchored on existing zone isolines.
   - Torso V: neck=0, yoke=0.12, waist 1/2/3 = 0.80/0.87/0.94, pants border=1.
   - Sleeve V: torso border=0, arm stripe 1/2/3 = 0.45/0.55/0.65, glove border=1.
   - Sock V: pants border=0, stripe 1/2 = 0.45/0.65, skate=1.
   - U: silhouette edges on each side of the local body axis, set 0/1 and interpolated.
   - Front/back: crest or skin visible.
   Because the anchors are the drawn stripes, the coordinates bend with the body.
3. **Atlas sampling + shade**, plus isoline features for stripes.
4. **Fix-up tool in Studio**: paint part, nudge anchors/isolines, copy labels from neighbouring frames and the same pose in other directions, flag broken frames.
5. **Validation**:
   - Re-rendering with the original team colours must reproduce the original (lossless).
   - Checker squares should keep a consistent size frame to frame.
   - Stripe thickness should be constant (measurable).
   - Contact sheets for every animation.

## Milestones
- **M1 (first step Abdul asked for): equipment zones.** Separate glove, goalie mask, catcher, blocker and pads.
  - Auto pass done for all frames.
  - Next: fix-up UI plus a manual pass on goalie frames, ~250 frames, about 6–12 h.
- **M2: UV v1 for skaters (frames 1–352) and the 95 skater additions.**
  - Auto pass is working.
  - Remaining work, ~1–2 weeks:
    - left/right arm identity across directions
    - occluded arm crossing the torso
    - pants split into two legs
    - temporal smoothing
- **M3: broken 95-only frames.** Infer parts and UV from geometry and neighbouring/94 frames instead of their indices; mostly manual, ~1 week.
- **M4: goalie UV** (pads/blocker/catcher templates), ~1–2 weeks.
- **M5: NHL Classic renderer** (part/uv/shade → RGB, isoline stripes), plus Studio atlas/team designer.
- **M6: Genesis/SNES superset.** Map their frames to PC frames; redraw the exclusives with the same layers.
