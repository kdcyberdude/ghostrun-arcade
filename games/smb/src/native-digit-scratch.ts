/** $0137 = DigitModifier+3 = Block_Y_Position+$60.
 * At an eligible CheckFrenzyBuffer/InitEnemyObject boundary, every score/coin/
 * timer writer has completed DigitsMathRoutine's unconditional $0133..$0139
 * erase. InitializeMemory supplies the same initial value. This is a boundary
 * invariant, not a claim that the scratch byte never changes inside an award.
 * See docs/NATIVE_DIGIT_SCRATCH.md and the original-ROM CPU fixture. */
export const NATIVE_DIGIT_MODIFIER3_AT_ENEMY_INIT=0;
