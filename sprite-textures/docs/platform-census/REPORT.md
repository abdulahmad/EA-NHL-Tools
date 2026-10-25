# Platform frame census (D165): every-frame comparison: 92G, 93G, 94G, 94S, 95PC

Generated 2026-10-25 (EDT). Nothing committed or pushed. Contact sheets and pickles are not committed (they are renders of game art); regenerate them with `scripts/mksheets.py` from local ROM dumps.

## Answer in one screen

- **Every frame of every set was checked**, including refs, fights, injuries, celebrations, logos, fonts, nets and the bench. Frame counts: 92G 549, 93G 649, 94G 845 (24 empty), 94S 976, 95PC 1134 (1 empty). 93S (720) is used only as a cross-reference.
- **93G exclusives**:
  - The **6 blood injury frames `finjury` 371–376** match nothing in 92G, 94G, 94S or PC. The only near match is 93 SNES at about 0.72.
  - **The fight set `fight/fheld/fgrab/flow/fhith/fhigh/fhitl/ffall` + gloves (353–370) is shared by 92G and 93G**, matching pixel-for-pixel. 94G blanked those 24 slots (353–376 are empty). 94S has no fight SPAs, and **no PC frame matches any fight or blood frame**. So fights are a 92/93 exclusive, and blood is 93-only.
- **92G exclusives**: none for players. The only frames with no confident match are the **team-logo sprites `Logos` 514–535** and the 2 `pad` stars, and the logos are not referenced by any SPA. Everything else in 92G is reused by 93G.
- **94G exclusives**: 79 frames, plus 72 more that have only an ambiguous match. They are all in the SPAs new in 94: `boardfront/back/left/right`, `benchcheckl/r`, `crosscheck`, and goalie `ghighl/r`, `gstick2l/r`, `gslamtop/bot`.
  - 94S has **its own redrawn** board, benchcheck and crosscheck art, so the two do not match frame-for-frame.
  - PC carries none of them.
- **94S exclusives**: 145 frames, plus 245 ambiguous. They cover:
  - the faceoff close-ups 423–432 (big player, ref arm, puck);
  - the bench strips 917–928;
  - its own board, benchcheck and crosscheck art;
  - new goalie SPAs: `gbutterfly`, `gcover`, `gpoke`, `gsprawll/r`;
  - `pump2` celebrations, `unused1/2`, and the replay icon;
  - fonts 433–447 and 929–966.
- **95PC exclusives**: 174 frames, plus 328 ambiguous. Most are **new goalie art and many new referee frames (roughly PC 817–843)**, plus the PC-only slot use 358–376. PC has no SPA names, so these are labelled "PC-new" with the category of the nearest console frame.
- **Missing from 95PC but present elsewhere**: 429 console frames, which collapse to **353 unique poses** (G94 141, S94 187, G93 18, G92 7). The list is in `roadmap_missing_from_pc.csv`.
- **Intra-game ("SPA/SPF differ in the same game")**:
  - Many SPA tables pull frames from other SPF groups. In 94G, `board*` and `benchcheck*` reuse `duck/fallback/fallfwd/slambot` frames. In 94S, `pump2` uses `celebrate/pump/skatewp`. The full list is below.
  - Large blocks of drawn frames are never referenced by any SPA or SPF symbol, and 94G and 94S also hold near-duplicate frames.
  - ROM revisions don't differ in art: 92 retail = RevA, and 93 retail/RevA = RevB plus one empty dummy table entry.

## Files

| file | what |
|---|---|
| `frames_matrix.csv` / `.json` | One row per frame of every set (4,873 rows incl. 93S). Columns: label (SPF name), category, animated, used, SPA list, code refs, status string, exclusive flag. For **each other set**: best frame, score, mirror, scale, sequence-supported, class. |
| `roadmap_missing_from_pc.csv` | 353 unique poses (deduped across games via match links) that have no match in PC, with every copy and the closest PC frame. |
| `roadmap_snes_only.csv` | 390 S94 frames with no confident match in any Genesis game or PC, with the closest G94 and PC frames. |
| `roadmap_92_93_exclusive.csv` | 92G/93G frames that are exclusive, ambiguous-only, or not in PC (fights, blood, logos), with per-set best and class. |
| `intra.json` | Within-game duplicates, SPA→SPF group usage, unused frames. |
| `sheets/*.png` | Not committed (renders). Contact sheets (≤1000 px) with each frame beside its closest frame elsewhere; produced by `scripts/mksheets.py`. Four 800 px samples are in `sheets/` (93G fights/blood, 94G-only 1/3, 94S-only 3/5, PC-only 1/5). |

