# Source CPU/PPU continuation clock

`NativeSourceMachine` executes the statically compiled source program. It owns FF
cold RAM, reset CPU state, controller serial state, nametables, palette, OAM and PPU
registers. A pad passed to `step(pad)` remains available until the next PPU sample;
source ReadJoypads instructions decide when to consume it. No observed RAM,
FrameCounter sequence, workload total, level or recording identifier enters runtime.

`stepInstruction()` returns exact source RAM/IO reads and writes, source PC before
and after, instruction cost, NMI service, and CPU state immediately before the
opcode (after any seven-cycle NMI entry). `onInstruction(event,machine)` receives
the same events during `step`. Public CPU/RAM allow isolated native procedure
fixtures to initialize a test once; continuous production ownership starts at reset.
The callback sees the completed instruction and advanced PPU state. A GameCore or
parser call may cross a PPU sample without restarting its source instructions.

Timing follows the authenticated NeSLE backend used by the captures, rather than
an assertion about another emulator or physical hardware: instruction branch/page
penalties, atomic NMI entry plus first opcode, 513-cycle DMA, alternating omitted
pre-render dot, status/NMI edges, open bus and instruction-stamped PPU events.
The constants in the PPU line replay are its source coordinate conversion and
fetch/update boundaries, not measured frame schedules. `batch_frame.cuh` functions
`replay_tiles`, `replay_line`, `replay_end_of_line`, `sprite0_first_seen` and
`frame_sprite0_hit` define the opacity projection used here. Backend hashes are
in the portable fixture. Sprite-zero overlap uses dynamic source scroll, rendering
masks, OAM pattern/flips and nametable tile patterns; palette colors do not affect it.

`native-source-graphics.ts` derives 4,096 opacity rows and the static title command
readback region from the existing `patterns-index.png`. The title read starts at
source `TitleScreenDataOffset=$1ec0`; DrawTitleScreen reads $013a bytes after a
garbage read. Complete last-20-pattern region is retained, not observed read events.
The optional local-ROM check authenticates all reconstructed graphic bytes without
bundling a ROM. Runtime does not decode recorded pictures.

Proof: three World1-1 POWERON inputs, samples 0..945, all 5,812,224 RAM bytes exact.
Native CPU/PPU sample windows 935..940 and every reported NMI instruction cost also
match. At 937 the CPU remains inside RenderAreaGraphics, and at 938 the same call
has completed without a new FrameCounter/RNG/gameplay update. The 91a8 case costs
30,535 cycles and samples PC $8906; the other two cost 30,544 and sample PC $8903.
Those are test assertions only; the evaluator computes both paths and Sprite0 wait.
Independent GameCore/parser fixtures cover additional source branches and split
procedure states. Regenerate the proof with `native-poweron-timing.cpp` followed by
`native-source-machine-proof.ts`; the native observer authenticates every preceding
RAM sample before writing CPU windows.

Coverage is explicitly bounded: this is an NROM vertical-mirroring source machine,
not a generic NES emulator. Unknown source instructions/data reads fail. CHR color
readback outside the source title region fails. Enabling DMC fails; unsupported APU
feedback reads fail. Audio synthesis is absent; source sound-engine instructions and
RAM still execute. Sprite opacity timing does not synthesize pixels. No Simulation
or renderer consumer is changed by this helper commit, so it alone does not repair
the high-level remake's partial-tail divergence. Runtime integration must consume
owned source events and preserve the existing semantic/picture contracts.

The opt-in `observerPcs` set restricts `step` callbacks to selected source PCs plus
NMI entry. `stepInstruction` always returns its full instruction/access event.
Without a requested instruction callback, `step` avoids trace allocations and can
batch a source absolute self-JMP. Each batch ends at the first PPU event/sample
boundary (one final JMP may straddle it), then rechecks pending NMI. It does not
batch running source procedures, replace their costs, or consult captured cycles.
The production parser observer needs only $92b0/$92c7 plus NMI entry. All native
RAM and CPU split-sample assertions are repeated with that sparse mode and with
no observer. Measured source-clock throughput on Node18 increased from84–86fps to
179–186fps across the three946-sample prefixes (CPU/PPU only; no combined-renderer
performance claim). Reproduce with `native-source-machine-benchmark.ts`.

## Physical display frontier and bounded prediction

The source PPU freezes `displayFrontier` at vblank: pre-render header/palette,
instruction-stamped events, final nametables and OAM. These are owned simulation
state, never a previous rendered image. `nativeSourceDisplay` resolves that frozen
frame using the existing 2-bit pattern sheet, including transparent sprite slot
reservations, the eight-sprite scanline limit, priority, scrolling and palettes.
The three focused prefixes reproduce all 152,570,880 captured native pixels and
all emphasis rows (crop x8..247, y8..231); unobserved border pixels are not counted.

The renderer's draw-before-input convention needs the *next* physical frontier.
`predictNextDisplay()` runs an isolated fork of owned source CPU/PPU/RAM to its
next sample, with no pad argument. It rejects every controller-port read before
consuming any value and returns `undefined` if future input would be needed. The
current machine, callbacks, RAM, timing and display latch are untouched. This is
sufficient for the already-running parser continuation: the native proof's next
sample 938 requires no new controller feedback and its physical frame is predicted
exactly. Fresh-NMI forecasts are refused. Tests retain older frozen frames across
many steps before rendering and verify their immutability.

The live consumer should request this bounded forecast only for its source-proven
pending parser, otherwise use the existing renderer. It must not use the current
frontier as a one-frame-ahead prediction, guess a next pad, skip a render, or cache
the previous screen. Small subsequent fresh-NMI picture differences remain deferred;
this helper does not claim to repair them or provide arbitrary future-frame foresight.
