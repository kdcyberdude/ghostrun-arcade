# Reproduce the recorded action clips

The two renderers use the same simulation. `tools/harness/record-route.mjs` resets once, sends an unchanged run-length controller stream, and writes one rendered PNG per simulation step into a silent 60 fps MP4. It also writes the source SHA-256, initial-state convention and sampled simulation snapshots. It never corrects player positions during playback.

```bash
node tools/harness/record-route.mjs --self-test
node tools/harness/record-route.mjs --view 2d --frames 900 --out /tmp/route-2d
GHOSTRUN_NATIVE_GPU=1 node tools/harness/record-route.mjs --webcodecs --view 25d --frames 900 --out /tmp/route-3d
```

`--webcodecs` encodes actual canvas frames directly in Chrome, retaining explicit timestamps and checking that every frame is emitted. It avoids per-frame PNG transfer; unsupported H.264 configurations fail clearly, and omitting the option uses the PNG fallback. Its first 60-frame 2D smoke test decoded to exactly 60 frames and one second. Full-length and 3D encoding require their own verification.

Output directories must not already exist. The default source is `data/observed-winning-inputs.json`, an earlier observed reference route. Use `--actions /absolute/path/to/actions.json`, `--from 0` and `--frames 900` to select a different interval. The recorder supports standard reset and power-on logs only. A later v2 level entrance needs its exact saved starting state and is rejected here rather than silently substituted.

Install FFmpeg and Chrome; set `CHROMIUM_PATH` when Chrome is in a different location. `GHOSTRUN_NATIVE_GPU=1` uses Metal on macOS and Chrome's default GPU backend elsewhere. Software rendering is the portable default. `--resolution 1080p` selects the 3D render resolution; 2D preserves its native pixel canvas.

A matching renderer replay demonstrates that graphics did not alter the checked simulation. It does not establish native-game fidelity, a fresh closed-loop policy win, or equivalence between legacy CPU-cycle slices and completed PPU frames. The MP4's 60 fps is its presentation rate. These offline captures omit audio because simulation steps do not follow the wall-clock audio engine; live-play captures can retain the actual game sound.

## Published native model-view recordings

The [v2 all-level recording release](https://github.com/kdcyberdude/ghostrun-lab/releases/tag/recordings-v2-20261111) contains all 32 selected videos, controller bytes, eight-mood scores and a per-level audit: 23 clears, 8 game overs, 1 capped attempt. These are independent level-start attempts. Preview MP4s omit some boot/warmup/terminal frames included in the action logs, so they cannot be aligned by simply pairing frame zero. See the release report before using them in a comparison.

The [fresh v1 recording release](https://github.com/kdcyberdude/ghostrun-lab/releases/tag/recordings-v1-20261111) retains the full action stream across all 32 levels, per-level clips and original screenshots. Its terminal Princess-room image precedes the ending text; `won=false` is retained. The videos are silent tick-sampled previews using the older frame-clock convention.
