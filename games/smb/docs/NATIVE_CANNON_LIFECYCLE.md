# Native cannon bounds and slot release

ID51 is handled by ProcessCannons after the ordinary enemy loop and scroll.
For each slot2,1,0 it checks an already-owned bullet with OffscreenBoundsCheck
BEFORE BulletBillHandler/MoveEnemyHorizontally. Erasing it does not revisit that
slot's free-slot cannon selection during the same pass. The comparison reads
ScreenLeft/ScreenRight and the bullet's prior integer X, not its next X.
CPY PiranhaPlant leaves carry set for ID51: left=ScreenLeft−72. The following
page subtraction carries into the right ADC: right=ScreenRight+72+carry.
The source primitive implements the16-bit page/sign comparisons. No RNG or
launch phase is reconstructed.

The old model used next X and the prior camera−70. Original8-3 row264,7-1
row381 and5-2 row795 all retained a bullet after native erased it; the wrong
occupancy then changed later timer selections. The runtime now retains each
existing shot's pre-step X, applies the source check in the cannon pass against
current scroll, and preserves the slot's occupancy for that entire pass. The
ordinary frenzy Bullet Bill path remains separately owned.

The read-only CPU observer follows actual saved native emulator entrances.
Native-enemy-cursor-traces.py checks every initial/PPU RAM byte. Its shared ABI
labels the bounds-call/erasure counters as attempts/initializers in stdout;
there is no enemy-stream observation in this shim. Three original recordings
cover11,576PPUrows and3,739actual bounds calls, including161erasures. Every
call agrees with the helper. The fixture retains native call inputs/outputs,
raw compressed replay prefixes, entrance receipts and input/RAM/log hashes.
The focused replay tests compare every cannon slot/X/Y row over1,584prefix
frames (8-3:0..340,7-1:0..442,5-2:0..799), including creation/removal rows.
Timer-table equality is checked during native active gameplay; load/screen
phases are explicitly outside the table assertion, while actor rows continue.

Focused whole-level comparison is in evidence/native-cannon-focused-survey.json.
8-3 strict extra264→1052,position914→987; death3813,timer3830 andstate3813
all become exact through the retained trace.7-1 extra381→552,position395→443,
death1099→1152 andtimer1118→1166.5-2 extra795→1338 andstate2121→none.
Remaining7-1 continuation.load.ready3651 follows existing actor443/playerY444
and a changed downstream death/load path; its load contract remains open.
No all32/corpus/picture audit or full npm/TypeScript gate was run in this unit;
integration owns batch validation.

Reproduce with native-cannon-capi.cpp built as a shared library against the
normal lab/NeSLE headers, then native-enemy-cursor-traces.py --levels8-3,7-1,5-2
(using the normal spaced CLI arguments) and native-cannon-events.ts.
Focused checks: npx tsx --test tests/native-cannon-bounds.test.ts
tests/native-enemy-rules.test.ts. NativeROM/emulator archives are never committed.

Batch-C classification is in `evidence/native-cannon-batch-causal.json`.
A cannon-only counterfactual on the combined candidate reproduces both fields
while retaining every other batch fix.8-2's extra1380 is an actual native
pre-motion erasure, proved by another read-only CPU call. Both trajectories
still misassign Piranha1450 to4 instead of native2. Corrected timers fire into
wrongly free2 at1453; old timers delay that kind mismatch until1476. The exact
gate requires old/new missing1382→1450, extra1380→1450 and unchanged position1553;
both upstream missing firsts must precede1453. Allocation remains unfixed.

For7-1, native starts logical7-2 loading3651 (task0/engine5). The corrected
replay still plays7-1; the old replay is already game-over7-1. Both have earlier
playerY444 and wrong level/counter3651. Old readyfalse matches accidentally.
The exact null→3651 gate requires those unchanged witnesses and the historical
baseline fingerprint. Ten gate selftests reject alternate was/now, baseline
and upstream contexts. No runtime edits or full gates accompany this evidence.


## Source flag release after Cannon rejection

The remaining8-2 allocation error was a fresh state-zero rejection, not a
defeated Cannon. Native slot2 is51/state0 at1448; BulletBillHandler takes KillBB
at1449 and EraseEnemyObject clears its flag/id/state. Native retains058=8,
0401=128 andA0/0434/0417=0/0/104. Piranha13 owns2 on1450. The remake called
its generic erase routine, leaving dead100 without the explicit bank-release
marker; the old dead-walker linger rule therefore reserved2 until−74.

Cannon bounds and KillBB now use the existing bullet bank-release operation,
renamed eraseBulletObject to include live rejections. This sets the actual
slot-free marker and preserves the source movement residue. The cannon pass's
already-captured used-set still prevents same-pass refiring; its release-frame
marker also remains. The following turn may reuse the slot. No holdsNativeSlot
filter, Piranha factory, generic allocator, defeated motor or contact order was
changed. Source erased-Cannon graphics still skip EnemyGfxHandler/$EF writes.

Read-only native BulletBillHandler and nested EraseEnemyObject entry/return
observation authenticates14,336PPUrows from8-2,8-3,7-1 and5-2.3,887handler
calls contain26 actual erasures, including one state32 case. The portable
fixture records all26 exact erasure entry/exit byte vectors, input hashes and
an authentic8-2 prefix. Tests check retained058/0401/0417/vertical state,
FrameTimer clear, unchangedEF, same-pass reservation, following-pass reuse
and the actual1448→1450 ownership sequence.14 focused tests pass.

In the four-level focused comparison, all eight8-2 legacy fields become exact.
Strict missing1450/extra1450/kind1453 also become exact; strict position moves
1553→2003. Native and remake both die on2003, but Bullet0/Para4 positions now
expose a later ordered-contact/freeze gap. That remains open. Every first field
of nearby8-3,7-1 and5-2 is unchanged. The portable before/after coverage and
fields are in evidence/native-cannon-terminal-release.json. No all32/full
suite/TypeScript/corpus/pixel audit was repeated; integration owns those gates.
