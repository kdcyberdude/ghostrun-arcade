# World1-1 Goomba block-stun source unit

This completes only the already-assigned block-bump proof backlog. No Simulation,
contact, parser, camera or motor runtime wiring is included; Contacts owns that.

`HandleEToBGCollision` recognizes and consumes temporary metatile$23. For a
Goomba it calls `KillEnemyAboveBlock -> ShellOrBlockDefeat -> ChkToStunEnemies`.
That first stun sets low-state2 and decrements rawY twice; ShellOrBlockDefeat
sets defeated bit5. The return path writes floatey control1 again and calls
`ChkToStunEnemies` a second time, decrementing rawY twice more. Final state is
`(oldState & $10) | $22`, speed$FD; force and fraction are preserved. Y-high
never participates in the four DEC instructions. Two writes to the same
floatey slot leave one100-point control, not200 points.

`PlayerEnemyDiff` subtracts the complete16-bit coordinates and branches on the
high-byte sign. The helper therefore handles page crossings and16-bit wrap;
using a plain world-coordinate ordering is incorrect at wrap boundaries.
EnemyBGCXSpdData supplies raw$10/$F0 and moving direction1/2.

API: `nativeGoombaBlockStun(n, enemyX, marioX)` mutates a raw low-Y state,
raw xSpeed/direction, and signed vertical speed. It returns semantic points100.
The caller owns finding/consuming the actual temporary metatile and must invoke
this only on the source Goomba block-bump path. It must not apply the helper
just because an enemy is geometrically near a bumped block.

## Native evidence

- 496 isolated procedure calls execute the unmodified PRG0
  `HandleEToBGCollision` using the native CPU. Controlled RAM and register inputs
  are explicit procedure tests, not natural captures or full-run parity proof.
  All256 starting states and lowY values, all slots0..4, retained force/fraction
  bytes, page crossings, equal positions and16-bit signed-difference wrap are
  covered. The ROM procedure consumes the actual supplied$23 cell.
- Six unmodified natural World1-1 captures independently verify the pre/post
  event state. After this helper, the native same-row `MoveDefeatedEnemy`
  gravity/horizontal step produces every captured alias. Floatey control is1
  and timer47 after its same-row decrement. Representative8f90807f… source780
  has rawY120->113: four stun DECs, then the existing−3 gravity move.

The generator verifies the expected ROM SHA256 and full natural RAM hashes;
fixture metadata retains procedure-source/binary and before/after frame hashes.
Natural cases are the six existing002743d catalog block-bump cases, not a new
corpus investigation. No other worlds were captured or investigated.

```
c++ -O2 -std=c++20 -ffp-contract=off -I NESLE/cpp/include -I LAB/rl/csrc tools/harness/native-block-enemy-proof.cpp NESLE/cpp/src/rom.cpp -o /tmp/native-block-enemy-proof
npx tsx tools/harness/native-block-enemy-events.mjs --rom ROM --proof /tmp/native-block-enemy-proof --entries ENTRIES.jsonl --out tests/fixtures/native-block-enemy.json
npx tsx --test tests/native-block-enemy.test.ts
```

Both focused tests pass. Full batch gates belong to integration after Contacts
wires the runtime. No new investigations follow this backlog unit.