Sheets:
- `g93_fights_blood.png`: 93G fights next to the 92G twin and the nearest PC frame.
- `g94_only_1-3`
- `s94_only_1-5`
- `pc_only_1-5`
- `g92_ambiguous_1`
- `missing_pc_G94_1-4`
- `missing_pc_S94_1-6`

## Method (short)

- **Decoding**:
  - 92G: EA-NHL-Tools ANIM-To-BMP.
  - 93G (RevB `Sprites.anim`) and 94G (ROM 0x5DE84): my own decoder, sanity-checked visually.
  - 94S: earlier `snes94.pkl`.
  - PC: `lib.frame`.
- **Names**:
  - SPF equates and SPA tables are parsed from each disassembly (case-insensitive; 92 mixes `SPFpen`/`SPFPen`).
  - Code references are `SPFxxx(+N)` greps of the non-frame source.
  - PC SPAs come from SPAtab bytes in `035_C9078_data_engine_35.asm`. The stored frame value is 0-based (PC id = value + 1, verified against 94G `stop`).
- **Matching**:
  - Coarse pass: 32×32 bottom-centred mask + 3-band luminance grids, with mirroring and an x-shift.
  - Then pixel alignment of the top candidates for anything under 0.85: scales 1/0.9/0.8, dx ±2, dy ±1, mirror.
  - Score = max of the two.
  - "Sequence-supported" means a frame ±1/±2 maps with the same offset at ≥ 0.6.
- **Classes**:
  - match ≥ 0.80 (0.70 if sequence-supported); ambiguous ≥ 0.65 (0.60).
  - Pairs involving 94S are 0.05–0.10 lower (SNES palette and size differences): 0.75/0.65 and 0.62/0.55.
  - Exclusive = no match and no ambiguous in all four other in-scope sets.
  - "Ambiguous-only" frames are listed separately and need a human look.
- No pixels were relabelled or edited. Scores only decide classes.

## Confidence / caveats

- Exclusive lists are high confidence. Every sheet shows the closest candidate, and none of them is the same drawing.
- **Ambiguous-only lists are lower confidence**. Many are the same pose redrawn (e.g. 94S boards vs 94G boards, PC goalies vs 94S goalies). Treat them as "not reusable as-is" but possibly "reference exists".
- "Unused" means no SPA entry and no `SPF` symbol in code. Frames drawn by code with computed indices show up as unused even though the game draws them: fonts, bench, faceoff close-ups (94S 424–432), logos, and the 94S bench strips and big font (917–975). PC code was not scanned, so PC unused is SPAtab-only.
- No NHL95 SNES ROM was available, so 94S stands in. 95G art is redrawn (v1 finding) and is not part of scope.
- 93S is decoded and matched (column in the matrix) but excluded from the exclusivity tests. It shares the fights and the blood frames with 93G.
- The blood frames on the sheets use the shared preview palette, so the red reads as grey. Their identity comes from the SPA (`finjury`), not from colour.
- Some G94 "not in PC" non-player items (arrows, puck, siren, goal, wall-left 381–383) may exist in PC as non-sprite graphics. I only compared sprite banks.

## Per-game exclusive lists (by animation and frame ID)

Frame IDs are 1-based as in the disassemblies. The `animation` column is the SPF group the frame sits in; PC frames have no names.

#### G92: exclusive (no match or ambiguous in any other in-scope game) — 0 frames

| category | animation (SPF) | frames |
|---|---|---|

#### G92: ambiguous only (no confident match anywhere; check by eye) — 11 frames

| category | animation (SPF) | frames |
|---|---|---|
| nonplayer | pad | 384-385 |
| nonplayer (team logos) | Logos | 514-515, 518, 520, 529, 531-532, 534-535 |

#### G93: exclusive (no match or ambiguous in any other in-scope game) — 6 frames

