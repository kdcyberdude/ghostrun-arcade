// Small pure rendering rules measured against native frames (tools/harness/shot-pairs.mjs + frame-diff.mjs, viewaudit 2026-11-11).
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
/** Star palette cycle (native 1-1 star on fire Mario, every frame from the pickup row to the end, evidence/view5-findings-20261111.md): own palette, green, white, dark
 * in 2-row cells (713 rows), 8-row cells once the star timer 0x79F drops below 8 (the last 150 rows of the star). left = star rows remaining (1 on the last row). */
export const starVariant=(left:number,frame:number,own:string)=>[own,'star-green','star-white','star-dark'][Math.floor(frame/(left<=150?8:2))%4];
