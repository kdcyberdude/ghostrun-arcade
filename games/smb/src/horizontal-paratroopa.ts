/** Native id $10: XMoveCntr_GreenPTroopa + MoveWithXMCntrs and FrameCounter y sway.
 * Primary counter aliases $A0, secondary $58, horizontal subpixel $0401. */
export type NativeHorizontalFlight={x:number;y:number;primary:number;secondary:number;fraction?:number}; // fraction: the slot's y sub-pixel, untouched by the flight (a stomp drops from it)
export function advanceNativeHorizontalFlight(n:NativeHorizontalFlight,frame:number){
 if((frame&3)===0){
  if(n.primary&1){if(n.secondary===0)n.primary=(n.primary+1)&255;else n.secondary=(n.secondary-1)&255;}
  else if(n.secondary===19)n.primary=(n.primary+1)&255;else n.secondary=(n.secondary+1)&255;
 }
 const velocity=(n.primary&2?n.secondary:-n.secondary)/16;n.x+=velocity;
 if((frame&3)===0)n.y+=frame&64?1:-1;
 return velocity;
}
