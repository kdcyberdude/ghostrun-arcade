# Mario visual and sound assets

This package was extracted from the locally supplied ROM. It contains PNG, WAV,
JSON and a small Three.js helper. It contains no ROM, NSF, model, emulator or
training data. Read `manifest.json` for source identities and validation.

- `graphics/patterns-preview.png`: all512 raw8×8 patterns in16columns. The last20
  patterns overlap title-screen command data and are not all artwork.
- `graphics/patterns-index.png`: same layout; byte values0–3 are pixel color
  indices, not display brightness. Sprite bank is the first256patterns,
  background bank the second256.
- `graphics/metatiles-palette-*.png`:101 original16×16 background blocks in16columns,
  colored using palettes observed in gameplay. `graphics-manifest.json` maps block
  IDs to rectangles; palette observations identify the sheet and first encounter.
- `graphics/player-*.png`:26 ordinary right-facing16×32 player cells in13columns.
  Filenames encode the four NES color indices; transparency uses pixel index0.
  Blank top rows of small Mario preserve the original32pixel origin.
- `graphics/player-{mario,luigi,fire}-{left,right}.png`: named palette variants
  using52 source-derived directional assemblies, including native symmetric-row
  and death-cell flips. `tables.json` supplies annotations and descriptors.
- `graphics/special/`: powerups, coins, flames, explosions, vines, flags,
  platforms and other source-derived composites, using the first ground-area
  runtime palette. Its index records exact assembly and palette choices.
- `graphics/enemy-table-*.png`:43 raw16×24 enemy table cells in11columns. Native
  state-dependent flips, offsets, palette selection and multipart assembly still
  need implementation; these are table references, not universally final poses.
- `graphics/sprite-tiles-*.png` and `background-tiles-*.png`: complete banks with
  each observed four-color subpalette. Cross-product variants do not all occur
  naturally. Background index0 is opaque universal background; sprite index0 is
  transparent. `tables.json` retains original table bytes and source addresses.
- `screens/`: title,32 level-start screenshots and ending at256×240, plus logical
  nametable PNG/JSON snapshots. These are not complete level maps.
- `audio/`:41 original-driver renders at48kHz16bit mono:40 audible captures and
  an intentional silence command. Metadata names music/effects/speed variants.
  Recurring captures are180seconds, victory is30seconds; these are finite renders,
  not verified seamless loops. No exact loop points or analog audio equivalence
  is claimed. Pause/unpause use the same native tone routine.

The RGB palette matches the pinned emulator used for validation. NES composite
video colors depend on the decoder/display, so a different emulator may look
different. All8192 CHR bytes roundtrip exactly. The controller replay matched all
10626 reference policy-image hashes, cleared32 ordered levels and reached the
native ending. This extraction replay is not new model inference or training.

## Using the assets in Three.js

```js
import * as THREE from 'three';
import {loadPixelTexture, pixelQuad, pixelCamera} from './three-assets.mjs';
const renderer = new THREE.WebGLRenderer({antialias: false});
renderer.setPixelRatio(1);
renderer.setSize(256 * 3, 240 * 3); // Integer scaling preserves sharp pixels.
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
const camera = pixelCamera(THREE);
const scene = new THREE.Scene();
const texture = await loadPixelTexture(THREE, './graphics/player-mario-right.png');
const mario = pixelQuad(THREE, texture, [0, 0, 16, 32]);
mario.position.set(40, 48, 1); // Quad center; world Y increases upwards.
scene.add(mario);
renderer.render(scene, camera);
// Browser user gesture is required before starting audio.
const audio = new Audio('./audio/music_ground.wav');
// audio.play(); Do not set loop=true until a seamless loop has been authored.
```

Use the RGBA sheets for display. The index PNGs are data for your own palette
shader. Keep nearest filtering, no mipmaps, integer scaling, an orthographic
camera and no lighting/tone mapping. Exact gameplay also requires implementing
physics, camera scrolling, timing, sprite priority, clipping and animation rules.

Primary references: [addressed game disassembly](https://www.6502disassembly.com/nes-smb/SuperMarioBros.html),
[readable game source](https://github.com/Xkeeper0/smb1/tree/main/src),
[GME audio renderer](https://github.com/libgme/game-music-emu).
