# World1-1 rewards and held-death misc objects

Base `4d39a1e`. Scope is World1-1 main/bonus-coins, clipped before the first
native logical1-2 row. These are authenticated native entrance-seeded diagnostic
episodes, **not continuous POWER-ON or dashboard completion proof**.

The frozen4aa report contains40 flag-related score failures and3 other score
failures. Replaying all43 on the current base clears18 of the40 through the
already-integrated flag-parser fix. All remaining22 flag score failures and
the other3 score failures follow earlier position/contact/ownership failures.
There is no independent score-writer failure in this set. The complete43-case
classification and source offsets are retained in the adjacent survey JSON.

The scoped458-episode survey covers422 main/36 bonus epochs:372 passed before
this change,382 after. All checked first-field values stayed equal or became
null; none became earlier. Ten independent misc-coin episodes become entirely
strict-state exact. Three other coin cases (2bfc3132…,91a8d597…,a60f59c3…)
retain a same-row contact/Mario discrepancy at722 and are left explicit.

## Native cause and rule

SMBDIS `GameCoreRoutine -> GameEngine` still calls `MiscObjectsCore` after
`PlayerDeath` returns with TimerControl set. `ProcJumpCoin` has no TimerControl
guard; its gravity, floatey counter and erasure continue during injury. Only
hammer motion applies its own TimerControl guard. The model omitted the whole
misc bank in its ordinary dying branch, freezing a coin until it became an
extra object. The source misc dispatcher now runs there, with the held-death
ScrollAmount zero; the existing pit full-world pass is unchanged.

Representative8323cdd6… entry0 source401/local185 has native engine11,
TimerControl254 and coinY101; the old model heldY98. Native state advances
to2 atlocal190 and erases normally while the old model retained the coin.

The ten independent native episodes were selected from the frozen002743d
World1 diagnostic catalog (8 coin-position/2 coin-state first failures), not
from successful candidate runs. The extraction tool validates original full
pad/RAM hashes and initial/segment hashes before retaining every live/erase
misc row. The fixture contains790 bank rows, including all live coin aliases
and erasure, and preserves diagnostic-only labeling.

```
npx tsx tools/harness/native-one-one-misc-death-events.mjs --entries ENTRIES.jsonl --out tests/fixtures/native-one-one-misc-death.json
npx tsx --test tests/native-one-one-misc-death.test.ts tests/native-misc*.test.ts tests/native-player-resume.test.ts tests/native-game-timer-runtime.test.ts
```

28 focused tests pass. Full batch npm/TypeScript/pixels are not claimed.

## Powerup coverage limits

The supplied native1-1 mood recordings contain506 mushroom rows/6 births and
838 Star rows/4 births; no powerup actor mismatch appears in the scoped
diagnostics. They contain no flower/1up rows and no engine9/10/12 transform
starts. Collection/transform behavior is therefore **unexercised**, not newly
verified by this reward survey. The remaining bonus timer failures follow
earlier entry movement/ownership discrepancies and were not fitted here.
