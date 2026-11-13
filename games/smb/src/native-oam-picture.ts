import {enemyPicture,enemyPictureTimersStopped} from './enemy-picture.js';import {playerCell,playerVisible} from './player-cell.js';import tables from '../assets/graphics/tables.json';
/** Explicit initial capability: normal Mario plus live Goombas. Unknown writers
 * refuse the whole composition; they are never silently omitted from the cap. */
export function nativeOamPicture(s:any){
 const reasons:string[]=[];
 if(s.paused||s.phase!=='play'||s.spritePictureOwner!=='engine'||s.nativeScreen||s.nativeTimersStopped||s.powerChange)reasons.push('control-owner');
 if(s.currentPlayer||s.player.size===2||s.player.star||s.starDrawPalette!==undefined||s.player.climbing||s.player.duck||['water','castle'].includes(s.area.theme)||s.player.dead)reasons.push('player-variant');
 if(s.items.length||s.popups.length||s.blockGraphics.length||s.vines.length||s.nativeFireworks?.length||s.nativeCastleFlag||s.specialSlot5.flag||s.frenzyControllers?.some((c:any)=>c.slot!==undefined&&!c.lost))reasons.push('other-writer');
 if(s.area.platforms?.length||s.area.firebars?.length||s.area.springs?.length)reasons.push('area-writer');
 const enemies=s.enemies.filter((e:any)=>e.active&&enemyPicture(e).dead<90);
 if(enemies.some((body:any)=>{const e=enemyPicture(body);return e.kind!=='goomba'||e.dead||e.enemySlot===undefined||body.graphicsVisible===false;}))reasons.push('enemy-writer');
 const pose=playerCell(s);if(pose.throwing||pose.swimKick!==undefined)reasons.push('player-extra-piece');
 const px=Math.floor(s.player.x-s.camera),py=Math.floor(s.player.y)-32;
 if(px<0||px>240||py<0||py>208)reasons.push('player-offscreen');
 if(s.spriteShuffle.offsets[0]!==4)reasons.push('player-offset');
 if(reasons.length)return {supported:false as const,reasons};
 // MoveSpritesOffscreen clears Y only; unused tile/attribute/X bytes stay unknown.
 let overlapping=false;const oam=new Uint8Array(256),written=new Uint8Array(64);for(let a=0;a<256;a+=4)oam[a]=248;
 const write=(address:number,y:number,tile:number,attribute:number,x:number)=>{const a=address&255;if(written[a/4])overlapping=true;written[a/4]=1;oam.set([y&255,tile,attribute,x&255],a);};
 write(0,24,255,35,88);
 const tiles=tables.player_cells[pose.cell].tiles;
 // ChkForPlayerAttrib forces symmetry at table offsets50/B8/C0/C8.
 if(playerVisible(s))for(let row=0;row<4;row++)for(let col=0;col<2;col++)write(4+row*8+col*4,py+row*8,tiles[row*2+(pose.facing<0?1-col:col)],(([10,23,24].includes(pose.cell)&&row===3||pose.cell===25&&row>=2)?col*64:pose.facing<0?64:0)|(s.playerDrawBackgroundPriority?32:0),px+col*8);
 for(const body of enemies.sort((a:any,b:any)=>a.enemySlot-b.enemySlot)){
  const e=enemyPicture(body),x=Math.floor((e.graphicsX??e.x)-s.camera),y=Math.floor(e.graphicsY??e.y)-24,base=s.spriteShuffle.offsets[e.enemySlot!+1],stopped=enemyPictureTimersStopped(e,s.frame,s.nativeTimersStopped),left=(e.graphicsFacing??e.vx)<0,flip=stopped?left:left===Boolean(s.random.frame&8);
  if(y<0||y>216)return {supported:false as const,reasons:['enemy-vertical-mask']};
  // SprObjectOffscrChk hides whole columns, including the left column at X0.
  for(let row=0;row<3;row++)for(let col=0;col<2;col++){const xx=x+col*8;write(base+row*8+col*4,xx<=0||xx>255?248:y+row*8,tables.enemy_cells[14].tiles[row*2+(flip?1-col:col)],3|(flip?64:0),xx);}
 }
 if(overlapping)return {supported:false as const,reasons:['overlapping-writer']};
 return {supported:true as const,reasons,oam,written};
}
