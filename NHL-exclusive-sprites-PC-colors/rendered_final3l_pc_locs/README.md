# Rendered exclusive sprites in 95 PC colours (final3l, 95 PC arm/sock locations)

This is the **P** sister set of the final3l exclusive renders: **arm bands and sock stripes are placed at 95 PC locations** (arm candidate `P` from the PC-position model along shoulder→elbow→hand, sock stripe row `P` from the sock regressor).

The companion set, with arm/sock bands at Genesis locations, is in `../rendered_final3l_genesis_locs/`. Contact sheets with columns **A Genesis / G the companion set / P this set** are in `contact_sheets/` (copied into both set folders).

Round-trippable **95 PC index PNGs** and **Boston home preview renders** for every Genesis exclusive sprite: all **36** NHLPA 93-only frames and all **129** NHL 94 Genesis-only frames (exclusives only; the 51 in-sequence 94G companions from the final3k folder are not repeated here).

`frames_pc/` is not used as an output folder and was not overwritten. Abdul’s completed pixels are kept in the 93G renders (ABDUL / PART). AUTO frames and unfilled PART pixels are filled by the final3l classifier.

## Layout

| path | what |
|---|---|
| `manifest.csv` | every written frame: game, number, source (ABDUL / PART / AUTO / final3l-hybrid / J-goalie), SPIT and PNG round-trip flags, opaque pixel count, loc=`P` |
| `93g/idx/g93_<n>_idx.png` | 36 paletted PNGs (mode P). Pixel value = 95 PC index, 255 = transparent. Palette is the 95 PC sprite (SH) palette. Encode→decode and palette round-trip both pass. |
| `93g/preview_bos_h/g93_<n>_bos_h.png` | the same frames rendered in the BOS home team palette (RGB) |
| `94g/idx/g94_<n>_idx.png` | 129 paletted exclusive index PNGs |
| `94g/preview_bos_h/g94_<n>_bos_h.png` | BOS home RGB previews of those 129 |
| `contact_sheets/` | eight A / G / P contact sheets, each ≤1000 px wide, colour-blind-safe, palette legend beside |
| `fight/` | NHLPA 93 BOS-home vs PHI-away fight GIF, sequence strip, contact sheet, `source_map.json` |

Genesis frame numbers count from **1**. 95 PC indices count from **0**.

## 93G exclusive (36)

Fights and fight injury **353–376**, and regular-play bloody injury1 **633–644**.

- **ABDUL** (kept as-is): 354–357, 359–362, 368, 637–639, 642. Frame 354 also has the helmet fix 194→190, 195→191 (18 head pixels). That fix is only on the render; `frames_pc/93_354.png` is unchanged.
- **PART** (his pixels kept, the rest filled): 364, 365, 370–376, 633–636, 640, 641, 643, 644.
- **AUTO** (classifier, plus any shared-black pixels already in `frames_pc/`): 353, 358, 363, 366, 367, 369.

93G has no joint-based arm/sock relocation, so these 36 frames are **identical** in the G and P sister sets. The fight GIF is therefore the same in both folders.

Approved maps used on fills: blood Genesis 29→76, 28→78; ice chips 1 and 2→89; fixed 33→8, 34→0, 38→133, 39→135, 46→136, 47→88.

The fight GIF (`fight/nhlpa93_bos_vs_phi_fight.gif`) follows the 93G disassembly sequence (SPAfight / grab / high punch / SPAfinjury 368–376). Injury1 633–644 is a regular-play injury SPA and is **not** mixed into that GIF. BOS is on the left (facedir 2, no X-flip); PHI is on the right (facedir 5, X-flip). Gloves (353) appear from fight frame 356. Nothing is faked.

## 94G exclusive (129)

Skaters use the final3l hybrid with arm/sock locations forced to the 95 PC models. Goalies stay on J (final3l did not change them), so goalie frames match the G set. 88 of 89 exclusive skaters differ from the G set; frame 775 is identical.

## Round-trip

Every index PNG in this folder was checked:

- SPIT `encode_pic` → `decode_pic` byte match
- paletted PNG saved with the SH palette, reloaded, pixels and palette match
- no index outside the valid 95 PC set (76 is included so blood is legal)

165 / 165 passed, 0 invalid indices.

## How to re-render

See `../training_final3l/README.md`. In the conversion workspace, run `build_sister_sets.py` and `contact_sheets_final3l.py`. Do not write into `frames_pc/`.
