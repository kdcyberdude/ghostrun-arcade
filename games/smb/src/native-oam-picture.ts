import {nativeMiscOffscreen,nativeHammerPicturePhase} from './native-misc.js';import specialSprites from '../assets/graphics/special/index.json';import {enemyRenderPicture,enemyPictureTimersStopped,nativeBlooperPicture} from './enemy-picture.js';import {nativeBubbleShown,itemShown} from './view-rules.js';import {playerCell,playerVisible} from './player-cell.js';import tables from '../assets/graphics/tables.json';import {nativePlatformArtworkYs,nativeSmallPlatform,platformMotionModel} from './platform-motion.js';import shellLaunchRules from '../data/shell-goomba-launch-rules.json';
/** Explicit capability: normal Mario, live Goombas and lifts. Unknown writers
 * refuse the whole composition; they are never silently omitted from the cap. */
/** ChkTallEnemy: a Spiny, Piranha Plant or Cheep Cheep, or an ID below 9 other than the Hammer Bro in state 2 or more (dead or a shell),
 * puts its floatey number in its own slot's first two entries; any other victim uses Alt_SprDataOffset[SprDataOffset_Ctrl]. */
/** A cannon's Bullet Bill is ID $33 (a frenzy one ID 8): a stomped cannon bullet's number goes to the Alt entries, where a later slot's number replaces it
 * (ba9b128f 8-2 RAM 73973-73974: slot 0 ID $33 stomped, its own entries keep the bullet, entries 54-55 hold slot 3's 400 only; a3ca705b 7-1 RAM 58339: slot 1's 200 hides slot 0's 400). */
