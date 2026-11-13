/** PlayerCtrlRoutine after BG collision: retain priority in holes, pipe entry,
 * flag/castle walk, and PlayerEntrance. Caller owns whether that routine ran. */
export const nativePlayerPriorityCleared=(engine:number,rawY:number)=>engine>=4&&engine!==5&&engine!==7&&rawY>=0x40;
