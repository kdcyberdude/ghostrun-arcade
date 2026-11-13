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
