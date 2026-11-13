/** Source PlayerChangeSize/PlayerInjuryBlink/PlayerFireFlower completion tests.
 * SetPRout writes TimerControl=$FF; NMI decrements it before GameRoutines. */
export type NativeTransform='grow'|'shrink'|'fire';
const END={grow:0xc4,shrink:0xc8,fire:0xc0};
export const nativeTransformRows=(kind:NativeTransform)=>255-END[kind];
export function nativeTransformStep(kind:NativeTransform,remaining:number){
 const timer=END[kind]+remaining-1;
 return {timer,remaining:remaining-1,done:timer===END[kind]};
}
