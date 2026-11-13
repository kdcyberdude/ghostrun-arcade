# World1-1 bonus return: ordinary enemies share the native cursor and slot pass

This unit finishes only the current generic bonus-return walker/group stream issue, then stops for review. It uses Water's547f218 controller-edge fix (parent1fd6b93), Walker's0430c09 readiness readout (local260d701), and the separate68b7d9c Goomba-release unit (local72461fc). The final stream commit does not fold those changes into its diff.

## Native cause

Both continuous recordings have identical source actor behavior at their backloaded main-room return, despite different preceding inputs:

- 3d43b7b4… first engine7 row1076: EnemyDataOffset13/page5, no active Goombas. Next row1077: offset23/page7, still none. Row1078: offset29/page11, slots0/1 now hold Goombas at2815/2839, without movement on that allocation row.
- 1ec0a3e4… has the same progression at1017/1018/1019.

InitializeArea resets the shared EnemyData cursor. ProcessEnemyData consumes one behind-screen record per free-slot attempt; page controls recurse within that attempt. The first two enemy-bank passes therefore consume earlier records before reaching the current viewport. On the third pass HandleGroupEnemies allocates its members into already-visited lower slots, so neither new object runs a handler that row.

The old generic fallback skipped all earlier records in one pass and created the returned group immediately. This produced two premature actors, shifted their subsequent positions and eventually lost a3d43 actor. No entrance delay or frame/page/area trigger was added to repair it.

## Source-backed change

The existing physical-stream scene helper now admits any fully supported normal-enemy/group record set, preserving unsupported-handler rejection and existing water/platform profile boundaries. Plain normal actors use the same ascending native slot attempts already used by the Hammer Bro profile; the private profile flag is renamed `placedActorStream` to describe its wider family. Its two test fixture seams are renamed consistently.

Each completed normal actor now writes its movement aliases and executes OffscreenBoundsCheck before a later slot can parse a group. The effective source camera is passed as a read-only argument; no temporary camera mutation is used. Births without a handler are not bounds-checked as if they had executed. This ordering is necessary to preserve original v2 World1-1: at741 an earlier Goomba is erased before a later group scans flags and reuses its slot. Its final vertical/fraction bytes are recorded before release, preserving later initializers; the existing Hammer Bro byte-state tests remain unchanged and pass.

Pinned SMBDIS.ASM revision59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42: ProcessEnemyData/CheckpointEnemyID, HandleGroupEnemies8755 onward, RunNormalEnemies9067..9080 and OffscreenBoundsCheck11006 onward. The runtime adds no per-level, recording, entrance, random-phase or timing constants. No pipe/AB/ready routine, contact geometry, score, rendering, camera rule or68b interval-erasure branch is changed here.

## Continuous bounded evidence and actual counts

`native-return-stream.json` preserves authenticated POWER-ON initial RAM, every pad and complete comparison RAM for exactly two recordings. The model starts from its own cold state and receives only controller inputs; no native entrance initialization, intermediate reset, later native byte injection or section replay is used in these two tests.

With the listed dependencies before this stream change:

- 3d43:7396 inputs replayed. Within supported World1-1/boot state,243 actual mismatch frames: extra2 frames (4 actor instances), position240 frames (452 instances), missing1 frame. Other scalar/control fields have no first divergence.
- 1ec0:8708 inputs replayed.239 actual mismatch frames: extra2 frames (4 instances), position237 frames (445 instances). Other scalar/control fields have no first divergence.

Afterward all declared state fields match on every supported frame:3d43 has2173 match frames and5223 explicitly unchecked other-level frames;1ec0 has8708 match frames and no unchecked frames. Both have zero known mismatch frames and no unowned gaps within the supported scope. All16104 controller inputs are retained. Counts are recomputed from each frame's differences, not carried forward after the first failure. Per-field frame counts are deduplicated within each frame; actor-instance counts are stored separately.

This is state evidence for World1-1 and source-owned boot only. It does not claim other-level equivalence, pixels/audio, complete2048-byte machine equivalence, or full-dashboard visual proof. The existing CCA full audit remains frozen and untouched.

Original v2 World1-1 remains exact for all2853 inputs before its first level change, checked by a separate one-time native-entrance diagnostic test. It is explicitly not described as a cold continuous proof.

## Focused validation

28 tests pass:

```
npx tsx --test tests/native-return-stream.test.ts tests/native-pipe-rise-input.test.ts tests/native-pipe-ready-readout.test.ts tests/native-hbro-spawn.test.ts tests/native-walker-parser.test.ts tests/native-goomba-slot-lifetime.test.ts tests/native-walker-groups.test.ts tests/native-group-reuse.test.ts
```

The additional native CPU parser-attempt regression `tests/native-enemy-cursor-instructions.test.ts` passes (29 focused tests total). New tests assert every supported continuous readout, exact return-row cursor/page/selection, complete live actor slots/X fractions/Y, birth-row age/visibility, and the original1-1 negative control. No existing assertion or retained native frame was weakened.

Generator: `tools/harness/native-return-stream-events.ts` (flags in header). Actual before/after counts and return snapshots are committed in `w11-return-stream-comparison-20261113.json`; detailed bounded logs persist in `/home/kd/.codex/worktrees/smb-w11-return-actors/proofs/`.

The generic profile also admits other source-supported rooms. Root owns the integrated all32 field gate, fullsuite/TypeScript/build and any rendered audit. No broader survey or newly exposed issue was started here. After this SAFE unit, work stops for review as requested.
