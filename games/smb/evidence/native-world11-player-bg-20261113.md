World1-1 Mario background collision and retained vertical state

The f25dd9e5 entry1 wall mismatch at local424/source1962 comes from
DoFootCheck passing Player_MovingDir($45)=2 to ImpedePlayerMove while the
signed Player_X_Speed($57) is zero and the retained fraction($0705)=128.
The model used Math.sign(full fractional velocity) and pushed left. Native
pushes right and masks the LEFT side. The source helper reproduces the signed
byte branch and preserves the fractional speed; the runtime also retains the
actual collision side through the later PlayerMotor contact-mask update.
The CPU's CPY1/BPL exception at raw speed128 is preserved, not simplified to
an ordinary signed comparison. No PlayerMotor/ScrollHandler arithmetic changed.

The 9a3d23e2 entry0 ledge mismatch at local1339/source1555 starts with a stale
model landingFraction112/256. Native InitJS at local1292 clears both0416 and
0433. The model cleared its visible fraction only in a special power-up path,
and never cleared the hidden saved landing fraction. The zero-motion apex
landing at1304 did not replace that stale value, which walkOffStart re-added
at1335. The jump now clears both representations at the actual InitJS boundary.
The subsequent ledge correctly retains zero; no later corrective reseed occurs.

Actual ROM proof (SHA f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de):
-6144 complete ImpedePlayerMove calls at$DF4B (2sides x256speed bytes x3fractions x4page-edge X positions).
-512 executions of the first13 actual InitJS bytes at$B4A0, stopping after
 STY$0433 (256old0416 values x2oldforces). This is a prefix proof, NOT a
 claim that the entire InitJS routine or full CPU frame was executed.
NMI is disabled only around controlled calls. Addresses are discovered from
unique actual opcode signatures, not fitted to a recording. The fixture
records every result and authenticates the source/ROM; no native RAM is fed
into the running simulation after its one initial entrance seed.

Complete assigned diagnostic epochs, with EVERY row compared independently
including after the prior first failure:
f25dd9e5 source1538..4374: CCA429match/2408mismatch/0unchecked ->2837/0/0.
9a3d23e2 source216..2569: CCA2350match/4mismatch/0unchecked ->2354/0/0.
Total5191STATE match/0mismatch/0unchecked;7183 native entity rows.
Both epochs retain flag/death/control tails; there are no skipped rows.
Original scoped1-1 also remains2853/2853 strict+legacy exact (4777 entity rows);
167 subsequent1-2 rows are explicitly outside this validation.
These are entrance-seeded diagnostics, NOT continuous POWER-ON proof.
Pictures and state/picture joint counts remain unchecked for this unit.

16 focused tests pass (native-player-bg, native-head-bump,
native-block-enemy-runtime, native-wall-medium-jump). Existing cross-level
fixtures were regression validation, not new other-level investigation.
No whole336 audit/full npm/tsc gate was duplicated; the integration batch owns it.

Reproduce controlled source calls:
c++ -O2 -std=c++20 -ffp-contract=off -I NESLE/cpp/include -I LAB/rl/csrc tools/harness/native-player-bg-proof.cpp NESLE/cpp/src/rom.cpp -o /tmp/player-bg-proof
/tmp/player-bg-proof 'Super Mario Bros (JU) (PRG 0).nes' > /tmp/player-bg-proof.json
The committed controlled fixture adds ROM/source hashes and role metadata to
that raw JSON. Reproduce full natural fixtures with:
node tools/harness/native-world11-player-bg-cases.mjs CATALOG/entries.jsonl tests/fixtures/native-player-bg-world11.json
npx tsx tools/harness/native-player-bg-survey.ts
npx tsx --test tests/native-player-bg.test.ts
