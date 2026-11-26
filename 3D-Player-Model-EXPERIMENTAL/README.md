# 3D Player Model from Sprites (EXPERIMENTAL)

> **EXPERIMENTAL. Work in progress, paused.** Nothing here is a finished tool or a finished asset.
> The models are rough, the scripts are research code with hard-coded paths, and the numbers in the
> notes describe an experiment, not a supported pipeline. Expect things to be broken.

This folder collects an experiment (November 2026) in rebuilding the player as a 3D model from the
game sprites of **NHL 95 PC** and **NHL 96 PC**:

- **NHL 95 PC**: a jointed template fitted to the palette-zone part labels of the 95 sprites
  (Toronto home), meshed, then coloured from the front and back control sprites. Five rounds (v1 to v5).
- **NHL 96 PC**: the 96 sprites turned out to be renders of a 3D model (one rigid pose seen from
  8 yaw angles, about 13 degrees of camera pitch). A clean low-poly Buffalo home player with one rule-based
  texture was rebuilt from them. Five rounds (clean v1 to v5), plus a first rig and pose solver.

The work was paused on 2026-11-18. See [`scripts/FINDINGS.md`](scripts/FINDINGS.md) for everything that was learned.

## Pictures

The pictures in this section are renders of the models only. Comparisons against the game sprites are in the next section.

### NHL 95 PC and NHL 96 PC side by side

Each game's model turned at that game's own sprite size and camera pitch (95: about 37 px tall, about 25 degrees;
96: about 58 px tall, about 13 degrees), one sample per pixel like the games. Left is the 95 model, right the 96 model. Shown at 5x.

| At NHL 95 PC resolution | At NHL 96 PC resolution |
| --- | --- |
| ![95 and 96 models at 95 resolution](compare_95_96/turntable_nhl95_angle_and_size.gif) | ![95 and 96 models at 96 resolution](compare_95_96/turntable_nhl96_angle_and_size.gif) |
| Actual size: ![](compare_95_96/turntable_nhl95_angle_and_size_1x.gif) | Actual size: ![](compare_95_96/turntable_nhl96_angle_and_size_1x.gif) |

### NHL 96 PC (Buffalo home), latest round (clean v5)

| Hi-res | Sprite size | Actual size |
| --- | --- | --- |
| ![96 v5 hi-res turntable](nhl96pc/clean_v5/turntable_large.gif) | ![96 v5 sprite-size turntable](nhl96pc/clean_v5/turntable_sprite_size.gif) | ![96 v5 actual size](nhl96pc/clean_v5/turntable_sprite_size_1x.gif) |

![96 v5 large views](nhl96pc/clean_v5/large_views.png)

The eight game directions at sprite size:

![96 v5 eight directions](nhl96pc/clean_v5/eight_directions.png)

Close-ups of the modelled helmet, gloves and skates:

![helmet](nhl96pc/clean_v5/closeup_helmet.png)
![gloves](nhl96pc/clean_v5/closeup_gloves.png)
![skates](nhl96pc/clean_v5/closeup_skates.png)

Angles the game never drew (in between its eight directions), clean v3:

![angles the game never drew](nhl96pc/clean_v3/angles_the_game_never_drew.png)

How it got there, sprite-size turntables of each round:

| Carved standing pose | Clean v1 | Clean v2 | Clean v3 | Clean v4 | Clean v5 |
| --- | --- | --- | --- | --- | --- |
| ![](nhl96pc/standing_pose/turntable_sprite_size.gif) | ![](nhl96pc/clean_v1/turntable_sprite_size.gif) | ![](nhl96pc/clean_v2/turntable_sprite_size.gif) | ![](nhl96pc/clean_v3/turntable_sprite_size.gif) | ![](nhl96pc/clean_v4/turntable_sprite_size.gif) | ![](nhl96pc/clean_v5/turntable_sprite_size.gif) |

### NHL 95 PC (Toronto home), latest round (v5)

| Hi-res | Sprite size |
| --- | --- |
| ![95 v5 hi-res turntable](nhl95pc/v5_mesh/turntable_mesh_large.gif) | ![95 v5 sprite-size turntable](nhl95pc/v5_mesh/turntable_mesh_sprite_size.gif) |

