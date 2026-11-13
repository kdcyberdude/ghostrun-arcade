# Actual every-frame state and picture audit (v2)

The human's final audit correction supersedes the former sticky-first-failure policy. Every recorded input is applied once, continuously, and every resulting state/picture observation is counted independently. First divergence is diagnostic only. A mismatch or unchecked prefix never changes the classification of later observed rows. State, picture and their joint outcome each show match/mismatch/unchecked counts. A joint row mismatches if either observed component mismatches; it matches only when both match; otherwise it is unchecked. Missing source ownership or unsupported readout fields remain explicit gaps, never assumed matches.

The inventory remains336 POWER-ON mood recordings plus32 original native-entrance recordings:368 recordings /5,178,452 input frames, inventory SHA256`28cc953708c8f0bbd38f26342c134796c68a9fda09497442f56cb16cf5700106`. Pictures keep the same palette normalization, full240×224crop, one-frame native PPU lag and blob policy: channel tolerance24,8-connected components above15native pixels fail. There is no mask, frame dropping or picture/state tolerance change. v1 sticky receipts are rejected and cannot be relabelled as v2 measurements.

`combined-monitor-audit.ts` uses bounded browser batches (default 16 frames). Every pad still steps/draws once in the browser. Native picture bytes reach the page as binary HTTP bodies from the audit's own Vite server (the same buffers Node hashes), the remake is read with `readPixels` from the renderer's preserved buffer, and the shared pure browser comparator returns compact picture results; RGBA transport is reserved for the first diagnostic image. State verdicts come from `native-state-replay.ts`, a plain-Node replay of the same pads with the same comparators (`LiveWorld1StateAudit` and `strictCompare`), run beside the browser; on the cca2e44 audit it reproduced all 5,178,452 per-frame state verdicts exactly. The side-by-side PNG is written only when a run's first failure is a picture mismatch. Every picture and emphasis byte is streamed into SHA256 and checked against its native capture metadata before a completed run is accepted. RAM/pads/initial-state hashes are also checked. Runtime commit, inventory, palette, policy and tool dependency hashes bind the report, and are checked again at completion. No native RAM is passed into the browser model, no future-state initialization is injected, and no post-divergence reset occurs. POWER-ON state coverage currently supports source-owned boot/title and World1-1; other unimplemented state modes stay unchecked while pictures continue to be measured. Original32 state uses an observational callback from the existing strict replay engine, not its first-divergence summary.

Run only after root supplies the final immutable batch checkout (tracked tree must be clean):

    node games/smb/tools/harness/native-monitor/run-audit.mjs --runtime /ABS/FINAL_CHECKOUT --monitor /ABS/EXISTING_SMB_PROGRESS --out /ABS/PERSISTENT/FINAL_PIN/every-frame --shards 8

The orchestrator partitions the unchanged368 recordings into8 disjoint shards, starts one browser worker per shard, and rejects missing/duplicate/mixed-source evidence. Every5seconds it atomically publishes`live-report.json`and`live-summary.json`containing ONLY complete recordings whose entire native picture/emphasis streams and runtime/tool manifests have been verified. Source verification runs before every completed recording is published. Active/unpublished recordings remain unchecked. The display pointer follows this live receipt through`--follow-live`; no completed-history entry is created while it is running. Aggregation succeeds only with5,178,452 directly observed frames and full native picture-stream authentication. It writes`combined-replay.json` and`summary.json`. Do not launch a second overlapping corpus audit. The old frontiers and diagnostic section audits do not substitute for this rerun.

For a bounded timing/transport pilot only, use the producer's`--ids`plus`--pilot-frames1..512`. Such pilots explicitly retain unchecked unmeasured tails, lack full picture-stream authentication and cannot be registered as completed reports. Fair throughput uses at least8 warmup frames for batch1 and batch8 alike; exact oracle comparisons still include every pilot row. The retained pilot receipt covers1024 genuine rows, with exactly equal classifications, first diagnostic hashes, readout coverage and source payloads for batch1 versus8. It measured121.4steady frames/s in one worker:11.85hours for one worker,1.48hours ideal8-worker scaling; allow roughly2–4hours provisionally for contention and unbenchmarked later phases. This is an estimate, not a completed-corpus claim.

