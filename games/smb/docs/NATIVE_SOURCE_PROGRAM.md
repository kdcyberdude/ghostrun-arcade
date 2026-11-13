The gameplay timing model needs the executed source path, including parser writes
that finish after a PPU sample. Atomic remake updates cannot represent that
boundary. `native-source-program.ts` supplies a static source program for the
separate CPU/PPU timing executor; it does not itself change game scheduling.

The compiler reads local SMBDIS and an authenticated local ROM. It resolves
source labels, RAM aliases, addressing modes and declared tables, then compares
every source instruction/data byte with the ROM. All 32,768 PRG source bytes
match. Output contains instruction semantics and explicitly declared source data,
not a ROM or instruction-byte image. No observed frame, pad sequence, RAM row,
measured procedure duration or execution-PC training list constructs the program.

Control-flow traversal follows conditional branches, direct calls/jumps and all
inline JumpEngine word-table targets. It understands immediate-load flag results
and source `.db $2c` BIT overlays, including their overlapping operand bytes.
This prevents an always-taken branch from treating following table data as code.
Start/NMI roots yield 10,693 nodes; GameCoreRoutine/AreaParserTaskHandler alone
yield 8,972. Traversal includes every reachable dispatcher alternative rather
than specializing to a recorded level. Source data declarations are retained
because indexed/indirect reads choose their addresses dynamically.

An independent tool using the native CPU decoder verifies every selected node's
mnemonic, addressing mode, operand, instruction size, base cycles and page-cross
cost flag. All 10,693 tuples agree. The portable receipt records program, compiler,
source, ROM and decoder fingerprints. Tests retain source dispatch, byte-authentication
and overlapping-BIT cases. The local ROM is never committed.

Reproduce from `games/smb`:

```
npx tsx tools/harness/native-source-program.ts --asm SMBDIS.ASM --rom LOCAL_ROM --entries Start,NonMaskableInterrupt --out data/native-source-program.json
c++ -O2 -std=c++20 -I NESLE/cpp/include tools/harness/native-source-decode.cpp -o DECODER
```

Pass one decimal instruction PC per line to `DECODER LOCAL_ROM PC_LIST`; compare
its JSON tuples to `program.instructions`. The fixture records their exact digest.

This proves source closure and individual instruction costs, **not predictive
runtime equivalence**. The next boundary is the shared source machine: CPU/PPU
phase, status/sprite-0 reads, source RAM, VRAM/OAM, sound writes, and resumable
instruction execution must advance from initial reset without later native RAM
corrections. Runtime integration and full World1-1 parity remain unverified.

`native-gameplay-procedure.json` adds 209 actual GameCore/parser calls across
8 World1-1 observation windows and 3,216 executed instruction PCs. The observer
replays genuine POWERON inputs, verifying every native RAM row through each
window, and captures CPU/RAM once at entry and at the actual outer RTS. Four
calls cross a PPU sample; their intermediate CPU and all RAM bytes are retained.
The source machine reproduces every instruction count, cycle/register result,
complete RAM result and partial sample without intermediate state correction.
These isolated procedure tests complement reset-owned continuous execution;
the snapshots are test inputs, not runtime state or synchronization rules.
