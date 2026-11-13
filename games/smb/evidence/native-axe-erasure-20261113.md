# Axe collision-buffer ownership

Base: `4aa045a`. Source: native `DoFootCheck`, `ChkFootMTile`,
`HandleAxeMetatile`, and `ErACM` in the SMB disassembly.

`DoFootCheck` retains the left-foot metatile in A while the second lookup leaves
the right-foot pointer in $06/$07 and its row in $02. `HandleAxeMetatile` enters
victory mode, then falls through to `ErACM`, which writes zero through that
right-foot pointer. Detection and erasure can therefore refer to different cells.

The original v2 1-4 first contact at local1978 detects C5 at $056d but erases
$056e. C5 remains, and native legitimately re-enters victory task0 at2105.
Mood c35cb97a… entry6 first contact at1007 instead erases $056d itself. Its
first PlayerVictoryWalk at1143 must not touch the erased axe again. Mood
52c7d5fb… entry6 has the same ownership at1040 and first walk1174.

Runtime now erases the actual right-foot collision cell immediately and checks
the mutable C5 tile before accepting another contact. The later visual axe
removal does not independently erase a collision cell. Canonical level data and
the existing picture-update schedule are unchanged.

`tests/fixtures/native-axe-erasure.json` retains unmodified controller bytes,
initial RAM, receipt, compressed native RAM, and SHA256 hashes for all three
replays. Regenerate a run with:

```
node tools/harness/native-axe-erasure-events.mjs NAME TRACES RECEIPTS tests/fixtures/native-axe-erasure.json
```

Focused verification:

```
npx tsx --test tests/native-axe-contact.test.ts tests/native-axe-erasure.test.ts tests/native-victory-runtime.test.ts tests/native-castle-pictures.test.ts
npx tsc --noEmit -p .
```

22 tests and TypeScript pass. Separate `native-divergence.ts --detail` replays:

- Original1-4: all legacy and strict first-field values remain null,2840 rows.
  Existing continuation vine-family adapter diagnostic at2675 remains explicit;
  strict status is incomplete, not a full fidelity pass.
- c35 entry6: all first-field values null,1704/1704 rows, strict pass. Frozen
  baseline first was victory.task1143, followed by x/y/camera1144, cell1146,
  missing retainer1221 and later victory counters.
- 52c entry6: all first-field values null,1725/1725 rows, strict pass. Frozen
  baseline first was victory.task1174, followed by x/y/camera1175, cell1177,
  missing retainer1253 and later counters/level transition.

These checks cover state and existing castle picture regressions. They do not
claim new pixel comparisons, a full336 audit, or resolution of the independent
left-boundary Mario/camera mood cluster.
