import {nativeMiscOffscreen} from './native-misc.js';
/** FlagpoleGfxHandler hides the flag and score together if any of horizontal bits1..3 is set. */
export const nativeFlagShown=(slot:{flag:number;id:number;x:number;y:number},camera:number)=>Boolean(slot.flag)&&slot.id===48&&!(nativeMiscOffscreen(slot.x,slot.y,camera)&14);

/** Three flag sprites followed by the optional two-sprite score, all native palette1. */
export function nativeFlagSprites(slot:{flag:number;id:number;x:number;y:number},number:{y:number;score:number}|undefined,camera:number){
 if(!nativeFlagShown(slot,camera))return [];
 // ADC #8 for the third Y retains carry from the preceding X +8, CLC, +12.
 const x=(Math.floor(slot.x)-Math.floor(camera))&255,y=slot.y&255,second=(x+8)&255,carry=second+12>255?1:0,sprites=[{tile:0x7e,x,y:y+1},{tile:0x7f,x:second,y:y+1},{tile:0x7e,x:second,y:((y+8+carry)&255)+1}];
 if(number){const index=[5000,2000,800,400,100].indexOf(number.score),pairs=[[0xf9,0x50],[0xf7,0x50],[0xfa,0xfb],[0xf8,0xfb],[0xf6,0xfb]];if(index>=0)for(let col=0;col<2;col++)sprites.push({tile:pairs[index][col],x:(x+20+col*8)&255,y:(number.y&255)+1});}
 return sprites;
}
