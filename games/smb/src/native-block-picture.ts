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
/** DrawBrickChunks: four $84 tiles on palette 3, flipped by FrameCounter bits 2-3; the left chunks at the block objects' X, the right ones
 * mirrored about Block_Orig_XPos (original - X, plus original, plus 6, with the SBC/ADC carries: 2 x original - X + 7 when nothing wraps); the left column hidden by offscreen bit 3, the upper row by bit 7, and the right
 * column when the original is on the right half and its X wrapped left of the left column (0a766fa4 1-2 rows 6187-6200; row 6348: X 255 for original 46 puts the right chunk at 99). */
export function nativeBrickChunkSprites(c:{x:number,y:number,lowX:number,lowY:number,origX:number},frame:number,camera:number){
 const cam=Math.floor(camera),orig=(c.origX-cam)&255,bits=nativeMiscOffscreen(c.x,c.y,camera),flipX=Boolean(frame&4),flipY=Boolean(frame&8);
 const rows=[[c.x,c.y],[c.lowX,c.lowY]].map(([x,y])=>{const left=(x-cam)&255,u=((orig-left)&255)+orig+(orig>=left?1:0);return {y,left,right:((u&255)+6+(u>255?1:0))&255};});
 const sprites=[];
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){const r=rows[row],x=col?r.right:r.left;
  if(!col&&bits&8||!row&&bits&128||col&&orig>=128&&rows[0].left>=rows[0].right)continue;
  sprites.push({tile:0x84,x,y:(r.y&255)+1,palette:3,flipX,flipY});}
 return sprites;
}