export const floateyOwnSlot=(v:any)=>{const id=v?.nativeId??(v?.kind==='bullet'?(v.frenzy?8:0x33):-1);return id<0||[0x0a,0x0b,0x0d,0x12].includes(id)||id<9&&id!==5&&(Boolean(v.dead)||Boolean(v.shell));};
export function nativeOamPicture(s:any){
 // The picture the renderer draws: with timers stopped (Mario dying) the frozen one (abf3a46f 1-1 row 1095: X one less than the pre-move picture).
 const pic=(e:any)=>enemyRenderPicture(e,s.frame,s.nativeTimersStopped);
 const reasons:string[]=[];
 if(s.paused||!['play','dying'].includes(s.phase)||s.spritePictureOwner!=='engine'||s.nativeScreen||s.nativeTimersStopped&&s.phase!=='dying'||s.powerChange)reasons.push('control-owner');
 if(s.currentPlayer||s.player.size===2||s.player.star||s.starDrawPalette!==undefined||s.player.climbing||s.player.duck||s.player.dead&&s.phase!=='dying')reasons.push('player-variant');
 // A Goomba or Koopa knocked over (not squashed): its picture's two rows at entries 2-5, its floatey number on 0-1 (all captures, state bit 5:
 // 30,689 rows with rows 1-2 eight apart, at the drawn top less one; a row reaching Y 248 stays hidden: 243 / 248).
 const defeatTop=(e:any)=>!e.dead||e.squashed?undefined:e.greenShellLaunchFrame!==undefined||e.defeat&&e.kind==='goomba'?Math.floor(e.y)+shellLaunchRules.visibleBodyTopFromFeet:e.defeat&&(e.kind==='koopa'||e.kind==='redKoopa')?Math.floor(e.graphicsY??e.y)-15:undefined;
 const powerup=(i:any)=>['mushroom','flower','star','1up'].includes(i.kind)&&i.nativePowerState!==undefined; // an emerging one too: the same four entries, behind the background (6ef303eb 2-1 RAM 11030-11048)
 if(s.pictureItems.some((i:any)=>!(i.kind==='coin'&&i.nativeCoin)&&!(i.kind==='hammer'&&i.nativeHammer)&&!powerup(i)&&!i.nativeFlame)||s.popups.some((p:any)=>p.victim?.enemySlot===undefined||p.victim.dead&&!p.victim.squashed&&defeatTop(p.victim)===undefined||!p.victim.dead&&!p.victim.shell&&p.victim.nativeId===undefined)||s.vines.some((v:any)=>v.height>0||v.growing)||s.nativeFireworks?.length||s.nativeCastleFlag||s.specialSlot5.flag&&!(s.specialSlot5.id===46&&s.items.some(powerup)))reasons.push('other-writer'); // a frenzy controller (ID23 before its Bullet, ID52 WarpZoneObject) holds a slot but draws nothing
 // Springboards: six entries at their slot's offset, rows Enemy_Y, +8, +16 (Enemy_Y: the spring's top, 8 lower per compression step) and columns X, X+8;
 // a column off X 1..255 keeps Y 248 (1ae7aeeb 2-1 rows 11640-11664 entering at the right, 13205-13223 compressed).
 const springs:{base:number,x:number,y:number}[]=[];
 for(const spring of s.area.springs??[]){const slot=s.spriteObjectSlot(spring);if(slot!==undefined)springs.push({base:s.spriteShuffle.offsets[slot+1],x:Math.floor(spring.x-s.camera),y:spring.y-24+8*s.springCompression(spring)});}
 // Firebars: ball k on entry slot offset + 4k, Y one line above the drawn ball, hidden off the screen's X 0..255 (19011e4d 1-4 rows 9500-11200: 8,182 of 8,182 entries; X 249-255 still drawn, rows 9585, 9724).
 const bars:{base:number,balls:{x:number,y:number}[]}[]=[];
 for(const bar of s.area.firebars??[]){const slot=s.spriteObjectSlot(bar);if(!s.firebarCenters(bar).length)continue; // not loaded: nothing drawn
  if(slot===undefined||s.firebarDuplicateSlot(bar)!==undefined){reasons.push('area-writer');break;}
  bars.push({base:s.spriteShuffle.offsets[slot+1],balls:s.firebarCenters(bar).map((c:any)=>({x:Math.floor(c.x-4-s.camera),y:Math.floor(c.y-4+(bar.visualOffsetY??0))}))});}
 // Lifts (DrawLargePlatform): one row of width/8 tiles at their slot's OAM offset (0d12a2e4 row 6018: slot 2, offset 96, entries 24..29).
 const context={levelId:s.level.id,areaId:s.area.id},lifts:{base:number,x:number,y:number,width:number,fromAbove:boolean}[]=[];
 for(const platform of s.area.platforms??[]){
  const ys=nativePlatformArtworkYs(platform,context,s.platformPicturePosition(platform).y);if(!ys.length)continue;
  const slot=s.spriteObjectSlot(platform),screenX=Math.floor(s.platformPicturePosition(platform).x-s.camera);if(slot===undefined&&(ys.every(y=>y<-16||y>=240)||screenX>=256||screenX+s.platformWidth(platform)<=0))continue; // an unloaded lift is parked far off screen, or not reached yet (308c986d 4-3 row 36999: X 326 and right of it)
  if(slot===undefined||platformMotionModel(platform,context)==='contact-cloud'){reasons.push('area-writer');break;}
  // DrawSmallPlatform: the first surface on entries 0-2, the one 128 lower on entries 3-5; a surface above the HUD line stays at Y 248 (e79163dc 2-4 row 20640: entries 13-15 at Y 144, 10-12 hidden).
  const first=s.platformPicturePosition(platform).y,surfaces=nativeSmallPlatform(platform,context)?[[0,first],[12,((first-1+128)&255)+1]].filter(([,y])=>y>=33):[[0,ys[0]]];
  // The picture one frame earlier: a lift reaching Y 0 from above the screen (Y 255) is still hidden (all captures, ids 26/27 at Y 0: 500 of 500 from 255 hidden, 523 of 523 from 0 or 1 drawn).
  const before=s.platformPosition(platform,s.platformPictureFrame(platform)-1).y,fromAbove=(y:number,offset:number)=>y===1&&((offset?((before-1+128)&255):before-1)&255)===255;
  for(const [offset,y] of surfaces)lifts.push({base:s.spriteShuffle.offsets[slot+1]+offset,x:Math.floor(s.platformPicturePosition(platform).x-s.camera),y:y-1,width:s.platformWidth(platform),fromAbove:fromAbove(y,offset)});
 }
 // Bowser alive: his head on his slot's six entries (rows feet-32, -24, -16), his rear on the rear slot's six, 8 lower and 16 behind
 // (32183fd4 1-4 rows 14079-14080: head 18-23 / 40-45 at X 224, rear 24-29 / 46-51 at X 240).
 const bowsers=s.enemies.filter((e:any)=>e.active&&e.kind==='bowser'&&!e.dead&&e.nativeBowser?.rearSlot!==undefined&&e.graphicsVisible!==false&&e.enemySlot!==undefined);
 const enemies=[...s.enemies,...(s.warpErased?.frame===s.frame?s.warpErased.enemies:[])].filter((e:any)=>e.active&&pic(e).dead<90&&!bowsers.includes(e));
 // An enemy with both columns off screen writes only hidden entries (SprObjectOffscrChk), whatever its kind.
 const hidden=(e:any)=>{const x=Math.floor((e.graphicsX??e.x)-s.camera);return [x,x+8].every(xx=>xx<=0||xx>255);};
 // EnemyGfxHandler skips a Piranha Plant moving with its frame timer running: all six entries stay cleared (entpat id $0D: 37,724 of 68,266 on-screen rows).
 const undrawn=(e:any,body:any)=>e.kind==='piranha'&&(body.graphicsVisible===false||!s.enemyPictureShown(body)||e.pir&&e.pir.speed>=0&&e.pir.timer!==0);
 // Entry rows (OAM Y less Enemy_Y) per drawn state, measured over World 1 captures (entpat): walkers 0/8/16 (Goomba id6 130,604 rows, Koopa id0 17,358);
 // a shell 2/10/18 (id0 states 4/84), a waking shell 0/8/16 (state 3: 82 of 82 sampled rows; 17a2baf0 2-1 picture 11987); a squashed Goomba 9/17 below its floatey number, which owns the slot's first two entries.
 const walker=(e:any)=>['koopa','redKoopa','beetle','paratroopa','piranha'].includes(e.kind);
 // A Koopa shell in state 2 is drawn like state 3, two lines higher (7-1 original RAM 445: slot 2 state 2, Enemy_Y 171, entries 48-51 at Y 178/186).
 // A cannon's Bullet Bill (ID $33), live or stomped: rows Enemy_Y-1, +7, +15 (captures, ID $33 on screen: 469 of 476 sampled rows have its body rows at +7/+15; original 8-2 RAM 1999: entries 52-57 at Y 167/175/183 for Enemy_Y 168).
 const rowsOf=(e:any,body:any):(number|undefined)[]|undefined=>e.kind==='bullet'&&!e.frenzy?[-1,7,15]:e.kind==='hammerBro'&&!e.dead?[0,8,16]:(e.kind==='goomba'||e.kind==='podoboo'||e.kind==='cheep')&&!e.dead?[0,8,16]:e.kind==='blooper'&&!e.dead?[0,8,16].map(r=>r+nativeBlooperPicture(e.bloop?.timer??0,false,enemyPictureTimersStopped(e,s.frame,s.nativeTimersStopped)).yOffset):e.kind==='goomba'&&e.squashed&&e.dead?[s.popups.some((p:any)=>p.victim===body)||body.erasedFrame===s.frame?undefined:1,9,17]:walker(e)&&!e.dead&&!e.shell?[0,8,16]:walker(e)&&!e.dead&&e.shell?(e.walkerState===3||e.walkerState===2&&e.kind!=='beetle'?[0,8,16]:[2,10,18]):defeatTop(e)!==undefined&&s.popups.some((p:any)=>p.victim===body)?[undefined,defeatTop(e)!-1-(Math.floor(e.y)-24),defeatTop(e)!+7-(Math.floor(e.y)-24)]:undefined;
 // A wholly hidden enemy is checked before its slot: an enemy loaded this row keeps a picture taken before it had one (8-1 original RAM 1043: slot 4's Piranha Plant at X 359).
 if(enemies.some((body:any)=>{const e=pic(body);return !hidden(e)&&(e.enemySlot===undefined||!undrawn(e,body)&&(!rowsOf(e,body)||body.graphicsVisible===false));}))reasons.push('enemy-writer');
 const pose=playerCell(s);if(pose.throwing)reasons.push('player-extra-piece');
 const at=s.playerPicturePosition(),px=Math.floor(at.x-s.camera),py=Math.floor(at.y)-32;
 if(px<0||px>240)reasons.push('player-offscreen');
 if(s.spriteShuffle.offsets[0]!==4)reasons.push('player-offset');
 if(reasons.length)return {supported:false as const,reasons};
 // MoveSpritesOffscreen clears Y only; unused tile/attribute/X bytes stay unknown.
 let overlapping=false;const oam=new Uint8Array(256),written=new Uint8Array(64);for(let a=0;a<256;a+=4)oam[a]=248;
 // written: 1 = all four bytes reconstructed, 2 = Y and X only (tile and attribute bytes are placeholders).
 const write=(address:number,y:number,tile:number,attribute:number,x:number,exact=true)=>{const a=address&255;if(written[a/4])overlapping=true;written[a/4]=exact?1:2;oam.set([y&255,tile,attribute,x&255],a);};
 write(0,24,255,35,88);
 const tiles=tables.player_cells[pose.cell].tiles;
 // ChkForPlayerAttrib forces symmetry at table offsets50/B8/C0/C8.
 // A row at Y 248 or below the screen stays hidden (all captures, Player_Y 170-300 in states 8 and 11: rows end where Y + 8 x row reaches 248).
 // Above the screen, PlayerOffscreenChk parks each row lying wholly above it at $F8; the rest keep their wrapped Y (df3651d6 4-3 RAM 35589: Player_Y 235 page 0, bits $C0: rows 248 248 251 3).
 if(playerVisible(s))for(let row=0;row<4;row++)for(let col=0;col<2;col++)if(py+row*8<248)write(4+row*8+col*4,py<0&&row<Math.floor(-py/8)?248:py+row*8,tiles[row*2+(pose.facing<0?1-col:col)],(([10,23,24].includes(pose.cell)&&row===3||[22,25].includes(pose.cell)&&row>=2)?col*64:pose.facing<0?64:0)|(s.playerDrawBackgroundPriority?32:0),px+col*8,pose.swimKick===undefined); // a swim kick swaps a foot tile only
 for(const e of bowsers){const feet=Math.floor(e.graphicsY??e.y),x=Math.floor((e.graphicsX??e.x)-s.camera),right=e.bowser?e.bowser.side>0:e.vx>0,head=right?x+16:x;
  for(const [slot,hx,top] of [[e.enemySlot,head,feet-32],[e.nativeBowser.rearSlot,head+(right?-16:16),feet-24]]){const base=s.spriteShuffle.offsets[slot+1];
   for(let row=0;row<3;row++)for(let col=0;col<2;col++){const xx=hx+col*8;write(base+row*8+col*4,xx<=0||xx>255?248:top+row*8,0,0,xx&255,false);}}}
 // Bowser's flame: three entries at its slot's offset, Y = its Y, X, X+8, X+16 (32183fd4 1-4 row 14079: entries 36-38 at offset 144).
 for(const i of s.items){if(!i.nativeFlame||!s.itemPictureShown(i))continue;const base=s.spriteShuffle.offsets[i.nativeFlame.slot+1],x=Math.floor(i.x-s.camera);
  for(let col=0;col<3;col++){const xx=x+col*8;write(base+col*4,xx<=0||xx>255?248:Math.floor(i.y),0,0,xx&255,false);}}
 for(const body of enemies.sort((a:any,b:any)=>a.enemySlot-b.enemySlot)){
  const e=pic(body),x=Math.floor((e.dead?e.x:e.graphicsX??e.x)-s.camera),y=Math.floor(e.dead?e.y:e.graphicsY??e.y)-24,base=s.spriteShuffle.offsets[e.enemySlot!+1],stopped=enemyPictureTimersStopped(e,s.frame,s.nativeTimersStopped),left=(e.graphicsFacing??e.vx)<0,flip=stopped?left:left===Boolean(s.random.frame&8);
  if(hidden(e)||undrawn(e,body))continue; // its entries keep the cleared Y (248); tile, attribute and X bytes are not reconstructed
  if(y<0)return {supported:false as const,reasons:['enemy-vertical-mask']};
  // SprObjectOffscrChk hides whole columns, including the left column at X0.
  // A live Goomba's bytes are exact; other states reconstruct Y and X only, which alone decide the scanline cap.
  const rows=rowsOf(e,body)!;for(let row=0;row<3;row++)for(let col=0;col<2;col++){const xx=x+col*8,dy=rows[row];if(dy===undefined)continue;write(base+row*8+col*4,xx<=0||xx>255||y+dy>=248?248:y+dy,tables.enemy_cells[14].tiles[row*2+(flip?1-col:col)],3|(flip?64:0),xx,e.kind==='goomba'&&!e.dead);}
 }
 // The row a squashed Goomba is erased, its slot still writes the first two entries (blank) one line below Enemy_Y (c35cb97a row 4020: Y 185, Enemy_Y 184).
 for(const body of s.enemies)if(body.squashed&&body.erasedFrame===s.frame&&body.enemySlot!==undefined){const base=s.spriteShuffle.offsets[body.enemySlot+1],x=Math.floor(body.x-s.camera);for(let col=0;col<2;col++){const xx=x+col*8;write(base+col*4,xx<=0||xx>255?248:Math.floor(body.y)-23,0xfc,3,xx,false);}}
 // A block's jumping coin (misc slot): two entries at the misc offset, the coin's halves at Y and Y+8, then its 200 side by side (c35cb97a rows 990, 999: offset index 7 + 8 x slot).
 // A coin in state 0 draws nothing (itemShown; 232eab82 2-1 rows 12240-12431, frozen while Mario dies).
 for(const i of s.items){const c=i.nativeCoin;if(!c||c.state===0)continue;const base=s.spriteShuffle.miscOffset(c.slot),x=Math.floor(i.x-s.camera)&255,y=Math.floor(i.y)&255,score=c.state>=2;
  write(base,y,score?0xf7:0x60,2,x,false);write(base+4,score?y:(y+8)&255,score?0xfb:0x60,2,score?(x+8)&255:x,false);}
 // A hammer: its picture's two tiles on its misc offset's two entries, in the picture's own order, at Y and X of each tile (8-3 original RAM 2458: entries 42-43 $80/$81 at X 111, Y 110/118; 2496: 28-29 $83/$82 at Y 99, X 54/62).
 for(const i of s.pictureItems){const n=i.nativeHammer;if(!n||!itemShown(i)||s.itemPictureShown(i)===false)continue;const base=s.spriteShuffle.miscOffset(n.slot),x=Math.floor(i.x-s.camera),y=Math.floor(i.y);
  const pieces=specialSprites.records.find((r:any)=>r.file===`sprite-hammers-${nativeHammerPicturePhase(n,s.random.frame,s.frame,s.nativeTimersStopped)}.png`)!.descriptor.sprites;
  pieces.forEach((p:any,k:number)=>write(base+k*4,(y+p.y)&255,p.tile,p.attributes,(x+p.x)&255,false));}
 // A power-up out of its block (an emerging one from state 6: 6ef303eb 2-1 RAM 11001-11005): four entries at slot 5's offset, its 16x16 picture one line below (all captures: id $2E rows at Enemy_Y+8/+16, X/X+8).
 for(const i of s.pictureItems)if(powerup(i)&&i.nativePowerState>=6){const base=s.spriteShuffle.offsets[6],x=Math.floor(i.x-s.camera),y=Math.floor(i.y);
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){const xx=x+col*8;write(base+row*8+col*4,xx<=0||xx>255?248:y+row*8,0x76,2,xx&255,false);}}
 // Floatey numbers: the victim slot's first two entries at Y = FloateyNum_Y - 8 (popup.y - 1), X and X+8 (fltpat: 17,618 of 23,640 rows; the rest read a shuffled offset).
 // ChkTallEnemy: a Spiny, Piranha Plant or Cheep Cheep, or an ID below 9 other than the Hammer Bro in state 2 or more (dead or a shell),
 // uses its own slot; any other victim (a stomped paratroopa's walking Koopa) uses Alt_SprDataOffset[SprDataOffset_Ctrl], offset index 8 + blockControl
 // (889741ec 3-1 RAM 24050-24051: $03EE 0 -> entry 54 = $D8, 1 -> entry 26 = $68).
 for(const popup of [...s.popups].sort((a:any,b:any)=>a.victim.enemySlot-b.victim.enemySlot)){const v=popup.victim,own=floateyOwnSlot(v),base=s.spriteShuffle.offsets[own?v.enemySlot+1:8+s.blockControl];for(let col=0;col<2;col++){const a=(base+col*4)&255;written[a/4]=0;write(a,popup.y-1,0xf6,2,popup.x+col*8,false);}}
 // A bumped block: four entries at Block_SprDataOffset (offset table entry 8 + its slot), rows at its picture Y and Y+8, a column hidden by
 // its misc offscreen bits left at Y 248 (1-2 9d8b2405 rows 3028-3041: entries 22-25 / 40-43 at offsets[8]).
 for(const b of s.blockGraphics){if(b.pictureY===undefined)continue;const base=s.spriteShuffle.offsets[8+b.slot],bits=nativeMiscOffscreen(b.x,b.pictureY,s.camera);
  for(let row=0;row<2;row++)for(let col=0;col<2;col++)write(base+row*8+col*4,bits&(col?4:8)?248:(b.pictureY+row*8)&255,0x86,3,(Math.floor(b.x)-Math.floor(s.camera)+col*8)&255,false);}
 for(const sp of springs)for(let row=0;row<3;row++)for(let col=0;col<2;col++){const xx=sp.x+col*8;write(sp.base+row*8+col*4,xx<=0||xx>255?248:sp.y+row*8,0xfc,2,xx,false);}
 // Air bubbles: one entry each at offset table entry 10 + its slot, Y = its Y (2-2 308c986d RAM 13279-13285).
 if(s.area.theme==='water')for(const [slot,bubble]of s.bubbles.entries())write(s.spriteShuffle.offsets[10+slot],nativeBubbleShown(bubble,s.player.y,s.camera)?Math.floor(bubble.y):248,0x74,2,(Math.floor(bubble.x)-Math.floor(s.camera))&255,false);
 for(const bar of bars)bar.balls.forEach((b,k)=>write(bar.base+k*4,b.x<0||b.x>255?248:b.y-1,0x75,2,b.x,false));
 // A lift at Y 0 that came from above the screen keeps Y 248 (0d12a2e4 row 6023); one already at the top is drawn (b230c302 1-2 row 6853: X 5, Y 0).
 for(const lift of lifts)for(let i=0;i*8<lift.width;i++){const xx=lift.x+i*8;write(lift.base+i*4,xx<=0||xx>255||lift.fromAbove?248:lift.y,91,2,xx);}
 if(overlapping)return {supported:false as const,reasons:['overlapping-writer']};
 return {supported:true as const,reasons,oam,written};
}