| category | animation (SPF) | frames |
|---|---|---|
| fight | finjury | 371-376 |

#### G93: ambiguous only (no confident match anywhere; check by eye) — 0 frames

| category | animation (SPF) | frames |
|---|---|---|

#### G94: exclusive (no match or ambiguous in any other in-scope game) — 79 frames

| category | animation (SPF) | frames |
|---|---|---|
| goalie | ghighl | 665 |
| goalie | ghighr | 664, 666 |
| goalie | gslambot | 710-713 |
| goalie | gslamtop | 706-707 |
| goalie | gstick2l | 677, 689, 693, 700 |
| goalie | gstick2r | 687, 695 |
| player | benchcheckl | 761, 769, 790, 798, 804-808, 810-814 |
| player | benchcheckr | 758, 766, 818-822, 824, 826-829 |
| player | boardback | 775-776, 778-781, 783-784 |
| player | boardfront | 741-744, 747-752 |
| player | boardleft | 791, 793-794, 796-797, 801 |
| player | boardright | 760, 762, 764-765, 767-768 |
| player | crosscheck | 831-837 |
| player | slambot | 730 |

#### G94: ambiguous only (no confident match anywhere; check by eye) — 72 frames

| category | animation (SPF) | frames |
|---|---|---|
| goalie | ghighl | 659, 661, 663, 667, 669, 671, 673 |
| goalie | ghighr | 660, 662, 668, 670, 672 |
| goalie | gready | 558 |
| goalie | gslamtop | 708-709 |
| goalie | gstick2l | 676, 680, 684, 688, 692, 697, 701, 705 |
| goalie | gstick2r | 679, 682-683, 690-691, 698, 702 |
| player | benchcheckl | 792, 800, 802-803, 809, 815 |
| player | benchcheckr | 816-817, 823, 825 |
| player | boardback | 770-771, 773-774, 782 |
| player | boardfront | 738-740, 746 |
| player | boardleft | 786-787, 789, 795, 799 |
| player | boardright | 754-755, 757, 759, 763 |
| player | crosscheck | 830 |
| player | slambot | 714, 716, 723-724, 726, 728-729, 731-733, 735, 737 |

#### S94: exclusive (no match or ambiguous in any other in-scope game) — 145 frames

| category | animation (SPF) | frames |
|---|---|---|
| celebration | celebrate | 196-198 |
| celebration | pump2 | 795-796, 798-803, 805, 811-812, 816, 818 |
| goalie | gbutterfly | 729, 733-734 |
| goalie | gcover | 699, 705, 710-711, 716 |
| goalie | gpoke | 686, 689, 693 |
| goalie | gskate | 630 |
| goalie | gsprawll | 743-744, 747, 749-753, 755-756, 758-759, 762, 765 |
| goalie | gsprawlr | 774, 776-777, 780, 783, 786, 789 |
| nonplayer | bench | 917-928 |
| nonplayer | replay | 395 |
| player | benchcheckl | 899-900, 904-905, 908-910, 913-916 |
| player | benchcheckr | 896-897, 902, 907, 911-912 |
| player | boardback | 867-879 |
| player | boardfront | 834-847 |
| player | boardleft | 880, 883-884, 887-891, 893-895 |
| player | boardright | 849-851, 853-859, 863 |
| player | crosscheck | 527, 529 |
| player | faceoff | 423-432 |
| player | unused1 | 821-823 |
| player | unused2 | 828-829 |

#### S94: ambiguous only (no confident match anywhere; check by eye) — 245 frames

