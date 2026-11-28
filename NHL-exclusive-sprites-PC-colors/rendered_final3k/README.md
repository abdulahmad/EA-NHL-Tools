# Rendered exclusive sprites in 95 PC colours (final3k)

Round-trippable **95 PC index PNGs** and **Boston home preview renders** for every Genesis exclusive sprite: all **36** NHLPA 93-only frames and all **129** NHL 94 Genesis-only frames, plus 51 in-sequence 94G companion frames so the exclusive animations read as motion.

`frames_pc/` is not used as an output folder and was not overwritten. Abdul’s completed pixels are kept in the 93G renders (ABDUL / PART). AUTO frames and unfilled PART pixels are filled by the final3k classifier.

## Layout

| path | what |
|---|---|
| `manifest.csv` | every written frame: game, number, source (ABDUL / PART / AUTO / final3k-hybrid / J-goalie), whether it is exclusive, SPIT and PNG round-trip flags, opaque pixel count |
| `93g/idx/g93_<n>_idx.png` | 36 paletted PNGs (mode P). Pixel value = 95 PC index, 255 = transparent. Palette is the 95 PC sprite (SH) palette. Encode→decode and palette round-trip both pass. |
| `93g/preview_bos_h/g93_<n>_bos_h.png` | the same frames rendered in the BOS home team palette (RGB) |
| `94g/idx/g94_<n>_idx.png` | 180 paletted index PNGs (129 exclusive + 51 sequence companions) |
| `94g/preview_bos_h/g94_<n>_bos_h.png` | BOS home RGB previews of those 180 |
| `sheets/` | labelled animation contact sheets (≤1000 px wide) and the A/B/C/D comparison |
| `contact_sheets/` | eight exclusive-only contact sheets (36 93G + 129 94G), Genesis original beside each final3k BOS-home render, ≤1000 px, colour-blind-safe, palette legend beside |
| `gif/` | BOS home animation GIFs (4×, 8 fps, loop) |
| `fight/` | NHLPA 93 BOS-home vs PHI-away fight GIF, sequence strip, contact sheet, `source_map.json` |

Genesis frame numbers count from **1**. 95 PC indices count from **0**.

## 93G exclusive (36)

Fights and fight injury **353–376**, and regular-play bloody injury1 **633–644**.

- **ABDUL** (kept as-is): 354–357, 359–362, 368, 637–639, 642. Frame 354 also has the helmet fix 194→190, 195→191 (18 head pixels). That fix is only on the render; `frames_pc/93_354.png` is unchanged.
- **PART** (his pixels kept, the rest filled): 364, 365, 370–376, 633–636, 640, 641, 643, 644.
- **AUTO** (classifier, plus any shared-black pixels already in `frames_pc/`): 353, 358, 363, 366, 367, 369.

Approved maps used on fills: blood Genesis 29→76, 28→78; ice chips 1 and 2→89; fixed 33→8, 34→0, 38→133, 39→135, 46→136, 47→88.

The fight GIF (`fight/nhlpa93_bos_vs_phi_fight.gif`) follows the 93G disassembly sequence (SPAfight / grab / high punch / SPAfinjury 368–376). Injury1 633–644 is a regular-play injury SPA and is **not** mixed into that GIF. BOS is on the left (facedir 2, no X-flip); PHI is on the right (facedir 5, X-flip). Gloves (353) appear from fight frame 356. Nothing is faked.

## 94G exclusive (129) and sequence companions (51)

Skaters use the final3k hybrid: new per-colour / sock classifiers + existing J arms. Goalies stay on J (final3k did not change them). Companion frames also exist on 95 PC; they are included so each animation reads left to right, and `manifest.csv` marks `exclusive=False` for those 51.

## Round-trip

Every index PNG in this folder was checked:

- SPIT `encode_pic` → `decode_pic` byte match
- paletted PNG saved with the SH palette, reloaded, pixels and palette match
- no index outside the valid 95 PC set (76 is included so blood is legal)

216 / 216 passed, 0 invalid indices.

## How to re-render

See `../training_final3k/README.md`. In the conversion workspace, run `export_all_exclusive.py` (index PNGs + BOS previews), `render_exclusive.py` (94G sheets and GIFs), and `build_exclusive_and_fight.py` (fight GIF). Do not write into `frames_pc/`.

The 94G hybrid re-render still needs the J arm models and joint / part-map features from that workspace; those binaries are not in this folder (J was not retrained; some of the older dumps are 100+ MB).
