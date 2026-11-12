# 3D presentation with shared 2D gameplay

Visual-only remake: genuine 3D models on the original 2D gameplay plane. The simulation (`src/simulation.ts`), level data, controls and audio are untouched;
the new renderer (`src/render3d/`) only READS the same `Simulation` state the 2D renderer reads. The original renderer remains the default.
The original visual work started at `4a986d4`. Its renderer and asset builders were recovered from successful development-session writes and integrated with the updated simulation in this release. The old branch alone did not contain the uncommitted visual implementation.

## Run it (private ports; never touches other servers)
```bash
npx vite --port 5473 --strictPort --host 127.0.0.1      # dev
# open http://127.0.0.1:5473/?view=3d   (original renderer: http://127.0.0.1:5473/)
npm run build && npx vite preview --port 5474 --strictPort --host 127.0.0.1   # production build
# open http://127.0.0.1:5474/?view=3d
```
URL options: `res=960p|1080p|2K|4K` (render resolution 1024x960 default, 1152x1080, 1536x1440, 2304x2160; also a picker in the page's button row, switchable while playing), `scale=2|3|4|6` (256*scale x 240*scale), `quality=low` (no MSAA/bloom, 2048 shadow map: the fallback for weak GPUs),
`debug=1` (simulation hit boxes drawn over the 3D scene). Controls are the game's own (arrows, Z/Space jump, X/Shift run/fire, Enter start, P pause, M mute).

## Rebuild the assets
```bash
python3 visual3d/tools/character-textures.py              # CC0 character materials + author attribution
.cache3d/venv-tools/bin/python visual3d/tools/polyhaven.py   # CC0 HDRIs, textures, vegetation/tree scans -> assets3d/ph (gitignored)
visual3d/blender/run.sh visual3d/blender/build_kit.py        # blocks, pipes, castle, campaign pieces, photo-scanned materials
visual3d/blender/run.sh visual3d/blender/build_mario.py      # Mario, rigged + clips
visual3d/blender/run.sh visual3d/blender/build_enemies.py    # enemies
visual3d/blender/run.sh visual3d/blender/build_items.py      # power-ups, coin, fireball
visual3d/blender/run.sh visual3d/blender/build_npcs.py       # toad, princess
visual3d/blender/run.sh visual3d/blender/build_vegetation.py # decimated CC0 shrubs/grass/ferns/rocks/flowers (VEG_ONLY=a,b to rebuild some)
visual3d/blender/run.sh visual3d/blender/render_impostors.py # Cycles tree impostor cards -> assets3d/impostors (~35 s on GPU; IMPOSTOR_DEVICE=CPU)
node visual3d/tools/optimize.mjs                               # -> assets3d/models/*.glb + index.json (meshopt)
```
Set `BLENDER_BIN` to an existing Blender executable and `BLENDER_THREADS` to limit CPU work. The character-material downloader uses the Python standard library; the Poly Haven downloader additionally needs Pillow.

Blender 4.5.15 LTS lives in `.cache3d/blender` (download `blender-4.5.15-linux-x64.tar.xz` from download.blender.org/release/Blender4.5 and extract there).
The original private design-reference sheets are not required by the included asset builders and are not distributed.

## Verify
```bash
npm test && npm run build                            # portable release checks
# Full native fidelity gate requires the original research fixtures; see docs/VERIFICATION.md.
npx tsx tools/visual3d/equivalence.ts                 # replay check: headless vs original vs 3D, states + audio events per frame
GHOSTRUN_NATIVE_GPU=1 node tools/harness/record-route.mjs --view 3d --frames 900 --out /tmp/route-3d
# See docs/RECORDINGS.md for capture limits and the published native action logs.
```

## How it works
- `coords.ts`: 1 world unit = 1 tile = 16 px; gameplay plane z = 0; camera = perspective (FOV 24 deg, 4.5 deg pitch: more sky above the horizon) placed so the 256 px window spans exactly 16 units at the plane.
- `world.ts`: visible tiles of the LIVE tile map -> instanced kit pieces every frame (bumps, broken bricks, used blocks follow the simulation); `semantics.ts` says what each metatile id is.
- `layout.ts` + `scenery.ts`: original hill/bush/cloud/tree tile clusters become single 3D objects set behind the plane, registered along the camera ray so they keep their screen position.
- Art direction: realistic AND colourful. Outdoor themes (ground, night, snow) use `nature.ts`: scanned-texture terrain, instanced CC0 vegetation and wildflowers, and tree impostors
  (full-detail scans rendered by Blender from the front; the camera never rotates, so a card per tree reads as 3D). Original hills/bushes become grassy knolls and fern/flower clumps,
  registered on the camera ray. Scan plant files hold several plants; `plants()` instances ONE recentred plant per point so nothing reaches in front of the blocks.
  Night: painted starry sky with moon (screen-space: the camera only translates, so a sky at infinity is fixed on screen), moonlight and fireflies. Snow: blue sky, snowfield, frosted trees, snow-capped blocks.
  `backdrop.ts`: underground = carved blue rock wall with glowing crystal clusters, castle = stone wall with flickering torches (a 6-light pool follows the camera), water = light shafts and bubbles, sky = cloud sea.
- `atmosphere.ts`: Poly Haven HDRI sky + image-based light, sun found in the HDR and turned front-left, soft PCF shadows, MSAA, GTAO, bloom, Khronos PBR Neutral tone mapping (keeps saturation), then a display-space grade (vibrance 0.6, contrast, warmth). Coins: procedural minted gold with its own studio reflection map, so they shine in dark areas too.
- `entities.ts` + `actors.ts`: skinned characters; clip and clip time are pure functions of simulation counters (walk/run phase follows distance travelled with the measured stride), so nothing can feed back into gameplay.
- `props.ts`: lifts, firebars, springs, vines, castle flag, fireworks, retainer. `hud.ts`: HUD/text screens in the original layout, drawn over the finished frame.
