# Texture attribution

All photo-scanned surfaces come from Poly Haven (https://polyhaven.com), licence **CC0 1.0** (public domain, no attribution required; credited anyway).
Downloaded at 1k (Diffuse, nor_gl, Rough) via api.polyhaven.com into `.cache3d/polyhaven/` (git-ignored) and tiled into each asset atlas at true size (1 tile = 0.8 m) by `lib/bake.py`. Only the baked atlases ship inside the .glb files.

| asset id | name | authors | real size (mm) | used for |
|---|---|---|---|---|
| [denim_fabric](https://polyhaven.com/a/denim_fabric) | Denim Fabric | Rob Tuytel | 100 x 100 | Mario cap/shirt (luminance only, 1.6x scale), overalls, emblem |
| [stretch_poplin](https://polyhaven.com/a/stretch_poplin) | Stretch Poplin | colormass, Rico Cilliers | 291 x 281 | princess dress |
| [cotton_jersey](https://polyhaven.com/a/cotton_jersey) | Cotton Jersey | colormass, Rico Cilliers | 264 x 264 | Mario gloves, Bullet Bill arms |
| [brown_leather](https://polyhaven.com/a/brown_leather) | Brown Leather | Rob Tuytel | 400 x 400 | Mario shoes, enemy shoes/feet |
| [velour_velvet](https://polyhaven.com/a/velour_velvet) | Velour Velvet | colormass, Rico Cilliers | 284 x 273 | mushroom/1-up caps and spots, fire flower petals, Toad cap, princess trim |
| [metal_plate](https://polyhaven.com/a/metal_plate) | Metal Plate | Rob Tuytel | 500 x 500 | Bullet Bill body, Lakitu goggles |
| [rusty_metal_02](https://polyhaven.com/a/rusty_metal_02) | Rusty Metal 02 | Rob Tuytel | 1000 x 1000 | hammer head, Bullet Bill base, Hammer Bro helmet |
| [fabric_leather_02](https://polyhaven.com/a/fabric_leather_02) | Fabric Leather 02 | Rob Tuytel | 500 x 500 | Goomba cap |
| [rough_linen](https://polyhaven.com/a/rough_linen) | Rough Linen | colormass, Rico Cilliers | 271 x 271 | Toad vest and trousers |

Everything else (skin, hair, keratin shells, reptile scales, fungal hide, worn gold, eyes) is procedural (numpy, `lib/detail.py`). No other third-party assets.
