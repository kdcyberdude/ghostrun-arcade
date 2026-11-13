# Source ID41 admission fixes 7-4 Podoboo ownership

Base `27c2d68`. Native source is `InitDropPlatform -> CommonPlatCode ->
InitVStf` in recovered SMBDIS.ASM, SHA256
`e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42`.
InitDropPlatform writes PlatformCollisionFlag=$ff; InitVStf clears $A0/$0434.
The source does not clear the inherited $58/$0401/$0417 aliases.

7-4 contains native falling-platform ID41. Its omission from the supported
castle profile disabled the entire authoritative EnemyData cursor, leaving
Podoboo births and offscreen erasures on the legacy path. Native frame54
initializes slot1 ID12 at x320, Y-high2/Y-low2 (strict y258). Legacy birth
was55. Native frame212 erases it after the current scroll; legacy erased213.
The same discrepancy recurred after a respawn at10199/10358. Neither native
Y-high2 nor below-playfield actors may be excluded from the comparison.

The fix admits ID41 into the existing source profile and platform factory.
Explicit drop initialization seeds the existing contact-driven platform motor;
it does not use an independent clock that would omit collision-load input.
An explicitly initialized drop holds its bank flag even before the public camera
commit reaches its birth threshold. The authenticated entrance snapshot seeds
the already-live ID41 in slot0, including its current motor bytes; otherwise
the first Podoboo incorrectly takes slot0. This is one-time initialization,
never a correction later in the replay.

The fixture retains all24000 native cursor rows,479 live Podoboo byte rows,
1075 live falling-platform byte rows, and source input/RAM hashes. Native
InitDropPlatform's before/after frame73/74 is checked explicitly. All six
bank slots, including empty slots, are compared on each retained bank row.

```
npx tsx tools/harness/native-castle-stream-events.mjs --traces TRACES --entrances RECEIPTS --levels 7-4 --out tests/fixtures/native-castle-drop-runtime.json
npx tsx --test tests/native-castle-stream-runtime.test.ts tests/native-podoboo.test.ts tests/native-platform-motor.test.ts tests/native-platform-birth.test.ts
```

17 focused tests pass. `native-divergence.ts --detail` reports all legacy and
strict fields null, no diagnostics, strict PASS for all24000 original7-4
frames/1554 native actor rows. The seven other original castle replays have
identical legacy and strict first-field maps to the frozen batchD27c candidate;
8-4's existing divergence remains. No pixel, mood-corpus, full npm, or TypeScript
gate is claimed here; those remain the parent's combined batch checks.
