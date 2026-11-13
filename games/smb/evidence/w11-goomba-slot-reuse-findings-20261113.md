# World1-1: Goomba interval erasure releases its native flag immediately

Base cca2e44cff28d07595b6def7e2efc5ed356fcd56. Scope is the two World1-1 Goomba missing/position episodes in the frozen002743d diagnostic locator. No other-level investigation, geometry, collision latch, pause/clock transport, score, picture, generic erasure family or Water/Cannon callback changes are included.

## Current native cause

Both natural episodes first fail exactly when a squashed Goomba in slot3 reaches interval14 and the physical enemy group at ROM offset23 becomes eligible. The model removes the old body with `eraseEnemy` (dead100, frame timer/popups cleared), but leaves slotFreed unset. `busyNativeSlots` still reserves3 until a later `releaseNativeSlots` pass. The group therefore installs only its first member in4 at x2048, dropping the other member.

Native MoveNormalEnemy/ReviveStunned→ChkKillGoomba compares EnemyIntervalTimer with $0e and immediately calls EraseEnemyObject. That clears Enemy_Flag, ID/state, interval, attributes and frame timer. HandleGroupEnemies scans current flags from the lowest slot for each group member, so a later parser-slot4 attempt can reuse the already-visited slot3 and allocate4 on that same row. Neither new member runs a handler on this allocation row, because3 has already run and4 is executing ProcessEnemyData.

Pinned source: SMBDIS.ASM revision59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42. ChkKillGoomba lines9360..9369; EraseEnemyObject9173..9184; HandleGroupEnemies8755..8814.

The runtime fix marks only this existing Goomba interval-erasure branch freed, records its release frame and preserves the unchanged X fractional byte. It does not advance a fractional position or change a movement/collision decision. The source constant14 was already present; there are no new per-level, recording or trigger constants.

## Two complete diagnostic episodes

Both replays initialize exactly once from authenticated native entrances and consume every retained input through the World1-1 exit. They do not enter or audit another level, and are not continuous POWER-ON/dashboard proof.

- 7be1c24038b01de67e526b90742a8162ee751ae2a790c233f823e29b7a7ef4ea entry0: source offset216,2039 retained frames. Before: strict missing/position841, legacy enemy842; slot3 native timer15→erasure/newgroup0 at counter227, interval-control20. Native new slots3/4 are x2048/2072, with slot3 fraction0. After: every legacy/strict first field NULL;3652/3652 actor rows compared, zero gaps.
- 928561a37b83ed1e3b649c188d303cd44817bad46824706ae4ecd337f6ead0aa entry0: source offset216,2186 retained frames. Before: strict missing/position820, legacy enemy821, downstream Mario Y871/score875. At counter206/interval-control20 the new slot3 retains fraction128, giving x2048.5; slot4 is2072. After: every legacy/strict first field NULL;3878/3878 actor rows compared, zero gaps.

All other first fields remain NULL or improve; no earlier-field waiver is used. Existing actual entity mismatch counters (not sticky-after-first counters) total223 actor-field rows per episode before and zero afterward. Per-actor missing/position counts are retained in the comparison receipt. This does not claim actual per-frame counts for unrelated fields or the whole corpus; root owns the frozen continuous audit.

Original recorded v2 World1-1, scoped before the first native level change: all2853 inputs remain exact before/after, with identical legacy/strict fields and coverage. No whole32/336 survey was run.

## Portable regression evidence

`tests/fixtures/native-group-reuse.json` contains both complete retained pad/RAM episodes, native identities and compressed RAM. The generator authenticates full POWER-ON pad and RAM hashes, then checks the retained initial/input/RAM hashes against the frozen catalog. Runtime never reads later RAM. It selects the native erase/reuse event from source interval/state transitions, and the tests retain the old physical actor reference to verify its immediate release plus the newly allocated slot's X fraction, age0 and no birth-row picture.

```
npx tsx tools/harness/native-group-reuse-events.ts --catalog /home/kd/.codex/worktrees/smb-world1-gameplay-evidence/002743d/entries.jsonl --captures /home/kd/Desktop/proj/ghostrun/notes/smb-native-handoff/recovered-native/moods/captures --out tests/fixtures/native-group-reuse.json
npx tsx --test tests/native-group-reuse.test.ts tests/native-goomba-slot-lifetime.test.ts tests/native-walker-groups.test.ts tests/native-group-stop.test.ts
```

15 focused tests pass, including unchanged source lifetime, group birth and earlier hurt-row stop fixtures. Reverting only the runtime change makes both new retained-episode tests fail at their original divergence. `w11-goomba-slot-reuse-comparison-20261113.json` preserves all first fields, entity mismatch counts and coverage summaries. Detailed probes/logs persist at `/home/kd/.codex/worktrees/smb-w11-spawn-followup/proofs/`.

Fullsuite, full TypeScript, rendered pixels and combined main integration gates are delegated to root's batch. The frozen CCA audit checkout and its results were not modified.
