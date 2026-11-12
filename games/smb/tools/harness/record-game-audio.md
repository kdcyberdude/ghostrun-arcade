# Game-only recordings with game audio

These tools capture the existing 2D canvas and the actual `AudioEngine` without changing the simulation. They do not run a policy.

```sh
node tools/harness/record-game-audio.mjs --actions data/observed-winning-inputs.json --frames 720 --out /tmp/new-capture
node tools/harness/audio-offline-check.mjs
```

The output contains `game.mp4`, the original source action JSON, raw H.264/PCM, an initial frame and a timing/state manifest. The default rate comes from `NATIVE_HZ` in the simulation. Every retained input step produces one timestamped video frame. The manifest records encoded timestamps, source hashes and audio commands; ffmpeg stream-copies the video and encodes the rendered PCM as AAC with a common zero epoch.

Audio is rendered by the unchanged game audio engine through `OfflineAudioContext`, using the game's decoded assets, loop points, channel replacement and actual `onended` callbacks. Suspensions at command times and interruption endings prevent offline rendering from outrunning those callbacks. Command timing is bounded by the 128-sample Web Audio block (2.667 ms at 48 kHz). The audio regression check exercises hurry music interruption and resumption. This is the browser game's audio output, not a substituted soundtrack or a claim of matching native APU samples.

## Independent observed starts

The optional entrance adapter accepts the retained 32-level v2 archive's observed initial RAM. It loads the mapped level's main area once, initializes observed player/HUD/camera/random fields and then leaves the simulation alone. It preserves the three observed airborne starts. Damage, death and all subsequent transitions remain active. The batch uses an explicitly calibrated direct-PPU controller transport: it empties the legacy two-frame queue once before the first input. Standard-reset recordings retain the legacy queue by default. It does not reconstruct full native emulator state, enemy-slot allocation, timer subphase or previous audio phase.

Export on the host with the existing environment and archive:

```sh
OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 RL_ROM_DIR=/path/to/roms \
python tools/harness/export-native-entrances.py --lab /path/to/lab \
  --archive /path/to/entrances.npy --logs /path/to/recordings/v2 --out /tmp/new-starts
node --import tsx tools/harness/native-entrance-check.ts /tmp/new-starts
node tools/harness/record-levels-audio.mjs --entrances /tmp/new-starts --out /tmp/new-recordings
```

The exporter adds a read-only RAM getter in a private CPU-library build. It restores the original entrance archive with the original seed and neutral warmup; no inference runs. Both before/after-warmup RAM are retained. The capture offset omits exactly the source boot/warmup prefix excluded by the original native MP4, with the offset and original source hash recorded. The remaining action masks and durations are unchanged.

Direct-PPU mode was calibrated against 128 fresh native rows at each of 1-1, 1-3 and the airborne 6-2 start. All 384 horizontal positions matched exactly; maximum vertical errors were 0, 0.1875 and 0.625 px. This bounded transport check does not prove full-level fidelity. `check-input-transport.ts` retains the per-frame comparison. Each capture records requested masks, masks consumed by the controller transport, and effective masks after ordinary gameplay input filters. No future inputs are primed.

The batch is sequential and records each real outcome. Capture stops at game-over/ending, a natural departure from the initialized level, or the end of the supplied input prefix. The native clip and browser clip may have different outcomes and lengths. Any comparison must explicitly state the shared action prefix and both clocks; these recordings do not prove continuous native-equivalent clears.
