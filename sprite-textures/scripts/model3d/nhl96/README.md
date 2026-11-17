# NHL 96 PC sprite-to-3D experiment

The NHL 96 PC player sprites (`GAMEART.VIV` -> `TOTAL.ref`, 2,829 frames, names `FFDD` = frame, direction) are renders of a 3D model:
each animation frame is one rigid pose seen from 8 yaw angles (45 degree steps), camera pitch about 13 degrees.
So the shape can be carved directly from the 8 outlines. No game data is stored here; extract `TOTAL.ref`, `newpal.qfs`
from your own `GAMEART.VIV` (BIGF archive) into the working folder.

- `ref96.py` SHPI bank reader with RefPack decoder; `pal96.py` team palettes from `newpal.qfs` (`!bfh` = Buffalo home).
- `carve96.py` projection and silhouette carving; `cal2.py` per-view offset / yaw and shared pitch calibration.
- `err96.py` wrong-pixel counter against the sprites (flattened shades, stick ignored) and the sprite / model / error sheet.
- `climb96.py`, `grow96.py` hill-climb on the wrong-pixel count (tunes voxels to the 8 views; overfits, see below).
- `smooth96.py` regularised shape and colours; `out96.py` GLB mesh and turntables; `pipe96.py` whole pipeline for one pose.

Standing pose (frames 8-15), 2026-11-16: about 700 body pixels per frame. Plain hull with voted colours 21% wrong;
hill-climbed 3.4% wrong at the 8 game angles but noisy in between (overfit); smoothed model 21.6% wrong.

## Low-poly mesh and clean texture (2026-11-16, later)
- `rast.c` (build: `gcc -O3 -shared -fPIC -o rast.so rast.c -lm`) rasterises a triangle mesh at the 8 game cameras and counts wrong pixels.
- `poly96.py` / `adapt96.py`: a mesh of flat faces, one palette zone per face; vertices are moved by hill-climbing on the wrong-pixel count, and faces
  that still straddle two zones are split so edges move onto the stripe boundaries. Standing pose: 600 faces 13.6% wrong, about 1,000 faces 7.0%.
  This is used for the SHAPE only.
- `samp96.py`: every sprite pixel covered by the mesh becomes a 3D sample with the sprite's own zone.
- `clean96.py`: the clean texture. The mesh only says which body part a point is on; the colour comes from rules whose few numbers are measured
  from the samples: ordered rings along each sleeve and sock (with a searched tilt), six hem bands (tilted, the torso leans forward), a smooth yoke
  line, a centred pant stripe, and the crest (6x6) and number (7x5) as rectilinear texel grids. Standing pose: 17.2% wrong, clean at any angle.
- `export96.py`: GLB with the clean texture baked into subdivided face colours, sprite-size turntables.
