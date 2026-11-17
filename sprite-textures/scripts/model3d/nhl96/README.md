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
