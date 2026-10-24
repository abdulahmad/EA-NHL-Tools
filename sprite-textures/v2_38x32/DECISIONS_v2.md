# DECISIONS_v2 (to be transferred to EXPANDED_ZONES.md)
- D1 2026-10-23: The control-diff harness (ctrl.py) is the acceptance test: 5 teams x 11 frames, 0 px diff, 0 occupancy diff. Before the fix it was 132/155/171/171/155 px.
- D2: Packing groups by (zone,row,family), not (zone,row). Reason: all mismatches before the fix were family slips (pants stripes, yoke corner, shoulder patch). After the fix: 0 on all 55 team-frames.
- D3 (Abdul's rule): fewer pixels than texels means a contiguous block centred in the row, offset (n-m)//2, with the outer columns dropped first. This replaced the min-|ds| best-fit offset. Anthem 897 uses 234 texels (was 242).
- D4: The back pants have no 'pants stripe 2' texel, because wide col 74 (old 53, a duplicate of old 29) was dropped. Back-pants stripe-2 pixels (row 17, 3 groups, 3 px in frames 57/72/42) therefore wrap to the front-half stripe-2 texel on the same row (v2 col 3). The panel physically wraps there, so this is the same texel the game duplicated. The verifier reports these as 3 'wrong_zone' px; this is intentional.
- D5: Fallback order for a missing family: same row, then nearest row ±1..3 in the zone, then the pants wrap. Only D4 was triggered.
- D6: Crest (idx), skin and gear texels are direct-mapped and are never targets for ordinary pixels.
- D7: Overflow (more pixels than texels) is unchanged: stretch evenly from the centre.
