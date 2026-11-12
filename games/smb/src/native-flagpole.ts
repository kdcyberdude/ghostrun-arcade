/** FlagpoleRoutine: Enemy_YMF_Dummy+5 ($041c) is retained from the previous special object.
 * CMP left carry clear, so ADC #$ff adds 255; the carry feeds ADC #1 for the flag's y ($00d4).
 * The award is checked before moving, at flag y >= $aa (or Mario y >= $a2). */
export function nativeFlagStep(y:number,fraction:number){
 const next=fraction+255;
 return {y:y+1+(next>>8),fraction:next&255};
}