![95 v5 eight directions](nhl95pc/v5_mesh/mesh_8_directions_large.png)

Sixteen directions at sprite size:

![95 v5 sixteen directions](nhl95pc/v5_mesh/mesh_16_directions_sprite_size.png)

How it got there, hi-res turntables of each round:

| First model (voxels) | v2 | v3 | v4 | v5 |
| --- | --- | --- | --- | --- |
| ![](nhl95pc/previews/turntable_large.gif) | ![](nhl95pc/v2_mesh/turntable_mesh_large.gif) | ![](nhl95pc/v3_mesh/turntable_mesh_large.gif) | ![](nhl95pc/v4_mesh/turntable_mesh_large.gif) | ![](nhl95pc/v5_mesh/turntable_mesh_large.gif) |

Voxels to smooth mesh (v2):

![v2 before and after](nhl95pc/v2_mesh/before_after.png)

## Comparisons with the game sprites

### NHL 96 PC

Each round's sprite vs model vs wrong pixels at the eight game directions (top row: game sprites; middle: model; bottom: wrong pixels in red).

| Round | Picture |
| --- | --- |
| Clean v1 | ![](nhl96pc/clean_v1/sprites_vs_model_vs_errors.png) |
| Clean v2 | ![](nhl96pc/clean_v2/sprites_vs_model_vs_errors.png) |
| Clean v3 | ![](nhl96pc/clean_v3/sprites_vs_model_vs_errors.png) |
| Clean v4 | ![](nhl96pc/clean_v4/sprites_vs_model_vs_errors.png) |
| Clean v5 (latest, about 18% wrong) | ![](nhl96pc/clean_v5/sprites_vs_model_vs_errors.png) |

Sprites vs shaded model vs flat model (clean v3):

![](nhl96pc/clean_v3/sprites_vs_shaded_vs_flat.png)

Progress pictures with the game sprites, in order:

| Step | Picture |
| --- | --- |
| Buffalo sprite sample | ![](nhl96pc/progress/00_buffalo_sprites_sample.png) |
| The eight standing sprites | ![](nhl96pc/progress/01_buffalo_standing_8_sprites.png) |
| First carve, 8.6% wrong | ![](nhl96pc/progress/03_sprite_vs_model_vs_errors_8.6pct.png) |
| Voxels tuned to the 8 views, 3.4% (overfit) | ![](nhl96pc/progress/04_tuned_to_8_views_3.4pct.png) |
| Smoothed, 21.6% | ![](nhl96pc/progress/06_smoothed_model_21.6pct.png) |
| Number 88 drawn on the sprites | ![](nhl96pc/progress/08_number_88_on_sprites.png) |
| Low poly before fitting, 28.8% | ![](nhl96pc/progress/09a_low_poly_before_fitting_28.8pct.png) |
| Low poly 600 faces, 13.6% | ![](nhl96pc/progress/09_low_poly_600_faces_13.6pct.png) |
| Low poly 1,000 faces | ![](nhl96pc/progress/11_low_poly_1000_faces.png) |
| Buffalo palette as a 16x16 texture sheet, with 88 | ![](nhl96pc/progress/12_buffalo_palette_16x16_with_88.png) |
| Clean rule texture, 17.2% | ![](nhl96pc/progress/13_clean_rule_texture_17.2pct.png) |
| Shape refined under the clean texture, 11.6% | ![](nhl96pc/progress/15_clean_texture_shape_refined_11.6pct.png) |
| 96 model at 95 size and camera | ![](nhl96pc/progress/17_96_model_at_95_size_and_camera.png) |
| Shaded and symmetric | ![](nhl96pc/progress/18_shaded_and_symmetric.png) |
| Supersampling vs centre sampling | ![](nhl96pc/progress/19_supersampling_comparison.png) |
| Second pose, rigid parts only | ![](nhl96pc/progress/20_second_pose_rigid_parts_only.png) |
| Second pose after a two-pose shape fit | ![](nhl96pc/progress/21_second_pose_after_two_pose_shape_fit.png) |
| Standing after the two-pose shape fit | ![](nhl96pc/progress/22_standing_after_two_pose_shape_fit.png) |
| Held-back pose with new joints | ![](nhl96pc/progress/25_held_back_pose_with_new_joints.png) |
| Skating stride (pose fit fails) | ![](nhl96pc/progress/26_skating_stride_pose_fit_fails.png) |
| Crouch with new joints | ![](nhl96pc/progress/27_crouch_with_new_joints.png) |