| category | animation (SPF) | frames |
|---|---|---|
| celebration | celebrate | 185, 187-192, 194, 199-200, 213 |
| celebration | cupover | 225-229, 232 |
| celebration | pump | 208, 210, 214 |
| celebration | pump2 | 790-794, 797, 804, 806-810, 814-815, 817, 819-820 |
| goalie | gbutterfly | 646, 650, 652, 654, 656, 658, 660, 718, 721-728, 730-732, 735-740 |
| goalie | gcover | 694, 696-698, 700-704, 706-709, 712-715, 717 |
| goalie | gglovel | 557 |
| goalie | gglover | 556 |
| goalie | gpoke | 678-681, 683-685, 687-688, 690-692 |
| goalie | gready | 537, 647, 649, 651, 653, 655, 657, 659 |
| goalie | gskate | 619, 622-629, 631, 633-634, 636, 638, 641, 643, 645 |
| goalie | gsprawll | 742, 745-746, 748, 754, 757, 760-761, 763-764 |
| goalie | gsprawlr | 767, 769-773, 775, 778-779, 781-782, 784-785, 787-788 |
| goalie | gstackl | 590, 596 |
| goalie | gwallleft | 370-371 |
| nonplayer | Pen | 369 |
| nonplayer | bglass | 516 |
| nonplayer | bigfont | 929, 931, 933, 937-943, 947-955, 963, 965-966 |
| nonplayer | smallfont | 433, 435-439, 442-447 |
| nonplayer | zamboni | 448 |
| player | Hold | 354-360 |
| player | benchcheckl | 898, 903 |
| player | benchcheckr | 901, 906 |
| player | boardback | 864-866 |
| player | boardfront | 832-833 |
| player | boardleft | 881-882, 885-886, 892 |
| player | boardright | 848, 852, 860-862 |
| player | crosscheck | 519-526, 528, 530-533 |
| player | faceoff | 1 |
| player | fallfwd | 338 |
| player | skatewp | 2-4 |
| player | stanley | 217-224 |
| player | stumble | 475 |
| player | unused1 | 824-826 |
| player | unused2 | 827, 830-831 |
| player | wallleft | 368 |

#### PC: exclusive (no match or ambiguous in any other in-scope game) — 174 frames

| category | animation (SPF) | frames |
|---|---|---|
| celebration? | PC-new | 874, 888, 896, 911, 926, 931, 936 |
| fight? | PC-new | 1082 |
| goalie? | PC-new | 672, 703, 729, 732-734, 789-790, 817-818, 824-825, 840, 869, 881, 912, 917-919, 921, 929, 934, 937, 939, 963, 966, 969, 971, 974-975, 978, 991-992, 999, 1001-1003, 1008-1009, 1018, 1021-1022, 1033, 1046, 1049-1050, 1054, 1063, 1070, 1076, 1098, 1104 |
| nonplayer? | PC-new | 383, 562-563, 649, 908, 988, 1039, 1087, 1113 |
| nonplayer? | PC-new-unused | 392, 405 |
| player? | PC-new | 359, 361-364, 376, 728, 748, 783, 785, 821, 823, 831-833, 835-839, 841-843, 873, 875, 877-878, 882, 886-887, 910, 913, 915-916, 920, 922-923, 930, 932-933, 935, 938, 940-941, 951-952, 954, 958-962, 965, 967, 970, 972-973, 989, 1007, 1017, 1020, 1023-1025, 1031, 1034, 1037-1038, 1040, 1042-1043, 1045, 1055, 1058, 1061, 1064, 1066-1069, 1074-1075, 1077-1081, 1083-1084, 1086, 1088, 1090, 1092, 1094-1097, 1099-1102, 1122 |
| player? | PC-new-unused | 360 |

#### PC: ambiguous only (no confident match anywhere; check by eye) — 328 frames

| category | animation (SPF) | frames |
|---|---|---|
| celebration? | PC-new | 372, 702, 885, 1089, 1114-1120 |
| goalie? | PC-new | 366-367, 373, 650-651, 658, 660-661, 663-670, 673, 675-678, 680, 682, 684, 688-699, 701, 704, 706-708, 712-713, 716-717, 722, 725-726, 730-731, 735-742, 745, 747, 749, 751, 753-754, 757-758, 760-763, 765-771, 777, 779-781, 793, 796, 799-802, 805, 808, 811-815, 819, 822, 826, 830, 834, 844-847, 851-853, 856-857, 862-863, 866-868, 880, 884, 891-892, 904, 907, 964, 968, 976, 979-981, 984-987, 990, 993-998, 1000, 1004-1006, 1010-1012, 1016, 1019, 1026, 1028-1029, 1032, 1035-1036, 1041, 1044, 1047, 1051, 1053, 1056, 1062, 1065, 1071, 1129, 1132, 1134 |
| goalie? | PC-new-unused | 1124 |
| injury? | PC-new | 635, 637 |
| nonplayer? | PC-new | 41, 43, 555-556, 559-561, 564-565, 647-648, 816, 872, 1030 |
| nonplayer? | PC-new-unused | 353-356, 393 |
| player? | PC-new | 3-4, 44-45, 150, 358, 368-371, 374-375, 381-382, 652, 654-655, 662, 671, 674, 679, 681, 683, 685, 687, 700, 705, 709-711, 714-715, 718-721, 723-724, 727, 743-744, 746, 750, 752, 755-756, 759, 764, 776, 778, 782, 784, 786-788, 791-792, 804, 806-807, 809-810, 820, 827-829, 848-850, 854-855, 858-859, 864-865, 870-871, 876, 879, 883, 889-890, 893-895, 897-903, 905-906, 925, 942-943, 945-950, 953, 956, 977, 1015, 1027, 1048, 1052, 1057, 1060, 1072-1073, 1085, 1091, 1093, 1103, 1109, 1111-1112, 1121, 1123, 1125-1128, 1130-1131, 1133 |
| player? | PC-new-unused | 357, 365 |

