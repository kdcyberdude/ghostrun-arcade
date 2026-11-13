# Digit scratch at native enemy initialization

`$0137 = DigitModifier+3 = Block_Y_Position($d7)+Y($60)`. It is **not always zero inside a scoring routine**. It is zero on return from every digit writer, and therefore at eligible `CheckFrenzyBuffer` / `InitEnemyObject` boundaries. The shared export is `NATIVE_DIGIT_MODIFIER3_AT_ENEMY_INIT`; a persistent imitation RAM bank is unnecessary for this boundary. It must not replace an arbitrary mid-instruction snapshot byte before its interrupted routine resumes.

Source closure in the authenticated PRG0 SMBDIS:

- `FloateyNumbersRoutine` writes `DigitModifier,x` using ScoreUpdateData. Its high nibbles are0/3/4; the3 entries transiently set0137 to1/2/4/5/8. The next call is `AddToScore`, then `DigitsMathRoutine`.
- `FlagpoleRoutine/GiveFPScr` uses FlagpoleScoreDigits3/3/4/4/4. The two index3 awards transiently set0137 to5/2, immediately followed by `AddToScore`.
- `GiveOneCoin` writes modifier5 and calls math, then its `CoinPoints` writes modifier4 and calls `AddToScore`. `BrickShatter` writes modifier5 and calls `AddToScore`. `FireworksSoundScore` writes modifier4 and jumps to `EndAreaPoints`, which calls math.
- `RunGameTimer` writes modifier5=$ff and calls math. `AwardGameTimerPoints` does the same subtraction, then writes modifier5=5 and calls math again. Borrow/carry can temporarily write modifier3.
- Inside math, `CarryOne`/`BorrowOne` affect `DigitModifier-1,x`. Every normal six-digit path reaches `EraseDMods`; the title-mode path branches directly there. `LDX #6; STA DigitModifier-1,X; DEX; BPL` clears **all seven bytes0133..0139**, including0137, before RTS. No writer branch returns to the engine with an uncleared modifier.
- `InitializeMemory` clears page1 offsets00..5f while preserving the high-stack range60..ff; both cold/game setup and area initialization clear0137 before engine dispatch. Its sampled execution can span PPU frames, but no enemy loader executes before that routine returns.

These are all symbolic DigitModifier stores/increments/decrements in this source. Other block/floatey stores have bounded object-slot indices and do not reach0137. The CPU call stack occupies the high part of page1; the controlled procedure cases retain its minimum pointer and never approach the low scratch range. Native NMI clears PPUCTRL's NMI-enable bit on entry, runs scoring and enemy dispatch through `OperModeExecutionTree`, and enables NMIs only immediately before RTI. Thus a second NMI cannot reenter an enemy loader between a modifier write and its erase. This is a routine-order invariant for valid native execution, not an inference from the774 natural vine observations.

## Actual-ROM CPU evidence

`native-digit-proof.py` executes unchanged ROM procedures on NeSLE's Ricoh2A03 CPU with controlled RAM/register inputs and a synthetic JSR/RTS return. There is no PPU advance, no NMI scheduling and no ROM write. The portable fixture retains ROM/source/wrapper hashes, unique-signature procedure addresses, scratch-write PCs, final digits, stack bounds and following vine-initialization results.

-3072 exhaustive cases: both gameplay and title math, all six modifier columns, every byte value0..255. Every return cleared0133..0139.
-50 representative cases: both players'11 floatey awards and5 flag awards, coin00/09/99 including100-coin carry, timer001/010/100/999 including borrow, fireworks, and both source InitializeMemory limits4b/6f.
-40 cases actually wrote a nonzero0137 transient before erasing it. This rejects the stronger, false claim that it is always zero.
-All48 award cases then execute actual `InitEnemyObject→JumpEngine→Setup_Vine` without changing0137 between calls. Every secondary vine receives rawY0, state0, ID47, flag1.

Build `native-digit-procedure.cpp` with the existing NeSLE `cpp/include`, then run `native-digit-proof.py --rom ROM --library LIB --assembly SMBDIS.ASM --cpu-header NESLE/cpp/include/nesle/cpu.hpp`. The ROM is not committed. `native-digit-scratch.test.ts` validates the portable CPU result and shared boundary API. No Simulation, vine, EF register, scoring behavior, full audit or pixel code changes belong to this proof unit.
