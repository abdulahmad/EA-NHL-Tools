# 94 SNES → 94 Genesis / 95 PC redraw rules (D176)

Based on 382 census pairs (`preview_v2/platform_unique/v2/frames_matrix.*`): S94 frames whose G94 match is class `match`, not mirrored, and scaled 0.9–1.15. Only player sprites (≥90 % of pixels in palette row 2) are used. Measured by `analyse.py`; the numbers are in `analysis.json`.

## Rules
1. **Size: the frames are not the same size.** The census `scale` column is the matching scale, not the frame size. Only 1 % of pairs have identical dimensions. A G94 sprite is about **8 % taller and 11 % wider** (median h 1.076, w 1.106) and has about 4 % more pixels (median 318 vs 304). Redraw on a canvas enlarged by ×1.08 vertically and ×1.11 horizontally; do not keep the SNES box.
2. **Pose and silhouette are redrawn, not traced.** Even after scaling and the best offset, the silhouette IoU is only about 0.72. Limbs, the stick angle and skate placement differ by 1–3 px, so treat SNES only as a pose guide.
3. **Outline.** Black is used more on Genesis: 19 % of pixels vs 14 %, and 17.6 % vs 15 % of silhouette-edge pixels. Genesis adds black on the lower and shadow side of limbs and between the legs. SNES uses black mainly on gloves, skates and the stick blade.
4. **Team colour shading.** SNES draws the jersey as flat white plus 2 blue levels (stripes only). Genesis uses **3 navy levels** and 3 whites, and fills large shadowed areas of the jersey and pants with dark navy (G 41/42/36). The pixel mapping shows SNES "white" slots 38 and 45 become **G42 navy** 40–49 % of the time; those slots are stripe/shadow zones on Genesis.
5. **Light direction.** Both light from above (the lum-weighted centroid is above the body centroid). The Genesis gradient is stronger (−1.5 px vs −1.1), and neither leans left or right. Highlights go on the shoulders, helmet top and upper back; dark navy goes on the lower torso, pants and the back of the legs.
6. **Helmet and face.** SNES has a grey helmet and a single flat skin tone (0.85 levels on average). Genesis has a white helmet with a grey shade line, and the face uses **2 skin tones** (G38 light, G39 shadow) plus a dark eye pixel.
7. **Stick.** SNES 46 (brown) → G46 orange in 77 % of pixels. The Genesis stick is 1 px wide with a black 2–3 px blade. Keep its length and angle from the pose.
8. **Skates and ice.** SNES 47 → G47 ice spray (84 %). Skates stay black with a white/grey blade line.
9. **Palette-index map** (majority vote, SNES → G94): 34→34 black, 36→36 navy, 39→39 skin shadow, 43→43/44 white, 44→44, 46→46 stick, 47→47 ice, 35/37→43 white, 38/45→42 navy, 40/41→41 navy. Map by **index (zone)**, not RGB: on SNES Leafs, slots 35, 37, 38, 42, 44 and 45 are all the same white.

## Converter
`train.py` works in three steps:
1. Scale ×(1.08, 1.12) by nearest neighbour.
2. Run a random forest on 7×7 SNES colour-family windows plus the relative height in the sprite. It predicts the G94 index for every pixel within 2 px of the silhouette, so it can grow or trim the outline.
3. Fall back to the rule-9 index map for any SNES pixel that the forest blanks, which keeps thin sticks.

It is trained on 311 frames and validated on 71 **held-out animations** (skatewp, hook, stop, duck), measured over the union of both silhouettes:

| method | exact index | exact colour | colour family | silhouette IoU |
|---|---|---|---|---|
| index map only | 30.2 % | 31.1 % | 47.4 % | 0.72 |
| map + forest | 34.8 % | 35.7 % | 51.2 % | 0.725 |

**Quality.** The output reads as Genesis-coloured (navy shading, 2-tone faces, white helmet), but the drawing is still SNES. The pose and outline are not redrawn, and the low scores mostly reflect pose and silhouette differences that no per-pixel translator can fix. Known artefacts: flat ice blobs under the skates, and blotchy navy where SNES had stripes.

Run: `python3 analyse.py && python3 train.py && python3 sheets.py`. This needs the local census and ROM extracts; no game data is committed.


See [RULES_D177_D178.md](RULES_D177_D178.md) for the staged converter (D177–D178).
