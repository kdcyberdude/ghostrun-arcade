# Native mood corpus

These tools replay the supplied `runs/rl/**/eval/itNNNNNN/smb_moodK.pads.bin`
files. A byte is one completed PPU frame from POWER-ON, with A/B/Select/Start/
Up/Down/Left/Right in bits0..7. Discovery includes hidden and ignored paths.
SHA-256 deduplication preserves every source path and matching summary row.
The original inventory has336 files,336 distinct streams and5,032,416 frames.

## Capture and resume

```sh
npx tsx tools/harness/native-mood-corpus.ts --root LAB/runs/rl --out CACHE
npx tsx tools/harness/native-mood-corpus.ts --root LAB/runs/rl --out CACHE \
  --capture --lab LAB --nesle NESLE --rom ROM --jobs 4
```

`LAB/rl/csrc/rlenv_build.hpp` supplies the exact rollout `HostMachine`, using
CPU RAM `$FF`, PPU dot0 and first frame target vblank241:1. The standalone C++
observer applies every byte exactly once. It does not call `env.start`, restore
an entrance archive, apply hidden neutral frames or trim a boot prefix. It
writes initial RAM before byte0 and RAM after each subsequent byte. Source,
ROM, input and RAM hashes and provenance accompany each content-addressed
capture. Failed partial outputs have no completion receipt and can be retried.
Native capture caches are reused by backend/input/ROM identity and output size;
the audit verifies the complete stored input and RAM hashes before using them.
The expected reference ROM hash is checked; no ROM is copied into the repo.

`CACHE/captures/SHA/{initial.ram,pads.bin,ram.bin,capture.json}` is the full
native run. No title, death, game-over or area-control row is omitted.
`CACHE/inventory.json` retains all original file provenance and summaries.
Unfinished summary rows (`end=running`) do not establish final death counts.

## Entry splits and replay audits

```sh
npx tsx tools/harness/native-mood-audit.ts --cache CACHE \
  --runtime-ref IMMUTABLE_COMMIT --write-traces
npx tsx tools/harness/native-mood-report.ts --cache CACHE \
  --runtime-ref IMMUTABLE_COMMIT
```

Both commands support a retained corpus without policy inference. The audit
supports `--limit N` and `--hashes SHA,...`. It checks that runtime src/data match
the stated commit. Audits can resume when runtime, harness, native RAM, pixel
capture and artifact-write signatures match. Reports retain runtime and harness
identities; intermediate reports list multiple harness versions explicitly.

Native mode1/task0→1 identifies InitializeArea epochs, including death respawns
and same-stream returns. ROM AreaData pointers and load pages establish the
compiled scene and coordinate origin. An epoch exports its first native
engine7/8 entry even when the initializer cannot represent it. A separate replay
starts at the first supported engine7 or first engine8 snapshot; the audit never
searches later movement for a conveniently matching pose. Every earlier row
remains in native control spans and explicit coverage counts.

`entries/NNNN/native-entry/{traces,receipts}/LEVEL` retains the actual source
entry. `entries/NNNN/{traces,receipts}/LEVEL` is the supported comparison entry,
using the existing initial.ram/pads.bin/ram.bin and entrance.json layout. These
can be passed directly to native-divergence/native-pixels. The receipt carries
its ROM scene binding and exact source frame offset. Default v2 entrance
validation remains unchanged. The optional source snapshot profile seeds raw
pose/subpixels, clocks and already-active actors; falling state uses native
$070A instead of inventing a new jump class. Native water snapshots preserve
all motor, stroke, prior-input, actor and bubble state, including engine7.
A native Piranha absent from static declarations can be restored from its fixed
x/DownYPos, but is reported as `snapshot-native-actor-not-declared`.

An independently seeded entry does not prove continuous POWER-ON equivalence.
Hidden initial state, unsupported control phases/object families, no-coordinate
rows and untested pixels remain explicit incomplete coverage. State-stepped
frames are not the same as fully compared frames. The report separates legacy
and strict field clusters by scene, engine and actor, with source RAM, random
register, slot state and earlier divergent fields attached to examples.

## Lossless pictures and untruncated UI audit

```sh
npx tsx tools/harness/native-mood-corpus.ts --root LAB/runs/rl --out CACHE \
  --pixels --lab LAB --nesle NESLE --rom ROM --limit 2
# Repeat audit --write-traces for newly captured pixel entries.
npx tsx tools/harness/native-mood-ui.ts --cache CACHE \
  --runtime-ref IMMUTABLE_COMMIT --limit 2
```

Pixels are240×224 NES palette-index binary frames plus224 emphasis bytes,
never millions of PNGs. The picture replay must reproduce the entire RAM hash
of the render-free capture. Entry clipping keeps exact source offsets. The UI
runner compares every stored frame, including frame0 and frames after a state
divergence, and records results under each entry's ui.json. Native-pixels retains
its original cutoff by default; `--all-frames` opts into the untruncated audit.
Scroll alignment uses ROM scene origins. Unknown alignment, empty comparisons
and zero playfield overlap are incomplete, never a pixel pass. Source late
status-bar splits and queued graphics remain measured differences; no rows are
masked to manufacture zero. Only requested diagnostic PNGs are exported.

The first336-run frozen report is outside git at
`/tmp/smb-mood-corpus/corpus-report-29b5de7.json`: all5,032,416 native rows were
captured,4,458,061 rows stepped,4,137,615 had coordinate comparison,2,631/2,681
entry epochs initialized, and no complete all-field/pixel proof was claimed.
Those numbers precede the final falling/water/Piranha snapshot improvements and
must not be substituted for a newer runtime/harness report.

Reports group load-prefix field failures under `control-prefix`, including captures that end before gameplay. `coverageGaps` separately groups unsupported object families and other unverified controls by scope, level, area and diagnostic. These groups remain incomplete even when their compared fields match. Group examples retain source-frame offsets and trace/receipt paths for reproducing the same input.