## 93G fights and blood, in detail

| frames | SPF | 92G | 94G | 94S | 95PC |
|---|---|---|---|---|---|
| 353 | gloves (on ice) | identical | empty slot | none | none |
| 354–370 | fight, fgrab, fhigh, flow, fhitl, ffall | identical (score 1.0) | empty slots | no fight SPAs, no match | none (best 0.56–0.68, unrelated poses) |
| 371–376 | finjury (blood) | — (92 has no finjury) | empty | none | none (best 0.55–0.59 = PC lying-down injury art) |

SPA names: 92G has `fight fheld fgrab flow fhith fhigh fhitl ffall`, and 93G adds `finjury`. 94G drops all of them but keeps `injury1` and adds `injuryfall`. 94S has no fight SPAs, and its slots 375–388 are partly unused.

## 94G frames 659+ (resolved via SPA usage)

| frames | SPA |
|---|---|
| 659–673 | ghighl (8) / ghighr (7), interleaved |
| 674–705 | gstick2r / gstick2l (16 each), interleaved |
| 706–709 / 710–713 | gslamtop / gslambot (4 each) |
| 714–737 | slambot SPF group, not referenced by any SPA (drawn but unused) |
| 738–753 / 754–769 / 770–785 / 786–801 | boardfront / boardright / boardback / boardleft (16 each) |
| 758–829 | benchcheckr / benchcheckl (20 each; own frames 802–829 plus board frames) |
| 830–837 | crosscheck (8) |
| 838–845 | not referenced |

Groups overlap because SPAs share frames. The exact frame→SPA lists are in the `spa` column of the matrix.

## Intra-game differences (same game, SPA vs SPF)

**SPA tables that use frames outside their own SPF group**:

- **G92**: `pflip` → puck, skatewp; `faceoff` → skatewp, sweep; `stop` → skatewp, stop; `gskate` → Goalie, skatewp; `fallfwd` → duck, fallfwd; `fallback` → duck, fallback
- **G93**: `gready` → Goalie, gready; `gglovel2` → Goalie, glovel2; `faceoff` → skatewp, sweep; `fake` → sweep, turnl, turnr; `fallfwd` → duck, fallfwd; `flip` → duck, fallback, flip; `fallback` → duck, fallback; `injury1` → fallback, injury1; `finjury` → fight, finjury
- **G94**: `gslambot` → Goalie, slambot, slamtop; `gready` → Goalie, gready; `gslamtop` → Goalie, ghighr, slamtop; `gglovel2` → Goalie, glovel2; `faceoff` → skatewp, sweep; `fake` → sweep, turnl, turnr; `fallfwd` → duck, fallfwd; `boardleft` → duck, fallback, fallfwd, slambot; `boardback` → duck, fallback, fallfwd, slambot; `boardright` → duck, fallback, fallfwd, slambot; `boardfront` → duck, fallback, fallfwd, slambot; `flip` → duck, fallback, flip; `fallback` → duck, fallback; `benchcheckr` → duck, fallback, slambot; `benchcheckl` → duck, fallback, slambot; `injury1` → fallback, injury1
- **S93**: `gready` → Goalie, gready; `faceoff` → skatewp, sweep; `fallfwd` → duck, fallfwd; `flip` → duck, fallback, flip; `fallback` → duck, fallback; `finjury` → fight, finjury
- **S94**: `gready` → Goalie, gready; `gbutterfly` → gbutterfly, gready; `gsprawlr` → gready, gsprawlr; `gsprawll` → gready, gsprawll; `gcover2` → gcover, gready; `gcover` → gcover, gready; `faceoff` → skatewp, sweep; `pump2` → celebrate, pump, pump2, skatewp; `unused1` → skateb, skatewp, unused; `unused2` → skateb, unused; `fallfwd` → duck, fallfwd; `boardleft` → boardleft, fallback, fallfwd; `boardback` → boardback, fallback, fallfwd; `flip` → duck, fallback, flip; `fallback` → duck, fallback; `boardfront` → boardfront, fallfwd; `boardright` → boardright, fallback; `celebrate` → celebrate, pump

