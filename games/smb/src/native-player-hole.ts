/** PlayerHole's CMP #$02 / BMI guard, evaluated on the raw Y-high byte.
 * Called only when PlayerCtrlRoutine runs, including the engine11 death arc. */
export const nativePlayerHoleLocks=(yHigh:number)=>!(((yHigh-2)&255)&128);
