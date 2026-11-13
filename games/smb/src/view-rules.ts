// Small pure rendering rules measured against native frames (tools/harness/shot-pairs.mjs + frame-diff.mjs, viewaudit 2026-11-11).
import type {Item} from './types.js';
import {nativeMiscOffscreen} from './native-misc.js';
/** DrawBubble checks the player's vertical page and the bubble's horizontal offscreen bit. */
export const nativeBubbleShown=(bubble:{x:number;y:number},playerFeetY:number,camera:number)=>Math.floor((playerFeetY-32)/256)===0&&!(nativeMiscOffscreen(Math.floor(bubble.x),bubble.y,Math.floor(camera))&8);
/** PowerUpObjHandler skips drawing until the native emergence state reaches 6; the first five pixels remain hidden inside the block. */
export const itemShown=(item:Item&{nativePowerState?:number})=>(item.nativePowerState===undefined||item.nativePowerState>=6)&&item.nativeCoin?.state!==0&&item.nativeHammer?.state!==0;
/** Water areas keep sky colour in the top 32 rows (above the surface wave); only the playfield below is water blue. Native 2-2/7-2 rows 0..31 = #6888fc. */
export const waterSurfaceSky=(area:{theme?:string;background?:string})=>area.theme==='water'&&area.background==='#0058f8';
/** Castle doorway (metatile 74): where the level data has no tile below it, native draws the black lower half (metatile 75). */
export const doorwayBottomTile=(id:number,hasTileBelow:boolean)=>id===74&&!hasTileBelow?75:undefined;
// Native power-on frames before the title menu (steps 1-based): grey 1-9, black 10-27, plain sky 28-32, title from 33.
export const titleBootColor=(frame:number)=>frame<=9?'#7c7c7c':frame<=27?'#000000':frame<=32?'#6888fc':undefined;
/** Mushroom growth pose (native 1-1 captures, every frame of the 59-row freeze; evidence/view4-findings-20261111.md): 4-frame cells from freeze row 1,
 * 0 small / 1 mid / 2 big = A A B A B A B C A B C, then one more small frame and big from row 46. Returns the sprite cell (23 small, 24 mid, 25 big) or undefined (row 0: keep the pose). */
export const growCell=(frozen:number)=>{
 if(frozen<1)return undefined;
 const seq=[23,23,24,23,24,23,24,25,23,24,25],cell=Math.floor((frozen-1)/4);
 return cell<seq.length?seq[cell]:frozen===45?23:25;
};
/** Shrink freeze (native 1-1 hurt by a Goomba, every frame of the 55 engine-10 rows): the big pose alternates with the small one each frame on freeze rows 1,3 .. 15 (big) / 2,4 .. (small), small from row 16. Row 0 keeps the pose. */
export const shrinkBig=(frozen:number)=>frozen<1||frozen<=15&&frozen%2===1;
/** Fire flower freeze (native 1-1, every frame of the 63 engine-12 rows, evidence/view5-findings-20261111.md): row 0 keeps the old palette, row 1 is fire,
 * then 4-row cells dark, fire, green, white repeating from row 2 (the 61st-63rd rows are white), fire after the freeze. No normal-palette rows. */
export const fireFlashVariant=(frozen:number)=>frozen<1?undefined:frozen===1?'fire':(['star-dark','fire','star-green','star-white'] as const)[Math.floor((frozen-1)/4)%4];
/** Fireball throw pose (native 1-1 fire Mario, every frame): shown on the rows 1..3 after the fireball appears when moving on the ground (3 of 3 throws, speed 1.5-1.7 px),
 * rows 1..6 when starting from a stand (1 throw, speed 0.06-0.4 px) and rows 1..2 in the air (1 throw). age = rows since the fireball was created. */
export const throwPoseShown=(age:number,grounded:boolean,speed:number)=>age>=1&&age<=(!grounded?2:speed<0.875?6:3);
/** Player OAM palette bits are captured before EndGameEngine updates $03C4 for the next draw. Palette0 preserves Mario/Luigi/Fire. */
export const starVariant=(palette:number,own:string)=>[own,'star-green','star-white','star-dark'][palette&3];
/** ?-block / coin palette cycle (native ColorRotation, traces of all 32 levels: ColorRotateOffset $06D4 and FrameCounter $09 are cleared with the area and the
 * offset advances once on every game-engine frame with FrameCounter&7==0). Each run writes ColorRotatePalette[offset] = 27 27 27 17 07 17 to BG palette 3 colour 1
 * (palette entry 13), shown from the next picture. rotations = runs since the area was initialized (0: the loaded palette). Returns the palette observation
 * index equal to `index` except for entry 13, or `index` when there is none. */
export const rotatedPalette=(palettes:number[][],index:number,rotations:number)=>{
 if(rotations<1)return index;
 const color=[0x27,0x27,0x27,0x17,0x07,0x17][(rotations-1)%6],base=palettes[index];
 const found=palettes.findIndex(p=>p[13]===color&&p.every((c,i)=>i===13||c===base[i]));return found<0?index:found;
};
/** Only hit blocks (bricks, ?-blocks, hidden and used blocks, simulation isHitBlock) move when bumped from below; native canopy/ground/stair cells hit by the
 * head stay put (5-3 frame 420: a bumped canopy cell drawn 4 px high, 128 px differed). */
export const bumpShown=(id:number)=>(id>=81&&id<=96)||id===192||id===193||id===196;
/** Castle lift ropes (metatile 64, native $40: the flagpole pattern below the collision bound, so the block buffer holds 0 there) run the full playfield height, rows 2-14, in every native picture (2-4 columns 86/89, 5-4 columns 86/89); the extracted
 * maps lost the cells hidden behind the lifts (2-4 rows 3-5, 5-4 column 86 rows 12-14). Returns the columns to draw full height. Rope cells are not solid. */
export const liftRopeColumns=(area:{theme:string;tiles:[number,number,number][]})=>area.theme==='castle'?[...new Set(area.tiles.filter(t=>t[2]===64).map(t=>t[0]))]:[];
