# World1-1 group followers obey the native TimerControl gate

Runtime base4d39a1e; runtime change is one condition in `passNativeGroups`. This scope is World1-1 enemy spawning/slots/timers. Block-bump defeat, pause/control transport, score, boot and pictures belong to other owners.

## Current classification before fixing

A small native-entrance-seeded diagnostic survey reproduces three independent old4aa failure types on current4d39a1e. These clips are not continuous dashboard execution proof.

- 24a4c03d entry0 first316: Goomba group born on a hurt row. Native slot1 contact sets TimerControl=$ff before the newly allocated higher slot2 runs. Native slot2 stays at x840, model steps to839.5. The old engine11 Goomba-position cluster counts5 recordings but preserves only3 example captures; this unit verifies those3, not all5.
- 8f90807f entry0 first564: block-bumped Goomba becomes native state34/x1247.5/y113; old model dead2 has no source defeat motor, x1248.5/y117. Contacts owns this separate cause.
- 91a8d597 entry0 first722: native FrameCounter holds107 while model advances108; Mario/camera/all actors advance one frame too early. This is pause/control dispatch, routed to Flag_end.

No runtime changes for the latter two causes are included.

## Source and change

Pinned SMBDIS.ASM revision59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42.

HandleGroupEnemies (8755) allocates ascending free slots, initializes each object and leaves. A newly allocated slot later than the current parser slot reaches RunNormalEnemies during the ongoing enemy-bank pass. RunNormalEnemies (9067..9080) draws and checks collisions, then reads TimerControl; nonzero skips EnemyMovementSubs, retaining OffscreenBoundsCheck. The model manually executes later-group-slot movement in the constructor but omitted this native timer gate.

The added `!this.nativeTimersStopped` guard suppresses both horizontal movement and gravity for that later slot when an earlier actor has already stopped timers. Allocation, sprite capture and visibility remain unchanged. The rule has no level/recording/frame constants and reads the existing source timer-control state.

## Portable evidence and focused checks

`tests/fixtures/native-group-stop.json` preserves three authenticated POWER-ON capture identities, first-supported engine7/8 entrance snapshots, complete pad/RAM diagnostic prefixes and native hashes. Initializer selection mirrors the corpus workflow: try only the first engine7 and first engine8 snapshots, never search later movement for a matching pose. The recorded source offsets are216, with failure frames316,282,280. Counter phases at birth are214,180,178; later RAM is comparison-only.

All1022 prefix rows now have no legacy or strict field divergence, including every actor's full X fraction/Y/slot ownership after the hurt-row birth. Before the guard all three regressions reproduce at316/282/280. `w11-group-stop-comparison-20261113.json` contains every first-field/coverage summary before and after. Every other field remains NULL; no earlier-field waiver is needed.

```
npx tsx --test tests/native-group-stop.test.ts tests/native-walker-groups.test.ts tests/native-walker-parser.test.ts
```

14 focused tests pass. Generator: `tools/harness/native-group-stop-events.ts --captures DIR --out FILE`. Detailed survey, baseline failure and focused logs persist at `/home/kd/.codex/worktrees/smb-w11-enemy-audit/`.

No complete World1-1 cohort recount, whole336/all-level audit, fullsuite, full TypeScript, pixel or 3D run was repeated. Contacts owns the current World1-1 catalog; root owns combined integration gates. This evidence does not establish continuous power-on/dashboard equivalence or claim all old5 recordings are fixed.
