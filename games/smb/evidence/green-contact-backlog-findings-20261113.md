# Existing F backlog: green Paratroopa motion hold and wrapped contact operands

Base4d39a1e. These are repairs to already-merged contact behavior, authorized before consolidation/stop. No new level investigation, callback, fitted constant, score/picture, Hammer Bro, Water or generic slot-release change is included.

## 5-1 hurt-row regression

Original recorded 5-1 is exact through2299. Slot1 ID14 is x2799.5/rawY143, speed−1/force104/fraction124. Native PlayerEnemyCollision injures Mario at2300 and sets TimerControl=$ff, holding this slot's subsequent movement. The model correctly detects contact with the new native latch but performs green movement first, leaving x2799/rawY142/force132/fraction228 before freezing. Existing hurt rollback covered ordinary fallers and Podoboos, but omitted green Paratroopas.

RunNormalEnemies in pinned SMBDIS.ASM9067..9080 draws, computes the box, applies background collision, tests player contact, then reads TimerControl before EnemyMovementSubs. The fix splits the existing green helper into its unchanged background and motion phases, retaining its old combined wrapper for existing component callers. The runtime records the post-background state and restores only green horizontal/gravity motion when this actor's contact stops timers. Background landing snap and side-turn effects survive; other actor rollback branches are unchanged.

Full original5-1,4392 inputs: strict position2300→3238, restoring the pre-F first position. Every other legacy and strict first-field value is unchanged. Later independent errors and19 continuation coverage gaps remain; this is not a whole-input pass. A new2320-frame authenticated prefix verifies all legacy/strict fields and exact actor X/Y/speed/force/fraction across the actual hurt/freeze rows.

## 2-1 residue failure

The existing `native-paratroopa-erase-residue.json` replay fails at1341 because an earlier false collision at1338 converts the falling ID14 into Koopa. Native remains ID14/state0, with exact player/enemy state through1337. The source raw boxes at1338 (global16260 of capture d2bbd82bb5182db3aaf5c777b720352ef7b60d97f052d06100a3817277595132) are player[125,138,135,150], enemy[123,248,135,4]. Enemy Y wraps at the byte boundary while falling below the viewport.

SMBDIS.ASM12926..12990: PlayerCollisionCore sets X=player, preserves Y=enemy. SprObjectCollisionCore compares the Y object's bounds first, and its vertical-wrap logic is asymmetric. The new normal latch passed the player first to `nativeBoxesOverlap`, reversing the source operands and accepting a false stomp. The one-line call-order fix passes enemy first, preserving skipped-row gates and contact latch behavior.

Afterward the complete retained2-1 diagnostic prefix has every legacy/strict field NULL; the unchanged residue test verifies every selected A0/0434/0417/078A/flag/position row through1398. No assertion, frame, input or native state was removed. Initial seed and pads are the existing authenticated one-time entrance fixture; this remains a diagnostic replay, not continuous dashboard proof.

Pinned source revision59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42.

## Verification and boundaries

```
npx tsx --test tests/native-green-hold.test.ts tests/native-hammer-paratroopa-residue.test.ts tests/native-player-enemy-latch.test.ts tests/native-paratroopa-events.test.ts tests/paratroopa-beetle-spawns.test.ts
```

13 focused tests pass, including the unchanged CPU-controlled latch/box fixtures and source green motion events. New portable fixture `native-green-hold.json` retains the5-1 prefix plus the natural wrapped2-1 source event. Generator `tools/harness/native-green-hold-events.ts` authenticates full recovered capture RAM/pads, existing retained seed and action slice before extracting that event. Source RAM is comparison-only after the initial seed.

Field receipts: `green-contact-backlog-comparison-20261113.json`. They contain first-divergence locations, not per-frame actual mismatch counts. Detailed logs and probe scripts persist in `/home/kd/.codex/worktrees/smb-green-contact-hold/`. Root owns combined fullsuite/TypeScript/every-frame validation. No further investigations were started after the consolidation/stop instruction.
