# Source-native Hammer Bro / Piranha ownership is not geometric visibility

Base a8b71fc. Runtime diff is three added lines: source-native Hammer Bros (ID5) and live terrain-owned Piranhas retain their slot while active/unfreed, until the existing erasure path runs; source-native defeated Hammer Bros use the same carry-sensitive OffscreenBoundsCheck as living ones. Legacy actors, defeated Piranhas, Water release bytes, Cannon erasure, movement/contact, preload callbacks and EF scratch are untouched.

## Native evidence and source

The authenticated original v2 5-2 prefix in `tests/fixtures/native-hbro-spawn.json` has a live Bro in slot1 at frame869 x735.75/camera755 and frame870 x736/camera757. Enemy_Flag remains1 and Enemy_ID remains5. The old `holdsNativeSlot` reach17 reports no ownership at869 and `releaseNativeSlots` prematurely frees the slot, although the active motor continues to run.

Pinned SMBDIS.ASM revision59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42:

- RunNormalEnemies (9067..9080) unconditionally returns through OffscreenBoundsCheck, including defeated state and TimerControl-held movement.
- OffscreenBoundsCheck (11006) performs CPY, ADC #$38, SBC #$48. The carry from the low-byte addition is used in subtraction, without a matching page increment. At camera757 the native left bound is486, rather than741. At camera768 the bound becomes752. Existing `nativeLeftBound` already models the live-object carry quirk.
- EraseEnemyObject (9173) clears Enemy_Flag. A pre-handler ownership query must not erase/release a source-owned actor based on a visibility reach. The existing actual erasure pass retains release-frame markers and source slot residue.

The first geometric prototype reused nativeLeftBound directly in the ownership query. That still predicted release before the actor's own handler and caused earlier 5-2 enemy1325/position1327 failures. It was discarded. The committed rule waits for actual erasure, and those regressions are absent.

## Focused verification

`tests/native-source-slot-ownership.test.ts` compares actual raw primary ID5/ID13 ownership, slot and integer X on every row of four authenticated one-time entrance replays (3750 frames). It does not rely on the strict comparator's offscreen visibility filter. The unchanged base fails at 5-2 row869; the candidate passes every row. Source-state checks additionally verify pre-handler retention, actual erasure/release-frame marking at the carry boundary, and defeated ID5 return through bounds checking.

```
npx tsx --test tests/native-source-slot-ownership.test.ts tests/native-hbro-spawn.test.ts tests/native-walker-corpse.test.ts tests/native-walker-parser.test.ts
```

19 tests pass. The prior walker-only corpse test now leaves native ID5 to this new explicit handler; its Cannon/Blooper exclusions are unchanged. No fixture RAM/pads changed or future RAM corrections were introduced.

Complete focused first-field ratchet: every legacy and strict first-field value is unchanged on original 3-1,5-2,7-1,8-2,8-3 against a8b71fc. 3-1 retains strict pass. 5-2 retains first Y1328/strict position1349; the discarded prototype's1325/1327 errors are absent. This unit improves raw slot-flag fidelity rather than the legacy comparator's already-filtered offscreen readout. Field/coverage receipts are in `native-source-slot-ownership-comparison-20261113.json`; other three routes compare against the previous committed HBro comparison receipt.

## Separate 8-2 cause

Original 8-2 slot2 Cannon51 exists at1448 x1680/y168/camera1732; native clears it at1449. The remake retains that Cannon with dead100/slotFreed unset, so Piranha2104 takes slot4 at1450 rather than native slot2. This is not caused by the Hammer Bro/Piranha carry predicate. Root assigned the Cannon terminal-erasure fix to Sky; no Cannon code is included here. The existing 8-2 divergence table and its incomplete continuation coverage remain unchanged.

No fullsuite, full TypeScript, all32/corpus/pixel or 3D runs were repeated. Root integration owns the combined gates. Detailed focused/reproduction logs persist in `/home/kd/.codex/worktrees/smb-native-slot-ownership/`.