### NHL 95 PC

Game sprites next to the model for the control frames and falls, and for the glide in 8 directions:

| Round | Controls and falls | Glide, 8 directions |
| --- | --- | --- |
| First model | ![](nhl95pc/previews/compare_controls_and_falls.png) | ![](nhl95pc/previews/compare_glide_8_directions.png) |
| v2 | ![](nhl95pc/v2_mesh/compare_controls_and_falls.png) | |
| v3 | ![](nhl95pc/v3_mesh/compare_controls_and_falls.png) | ![](nhl95pc/v3_mesh/compare_glide_8_directions.png) |
| v4 | ![](nhl95pc/v4_mesh/compare_controls_and_falls.png) | |

Sprite vs model, zoomed:

| v3 | Round 4 work | v4 | v5 |
| --- | --- | --- | --- |
| ![](nhl95pc/v3_mesh/zoom_sprite_vs_model.png) | ![](nhl95pc/wip_round4/renders/zoom_sprite_vs_model.png) | ![](nhl95pc/v4_mesh/zoom_sprite_vs_model.png) | ![](nhl95pc/v5_mesh/zoom_sprite_vs_model.png) |

First steps: voxel carve, first body-part fit, ten views flattened to zones:

![](nhl95pc/progress/01_voxel_carve.png)
![](nhl95pc/progress/02_body_part_fit_first_pass.png)
![](nhl95pc/progress/03_ten_views_flattened.png)

## Game data

The scripts read the sprites and palettes from your own copy of each game at run time; no game files are
stored here. The comparison pictures in the section below do show original game sprites
 

## What is here

| Folder | Contents |
| --- | --- |
| `compare_95_96/` | The final 95 and 96 models side by side as turntables, at each game's sprite size and camera pitch (`nhl95_angle_and_size` = 95 resolution, `nhl96_angle_and_size` = 96 resolution; `_1x` is actual size, the others are 5x) |
| `nhl95pc/model/` | First NHL 95 PC model: GLB, OBJ + MTL, MagicaVoxel `.vox`, fitted parameters |
| `nhl95pc/v2_mesh/` to `v5_mesh/` | Each later NHL 95 PC round: smooth mesh (GLB), voxels, parameters, turntables at sprite size and large (hi-res), 8 and 16 direction sheets |
| `nhl95pc/previews/`, `nhl95pc/progress/` | First turntables and intermediate pictures |
| `nhl95pc/wip_round4/` | State and renders from round 4 |
| `nhl96pc/clean_v1/` to `clean_v5/` | Each NHL 96 PC round: GLB, turntables at sprite size (`_1x` actual size) and large (hi-res), eight directions, angles the game never drew, close-ups (v4, v5) |
| `nhl96pc/standing_pose/` | The first carved standing-pose model and its turntables |
| `nhl96pc/progress/` | Intermediate pictures |
| `scripts/` | The NHL 95 PC scripts ([README](scripts/README.md)) and NHL 96 PC scripts ([README](scripts/nhl96/README.md)), plus `FINDINGS.md` |

The latest models are `nhl95pc/v5_mesh/nhl95pc_player_mesh.glb` and
`nhl96pc/clean_v5/nhl96pc_buffalo_player_clean_v5.glb`. Any glTF viewer opens them.

## Status and what is not done

- 95 PC: shape and texture are approximate; the result is not one clean texture yet.
- 96 PC standing pose: about 18% of pixels differ from the game sprites (about 5 points of that are outline pixels).
  Other poses are 39% to 46% off; the pose search is the limit, not the part sizes.
- Not done: texture for a bent torso, the chest and shins as clean shapes, the stick, a falls comparison with 95.
