# Native SMB combined batch gate

This tool validates a frozen, assembled candidate once. It does not change runtime rules or establish full game fidelity. Resolve merge conflicts and finish source edits before running it.

From `games/smb`, supply the checkout, original32 native captures, entrance receipts, and an immutable prebatch report/Git reference:

```sh
node tools/harness/native-batch-gate/gate.mjs \
  --worktree /path/to/checkout \
  --traces /path/to/native/traces \
  --entrances /path/to/threejs-2d \
  --baseline /path/to/prebatch-report.json \
  --baseline-ref b4c934e \
  --out /path/to/new-empty-batch-directory
```

For the historical November13 batch, `b4c934e` generated the prebatch `smb-integration-podoboo-norun.json` report. Keep that report immutable and pass it explicitly. Other prebatch reports and their corresponding Git references are accepted; the historical readiness allowance only matches the exact recorded baseline fingerprint.

The gate rejects unresolved merges and nonempty output directories. It runs one original32 detailed/strict survey, v2 excerpt regeneration, all9 water excerpt replays, ID51 coverage accounting, full `npm test`, TypeScript, then JSON comparison. Logs and reports go to the new output directory. Only the requested excerpt firsts change in the checkout; it never commits or pushes. Tracked source/data/tools/tests/assets are hashed before and after to detect edits during validation.

Water ratchets replay the current excerpt's encoded original inputs and RAM without recompressing or replacing them. Payload hashes must match before/after and the prebatch Git reference. The9 expected excerpts are the three `water-{down-strokes,reverse,right-strokes}` runs for5-2,6-2,7-2.

`comparison.json` records every changed legacy/strict first, coverage additions, narrowly documented causal cases, existing diagnostics, and unclassified regressions. `gate.json` records commands, exit status and source stability. Missing fields, changed input lengths, reduced comparison coverage and changed payloads fail. There is no generic waiver merely because another field diverged earlier.

`exceptions.json` is an explicit historical audit policy, not game logic. ID51 expansion counted4703 active source actor rows,251 birth rows skipped by the existing legacy adapter and4452 newly mapped rows, before legacy area/engine gates. Exact water-run and Hammer hold cases require their documented unchanged earlier fields. The1-2 readiness case is bound to the historical pre-readout report fingerprint: unchanged b4c934e simulation with the newer readout already exposed3059. Portable evidence is in `evidence/native-readiness-coverage-1-2.json`, `evidence/native-hammer-hold-causal-8-3.json` and `evidence/water-camera-causality.json`.

`BATCH_NON_REGRESSION_PASS` means no unclassified regression against the supplied baseline. It does not mean all levels or pixels match. Existing strict gaps remain visible; pixels,3D and the336-recording corpus need their separate checks.

Run the small synthetic/portable-proof self-tests without native caches or full replays:

```sh
node tools/harness/native-batch-gate/selftest.mjs
```

To classify existing reports without rerunning the gate:

```sh
node tools/harness/native-batch-gate/compare.mjs \
  --baseline /path/to/prebatch-report.json \
  --candidate /path/to/candidate.json \
  --water /path/to/water-excerpts.json \
  --cannon-coverage /path/to/cannon-coverage.json \
  --out /path/to/comparison.json
```
