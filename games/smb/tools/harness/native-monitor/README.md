# SMB progress

Terminal viewer for NES-versus-remake audit receipts, plus the fast ways to produce new ones.
Policy and receipt rules: [TERMINAL.md](TERMINAL.md). Run everything from the repository root.

```sh
games/smb/tools/harness/native-monitor/smb-progress          # live view; 0 overview, 1-8 world, q quit
node games/smb/tools/harness/native-monitor/terminal.mjs     # one snapshot
```

## Setup

Machine-specific data lives in the ignored `.local/` folder (or pass `--monitor /ABS/DIR`).
`.local/sources.json` needs `snapshots` (the last entry's `mood` report supplies the inventory and its
sibling `traces/1-1 … 8-4`) and `combined`, the full historical every-frame receipt.

## What the view shows

* **Historical full audit**: the registered `combined` receipt (every frame of all 368 recordings,
  state AND picture). Its build is printed in the title; its totals stay historical until a new full audit.
* **Newer build results**: receipts registered with `--add-current`, listed per level and labelled
  * `STATE ONLY · pictures not compared`: from `native-state-replay.ts`;
  * `STATE+PICTURE`: a level-scoped `combined-monitor-audit.ts` audit (joint, state and picture counts);
  * `CURRENT` when the measured `src/` and `data/` equal HEAD's (clean tree), otherwise `OLDER BUILD <sha>`. Targeted receipts (a subset of recordings) say so.
* In the overview grid, a level with a CURRENT state+picture result shows that result, marked `*`;
  every other cell is the historical build.

## Fast development loop (World 1-1 example)

1. **State only, seconds.** Headless Node replay of every recording with the audit's own comparators:

   ```sh
   cd games/smb && ../../node_modules/.bin/tsx tools/harness/native-state-replay.ts \
     --monitor tools/harness/native-monitor/.local --out /ABS/state-1-1.json --levels 1-1
   ```

   `--ids a,b` replays only those recordings; `--jobs N` sets worker processes (default CPUs − 2).
   Works on an uncommitted tree; the receipt records `runtimeDirty` and is shown as such.

2. **Which recordings fail?**

   ```sh
   node games/smb/tools/harness/native-monitor/terminal.mjs --plan-failures 1-1
   ```

   Writes `.local/targeted-1-1-plan.json` (failing ids, failed-frame windows) from the newest
   registered evidence for that level, and prints an `--ids` value for step 1 or 3.

3. **State and picture, minutes.** On a committed, clean checkout:

   ```sh
   node games/smb/tools/harness/native-monitor/run-audit.mjs --runtime /ABS/CHECKOUT \
     --monitor /ABS/MONITOR --out /ABS/NEW_DIR --levels 1-1 --shards 20
   ```

   For a quick targeted pass use the producer directly with `--ids … --levels 1-1` (one shard,
   `shard-complete` receipt, never a level total).

4. **Register** (`--add-current` replaces an older receipt of the same kind and levels):

   ```sh
   node games/smb/tools/harness/native-monitor/terminal.mjs --add-current /ABS/state-1-1.json
   node games/smb/tools/harness/native-monitor/terminal.mjs --add-current /ABS/NEW_DIR/combined-replay.json
   ```

## Speed (48-core machine, 368 recordings, 5,178,452 frames)

| Check | Frames replayed | Wall time | Notes |
|---|---|---|---|
| Old full every-frame audit, state+picture (cca2e44) | 5,178,452 | 2 h 57 m (8 shards) | ~490 frames/s; ~14.5 ms/frame per shard |
| State only, all levels (`native-state-replay.ts`) | 5,178,452 | 37 s (44 workers) | equals the old audit's state verdict on every frame |
| State only, `--levels 1-1` | 1,182,392 | 10 s idle machine · 52 s at 20 workers beside an RL job | |
| State+picture, `--levels 1-1`, 20 shards | 1,182,392 | ≈15 min idle (est.: 1,319 frames/s measured over 188 recordings) · 18.4 min beside an RL job | equals the old audit's picture verdicts on all 552,853 compared 1-1 frames |

Where the time went (one browser shard, per frame): native picture base64 transfer through CDP ~1.5 ms and
`Uint8Array.from(atob)` decode 2.3 ms (both replaced by a binary HTTP feed); `drawImage`/`getImageData`
2.1 ms (now `readPixels`, 1.6 ms); in-page state capture serialized every frame (now in Node).
SwiftShader rendering is CPU-bound: beyond ~20 shards on 48 cores throughput stops improving. The GPU
(`--use-angle=gl-egl`) renders identical pixels but read-back stalls made it slower (16.5 ms/frame).
Node state replay under tsx ran at 210 frames/s; its keep-names transform wraps every closure in the
source-machine hot loop. The esbuild bundle ran at ~1,700 frames/s per worker while the remake still embedded a copy
of the original program for lag timing (~90% of the remaining time); that copy is gone (commit
ab3e2f2), and the World 1-1 state check now takes 8.5 s on 24 workers. Native lag frames (6 in the corpus)
are skipped in both checks and counted unchecked; see TERMINAL.md.

## Verification

```sh
node --test games/smb/tools/harness/native-monitor/*.test.mjs
```
