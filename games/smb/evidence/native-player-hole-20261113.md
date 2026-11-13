# World1-1 dying aliases: PlayerHole and the parser tail

BaseCCA `cca2e44`; catalog helper prerequisite `aa9a685` (already in integration
c4eefce). This unit changes actual source-owned state, not readout exclusions
or partial-reset timing. No camera formula, player motor or reset callback is
changed.

The46 continuous cases were the frozen catalog's35 `load.scrollLocked` and11
`load.parserColumn/load.scrollLocked` first groups. Their native PlayerLoseLife
row retains the previous parser and ScrollLock bytes. The following sampled
InitializeMemory partial pass already clears both correctly in the model.
The mismatches expose earlier omitted gameplay writes:

- `PlayerHole` performs `CMP #$02 / BMI`, then writes1 to ScrollLock$0723 when
  the raw Player_Y_HighPos is below-screen. It also executes on the engine11
  death arc. The model omitted this write on ground falls/injury arcs.
- `GameEngine` still reaches `UpdScrollVar` after `PlayerDeath`, even while
  TimerControl holds ordinary enemy movement. Pending tasks complete and can
  advance$0725/$0726 by two columns. The model omitted this tail while dying.

The PlayerHole predicate now follows the raw bytewise signed branch. Its normal
call is after the current ScrollHandler preview has been computed, preserving
current-row camera arithmetic; water reads pre-whirlpool Y. Its injury call
follows the existing death movement. The dying path runs the parser tail once,
including existing pit-world passes that do not themselves run that tail.
The prior MiscObjectsCore fix and all partial-clear hooks remain intact.

## Evidence

`native-player-hole-proof.cpp` executes unmodified PRG0 instructions.512
controlled PlayerHole guard calls cover every raw high byte with zero/nonzero
prior lock.46 full `UpdScrollVar` calls use retained native dying RAM, with the
prior buffer2 controller consumed as in NMI; their output aliases also match
independently captured next-frame RAM. These are explicitly controlled
procedure proofs, not full-run captures or native injection into the remake.

The fixture additionally retains authenticated cold-start input prefixes and
native alias rows for all46 recordings. Every replay constructs a normal model
and consumes the recorded inputs without resets or native-state seeds.73
focused tests pass, including parser/area-control and prior misc-death tests.

Full scoped replays of those same46 inputs clear both target fields in46/46,
with no earlier first field.44 now have no World1 state firsts;04a7c0c5… retains
its later bonus-rise/readout actors, andf25dd9e5… retains later movement causes.
Original recorded1-1 remains strict PASS over3020 retained rows with no field
or coverage gaps. A fresh browser and Node replay agree on every state
classification for two cold prefixes:709+1619=2328 frames. No pictures, new
bulk corpus audit or dashboard completion are claimed.

Reproduction from repository root:

```
c++ -O2 -std=c++20 -ffp-contract=off -I NESLE/cpp/include -I LAB/rl/csrc games/smb/tools/harness/native-player-hole-proof.cpp NESLE/cpp/src/rom.cpp -o /tmp/native-player-hole-proof
npx tsx games/smb/tools/harness/native-player-hole-events.mjs --catalog CATALOG.json --captures CAPTURES --rom ROM --proof /tmp/native-player-hole-proof --out games/smb/tests/fixtures/native-player-hole.json
npx tsx --test games/smb/tests/native-player-hole.test.ts games/smb/tests/native-parser-clock.test.ts games/smb/tests/native-area-controls.test.ts games/smb/tests/native-one-one-misc-death.test.ts
npx tsx games/smb/tools/harness/native-player-hole-browser-proof.ts --captures CAPTURES --ids 04a7c0c59a69ff99fe70e9feea29156c096005c9d26217d3d1d4c99dc56fe8c3,e2a3c1655e886de076360959ea78b91755f17657bbae5e91ccafab39d9f3ed61 --out BROWSER_PROOF.json
```

The versioned receipt retains all before/after first maps and the fresh browser
proof. Full npm/TypeScript/all32 checks remain integration's combined batch.
