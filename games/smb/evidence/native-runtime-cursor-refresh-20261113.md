# Authenticated 7-4 runtime-fixture cursor metadata

Base `1f3a544`. The timer and death-load runtime fixtures retained EnemyDataOffset2
and the already-live ID41 slot0, but omitted EnemyDataPage/EnemyDataSelected.
Recovered original7-4 initial RAM has $073a=1 and $073b=0. The new authoritative
castle cursor therefore needs page1/selectedfalse, just as a direct replay does.

Only those two entrance keys were added to the 7-4 run in each fixture. Removing
them produces JSON deeply equal to the original committed fixture: every pad,
pose, screen task, timer/control row, other entrance field and assertion is unchanged.
The two focused test files pass all11 tests on this snapshot.

Source SHA256 hashes:

- initial.ram: `efe093ed38522b4df866983b5b5f46b883e1d656d407184029174dfc74aab2b2`
- pads.bin: `35a927175c8341cf723b2f65dc543145a4784a658451be497deccef1d910b06a`
- ram.bin: `fa6a41c5d98184091168f34ce1cdac9c52ca7f3e9c69e20c74605ae9e525b4a4`
- entrance.json: `d78cd1349e810e68d81880c71cc9a506162ae9421601858e9a484482bf022322`

The refresh tool verifies every existing entrance field against the decoded
native source (new source fields may be absent in an older fixture), verifies
the complete retained pad prefix, and changes no expected data. It prints source
hashes and a digest of the unchanged run data excluding entrance metadata.

```
npx tsx tools/harness/native-runtime-cursor-refresh.mjs --traces TRACES --entrances RECEIPTS --fixture tests/fixtures/native-death-load-runtime.json --levels 7-4
npx tsx tools/harness/native-runtime-cursor-refresh.mjs --traces TRACES --entrances RECEIPTS --fixture tests/fixtures/native-game-timer-runtime.json --levels 7-4
npx tsx --test tests/native-death-load-runtime.test.ts tests/native-game-timer-runtime.test.ts
```

No runtime, assertions, pixel evidence or full batch gates were changed.
