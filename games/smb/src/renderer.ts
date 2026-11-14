import {nativeOamScanlines} from './native-oam.js';
import {nativeOamPicture} from './native-oam-picture.js';
import {nativeHammerPicturePhase} from './native-misc.js';
import {nativeFireballPhase} from './native-fireball-picture.js';
import * as THREE from 'three';
import {loadPixelTexture,pixelCamera,pixelQuad} from '../assets/three-assets.mjs';
import manifest from '../assets/graphics/graphics-manifest.json';
import nesPalette from '../assets/nes-rgb-palette.json';
import tables from '../assets/graphics/tables.json';
import specialSprites from '../assets/graphics/special/index.json';
import {Simulation,TRANSITIONS,POWERUPS,FLAG_COMPLETION,CASTLE_COMPLETION} from './simulation.js';
import {waterSurfaceSky,doorwayBottomTile,fireFlashVariant,starVariant,rotatedPalette,bumpShown,liftRopeColumns,itemShown,nativeBubbleShown} from './view-rules.js';
import {playerCell,playerVisible} from './player-cell.js';
import {nativeScreenPicture} from './native-screen-picture.js';
import {nativeStartupTitleShown} from './native-startup-picture.js';
import {nativeFlagSprites} from './native-flag-picture.js';
import {nativeBlockSprites} from './native-block-picture.js';
import {enemyRenderPicture,nativeBulletPicture,nativeHammerBroCell,nativeEnemyCyclePhase,nativeShellPhase,nativeBlooperPicture,nativeLakituCell,enemyPictureTimersStopped} from './enemy-picture.js';
import {platformMotionModel,nativePlatformArtworkYs} from './platform-motion.js';
import powerupRules from '../data/powerup-rules.json';
import popupAssemblies from '../data/popup-assemblies.json';
import shellLaunchRules from '../data/shell-goomba-launch-rules.json';
import type {Area,Enemy,Item} from './types.js';
const A=(import.meta.env?.BASE_URL??'/')+'assets/graphics/';
export class GameRenderer {
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=pixelCamera(THREE);textures=new Map<string,THREE.Texture>();
 private oamRows:number[]|undefined;private oam:Uint8Array|undefined;private oamWritten:Uint8Array|undefined;private oamContext:{base:number,count:number}|undefined;nativeOamCapability:{supported:boolean,reasons:string[]}={supported:false,reasons:['not-rendered']};
 private pools=new Map<string,THREE.Mesh[]>();private used=new Map<string,number>();private worldClip=false;private textZ=5;private enemyOamZ=2;
 private rects=new Map(manifest.metatiles.map(t=>[t.id,t.rect]));
 private originalArea?:Area;private originalTiles=new Map<string,number>();private ropeColumns:number[]=[];
 private hudCoinTextures:string[]=[];private skyBand?:THREE.Mesh;
 private palettes=manifest.palette_observations.map(o=>o.palette);private rotation=(index:number)=>index;
 constructor(canvas:HTMLCanvasElement){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.setSize(256,240,false);
  // Preserve depth priority; only equal-depth transparent quads follow this frame's submission order.
  this.renderer.setTransparentSort((a,b)=>a.groupOrder-b.groupOrder||a.renderOrder-b.renderOrder||b.z-a.z||a.object.userData.drawOrder-b.object.userData.drawOrder);
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
 }
 async load(){
  const names=new Set([...Array.from({length:30},(_,i)=>`metatiles-palette-${String(i).padStart(3,'0')}.png`),
   'player-mario-right.png','player-mario-left.png','player-luigi-right.png','player-luigi-left.png','player-fire-right.png','player-fire-left.png','patterns-index.png']);
  for(const {palette} of manifest.palette_observations)for(let group=0;group<8;group++){
   const colors=group<4?[palette[0],...palette.slice(group*4+1,group*4+4)]:palette.slice(group*4,group*4+4);
   names.add(`${group<4?'background':'sprite'}-tiles-${colors.map(n=>n.toString(16).padStart(2,'0')).join('-')}.png`);
  }
  // Special sprites use the supplied assembly images; actor state is simulated independently.
  for(const record of (await fetch(A+'special/index.json').then(r=>r.json())).records)names.add('special/'+record.file);
  await Promise.all([...names].map(async name=>this.textures.set(name,await loadPixelTexture(THREE,A+name))));
  for(const direction of ['left','right'])for(const name of ['star-dark','star-white','star-green'] as const){
   const source=this.textures.get(`player-mario-${direction}.png`)!;
   const canvas=document.createElement('canvas');canvas.width=source.image.width;canvas.height=source.image.height;
   const context=canvas.getContext('2d')!;context.drawImage(source.image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height);
   for(let p=0;p<pixels.data.length;p+=4)if(pixels.data[p+3]){
    const role=powerupRules.palettes.normal.findIndex(rgb=>rgb.every((color,c)=>color===pixels.data[p+c]));
    if(role>=0)for(let c=0;c<3;c++)pixels.data[p+c]=powerupRules.palettes[name][role][c];
   }
   context.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
   this.textures.set(`player-${name}-${direction}.png`,texture);
  }
  // Glyph patterns carry the supplied blue universal background. Make that one
  // color transparent so the same white glyphs work over the castle and night sky.
  for(const name of ['background-tiles-22-30-21-0f.png']){
   const source=this.textures.get(name)!;const canvas=document.createElement('canvas');canvas.width=source.image.width;canvas.height=source.image.height;
   const context=canvas.getContext('2d')!;context.drawImage(source.image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height);
   for(let p=0;p<pixels.data.length;p+=4)if(pixels.data[p]===104&&pixels.data[p+1]===136&&pixels.data[p+2]===252)pixels.data[p+3]=0;
   context.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
   this.textures.set(name+'#transparent',texture);
  }
  // Keep nonzero black pixels opaque even when they equal the universal color.
  const mask=document.createElement('canvas');mask.width=mask.height=8;const maskContext=mask.getContext('2d')!;
  maskContext.drawImage(this.textures.get('patterns-index.png')!.image,112,144,8,8,0,0,8,8);const indices=maskContext.getImageData(0,0,8,8).data;
  for(const {palette} of manifest.palette_observations){
   const file=`background-tiles-${[palette[0],...palette.slice(13,16)].map(n=>n.toString(16).padStart(2,'0')).join('-')}.png`,name=file+'#hud-coin';
   this.hudCoinTextures.push(name);if(this.textures.has(name))continue;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=8;const context=canvas.getContext('2d')!;
   context.drawImage(this.textures.get(file)!.image,112,16,8,8,0,0,8,8);const pixels=context.getImageData(0,0,8,8);
   for(let at=0;at<pixels.data.length;at+=4)pixels.data[at+3]=indices[at]===0?0:255;
   context.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(name,texture);
  }
 }
 private quad(name:string,rect:number[],x:number,y:number,z=0,flipX=false,flipY=false,sprite=true){
  const context=this.oamContext,rows=this.oamRows;
  if(context&&rows&&sprite&&rect[2]%8===0&&rect[3]%8===0){
   const width=rect[2]/8,height=rect[3]/8,px=Math.floor(x),py=Math.floor(y);
   // The entry drawing this 8x8 tile: among the object's written entries, the one at its X whose Y is one line above it; a hidden entry at that X hides it.
   const mask=(col:number,row:number)=>{const X=(px+col*8)&255,Y=py+row*8;let hidden=false;
    for(let k=0;k<context.count;k++){const n=((context.base+k*4)&255)/4;if(!this.oamWritten![n]||this.oam![n*4+3]!==X)continue;const y=this.oam![n*4];if(y+1===Y)return rows[n];if(y>=0xef)hidden=true;}
    return hidden?0:255;};
   if(Array.from({length:width*height},(_,i)=>mask(i%width,Math.floor(i/width))).some(v=>v!==255)){
    this.oamContext=undefined;
    for(let row=0;row<height;row++)for(let col=0;col<width;col++){
     const visible=mask(col,row),sx=rect[0]+(flipX?width-1-col:col)*8,sy=rect[1]+(flipY?height-1-row:row)*8;
     for(let start=0;start<8;){if(!(visible&(1<<start))){start++;continue;}let end=start+1;while(end<8&&(visible&(1<<end)))end++;
      this.quad(name,[sx,sy+(flipY?8-end:start),8,end-start],px+col*8,py+row*8+start,z,flipX,flipY,sprite);start=end;
     }
    }
    this.oamContext=context;return;
   }
  }
  const clipTop=sprite?0:32;y=Math.floor(y); // the clip must cut whole pixel rows: a fractional top shifted Mario 1 px at the screen top (0d12a2e4 row 8403)
  if(this.worldClip&&(y<clipTop||y+rect[3]>240)){
   const top=Math.max(0,clipTop-y),bottom=Math.max(0,y+rect[3]-240);if(top+bottom>=rect[3])return;
   rect=[rect[0],rect[1]+(flipY?bottom:top),rect[2],rect[3]-top-bottom];y+=top;
  }
  const key=`${name}:${rect.join(',')}:${sprite}`;let pool=this.pools.get(key);if(!pool)this.pools.set(key,pool=[]);
  const index=this.used.get(key)??0;this.used.set(key,index+1);
  let mesh=pool[index];if(!mesh){mesh=pixelQuad(THREE,this.textures.get(name)!,rect,{sprite});pool.push(mesh);}
  mesh.userData.drawOrder=this.scene.children.length;
  mesh.position.set(Math.floor(x)+rect[2]/2,240-Math.floor(y)-rect[3]/2,z);mesh.scale.set(flipX?-1:1,flipY?-1:1,1);this.scene.add(mesh);
 }
 private tile(id:number,x:number,y:number,palette:number,z=0){const rect=this.rects.get(id);if(rect)this.quad(`metatiles-palette-${String(palette).padStart(3,'0')}.png`,rect,x,y,z,false,false,false);}
 // Native water areas keep sky colour above the surface wave (rows 0-31, the HUD band); only the playfield below is water blue.
 private waterSurfaceSky(s:Simulation){
  if(!waterSurfaceSky(s.area))return;
  if(!this.skyBand){this.skyBand=new THREE.Mesh(new THREE.PlaneGeometry(256,32),new THREE.MeshBasicMaterial({color:'#6888fc'}));this.skyBand.position.set(128,224,-0.5);}
  this.scene.add(this.skyBand);
 }
 // Priority-bit castle flags show through universal-color crenellation gaps.
 private castlePriorityTile(id:number,x:number,y:number,palette:number){
  const base=`metatiles-palette-${String(palette).padStart(3,'0')}.png`,name=base+'#castle-priority';
  if(!this.textures.has(name)){
   const source=this.textures.get(base)!;const canvas=document.createElement('canvas');canvas.width=source.image.width;canvas.height=source.image.height;
   const context=canvas.getContext('2d')!;context.drawImage(source.image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height),background=[...pixels.data.slice(0,3)];
   for(let at=0;at<pixels.data.length;at+=4)if(background.every((color,c)=>pixels.data[at+c]===color))pixels.data[at+3]=0;
   context.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(name,texture);
  }
  this.quad(name,this.rects.get(id)!,x,y,1.6);
 }
 private spriteTile(id:number,x:number,y:number,palette='0f-1a-30-27',flipX=false,flipY=false,z=this.enemyOamZ??2){
  if(id===252)return;this.quad(`sprite-tiles-${palette}.png`,[(id%16)*8,Math.floor(id/16)*8,8,8],x,y,z,flipX,flipY);
 }
 private special(name:string,x:number,y:number,z=2){const file='special/sprite-'+name+'.png';const tex=this.textures.get(file);if(tex)this.quad(file,[0,0,tex.image.width,tex.image.height],x,y,z);}
 private text(text:string,x:number,y:number,palette='background-tiles-22-30-21-0f.png#transparent'){
  for(const char of text.toUpperCase()){
   const glyph=char===' '?36:char>='0'&&char<='9'?char.charCodeAt(0)-48:char>='A'&&char<='Z'?char.charCodeAt(0)-55:char==='-'?40:char==='×'?41:char==='!'?43:char==='.'?175:char==='©'?207:36;
   this.quad(palette,[glyph%16*8,Math.floor(glyph/16)*8,8,8],x,y,this.textZ);x+=8;
  }
 }
 private enemy(e:Enemy,s:Simulation){
  e=enemyRenderPicture(e,s.frame,s.nativeTimersStopped);
  const feet=!e.dead?e.graphicsY??e.y:e.y,x=Math.floor((!e.dead?e.graphicsX??e.x:e.x)-s.camera),y=Math.floor(feet)-23;
  const timersStopped=enemyPictureTimersStopped(e,s.frame,s.nativeTimersStopped);
  const blooper=nativeBlooperPicture(e.bloop?.timer??0,Boolean(e.dead),timersStopped);
  const nativeCycle=!e.dead&&!e.shell&&['koopa','redKoopa','beetle','paratroopa','spiny','piranha','cheep'].includes(e.kind);
  const phase=e.shell?nativeShellPhase(e.shellTimer??0,s.random.frame,timersStopped||Boolean(e.dead)||Boolean(e.movingShell)):nativeCycle?nativeEnemyCyclePhase(s.random.frame,timersStopped):Math.floor(e.age/8)%2;
  let cell=14,palette='0f-0f-36-17';
  if(e.kind==='koopa'||e.kind==='redKoopa'){cell=e.shell?17+phase:2+phase;palette=e.kind==='redKoopa'?'0f-16-30-27':'0f-1a-30-27';}
  if(e.kind==='paratroopa'){cell=4+phase;palette='0f-1a-30-27';}
  if(e.kind==='beetle'){cell=e.shell?19+phase:phase;palette='0f-1a-30-27';}
  if(e.kind==='spiny'){cell=(e.motion==='falling'?8:6)+phase;palette='0f-16-30-27';}
  if(e.kind==='piranha'){cell=32+phase;palette='0f-1a-30-27';}
  if(e.kind==='blooper'){cell=blooper.cell;palette='0f-00-30-10';}
  if(e.kind==='cheep'){cell=12+phase;palette='0f-16-30-27';}
  if(e.kind==='bullet'){
   const picture=nativeBulletPicture(Boolean(e.nativeShot&&!e.frenzy),e.cannonFrameTimer??0,e.graphicsFacing??(e.vx?Math.sign(e.vx):e.direction??-1)),tiles=tables.enemy_cells[39].tiles;
   const colors=manifest.palette_observations[s.area.palette].palette.slice(28,32).map(c=>c.toString(16).padStart(2,'0')).join('-');
   for(let row=1;row<3;row++)for(let col=0;col<2;col++)this.spriteTile(tiles[row*2+col],x+(picture.flipX?1-col:col)*8,y+picture.yOffset+(picture.flipY?2-row:row)*8,colors,picture.flipX,picture.flipY,picture.behindBackground?-0.1:this.enemyOamZ);
   return;
  }
  if(e.kind==='lakitu'){cell=nativeLakituCell(e.graphicsFrenzyTimer??0,Boolean(e.dead));palette='0f-1a-30-27';}
  if(e.kind==='hammerBro'){cell=nativeHammerBroCell(e.dead?0x20:e.hbro?.state??0,s.random.frame,timersStopped);palette='0f-1a-30-27';}
  if(e.kind==='podoboo'){cell=34;palette='0f-16-30-27';}
  if(e.dead&&e.kind==='goomba'&&e.dead<20){cell=23;}
  if(e.kind==='bowser'){
   const flipY=e.dead>0&&!s.castleBowserFalls(e);
   // The head half is the native anchor: at the body's left edge when he faces left, 16 px in (the body's right half) when he faces right.
   const right=e.bowser?e.bowser.side>0:e.vx>0,headX=e.bowser&&right?x+16:x;
   const colors=s.bowserPalette?e.palette??'0f-1a-30-27':manifest.palette_observations[s.area.palette].palette.slice(20,24).map(c=>c.toString(16).padStart(2,'0')).join('-');
   this.enemyCell(35+(e.nativeBowser?e.nativeBowser.controls>>7&1:phase)*2,headX,y-8,colors,!right,flipY);
   const rear=e.nativeBowser?.rearSlot,rearZ=rear===undefined?this.enemyOamZ:2+(255-s.spriteShuffle.offsets[rear+1])/4096; // the rear half has its own slot's OAM offset (0d12a2e4 row 18152: rear 40 < lift 64 < head 232)
   this.enemyCell(36+(e.nativeBowser?e.nativeBowser.controls&1:phase)*2,headX+(right?-16:16),y,colors,!right,flipY,rearZ);return;
  }
  palette=e.palette??palette;
  if(e.kind==='spiny'&&e.motion==='falling'&&!e.dead&&e.vx<=0&&palette==='0f-16-30-27'){
   const tiles=tables.enemy_cells[cell].tiles;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)this.spriteTile(tiles[(row+1)*2+1-col],x+col*8,Math.floor(feet)-15+row*8,palette,col===1,col===1);
   return;
  }
  if(e.kind==='podoboo'&&!e.dead){
   // The observed body is16px tall; the table's leading8px row is transparent.
   const tiles=tables.enemy_cells[34].tiles,falling=e.podobooFalling===true;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)
    this.spriteTile(tiles[(falling?2-row:row+1)*2+col],x+col*8,Math.floor(feet)-15+row*8,palette,col===1,falling);
   return;
  }
  if(e.greenShellLaunchFrame!==undefined||e.defeat&&e.kind==='goomba'){
   const top=Math.floor(e.y)+shellLaunchRules.visibleBodyTopFromFeet,tiles=tables.enemy_cells[14].tiles;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)this.spriteTile(tiles[(2-row)*2+col],x+col*8,top+row*8,palette,false,true);
   return;
  }
  if(e.defeat&&(e.kind==='koopa'||e.kind==='redKoopa')&&e.dead>0){
   // A defeated Koopa is the shell with its rows swapped ($6E over $6F), drawn from its pre-move picture: OAM x = x, OAM y = y + 8 (0d12a2e4 rows 5418..5449).
   const tiles=tables.enemy_cells[17].tiles,top=Math.floor(e.graphicsY??e.y)-15;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)this.spriteTile(tiles[(2-row)*2+col],x+col*8,top+row*8,palette,col===1,false);
   return;
  }
  if(e.squashed){
   const top=Math.floor(e.y)-6;
   this.spriteTile(239,x,top,palette,false,true);this.spriteTile(239,x+8,top,palette,true,true);return;
  }
  if(e.shell&&(e.kind==='koopa'||e.kind==='redKoopa'||e.kind==='beetle'&&!e.dead)){
   const shell=tables.enemy_cells[(e.kind==='beetle'?19:17)+phase],launched=e.dead>0;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++){
    const sourceRow=launched?2-row:row+1;
    this.spriteTile(shell.tiles[sourceRow*2+col],x+col*8,y+10+row*8,palette,col===1,!launched);
   }
   return;
  }
  const redVerticalFacing=e.kind==='paratroopa'&&!e.dead&&palette==='0f-16-30-27'&&(e.paratroopaMotion??'vertical')==='vertical';
  const walkerFacing=!e.dead&&!e.shell&&['koopa','redKoopa','beetle','paratroopa'].includes(e.kind);
  if(e.kind==='goomba'&&!e.dead){
   const tiles=tables.enemy_cells[cell].tiles;
   // GmbaAnim flips the moving direction when FrameCounter bit 3 is clear.
   // The direction is captured before collision turns, as in native OAM.
   const left=(e.graphicsFacing??e.vx)<0,flip=timersStopped?left:left===Boolean(s.random.frame&8);
   for(let row=1;row<3;row++)for(let col=0;col<2;col++){
    this.spriteTile(tiles[row*2+col],x+(flip?1-col:col)*8,y+row*8,palette,flip,false);
   }
  }else this.enemyCell(cell,x,y+(e.kind==='blooper'?blooper.yOffset:0)+(cell===23?1:0),palette,e.kind==='cheep'&&!e.dead?e.vx<0:e.kind==='hammerBro'?(e.nativeDir??-1)<0:redVerticalFacing?true:walkerFacing?(e.graphicsFacing??e.vx)<0:e.kind==='spiny'&&!e.dead&&e.motion!=='falling'&&e.vx!==0&&palette==='0f-16-30-27'?e.vx<0:e.vx>0,Boolean(e.defeat)||Boolean((e.hbro?.state??0)&32)||e.dead>20,e.kind==='piranha'?-0.1:this.enemyOamZ);
 }
 private enemyCell(cell:number,x:number,y:number,palette:string,flipX=false,flipY=false,z=this.enemyOamZ??2){
  const data=tables.enemy_cells[cell];
  for(let i=0;i<6;i++){
   const col=i%2,row=Math.floor(i/2),symmetric=data.tiles[row*2]===data.tiles[row*2+1];
   const bottomFlip=cell===40&&row===2||cell===41&&row===1||cell===23&&row===2;
   this.spriteTile(data.tiles[i],x+(flipX?1-col:col)*8,y+(flipY?2-row:row)*8,palette,flipX!==(symmetric&&col===1),flipY!==bottomFlip,z);
  }
 }
 private item(i:Item,s:Simulation){
  if(!itemShown(i))return;const x=i.x-s.camera;
  if(i.kind==='mushroom'||i.kind==='flower'||i.kind==='star'||i.kind==='1up'){const context=this.oamContext;this.oamContext=this.oamRows&&i.nativePowerState!==undefined&&!i.emerging?{base:s.spriteShuffle.offsets[6],count:4}:undefined;this.special(`powerups-${{mushroom:0,flower:1,star:2,'1up':3}[i.kind]}`,x,i.y+(i.nativePowerState===undefined?0:1),i.emerging?-0.1:1.5);this.oamContext=context;}
  if(i.kind==='coin'){
   if(i.nativeCoin){
    const y=Math.floor(i.y),screenX=Math.floor(x)&255;const context=this.oamContext;this.oamContext=this.oamRows?{base:s.spriteShuffle.miscOffset(i.nativeCoin.slot),count:2}:undefined;
    if(i.nativeCoin.state>=2){this.spriteTile(0xf7,screenX,(y&255)+1,'0f-16-30-27',false,false,2.5);this.spriteTile(0xfb,(screenX+8)&255,(y&255)+1,'0f-16-30-27',false,false,2.5);}
    else{const tile=0x60+((s.random.frame>>1)&3);this.spriteTile(tile,screenX,(y&255)+1,'0f-16-30-27');this.spriteTile(tile,screenX,((y+8)&255)+1,'0f-16-30-27',false,true);}
    this.oamContext=context;
   }else this.special('jumping_coins-'+Math.floor(i.age/4)%4,x,i.y);
  }
  if(i.kind==='fireball')this.special('fireball_or_firebar-'+nativeFireballPhase(s.random.frame),x,i.y);
  if(i.kind==='hammer'){
   const phase=i.nativeHammer?nativeHammerPicturePhase(i.nativeHammer,s.random.frame,s.frame,s.nativeTimersStopped):Math.floor(i.age/4)%4;
   const descriptor=specialSprites.records.find(record=>record.file===`sprite-hammers-${phase}.png`)!.descriptor,palette=manifest.palette_observations[s.area.palette].palette.slice(28,32).map(n=>n.toString(16).padStart(2,'0')).join('-');
   for(const piece of descriptor.sprites)this.spriteTile(piece.tile,i.nativeHammer?(Math.floor(x)+piece.x)&255:x+piece.x,i.nativeHammer?((Math.floor(i.y)+piece.y)&255)+1:i.y+piece.y,palette,piece.flip_x,piece.flip_y,i.nativeHammer?2+(255-s.spriteShuffle.miscOffset(i.nativeHammer.slot))/4096:2);
  }
  if(i.kind==='flame')this.special('bowser_flame-'+(s.random.frame>>1&1),x,i.y+1,i.nativeFlame?2+(255-s.spriteShuffle.offsets[i.nativeFlame.slot+1])/4096:2); // its enemy slot's OAM depth, so it can pass in front of a lift (e79163dc 2-4 row 23413); OAM attribute $82/$02 flips on FrameCounter bit 1; drawn one line below OAM y = flame y (0d12a2e4 rows 12380..12465)
  if(i.kind==='debris')this.tile(81,x,i.y,s.area.palette,2);
 }
 render(s:Simulation){
  const oam=nativeOamPicture(s);this.nativeOamCapability={supported:oam.supported,reasons:oam.reasons};this.oamRows=oam.supported?nativeOamScanlines(oam.oam).rows:undefined;this.oam=oam.supported?oam.oam:undefined;this.oamWritten=oam.supported?oam.written:undefined;this.oamContext=undefined;
  const rotated=new Map<number,number>();this.rotation=index=>{let r=rotated.get(index);if(r===undefined)rotated.set(index,r=rotatedPalette(this.palettes,index,s.colorDrawRotations));return r;};
  this.scene.clear();this.used.clear();const titlePicture=nativeStartupTitleShown(s.nativeStartupPicture,s.phase,s.nativeScreen),startup=titlePicture?s.nativeStartupPicture:undefined;if(startup&&!startup.rendering){this.renderer.setClearColor('#'+nesPalette.colors[startup.backdrop].map(c=>c.toString(16).padStart(2,'0')).join(''));this.renderer.render(this.scene,this.camera);return;}const preview=s.pipePreviewArea;if(preview){this.renderer.setClearColor(preview.background??'#000000');this.worldClip=true;for(const [col,row,id]of preview.tiles)if(row>=2)this.tile(id,col*16,row*16,preview.palette);this.worldClip=false;this.hud(s,preview.palette,true);this.renderer.render(this.scene,this.camera);return;}const dark=['underground','castle','night'].includes(s.area.theme);
  if(this.originalArea!==s.area){this.originalArea=s.area;this.originalTiles=new Map(s.area.tiles.map(([x,y,id])=>[`${x},${y}`,id]));this.ropeColumns=liftRopeColumns(s.area);}
  this.renderer.setClearColor(s.area.background??(dark?'#000000':'#6888fc'));
  const screen=s.nativeScreen?nativeScreenPicture(s.nativeScreen,s.area.theme==='water'):undefined,black=screen?!screen.world:['intro','gameover'].includes(s.phase)||s.pipeLoading||s.pipeClearing;
  if(black)this.renderer.setClearColor(screen?(s.nativeBackdrop===0x22?'#6888fc':'#000000'):s.pipeClearing||s.phase==='intro'&&s.phaseFrame>=TRANSITIONS.introUniformSkyFromFrame?(s.area.background??'#6888fc'):'#000000');
  if(!black){
   const ordinary=s.spritePictureOwner!=='empty'&&s.spritePictureOwner!=='victory';
   this.waterSurfaceSky(s);
   this.worldClip=true;
   const pictureTiles=new Map(s.tiles);
   // Jumpspring writes metatiles 0x67 (blank) and 0x68 (half brick) into its two rows; the picture shows the half brick under the spring (2-1 1ae7aeeb rows 11657+, column 188 row 12).
   for(const spring of s.area.springs??[]){const col=Math.floor(spring.x/16),row=Math.floor((spring.y-8)/16);pictureTiles.set(`${col},${row-1}`,0x67);pictureTiles.set(`${col},${row}`,0x68);}
   for(const [key,id]of s.blockBackground){if(id===null)pictureTiles.delete(key);else pictureTiles.set(key,id);}
   for(const[key,id]of pictureTiles){const[col,row]=key.split(',').map(Number);const x=col*16-Math.floor(s.camera);if(x<-16||x>=256||row<2)continue;
    if(id===95||id===96)continue;let y=row*16;
    const below=doorwayBottomTile(id,s.tiles.has(`${col},${row+1}`));if(below!==undefined)this.tile(below,x,y+16,this.rotation(s.area.palette));
    const age=s.bump.get(key);if(age!==undefined&&!s.blockGraphics.some(b=>b.key===key)&&!s.usedBlockRehits.has(key)&&bumpShown(id))y-=Math.round(Math.sin(age/16*Math.PI)*4);
    const original=this.originalTiles.get(key);
    if(s.blockBackground.has(key)&&original!==undefined&&original>>6!==id>>6){
     // A block write-back sends only the four name-table tiles, never the attribute byte, so the cell keeps its original palette group
     // (b230c302 row 13193: $2640/$2660 <- 57 58 / 59 5A over hidden block $5F, drawn gray in 1-4; same in 8-4 area-2 at 38,9).
     const palette=this.palettes[this.rotation(s.area.palette)],group=original>>6,colors=[palette[0],...palette.slice(group*4+1,group*4+4)].map(n=>n.toString(16).padStart(2,'0')).join('-');
     const tiles=tables.metatiles.find(m=>m.metatile_id===id)!.tiles; // TL,BL,TR,BR
     for(const [index,tile] of tiles.entries())this.quad(`background-tiles-${colors}.png`,[(tile%16)*8,Math.floor(tile/16)*8,8,8],x+Math.floor(index/2)*8,y+(index%2)*8,0,false,false,false);
    }else{
     this.tile(id,x,y,this.rotation(s.area.palette));
    }
   }
   for(const col of this.ropeColumns){const x=col*16-Math.floor(s.camera);if(x>-16&&x<256)for(let row=2;row<15;row++)if(!s.tiles.has(`${col},${row}`))this.tile(64,x,row*16,this.rotation(s.area.palette));}
   const freeTiles=s.freeTiles.filter(piece=>!s.area.hiddenFreeTiles?.some(hidden=>hidden.x===piece.x&&hidden.y===piece.y&&hidden.id===piece.id&&hidden.palette===piece.palette));
   for(const piece of [...s.area.decorations??[],...freeTiles])if(piece.x-s.camera>-16&&piece.x-s.camera<256){const age=piece.interactive?s.bump.get(`${piece.x/16},${piece.y/16}`):undefined;const y=piece.y-(age===undefined?0:Math.round(Math.sin(age/16*Math.PI)*4));this.tile(piece.id,piece.x-s.camera,y,this.rotation(piece.palette),'aboveFreeTiles'in piece&&piece.aboveFreeTiles===true?0.15:0.1);}
   for(const [col,row,id,file]of s.area.patternOverrides??[]){
    const key=`${Math.floor(col/2)},${Math.floor(row/2)}`;if(this.originalTiles.has(key)&&this.originalTiles.get(key)!==s.tiles.get(key))continue;
    const x=col*8-s.camera;if(x>-8&&x<256&&row>=4)this.quad(file,[id%16*8,Math.floor(id/16)*8,8,8],x,row*8,0.2,false,false,false);
   }
   for(const overlay of s.area.overlays??[])this.text(overlay.text,overlay.x-s.camera,overlay.y);
   if(s.warpZoneActive)for(const overlay of s.area.warpZone?.overlays??[])this.text(overlay.text,overlay.x-s.camera,overlay.y);
   if(ordinary){
   for(const platform of s.area.platforms??[]){
    const context={levelId:s.level.id,areaId:s.area.id},pos=s.platformPicturePosition(platform);
    for(const y of nativePlatformArtworkYs(platform,context,pos.y)){
     if(platformMotionModel(platform,context)==='contact-cloud')this.special(s.platformWidth(platform)===32?'large_platforms-3':'large_platforms-2',pos.x-s.camera,y);
     else{const slot=s.spriteObjectSlot(platform),base=slot===undefined?undefined:s.spriteShuffle.offsets[slot+1];this.oamContext=this.oamRows&&base!==undefined?{base,count:s.platformWidth(platform)/8}:undefined;for(let i=0;i<s.platformWidth(platform);i+=8)this.spriteTile(91,pos.x+i-s.camera,y,'0f-16-30-27',false,false,base===undefined?2:2+(255-base)/4096);this.oamContext=undefined;} // lower OAM offsets draw in front, as for enemies (0d12a2e4 row 18152: lift over Bowser)
    }
   }
   // Reference vines remain visible in the HUD rows while growing offscreen.
   this.worldClip=false;
   for(const vine of s.vines)if(vine.height>0){
    const top=vine.baseY-vine.height;
    for(let offset=0;offset<vine.height;offset+=8){
     const side=Math.floor(offset/8)%2===1,tile=offset===0?224:225,visible=Math.min(8,vine.height-offset);
     this.quad('sprite-tiles-0f-1a-30-27.png',[tile%16*8,Math.floor(tile/16)*8,8,visible],vine.x+(side?6:0)-s.camera,top+offset+(s.area.entryVine?.vineId===vine.id?1:0),1.5,side);
    }
   }
   this.worldClip=true;
   for(const spring of s.area.springs??[]){const compression=s.springCompression(spring);this.enemyCell(40+compression,spring.x-s.camera,spring.y-23+compression*8,spring.palette??'0f-1a-30-27');}
   }
   for(const e of s.enemies){const picture=enemyRenderPicture(e,s.frame,s.nativeTimersStopped);this.enemyOamZ=picture.enemySlot===undefined?2:2+(255-s.spriteShuffle.offsets[picture.enemySlot+1])/4096;if(s.enemyPictureShown(e)&&e.active&&e.graphicsVisible!==false&&picture.x-s.camera>-40&&picture.x-s.camera<272&&picture.dead<90){this.oamContext=this.oamRows?{base:s.spriteShuffle.offsets[picture.enemySlot!+1],count:6}:undefined;this.enemy(e,s);this.oamContext=undefined;}}this.enemyOamZ=2;
   if(ordinary){
   for(const b of s.blockGraphics)for(const p of nativeBlockSprites(b,!['water','underground','castle'].includes(s.area.theme),s.camera)){const palette=this.palettes[s.area.palette].slice(16+p.palette*4,20+p.palette*4).map(v=>v.toString(16).padStart(2,'0')).join('-');this.spriteTile(p.tile,p.x,p.y,palette,p.flipX,p.flipY);}
   for(const i of s.items)this.item(i,s);
   if(s.area.theme==='water')for(const [slot,bubble]of s.bubbles.entries())if(nativeBubbleShown(bubble,s.player.y,s.camera))this.spriteTile(0x74,(Math.floor(bubble.x)-Math.floor(s.camera))&255,bubble.y+1,'0f-16-30-27',false,false,2+(255-s.spriteShuffle.offsets[10+slot])/4096);
   for(const popup of s.popups){
    const assembly=popupAssemblies.records.find(record=>record.value===popup.value);if(!assembly)continue;
    const v=popup.victim;this.oamContext=this.oamRows&&v?.enemySlot!==undefined?{base:s.spriteShuffle.offsets[v.enemySlot+1],count:2}:undefined; // the composer's floatey entries
    for(const piece of assembly.pieces)this.spriteTile(piece.tile,popup.x+piece.x,popup.y+piece.y,'0f-16-30-27',false,false,2.5);this.oamContext=undefined;
   }
   for(const bar of s.area.firebars??[]){const slot=s.spriteObjectSlot(bar),centers=s.firebarCenters(bar);this.oamContext=this.oamRows&&slot!==undefined?{base:s.spriteShuffle.offsets[slot+1],count:centers.length}:undefined;for(const {x,y}of centers)this.special('fireball_or_firebar-'+nativeFireballPhase(s.random.frame),x-4-s.camera,y-4+(bar.visualOffsetY??0));this.oamContext=undefined;}
   const pole=s.area.exit;
   if(pole?.kind==='flag'){
    const flagPalette=this.palettes[s.area.palette].slice(20,24).map(n=>n.toString(16).padStart(2,'0')).join('-');
    for(const p of nativeFlagSprites(s.specialSlot5,s.phase==='flag'?{y:s.flagNumber.y,score:s.flagBonus}:undefined,s.camera))this.spriteTile(p.tile,p.x,p.y,flagPalette,false,false,1);
    if(s.phase==='flag'){
     const flag=s.castleFlag;
     if(flag){
      this.worldClip=false;this.special('castle_star_flag',flag.x-s.camera,flag.y,1.5);this.worldClip=true;
      for(const [key,id] of s.tiles){const [col,row]=key.split(',').map(Number);if(id>=69&&id<=73&&col*16<flag.x+16&&col*16+16>flag.x&&row*16<flag.y+16&&row*16+16>flag.y)this.castlePriorityTile(id,col*16-s.camera,row*16,s.area.palette);}
      for(const piece of s.freeTiles)if(piece.id>=69&&piece.id<=73&&piece.x<flag.x+16&&piece.x+16>flag.x&&piece.y<flag.y+16&&piece.y+16>flag.y)this.castlePriorityTile(piece.id,piece.x-s.camera,piece.y,piece.palette);
     }
     for(const firework of s.flagFireworks)this.special('explosions-'+firework.phase,firework.x-s.camera,firework.y);
    }
   }
   }
   if(playerVisible(s)&&(!startup||startup.player)){this.oamContext=this.oamRows?{base:4,count:8}:undefined;this.player(s);this.oamContext=undefined;}
   this.worldClip=false;
  }
  const introLoading=screen?!screen.hud:s.phase==='intro'&&(!s.introFromGameover&&s.introHiddenEarly||s.introHiddenLate);
  if(screen?screen.hud:!s.pipeLoading&&!s.pipeClearing&&!introLoading&&!s.gameoverClosing)this.hud(s,s.area.palette,Boolean(screen&&s.nativeScreen!.engine<8),titlePicture);
  if(titlePicture)this.title(s);
  if(screen?screen.message==='time-up':s.timeUpScreen&&!introLoading)this.text('TIME UP',96,128);
  else if(screen?screen.message==='lives':s.phase==='intro'&&!introLoading){
   this.text('WORLD '+s.level.id,88,80);if(!screen||screen.avatar)this.quad('player-'+(s.currentPlayer?'luigi':'mario')+'-right.png',[160,32,16,32],96,89,3);this.text('×  '+s.lives,120,112);
  }
  if(s.phase==='gameover'&&!s.gameoverClosing){if(s.twoPlayer)this.text(s.currentPlayer?'LUIGI':'MARIO',104,112);this.text('GAME OVER',88,128);}
  this.castleRescue(s);
  this.renderer.render(this.scene,this.camera);
 }
 private castleRescue(s:Simulation){
  const exit=s.area.exit;if(exit?.kind!=='axe'||['intro','gameover','title'].includes(s.phase))return;
  const actor=s.castleRetainer;if(actor?.graphicsVisible)this.enemyCell(s.level.id==='8-4'?26:27,actor.x-Math.floor(s.camera),actor.y+1,'0f-16-30-27');
  if(s.castleStage!=='message'&&s.phase!=='ending')return;
  if(s.castleText){for(const row of s.castleText)this.text(row.text,row.x-s.camera,row.y);return;}
  const elapsed=s.phase==='ending'?s.phaseFrame:s.phaseFrame-s.castleArrivalFrame;
  // The terminal reference image precedes ending dialogue. Subsequent ending
  // text is an inferred presentation; its timing cannot be observed via the tool.
  if(s.phase==='ending'&&elapsed===0)return;
  const actorScreenX=(actor?.x??exit.retainerX??0)-s.camera;
  if(elapsed>=0)this.text('THANK YOU '+(s.currentPlayer?'LUIGI':'MARIO')+'!',actorScreenX-80,80);
  if(elapsed>=CASTLE_COMPLETION.secondMessageFrames){
   if(s.level.id==='8-4'){
    this.text('YOUR QUEST IS OVER.',actorScreenX-96,112);
   }else{this.text('BUT OUR PRINCESS IS IN',actorScreenX-104,112);this.text('ANOTHER CASTLE!',actorScreenX-104,128);}
  }
 }
 private swimKickSheet(sheet:string,facing:number){
  const name=sheet+'#swim-kick';if(this.textures.has(name))return name;
  const source=this.textures.get(sheet)!,normal=this.textures.get(`player-mario-${facing<0?'left':'right'}.png`)!;
  const canvas=document.createElement('canvas');canvas.width=source.image.width;canvas.height=source.image.height;const context=canvas.getContext('2d')!;context.drawImage(source.image,0,0);
  const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;const rc=reference.getContext('2d')!;rc.drawImage(normal.image,0,0);
  const normalPixels=rc.getImageData(0,0,canvas.width,canvas.height).data,variantPixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const colors=powerupRules.palettes.normal.map(rgb=>{
   const at=normalPixels.findIndex((_,i)=>i%4===0&&normalPixels[i+3]!==0&&rgb.every((v,c)=>normalPixels[i+c]===v));
   return variantPixels.slice(at,at+3);
  });
  const atlas=this.textures.get('sprite-tiles-00-16-27-18.png')!;
  const kicks=[0x31,0x46].map(tile=>{
   const part=document.createElement('canvas');part.width=part.height=8;const pc=part.getContext('2d')!;pc.drawImage(atlas.image,tile%16*8,Math.floor(tile/16)*8,8,8,0,0,8,8);
   const pixels=pc.getImageData(0,0,8,8);
   for(let at=0;at<pixels.data.length;at+=4)if(pixels.data[at+3]){
    const role=powerupRules.palettes.normal.findIndex(rgb=>rgb.every((v,c)=>pixels.data[at+c]===v));
    if(role>=0)for(let c=0;c<3;c++)pixels.data[at+c]=colors[role][c];
   }
   pc.putImageData(pixels,0,0);return part;
  });
  for(const cell of [5,6,7,17,18]){
   const x=cell%13*16+(facing<0?8:0),y=Math.floor(cell/13)*32+24;context.clearRect(x,y,8,8);
   context.save();context.translate(x+(facing<0?8:0),y);context.scale(facing<0?-1:1,1);context.drawImage(kicks[cell<8?0:1],0,0);context.restore();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(name,texture);return name;
 }
 private player(s:Simulation){
  const p=s.player,{cell,facing,throwing,swimKick}=playerCell(s),change=s.powerChange;
  let variant:string=(change?.kind==='fire'?fireFlashVariant(POWERUPS.transformFreezeNativeFrames.fireValue-change.remaining):undefined)??(p.size===2?'fire':s.currentPlayer?'luigi':'mario');
  if(s.starDrawPalette!==undefined)variant=starVariant(s.starDrawPalette,variant);
  let sheet=`player-${variant}-${facing<0?'left':'right'}.png`;if(swimKick!==undefined)sheet=this.swimKickSheet(sheet,facing);
  const z=s.playerDrawBackgroundPriority||s.phase==='pipe'||s.pipeRising?-0.1:3;
  this.quad(sheet,[cell%13*16,Math.floor(cell/13)*32,16,32],p.x-s.camera,p.y-31,z);
  if(throwing&&Math.abs(p.vx)>0.1)this.quad(sheet,[176,0,16,24],p.x-s.camera,p.y-31,z+0.1);
 }
 private hud(s:Simulation,paletteIndex=s.area.palette,hideTime=false,titlePicture=false){
  this.textZ=1;
  this.text(s.currentPlayer?'LUIGI':'MARIO',24,16);this.text(s.hud.draw.score,24,24);
  // InitializeGame installs sprite zero before the first GameEngine row; intro still owns control.
  if(!titlePicture&&s.phase==='intro'&&s.nativeScreen?.task!==3||s.phase==='gameover')this.quad('background-tiles-0f-27-17-1c.png',[112,16,8,8],88,24,1);
  else{
   // Supplied OAM [24,255,0x23,88]: palette3, behind the HUD background.
   const palette=manifest.palette_observations[paletteIndex].palette.slice(28,32).map(n=>n.toString(16).padStart(2,'0')).join('-');
   this.spriteTile(255,88,25,palette,false,false,0.9);
   this.quad(this.hudCoinTextures[this.rotation(paletteIndex)],[0,0,8,8],88,24,1);
  }
  this.text('×'+s.hud.draw.coins,96,24);
  this.text('WORLD',144,16);this.text(s.level.id,152,24);this.text('TIME',200,16);if(!hideTime&&s.phase!=='title'&&s.phase!=='intro'&&s.phase!=='gameover'&&!s.vineEntryStage&&!s.area.autoWalk&&!s.entryTimerHidden)this.text(s.hud.draw.time,208,24);
  this.textZ=5;
 }
 private title(s:Simulation){
  for(const cmd of tables.title_screen.stream.commands){
   let at=parseInt(cmd.ppu_address,16)-0x2000;
   for(let i=0;i<cmd.length;i++){
    const tile=cmd.payload[cmd.repeat?0:i],x=at%32*8,y=Math.floor(at/32)*8;
    if(y<120&&y>=32)this.quad('background-tiles-22-36-17-0f.png',[tile%16*8,Math.floor(tile/16)*8,8,8],x,y,4,false,false,false);
    at+=cmd.stride;
   }
  }
  this.text('©1985 NINTENDO',104,120,'background-tiles-22-36-17-0f.png');/* native copyright line is cream (0x36), the menu lines white */this.text('1 PLAYER GAME',88,144);this.text('2 PLAYER GAME',88,160);this.text('TOP- 000000',96,184);
  this.quad('background-tiles-22-36-17-0f.png',[112,96,8,8],72,s.twoPlayer?160:144,5);
 }
 screenshot(){return this.renderer.domElement.toDataURL('image/png');}
}
