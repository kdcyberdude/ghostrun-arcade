/** FlagpoleRoutine: Enemy_YMF_Dummy+5 ($041c) is retained from the previous special object.
 * CMP left carry clear, so ADC #$ff adds 255; the carry feeds ADC #1 for the flag's y ($00d4).
 * The award is checked before moving, at flag y >= $aa (or Mario y >= $a2). */
export function nativeFlagStep(y:number,fraction:number){
 const next=fraction+255;
 return {y:y+1+(next>>8),fraction:next&255};
}

/** FlagpoleFNum_YMFDummy / Y_Pos: SEC, SBC #$ff, then SBC #1. */
export function nativeFlagNumberStep(y:number,fraction:number){
 const next=fraction-255;
 return {y:(y-1-(next<0?1:0))&255,fraction:next&255};
}

/** CheckSideMTiles -> HandleClimbing: the lower side probe uses X adders 2/13,
 * Y adder24 (feet-8), and the returned PLAYER X low nibble must be6..9.
 * Only the pole ball/shaft metatiles24/25 enter FlagpoleCollision.
 * Source: https://github.com/Xkeeper0/smb1/blob/master/src/prg.asm */
export function nativeFlagPoleSideContact(x:number,feet:number,tileAt:(x:number,y:number)=>number){
 const px=Math.floor(x),rawY=Math.floor(feet)-32,lowX=px&15;
 if(rawY<8||rawY>=0xcf||lowX<6||lowX>=10)return false;
 return [2,13].some(dx=>{const tile=tileAt(px+dx,Math.floor(feet)-8);return tile===0x24||tile===0x25;});
}
