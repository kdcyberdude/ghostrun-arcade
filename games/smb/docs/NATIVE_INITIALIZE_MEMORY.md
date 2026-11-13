# Cold-start memory microsequencer

`stepNativeInitializeMemory(state)` executes one source instruction from
InitializeMemory ($90CC..$90E6). State contains the owned2048-byte RAM and
CPU PC/A/X/Y/P/SP/cycle fields. The returned event identifies the executed PC,
cycle cost and optional RAM write; `done` marks the actual RTS. JSR and interrupt
entry belong to the caller. This is a partial cold-start component, not a live
startup or control change.

Each source branch and stack skip determines its own cost. The helper clears
pages7 down to0, beginning at the input Y in page7, and preserves0160..01FF.
It reads its return address from that protected stack. It never reads native
recordings, applies a terminal RAM snapshot or skips a fitted number of frames.
A caller can stop at any instruction boundary and retain only writes already
executed. A full cold startup scheduler still needs to reproduce CPU/PPU status,
NMI and controller timing around this routine.

The local-ROM observer executes three genuine cold-start calls, followed by21
controlled calls from the same real entry snapshot. Controlled Y values are
0/1/4B/6F/D6/FE/FF and RAM isFF/zero/an address pattern. Every instruction's PC,
cycle cost, A/X/Y/P/SP and write address/value matches native across286,332
instructions; every final RAM byte and stack return matches too. The actual
entry-through-RTS costs are36,882 for coldFE,34,308 for6F and33,660 for4B.
The native caller's JSR adds6, giving the observed34,314/33,666 nested calls.
These totals are assertions in the evidence tests, not runtime schedules.

Three focused tests pass, including a stop immediately after clearing076F that
leaves076E and0770 untouched. No Simulation, renderer, controls, full suite or
whole-input audit changed or ran in this component unit. Full cold startup
through the first InitializeGame return remains pending.

Regenerate with the locally built `native-initialize-memory-probe.cpp`, then
`native-initialize-memory-fixture.ts --observer FILE --rom FILE --out JSON`.
The ROM stays local; the fixture contains CPU/RAM evidence, not ROM bytes.
Run `npx tsx --test tests/native-initialize-memory.test.ts`.
