/** Entrance_GameTimerSetup tables and PlayerEntrance's pre-movement dispatch.
 * Header bits3..5 select Y; AltEntranceControl selects X and can override Y.
 * Coordinates are raw NES positions, before the remake's +32 feet offset. */
export function nativeEntranceSetup(header:number,alternate:number,page:number){
 const control=(header>>3)&7,index=alternate<2?control:[8,0][alternate-2];
 return {x:page*256+[0x28,0x18,0x38,0x28][alternate],y:[0,0x20,0xb0,0x50,0,0,0xb0,0xb0,0xf0][index],state:0,forceDown:40,sprite:[0,0x20,0,0,0,0,0,0,0x20][index],control};
}
export function nativeEntranceAction(control:number,alternate:number,y:number,override:number,sprite:number){
 if(alternate===2)return override?'vine':'rise';
 if(y<0x30)return 'fall';
 if(control===6||control===7)return sprite?'side':'walk';
 return 'ready';
}
