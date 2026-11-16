# model3d: a 3D skater from the NHL 95 PC sprites (experiment, 2026-11-16)

Builds a voxel 3D model of the skater from the 2D sprite frames. No game data is stored here; run `../dump.js` first (see `../../README.md`).

## Method
1. `carve.py` / `colour.py`: plain space carving from the 8 glide directions. Works, but blurry, because the hand-drawn views do not agree on the pose.
2. `tmpl.py`: a jointed template (47 numbers: joint angles, limb lengths, radii) made of tubes and ellipsoids, one class per body part.
3. `fit.py` .. `fit4.py`: CMA-ES fits the template so each part lands on the pixels of the same part. Parts come from the palette zones (`parts.segment`). One shape is shared; every frame gets its own pose.
   Frames used: glide d0-d7 (1,6,..,36), the standing controls 370 (front) and 185 (back), and SPAfallback / SPAfallfwd frames 289-291, 305-307, 313, 329 (limbs clear of the body).
4. `tex3.py`: every surface point votes for a palette zone from each frame where it is visible, in that frame's own pose. Shading is flattened first (light / medium / dark of a zone count as one zone). Votes are pooled so stripes wrap round limbs and left / right mirror.
5. `make.py` / `export.py`: voxelise (0.5 sprite px), export GLB / OBJ / MagicaVoxel, render turntables. Shading is applied afterwards from the surface normal, using the game's own light / medium / dark indices.

## Run
```sh
cd sprite-textures/scripts/model3d
python3 fit.py 1,6,11,16,21,26,31,36 25 fit1.json
python3 fit2.py fit1.json fit2.json
python3 fit3.py fit2.json fit3.json
python3 fit4.py fit3.json fit4.json
python3 tex3.py fit4.json compare.png model.npz
python3 make.py model.npz out/ tor
```
Needs numpy, scipy, pillow, cma, trimesh. Camera: orthographic, pitched 25 degrees, yaw 45 degrees per direction (d0 = facing away).

## Known limits
Arms come out thin, the stick pose is unreliable (it is drawn differently in every direction), and the back of the jersey has less detail than the front.
