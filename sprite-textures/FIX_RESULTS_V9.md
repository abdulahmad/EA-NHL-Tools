# v9: goalie mask back (`mask_b`)

New texture: `textures/v9/tex_gear_mask_b.png`. It is 7x6, the same capacity as the front `goalie_mask`. All other v8 gear is unchanged.

## Reference
Of the 7 Fuhr attachments (`01M5MRF*`), only `01M5MRFQ67SC2AWJK05N1EM5SV.jpg` (128x128) shows the back of the helmet. It shows a navy shell, a cream rim, a cream T-harness and a lower strap with buckles.
- The other attachments are the front of the mask, the pads, the pad backs, the blocker/glove sheet, the catcher, and an in-game shot.
- The reference image stays local.

## Method (same as v8)
- Tight crop `(1,2,125,125)` on the shell. The "by Ovalist" watermark sits outside the shell and is treated as background.
- Material classes:
  - background: white page, grey watermark ink and black outline
  - navy
  - cream
- Each cell is coloured by these rules:
  - more than 50% background: black, the same convention as the front mask's corners
  - cream covering 30% or more of the helmet pixels: the cream's own median shade
  - cream covering 15–30%: the true area average, so thin straps survive
  - otherwise: the navy's own median shade
- Colours are snapped to the 6-bit VGA palette.
- No forced symmetry. The measured result is nearly symmetric because the real harness is symmetric.

## Note for the mapping phase
No atlas slot is wired yet. Like `pad_b`, `mask_b` needs the sprite-mapping phase to decide which frames show the back of the head.
