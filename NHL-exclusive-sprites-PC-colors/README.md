# NHL exclusive sprites in 95 PC colours

Every sprite frame that NHL 95 PC does not have — the NHL 94 Genesis-only frames and the NHLPA 93-only frames — catalogued, and being re-coloured to **95 PC palette indices** so they can go into the NHL 95 PC sprite banks with full team colours.

By **abdulahmad** and **StaticEck** (collaborator). Kept separate from `sprite-textures` on purpose: this is colour expansion of whole frames; per-pixel texture mapping is the next phase and lives elsewhere.

**Credits:** abdulahmad ([EA-NHL-Tools](https://github.com/abdulahmad/EA-NHL-Tools)), StaticEck, chaos, McMarkis (Mhopkinsinc) and Drezz, with special thanks to smozoma and kingraph. See the repository's [AGENTS.md](../AGENTS.md); derivative works must carry these credits.

No game files are in this folder. Frame images are drawn from the games for reference; the tools read files you extract from your own copies (`tools/paths.py`).

## What is here
| path | what |
|---|---|
| `exclusive_frames.csv` | every candidate frame: 94G only (129), 93 only (36), uncertain (73), resolved as not exclusive (54) |
| `sheets/` | labelled sheets of those frames, one colour per Genesis colour zone, colour-blind-safe palette, legend on each |
| `indexed/` | the same frames as 16-colour indexed PNGs (index = Genesis palette index), the grid order and zone palette CSVs |
| `abdul/` | Abdul's working PSD (`abdul_expanded.psd`), his guide palette BMP, his guide palettes as ACT (`act/`, see its README), and every PSD layer extracted (`layers/`, `layers.json`) |
| `status/` | how far each frame is: `frame_status.csv`, `psd_layers_status.csv`, `status_injury.png`, `status_fights.png`, `psd_layout.png`, the labelled palette (`abdul_palette_labeled.png`, `abdul_palette_indices.csv`), the zone check (`zone_consistency.json`), and the two 95 PC palettes (`palette95_sprite.png`, `palette95_game.png`, `palette95_indices.csv`) |
| `frames_pc/` | each PSD frame exported as 95 PC indices (mode P PNG, value = 95 PC index, 255 = transparent) plus a `_todo.png` mask of pixels still to do; `decisions_applied.csv` lists every pixel changed by a decision |
| `decisions/abdul_decisions.csv` | Abdul's approved colour decisions (blood 76/78, single pixels), applied on top of his PSD by the tools |
| `reference/staticeck/` | StaticEck's reference images and notes |
| `tools/` | Python scripts (`pip install numpy pandas pillow scipy psd-tools`) |
| `PALETTE95.md` | the sprite palette vs the game palette, the colour mapping between them (home and away), which indices stay the same for every team, and the blood index |
| `PPV95-FORMAT.md` | the 95 PC sprite file format and the byte-exact round trip |
| `METHOD.md` | how the frames were found, matched and checked |
| `PLAN.md` | how to finish the rest, in order, with the gate each frame must pass |

## Colours in the comparison images
All comparison images (`status/status_*.png`, the `frames_pc/` PNG palettes) show 95 PC indices in **Abdul's guide palette** (`abdul/act/abdul_palette_complete.act`, which agrees with `abdul/abdul_palette.bmp` and fills its gaps), so each colour tells you the zone. Two guide colours are added on top of his ACT for the approved blood indices (his ACT files are not edited; `tools/paths.py` `GUIDE_OVERLAY`): **76 = wine (100,30,60)** and **78 = orange (255,150,0)**, both at least 67 RGB units from every colour in his palette. Any other index outside his palette is drawn in **cyan (0,255,255)**; on the status sheets it also gets a black dot and the legend lists those indices. The pixel values themselves are always 95 PC indices.

## Status (27 Nov 2026)
- 36 NHLPA 93 frames are in scope (fights 353–370, fight injury 371–376, bloody injury 633–644). The PSD covers 34 of them; 358 and 363 have no layer yet.
- 13 are FULL: fights 354–357, 359–362, 368 and bloody injury 637, 638, 639, 642. The other 8 bloody injury frames are 98–99.8%: only 1–7 white holes each are left (listed in PLAN.md). 13 have only a 95 PC head or crest patched in, or nothing (NONE).
- Blood is Genesis 29 → sprite index 76 and Genesis 28 → 78 (approved by Abdul; see PALETTE95.md).
- The 129 NHL 94 Genesis-only frames have not been started.
- The 95 PC sprite file encoder is byte-exact on all 1,135 retail pictures and all 23 banks.
