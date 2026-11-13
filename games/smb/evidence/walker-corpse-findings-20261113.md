# Defeated normal walkers still pass OffscreenBoundsCheck

Runtime base: 8409bd3 (3349d81 placed-parser fix plus recovered integration 836d9bb). This unit changes only the defeated normal-walker branch of `nativeLeftBound`; no slot allocator, Enemy_State bank, Water release logic, Cannon, Hammer Bro or Blooper handler changes.

## Native source

Pinned source: doppelganger SMBDIS.ASM revision 59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42. Recovered reference is `/home/kd/.codex/worktrees/smb-native-reference-recovered/SMBDIS.ASM`.

`RunNormalEnemies` (9067) draws, checks collisions and moves, then unconditionally jumps to `OffscreenBoundsCheck` (9080). `MoveNormalEnemy` (9293) state bit $20 selects `MoveDefeatedEnemy`; defeat does not bypass the caller's bounds check. `OffscreenBoundsCheck` (11006) subtracts 72 plus the borrow from ID comparison with 13 (IDs below 13 therefore use camera−73). `EraseEnemyObject` (9173) clears ownership, ID/state, FloateyNum_Control and timers. The old remake returned no bound for every non-squashed dead actor, retaining the body and its score popup after the native slot had cleared.

The new branch requires an existing defeat motor and a normal walker kind. Flying actors retain their separate behavior. There are no level, recording or frame constants in the runtime rule.

## Portable evidence and reproduction

`tests/fixtures/native-walker-corpse.json` contains authenticated POWER-ON capture identities, one-time entrance seeds, five source erase/retain events and a compressed 430-frame native RAM/pad replay. The generator authenticates complete recovered pad/RAM streams and binds the physical room from source ROM metadata. No replay frame imports future RAM into simulation.

Primary capture 54e749cc0fc3c5e733989f7062ab1da43479e582f8c7d42e067459dee3faad58, entry 2, 1-2 area-2, source offset 2819: local406 Koopa slot0 x613/camera684 still owned; local407 x612/camera686 erased, floaty control zero, all six OAM Ys $f8; local408 Goomba slot0 is allocated without drawing on its birth frame. The old actor survives at407 and overlaps the new slot occupant at408. These assertions fail without the runtime branch.

Focused command (15 tests):

```
npx tsx --test tests/native-walker-corpse.test.ts tests/native-walker-parser.test.ts tests/native-walker-groups.test.ts
```

Complete-epoch focused comparison:

```
npx tsx tools/harness/native-walker-corpse-audit.ts --captures /home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native/moods/captures --out REPORT.json
```

Generator:

```
npx tsx tools/harness/native-walker-corpse-events.ts --captures /home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native/moods/captures --report /home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/mood-report-4aa045a.json --out tests/fixtures/native-walker-corpse.json
```

## First-divergence comparison and limits

Committed `walker-corpse-comparison-20261113.json` retains complete field/coverage summaries before and after this unit, plus the downstream exception below. All three complete epochs step and compare every input row with no coverage gaps.

- 54e entry2, 1454 frames: all legacy fields remain NULL; strict extra407/kind408 become NULL. Every strict field now NULL; 4174/4174 actor rows compared.
- 24f632f6 entry2, 1394 frames: every field unchanged (score450, position445, extra494 remain).
- 2b723cc8 entry2, 1014 frames: every legacy field and other strict first field unchanged. Strict kind450→444 is a downstream exception to the no-earlier-field ratchet, following unchanged Mario x354/y357, enemy position370 and camera376 divergences. At443 simulation camera687/native672 and defeated Koopa x614.5/native616.5: the source bound correctly erases against the already-wrong simulation camera; new Goomba owns slot0 at444, native still Koopa until449 erase/450 Goomba birth. Component tests supplied authentic positions retain447/448 and erase449. This is not evidence that the earlier physics errors are fixed.
- Original recorded v2 1-2, all3060 inputs: all eight legacy fields and every strict first-field value unchanged; pre-existing strict x/extra1781 at the next-room load remains. This focused check is not an all32 runtime gate.
- Read-only original32 RAM scan found zero same-room normal-walker horizontal defeated-bound erase events. This is source-event coverage, not an all32 simulation or pixel proof.

No npm/full TypeScript/all32/pixel/3D run was repeated for this unit; parent integration owns the combined gates. Persistent detailed logs are in `/home/kd/.codex/worktrees/smb-placed-walkers-recovered/native-corpse-proof/`.