After accepting the versioned correction, copy these consumer files into the existing display folder while preserving`sources.json`,`combined-inputs.json`and historical receipts: `combined-replay.mjs`,`combined-view.mjs`,`terminal.mjs`,`visual-check.mjs`,`visual-core.mjs`,`visual-policy.json`,`monitor.test.mjs`,`visual-policy-oracle.json`,`live-aggregate.mjs`,`source-provenance.mjs`,`TERMINAL.md`. Before restarting, run`node terminal.mjs --await-v2`in the existing display folder. This preserves its old configuration, archives any v1`combined-replay-<hash>.json`receipts from the automatically discovered notes directory into a timestamped`legacy-sticky-reports/`subdirectory with a SHA256 manifest, and clears the legacy config pointer. Thus an old loaded watch cannot fall back to historical sticky totals. Existing v2 results cannot be cleared by this command. Restart the Codex-owned watch to load the corrected modules; do not kill the user’s separate shell watch. The external shell can restart the same wrapper later; until then its legacy consumer has no sticky receipt to display. Until a v2 report is available, display “awaiting v2 every-frame audit”; never display old sticky totals as actual new counts. Register only the completed, validated ALL368 receipt:

    node /ABS/EXISTING_SMB_PROGRESS/terminal.mjs --add-combined /ABS/PERSISTENT/FINAL_PIN/every-frame/combined-replay.json

The versioned terminal can alternatively address the existing display configuration with`--monitor /ABS/EXISTING_SMB_PROGRESS`. `--follow-live /ABS/live-report.json`accepts only a running v2 receipt and checks all published runs are individually native/source-verified; it changes the config pointer without registering completion. Its completion-history file is separate from the legacy sticky-policy history. The policy tests and strict frame-observer tests cover later matching rows after failures, independent counters, unsupported rows, legacy rejection and visual algorithm equivalence. No gameplay change is part of this correction.

## Fresh selected-level reports

To audit only the native frames belonging to World1-1 and World1-2 on one new
immutable build, retain the same 368-recording / 5,178,452-frame inventory:

    node games/smb/tools/harness/native-monitor/run-audit.mjs --runtime /ABS/NEW_CHECKOUT --monitor /ABS/EXISTING_SMB_PROGRESS --out /ABS/NEW_PIN/w1-levels --levels 1-1,1-2 --shards 8

The report declares `scope: {levels: ['1-1','1-2'], frameSelection:
'all-target-level-frames'}`. Each run still has its full inventory `frames`;
`selectedFrames` and `directlyComparedFrames` must equal the complete native
selection, represented by canonical merged `selectedFrameSpans: [{from,to}]`.
`replayedFrames` is the last selected interval's exclusive end (or 0 if none).
Every earlier pad is consumed continuously from the declared recorded start;
there is no jump to an entrance or post-failure reseed. Nonselected rows retain
their actual native level labels and BOTH state/picture are explicitly
`unchecked`, including inputs after the last selected frame. The complete
native pixel/emphasis files must still be SHA-authenticated; hashing a suffix
without replaying it does not count that suffix as compared. Each selected
interval receipt is bound by `provenance.selectedFrameSpansSha256 =
sha(JSON.stringify(selectedFrameSpans))` and checked against all target-level
spans. Runtime/tool/native-stream provenance must describe the same build.

All 368 inputs must be processed before final registration, including records
with 0 selected frames. Final status is `scoped-complete`, NEVER full `complete`.
The full unscoped guard still requires5,178,452 directly compared frames.
Scoped direct totals equal only the sum of selected frames; all other inventory
frames remain unchecked. No old-build pictures or earlier state-only result
may be added to the new report. The same STATE/PICTURE/JOINT rules, picture
policy hash and15/16-pixel blob threshold remain unchanged.

The terminal shows a `SCOPE 1-1, 1-2` header, per-level STATE/PICTURE/JOINT counts,
the unchecked remainder and `SCOPED COMPLETE` when finished. While running,
unpublished input frames also remain unchecked. Scoped completion history is
written separately to `last-completed-scoped-every-frame-audit.json`; the old
full-build history and reports remain intact. A configured report pointer takes
precedence over fallback discovery timestamps, so touching an older full report
cannot displace the newly selected build.

Install the new consumer modules (`combined-replay.mjs`, `combined-view.mjs`,
`terminal.mjs`, plus the updated tests/docs) in the existing progress folder
without changing its inventory or historical receipts. Restart the intended
watch processes to load these modules; editing module files does not reload an
already running Node process. Use the normal `--follow-live` and `--add-combined`
commands with the NEW scoped receipt. Do not use `--await-v2` to clear an existing
v2 report when refreshing a scope. No new measurements are claimed merely by
installing the consumer; the new audit must supply authenticated observations.
