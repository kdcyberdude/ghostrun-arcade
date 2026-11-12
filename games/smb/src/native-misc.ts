/** Native MiscObjectsCore, FindEmptyMiscSlot, Get{X,Y}OffscreenBits and PlayerHammerCollision helpers.
 * Source: https://github.com/MrWint/smb-dis/blob/master/smbdis.asm */
export type NativeBox=[number,number,number,number];
export type NativeMisc={slot:number;state:number;speed:number;force:number;fraction:number;collision?:boolean;box?:NativeBox};
export const nativeCoinSlot=(busy:ReadonlySet<number>)=>[8,7,6].find(slot=>!busy.has(slot))??8;
export function nativeMiscGravity(n:NativeMisc,y:number,down:number,max:number){
 const f=n.fraction+n.force;n.fraction=f&255;y+=n.speed+(f>>8);
 const v=n.force+down;n.force=v&255;n.speed+=v>>8;
 if(n.speed>=max&&n.force>=128){n.speed=max;n.force=0;}return y;
}
const XB=[127,63,31,15,7,3,1,0,128,192,224,240,248,252,254,255],YB=[0,8,12,14,15,7,3,1,0];
/** Returned bits use the native object page and position, including wrapping above/below the vertical unit. */
export function nativeMiscOffscreen(x:number,y:number,camera:number){
 let xb=0,yb=0;
 for(const edge of [1,0]){const d=camera+edge*255-x,hi=Math.floor(d/256),lo=d&255;let index=hi<0?(edge?15:7):(edge?7:15);if(hi===0&&lo<56)index=(lo>>3)+(edge?0:8);xb=XB[index];if(xb)break;}
 for(const edge of [1,0]){const d=(edge?256:511)-(256+y),hi=Math.floor(d/256),lo=d&255;let index=hi<0?(edge?0:4):(edge?4:0);if(hi===0&&lo<32)index=(lo>>3)+(edge?0:4);yb=YB[index];if(yb)break;}
 return (xb>>4)|(yb<<4);
}
export function nativeHammerBox(x:number,y:number,camera:number,checkX=x):NativeBox{
 let l=(x-camera)&255,r=(l+8)&255;
 if(checkX>=camera+128){if(r<128){if(l<128)l=255;r=255;}}
 else if(l>=160){if(r>=128)r=0;l=0;}
 return [l,y&255,r,(y+8)&255];
}
export function nativePlayerBox(x:number,feet:number,size:number,duck:boolean,camera:number):NativeBox{
 const small=size===0,left=small?3:2,top=small||duck?20:8,screen=Math.floor(x)-camera,y=Math.floor(feet)-32;
 return [(screen+left)&255,(y+top)&255,(screen+(small?13:14))&255,(y+32)&255];
}
/** SprObjectCollisionCore uses inclusive byte intervals and handles vertical wrap. */
export function nativeBoxesOverlap(a:NativeBox,b:NativeBox){
 const axis=(l:number,r:number,L:number,R:number)=>l>=L?(l===L||l<=R||l>r&&r>=L):(l>=R||R<L||r>=L);
 return axis(a[0],a[2],b[0],b[2])&&axis(a[1],a[3],b[1],b[3]);
}
export function nativeHammerContact(n:NativeMisc,player:NativeBox,frame:number,offscreen:number){
 if(!(frame&1)||offscreen||!n.box)return false;
 if(!nativeBoxesOverlap(n.box,player)){n.collision=false;return false;}
 if(n.collision)return false;n.collision=true;return true;
}

/** SetupJumpCoin retains the carry from ASL $06 four times: bit4 of the native block-buffer low address. */
export function nativeAboveCoinStart(bufferRow:number,bufferLow:number,blockPage:number){
 return {x:blockPage*256+((bufferLow<<4)&255)+5,y:(bufferRow+32+((bufferLow>>4)&1))&255};
}
