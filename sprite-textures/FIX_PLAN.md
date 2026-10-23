# FIX_PLAN: per issue, root cause → approach → verification metric

1. **Front/back detection.**
   - Cause: the rule "≥2 crest or skin pixels" is noisy, and neck skin shows in back views.
   - Approach:
     - Done: a majority vote over chains of near-identical frames.
     - Next: read the direction from the SPA animation tables (`frames95pc.asm` lists 8 directions per animation) and map each direction to its facing.
   - Metric: flips in consecutive pairs (0 now); front/back split against the SPA-derived facing; spot-check of the 8 directions by eye.
2. **Limb wrap.**
   - Cause: no curvature term on limbs.
   - Approach: done. Cylinder sag along the PCA axis, scaled by |axis_y|.
   - Metric: straight isolines on vertical limbs (122 → 49).
3. **Thin trim.**
   - Cause: band thickness is below 1 px.
   - Approach:
     - Done: capacity-sized textures (each band ≥1 texel), plus an isoline fallback in the render.
     - Next: merge adjacent sub-pixel bands at authoring time into the dominant colour, choosing by priority.
   - Metric: zero-pixel trim frames; band colour order preserved.
4. **Crest.**
   - Cause: physical capacity is 5×4 to 8×7 px.
   - Approach: next, hand-author a 6×4 pixel-art icon per team (the most important colour only), selected by the crest zone's size.
   - Metric: an eyeball legibility panel at 1×; colour count ≤4.
5. **Crosscheck forearm mislabelled as glove.**
   - Cause: the broken 95 zones.
   - Approach: next, use the arm skeleton (shoulder → hand path along the sleeve/forearm geodesic). Only the last 25 % of the path, beyond the forearm zone, counts as glove.
   - Metric: glove px / arm px ratio in 889–904 matching the 94 skater distribution.
6. **Sleeve sides.**
   - Approach: done, with sides derived from the facing.
   - Next: track arms by centroid continuity inside chains.
   - Metric: label flips in consecutive pairs (4 now → 0).
7. and 8. **Wrap amount.**
   - Approach: ELEV comes from the rink geometry (≈40°).
   - Next: fit ELEV per frame from EA's own drawn arm stripes (147–155), which already include curvature.
   - Metric: residual between the predicted and EA-drawn sleeve stripe arcs.
9. **Torso V distribution.**
   - Approach: next, re-anchor V by arc length along the body axis (geodesic neck → pants) instead of raw zone rows. Keep the zone rows only as soft constraints.
   - Metric: V histogram flatness (KS distance to uniform) across the 8 directions.
10. **Edge-dominant U.**
    - Approach: next, use cylinder U = 0.5 + asin(2s−1)/π, with s the normalised across-axis position, so the edges compress.
    - Metric: texel-to-pixel coverage ratio per U column.
11. **Pants as one region.**
    - Approach: next, split pants into legs by the sock components (Voronoi on the leg axes below the crotch), giving each leg its own U.
    - Metric: the pants stripe stays on the outer seam in stride frames.
12. **Arms over the torso.**
    - Approach: next, layered UV, with the arm drawn over the torso and the torso continued underneath through harmonic inpainting.
    - Metric: torso isoline continuity across the arm.
13. **Goalie gear.**
    - Approach:
      - Done: pad geodesic UV.
      - Next: blocker board orientation from the stick contact, and catcher pocket orientation away from the forearm.
    - Metric: both hands found (91/253 → target >200).
14. **Temporal jitter.**
    - Approach: next, smooth the V anchors along each chain (median of neighbours).
    - Metric: p90 jitter 0.169 → <0.08.
