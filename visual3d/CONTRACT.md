# 3D visual kit: asset contract

Visual-only experiment. The simulation (`src/simulation.ts`), levels (`data/`), controls and audio are NOT changed. The new renderer
(`src/render3d/`) reads the same `Simulation` state the 2D renderer reads, and draws genuine 3D models on the original 2D gameplay plane.

## Coordinates (shared by Blender, the glTF files and three.js)
- 1 world unit = 1 tile = 16 NES pixels. The gameplay plane is z = 0. +X = right, +Y = up, +Z = toward the camera.
- Blender authoring axes: face **+X**, up **+Z**, the camera-facing side is **-Y**. Export with `export_yup=True`
  (Blender +Z -> glTF +Y, Blender -Y -> glTF +Z). In three.js the model then faces +X with +Z toward the viewer.
- **Characters**: origin at the feet centre (x = 0, y = 0 on the ground, z = 0 mid-body). Standing, facing right.
  - Mario (big): about 2.0 units tall incl. cap, shoulders about 0.9 wide, body depth about 0.6 (the hit box is 12 px = 0.75 wide).
  - Small Mario is the SAME model scaled to 0.5 by the renderer; provide a `Chibi` morph target (bigger head, shorter limbs/torso) the renderer sets to 1 for small Mario.
  - Goomba / Koopa / most enemies: 1.0 unit wide (16 px), Koopa 1.5 tall (24 px), Goomba 1.0 tall.
- **Tile pieces** (blocks, bricks, pipe segments): origin at the tile CENTRE, the cube spans [-0.5, 0.5] in x, y and z (front face at z = +0.5).
  Pipe pieces: origin at the centre of the base tile of a 2-wide pipe (x in [-1, 1]), height n tiles is composed by the renderer from `pipe_top` + repeated `pipe_body`.
- **Scenery** (hill, bush, cloud, tree...): origin at the bottom centre of its footprint; authored at a 1-tile-wide-multiple footprint
  (`hill_small` 3 wide, `hill_large` 5 wide, `bush_1/2/3` 1/2/3 wide plus 1 end cap, `cloud_1/2/3`), z extent behind the plane (z in [-3, 0]).
- Y-up three.js, right-handed, metres are not meaningful; keep every file in these units.

## Animation (characters and animated props)
- Clips are keyframed in Blender actions and exported as glTF animations. Names are exact (lowercase). Looping clips must loop seamlessly.
- **No root motion.** The root bone/object never translates in x or z, and never changes y except for deliberate pose height (crouch/jump squash). The renderer drives position from the simulation.
- Mario clips: `idle` (loop ~2 s), `walk` (loop, one full cycle = 1.0 s), `run` (loop, 0.6 s), `skid` (hold), `jump` (hold, rising pose), `fall` (hold), `duck` (hold),
  `swim` (loop 0.8 s), `climb` (loop 0.8 s, hands/feet alternate on a vertical pole), `slide` (hold, hugging a pole), `death` (hold, arms up), `throw` (one-shot 0.25 s), `victory` (loop).
- Enemy clips are listed per asset in `visual3d/blender/out/MODELS.md` (at least `walk` for walkers, `idle` for stationary ones).

## Materials (so the renderer can recolour at run time)
- glTF PBR metallic-roughness only (Principled BSDF, no exotic nodes). Textures PNG or JPEG, at most 1024 x 1024 per asset; packed ORM is welcome.
- Mario: material names `M_Cloth_Primary` (cap + shirt, red), `M_Cloth_Secondary` (overalls, blue), `M_Skin`, `M_Hair`, `M_Glove`, `M_Shoe`, `M_Button`, `M_Eye`, `M_Emblem` (cap emblem).
  The renderer recolours the two cloth materials for Luigi (green / dark blue) and Fire (white / red).
- Koopas: `M_Shell` is recoloured for the red variant. Other enemies: keep one palette material per major body area, named `M_<Part>`.

## Budgets
Mario <= 30 k triangles, any enemy <= 12 k, any block/pipe piece <= 3 k, scenery piece <= 8 k. Whole level kit loaded at once <= 12 MB after optimisation.

## File layout
```
visual3d/blender/lib/*.py        shared helpers (materials, bevels, rig/anim helpers, export)
visual3d/blender/build_*.py      one script per asset family; each one is runnable with visual3d/blender/run.sh and rebuilds its GLBs from scratch
visual3d/blender/out/*.glb       raw exports (the renderer never reads these directly)
visual3d/blender/out/MODELS.md   node names, clips, anchors, triangle counts for every asset
visual3d/blender/previews/*.png  turntables / pose sheets for review
visual3d/ai3d/                   image-to-3D experiments and report
assets3d/models/*.glb            optimised runtime files (written by visual3d/tools/optimize.mjs only)
visual3d/ASSET_MANIFEST.json     provenance + licence for every asset (tool, source, licence, attribution)
```
Owners: the renderer (`src/render3d/`, `tools/visual3d/`, `assets3d/`) belongs to the lead. Asset helpers write only under `visual3d/blender/` and `visual3d/ai3d/`.

## Rules that never change
- No ROM or executable inspection. The existing sprites (`visual3d/refs/*.png`, `assets/graphics/`) are DESIGN REFERENCES only; never ship them.
- No paid or proprietary generation services; open-source models and tools only; record every licence in `ASSET_MANIFEST.json`.
- Never use the main checkout `/home/kd/Desktop/proj/build_games_from_scratch_in_threejs` (read-only reference). Work only in this worktree.