**SPA names that exist in only one game (of 92G/93G/94G/93S/94S)**:
- 94G: ghighl, ghighr, gslambot, gslamtop, gstick2l, gstick2r, injuryfall
- 94S: gbutterfly, gcover, gcover2, gpoke, gsprawll, gsprawlr, gwallleft, gwallright, onetimerb, onetimerf, pump2, unused1, unused2, unused3
- 92G and 93G have none (the 92 SPA set is a subset of 93).

**Frames never referenced by an SPA or an SPF symbol in code**:

| set | frames |
|---|---|
| G92 | 379-380, 382-383, 513-535 (team logos) |
| G93 | 385-386, 388-389 |
| G94 | 355-376 (blank fight slots), 385-386, 388-389, 714-737, 838-845 |
| S93 | 385-386, 388-389, 533-541, 543-556, 660-720 |
| S94 | 226-232, 375-376, 378-379, 381-382, 384-385, 387-388, 424-432 (faceoff close-ups, probably drawn by code), 435-447 (font), 918-922, 924-928, 930-966, 968-975 (bench/fonts, drawn by code) |
| PC | 353-357, 360, 365, 384-394, 405-406, 1124 (SPAtab only) |

**Near-identical duplicates inside one set (score ≥ 0.985)**: G92 19, G93 25, G94 84, S93 35, S94 47, PC 21. Pairs are in `intra.json` → `dups`.

**Other banks inside a game**:
- 93G has separate archives: FaceOff 10, Crowd 62, Zam 8, EASN 9, Title3 33, TitleLogo 4, GameSetup 1.
- 94G has an 11-frame blob at 0xa78ae (probably faceoff) and blobs at 0x846e8 and 0xb3640.
- 94S has one main sprite set plus logo and letter sets.
- 93S has 15 sets; its 54 crowd frames are its only exclusives.
- These side archives were **not** cross-matched frame-by-frame. That includes 93G/94G FaceOff vs the 94S close-ups 423–432, which is the obvious next check.

**ROM revisions**:
- 92 retail = RevA (identical sprites).
- 93 retail/RevA = RevB for frames 1–649, plus one empty dummy table entry (650).

## Roadmap lists (for 95PC)

1. **In other games, missing from 95PC**: `roadmap_missing_from_pc.csv` lists 353 unique poses. Sheets: `missing_pc_G94_*`, `missing_pc_S94_*`, `g93_fights_blood`.
   - 94G (141): board checks ×4 directions, bench checks L/R, crosscheck, goalie high/stick2/slam, slambot, plus small non-player items (arrows, siren, puck, goal, wall-left, bglass).
   - 94S (187): its own board, bench-check and crosscheck art, the new goalie SPAs (butterfly, cover, poke, sprawl), pump2/celebrate, faceoff close-ups, the bench, fonts, zamboni and the replay icon.
   - 93G (18): fights 353–370 and blood 371–376. 92G (7): logos and pad.
2. **SNES-only frames to convert**: `roadmap_snes_only.csv`, 390 frames with the closest G94 and PC base. The 145 exclusive frames have no usable base. The 245 ambiguous ones are mostly redraws of a pose that exists in G94 or PC.
3. **92G/93G exclusives**: `roadmap_92_93_exclusive.csv`, which holds the fights and blood, and the 92 logos.
