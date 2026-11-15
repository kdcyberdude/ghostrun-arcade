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
/** Mushroom growth pose (PlayerChangeSize; all captures, 4 of 4 grows plus the 1-1 freeze in evidence/view4-findings-20261111.md): freeze rows 1-6 keep the
 * current pose; from row 7 the size step starts at 0 and advances on rows with FrameCounter&3 = 0, drawing sizes 0 1 0 1 0 1 2 0 1 2 as cells 23/24/25;
 * the tenth step draws 23 once and ends it, later rows show the big pose ('big'). undefined: keep the pose. */
export const growCell=(frozen:number,frameCounter:number):number|'big'|undefined=>{
 if(frozen<7)return undefined;
 let step=0;for(let k=7;k<=frozen;k++)if(((frameCounter-frozen+k)&3)===0&&++step===10)return k===frozen?23:'big';
 return [23,24,23,24,23,24,25,23,24,25][step];
};
/** HandleChangeSize while shrinking: PlayerChangeSizeFlag is set on freeze row 15 (TimerControl $F0) with PlayerAnimCtrl 0; the counter steps on each later
 * row whose FrameCounter&3 is 0, and ChangeSizeOffsetAdder's shrink half (2,0,2,0..) picks small swim frame 1 ($88, cell 17) or big swim frame 1 ($28, cell 5)
 * (371fe2fe 2-1 RAM 18250-18262: anim 1 tiles 08 09 28.., anim 2 fc.. 32 33 44 45). Rows 0-15 keep the ordinary pose; from PlayerAnimCtrl 10 the small
 * frame stays until the last row, which draws the small ordinary pose (371fe2fe RAM 18286-18288, a3899256 12420-12422: $88 $88 then $80). */
export const shrinkCell=(frozen:number,frameCounter:number):number|undefined=>{
 if(frozen<16)return undefined;
 let anim=0;for(let k=16;k<=frozen;k++)if(((frameCounter-frozen+k)&3)===0)anim++;
 return frozen>=54?undefined:anim%2?5:17;
};
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
 // Before the first write the area's loaded colours stand, $3F0F included: 6-3 loads $00 there, which ColorRotation's 0F 27 17 0F replaces
 // (6-3 original pixels 2576 / 2582: the coin edge $00, then $0F).
 if(rotations<1){const base=palettes[index],loaded=palettes.findIndex(p=>p[15]===0&&base[15]!==0&&p.every((c,i)=>i===15||c===base[i]));return loaded<0?index:loaded;}
 const color=[0x27,0x27,0x27,0x17,0x07,0x17][(rotations-1)%6],base=palettes[index];
 const found=palettes.findIndex(p=>p[13]===color&&p.every((c,i)=>i===13||c===base[i]));return found<0?index:found;
};
/** Only hit blocks (bricks, ?-blocks, hidden and used blocks, simulation isHitBlock) move when bumped from below; native canopy/ground/stair cells hit by the
 * head stay put (5-3 frame 420: a bumped canopy cell drawn 4 px high, 128 px differed). */
export const bumpShown=(id:number)=>(id>=81&&id<=96)||id===192||id===193||id===196;
/** Castle lift ropes (metatile 64, native $40: the flagpole pattern below the collision bound, so the block buffer holds 0 there) run the full playfield height, rows 2-14, in every native picture (2-4 columns 86/89, 5-4 columns 86/89); the extracted
 * maps lost the cells hidden behind the lifts (2-4 rows 3-5, 5-4 column 86 rows 12-14). Returns the columns to draw full height. Rope cells are not solid. */
export const liftRopeColumns=(area:{theme:string;tiles:[number,number,number][]})=>area.theme==='castle'?[...new Set(area.tiles.filter(t=>t[2]===64).map(t=>t[0]))]:[];
