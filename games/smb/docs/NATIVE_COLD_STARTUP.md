# World1-1 cold CPU startup

`NativeColdStartup` owns a coldFF2048-byte RAM, reset CPU and reference PPU clock.
`step(pad:number):void` executes source instructions until the next native PPU
sample. Its public `ram` is generated only by those instructions. `done` becomes
true after the first InitializeGame/NMI return and the current sample target;
the following sample belongs to normal title execution. Read-only diagnostics
are cycles/pc/sp/ppuDot/nmiEligible/nmiCycles and snapshot(). This unit adds no
Simulation, controller or renderer integration.

The source-readable program contains407 operation/address-mode/operand nodes
and17 cold-read ROM table bytes. It contains no ROM image, binary instruction
stream, recorded RAM or replay-frame schedule. The local-ROM generator observes
the full256-value first-controller space through this bounded constructor-owned
cold state. Runtime follows PC, registers and its own RAM; it never selects a
recording or reads the proof fixture. The independently verified InitializeMemory
instruction helper handles its partial page/stack writes.

CPU work determines the overrun. Each branch/page crossing and instruction has
its native cost; JSR/RTS/NMI operate on the generated stack. DMA adds513 cycles.
The source console services NMI7 and its first instruction atomically. The PPU
model follows the reference's status flag12dots before NMI, status-read clearing,
CTRL rising-edge latch, open bus and alternating pre-render kook skip. Controller
strobe/shift reads include port2's empty0x40 output. Those are source machine
rules, not fixed boot rows or a fitted71,599-cycle wait. Graphics VRAM/audio
synthesis are outside this control helper; no PPU data reads occur in its scope.

All256 controller values are held through every first-seven PPU sample, including
the actual first ReadJoypads inside NMI. All1,792 native snapshots match every
RAM byte plus PC/A/X/Y/P/SP/cycles, PPUframe/dot/CTRL/MASK/status/openbus/NMI and
actual completion/cost. This checks3,670,016RAM bytes. The authentic zero-pad
POWER-ON capture and a separate held-Start8 capture independently match their
first seven RAM rows. Actual PCs/cycles/dots are preserved in
`evidence/native-cold-startup-proof.json`; the71,599-cycle first NMI spans
multiple samples because both source memory clears execute incrementally.
No later RAM state is applied early. Five focused tests pass.

The public API ends at this ownership boundary. Normal title NMI, live startup
wiring and the combined controls/picture proof through sample35 are the next
owner's existing work. This helper alone does not claim whole-startup rendering,
whole-input fidelity or the game goal. No full suite/audit or additional mechanic
investigation was started.

Reproduce with locally built `native-cold-program.cpp`, followed by
`native-cold-fixture.ts --observer FILE --rom FILE --asm FILE --capture DIR
--program data/native-cold-program.json --out tests/fixtures/native-cold-startup.json`.
The binary and ROM stay local. Run `npx tsx --test tests/native-cold-startup.test.ts
tests/native-initialize-memory.test.ts`. Runtime imports only the source program,
not the compressed native proof samples.
