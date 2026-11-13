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
