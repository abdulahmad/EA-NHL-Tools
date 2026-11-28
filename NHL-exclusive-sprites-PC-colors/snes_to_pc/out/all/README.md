All 393 SNES-exclusive frames (none 'match' in 94G or 95 PC). Boston home palette.
343 player/goalie/celebration frames: A SNES / B Genesis style / C 95 PC style (sheets/all01..all51), grouped by animation.
 Clear (none in both games): 133 (84 player, 16 celebration, 33 goalie). Ambiguous: 210 (59 player, 37 celebration, 114 goalie).
50 non-player frames (fonts, zamboni, rink glass, bench, pen, replay): listed, shown SNES-only in sheets/nonplayer_snes_only_1..2, not converted.
Round trips (Genesis PNG, PC PNG+SH palette, SPIT encode/decode, valid indices): 343/343 pass, 0 failures (failures.json is empty).
Flagged: S429-432 (referee, faceoff group) and S225-229, S232 (Stanley cup, cupover group) are not players; B/C for them are not meaningful.
manifest.csv: frame, category, label, status, scores, sheet, note. Files: genesis_idx/, pc_idx/, npy/.
Method as in ../../FINDINGS.md. Stray non-sprite classes (<33, >47) learned from 94G are now dropped from B (51 px in 16 frames).
