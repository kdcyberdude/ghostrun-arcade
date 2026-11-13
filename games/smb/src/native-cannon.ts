/** Source OffscreenBoundsCheck for ID51. The CPY PiranhaPlant leaves carry set,
 * so the left edge is ScreenLeft-72. That subtraction's carry enters the
 * ScreenRight ADC, extending the right edge by72 or73. Both comparisons are
 * native page/subtract sign tests. Position is sampled before BBFly moves. */
export function nativeCannonOutside(x:number,screenLeft:number,areaOffset=0){
 const left=(Math.floor(screenLeft)-areaOffset)&65535,position=(Math.floor(x)-areaOffset)&65535;
 const lower=(left-72)&65535,upper=(left+255+72+Number(left>=72))&65535;
 return ((position-lower)<<16>>16)<0||((position-upper)<<16>>16)>=0;
}
