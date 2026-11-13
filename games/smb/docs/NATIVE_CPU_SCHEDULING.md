Predictive CPU/NMI scheduling remains unimplemented. The evidence below expands
the known gap and identifies source work that a correct model must account for.
No game code, level/row skip table, fitted workload threshold or production tile
was changed by this investigation.

`native-nmi-corpus-survey.json` covers368 inputs: all32 retained v2 runs and336
power-on mood captures, totaling5,178,452 PPU samples. Independent every-frame
v2 captures and the mood receipts authenticate the RAM digests. There are
3,773,647 adjacent normal-play pairs (mode1, mode-task3, engine8 on both sides).
Exactly six pairs hold both FrameCounter and all random-register bytes; OAM
also stays unchanged. There are no other non-unit counter deltas in that scope.
Pause, loading, life screens, victory and other engine boundaries are explicitly
outside this normal-play count, rather than assumed exact.

The retained5-2 event remains row2178→2179, parser8→7, PC$94FA/SP$F5 inside
RendBBuf then idle$8057/SP$FF. Five mood events add three distinct workloads:
three1-1 prefixes at938 (parser7→6),1-2 at3420 (parser8→7), and2-1 at12056
(parser7→6). Their partial PCs are$8903,$94E9,$88E5 respectively. Graphics work
can overrun as well as area-column construction. Identifiers/rows here are
measurement coordinates; runtime simulation does not read this event list.

`native-poweron-timing.cpp` uses the rollout's exact HostMachine. Its profiled
frame loop retains the native instruction, PPU-settlement and idle-forward
algorithm. A callback records CPU registers, cycles and PPU phase, and records
JSR/RTS call durations using actual stack pointers (including JumpEngine's
return-stack manipulation). Every RAM sample through each probe window is
compared byte-for-byte with the original capture. All18,305 prefix samples
across the five selected mood inputs match. Controlled branches deep-restore
all native snapshot arrays and the PPU target; an unmodified repeat reproduces
the same samples and cycle counts. The observer neither modifies nor bundles
ROM bytes.

The primary1-1/1-2/2-1 NMI calls take30,544/30,401/30,140 CPU cycles and finish
2290/1867/1078 PPU dots beyond the next vblank sample. Their operation-mode
calls at$8212 take24,552/24,416/24,148 cycles. These are measured consequences
of executing the native instructions, not constants for a future predictor.

Native causal controls demonstrate why a small parser heuristic is insufficient:

- Replacing active ordinary enemy IDs with native NoRunCode35 retains occupied
  flags while reducing the operation-mode call to11,932/10,357/10,103 cycles.
  Every selected overrun disappears. The source enemy work depends on kind,
  state, slot order, collisions, positions and background samples.
- Clearing Sprite0HitDetectFlag removes the sprite-0 wait/shuffle path. The
  operation-mode work stays identical, but the NMI finishes before the boundary.
  This is a diagnostic intervention; removing the NES status-bar split is not a fix.
- Incrementing the incoming FrameCounter removes the1-2/2-1 overrun, but1-1
  still overruns. An odd/even condition is not a sufficient workload rule.
- Emptying the incoming buffer1 and sound queues changes nothing in these
  snapshots because those inputs were already empty. The nonzero buffer1 sizes
  seen in partial RAM are generated during the expensive current pass. These
  controls do not establish that VRAM or sound work can generally be ignored.

Cycle/PPU accounting also retains the native short-frame latch. The backend's
`batch_ppu_short_frame` reads `kLogShortFrame`; `frame_log_capture` derives it
from rendering state and the alternating frame flag. Settlement advances one
extra logical dot when the nonexistent pre-render dot is crossed. The profiler
counts that actual skipped dot; tests check exact equality to three PPU dots
per CPU cycle plus the recorded skipped dot. No one-dot tolerance or inference
from the game's resetting FrameCounter is used.

The NMI disables further NMIs, updates VRAM/audio/controllers/timers/random,
waits for sprite0, then executes the operation-mode tree. If work reaches the
next vblank, its final PPU_STATUS read clears that vblank before NMI is enabled
again. The next PPU sample therefore completes the old pass without a new
counter/random/physics update. Parser mutations and buffer writes can still
finish on that sample. Merely suppressing one complete remake update would
not reproduce the partial nametable/block-buffer picture or parser frontier.

A source-backed predictive model needs the instruction path and cycle phase:
CPU PC/registers/flags/stack and cycle parity, PPU frame/dot/NMI/short-frame and
sprite0 state, VRAM buffer contents/control, sound state, all enemy-slot states
and collision boxes, Mario/background/block/score events, and area-parser object
stream/length/terrain/metatile state. Current remake RAM-derived mechanics cover
many individual rules but do not yet provide a complete cycle-cost path for
those operations. The measured per-context totals must not become fitted costs.
Initial CPU/PPU phase must be authenticated from the native entrance or derived
from a source clock, rather than assigned a per-level phase. Validation must
cover normal negative cases and the other engine phases as well as these six
positive pairs. The remaining work is a complete source instruction/work
scheduler and resumable partial engine/parser updates.

Reproduce the survey with:

```sh
npx tsx tools/harness/native-nmi-survey.ts --traces TRACES --reference-traces EVERY_FRAME_TRACES --corpus /tmp/smb-mood-corpus --verify --out /tmp/native-nmi-survey.json
```

Build the observer with the command in its header, then reproduce all surveyed
mood candidates with:

```sh
npx tsx tools/harness/native-nmi-probes.ts --observer /tmp/native-poweron-timing --rom "ROM_PATH" --lab LAB_PATH --corpus /tmp/smb-mood-corpus --survey /tmp/native-nmi-survey.json --out /tmp/native-nmi-probes.json
```

The probe report fingerprints the observer source/binary, reference backend
sources and supplied ROM; it includes exact call-cycle records and every
controlled branch. Existing retained5-2 CPU evidence remains in
`native-engine-overrun.json`. No native-equivalence pass is claimed for the
unimplemented scheduler.
