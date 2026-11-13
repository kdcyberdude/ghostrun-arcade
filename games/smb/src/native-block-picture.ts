import {nativeMiscOffscreen} from './native-misc.js';
export interface NativeBlockPicture {x:number;pictureY:number|undefined;metatile:number}
/** DrawBlock: brick tiles85/86 or the four mirrored used-block tiles87. */
export function nativeBlockSprites(block:NativeBlockPicture,ground:boolean,camera:number){
 if(block.pictureY===undefined)return [];
 const used=block.metatile===196,bits=nativeMiscOffscreen(block.x,block.pictureY,camera),sprites=[];
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  if(bits&(col?4:8))continue;
  sprites.push({tile:used?0x87:!row&&ground?0x85:0x86,x:(Math.floor(block.x)-Math.floor(camera)+col*8)&255,y:((block.pictureY+row*8)&255)+1,palette:used&&!ground?1:3,flipX:used&&col===1,flipY:used&&row===1});
 }
 return sprites;
}
