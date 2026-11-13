/** VerticalPipeEntry/ScrollHandler: engine3 moves raw Y by1, reuses $06ff,
 * consumes $03a1, then decrements ChangeAreaTimer ($06de). X speed and both
 * player position fractions are untouched. */
export type NativePipeState={y:number;change:number;camera:number;xScroll:number;platformScroll:number};
export function nativeSavedScroll(n:Pick<NativePipeState,'camera'|'xScroll'|'platformScroll'>,screen:number,sideTimer:number,locked:boolean){
 n.xScroll=(n.xScroll+n.platformScroll)&255;n.platformScroll=0;
 let amount=0;
 if(!locked&&screen>=0x50&&sideTimer===0&&((n.xScroll-1)&255)<128)amount=screen>=0x70||n.xScroll<2?n.xScroll:n.xScroll-1;
 n.camera=(n.camera+amount)&65535;
 return amount;
}
export function nativeVerticalPipe(n:NativePipeState,screen:number,sideTimer:number,locked:boolean){
 n.y=(n.y+1)&255;
 const amount=nativeSavedScroll(n,screen,sideTimer,locked);
 n.change=(n.change-1)&255;
 return amount;
}
