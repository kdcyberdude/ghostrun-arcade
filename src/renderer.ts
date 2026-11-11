import * as THREE from 'three';
import {loadPixelTexture,pixelCamera,pixelQuad} from '../assets/three-assets.mjs';
import manifest from '../assets/graphics/graphics-manifest.json';
import tables from '../assets/graphics/tables.json';
import specialSprites from '../assets/graphics/special/index.json';
import {Simulation,TRANSITIONS,POWERUPS,FLAG_COMPLETION,CASTLE_COMPLETION} from './simulation.js';
import {waterSurfaceSky,doorwayBottomTile,titleBootColor,growCell,shrinkBig,fireFlashVariant,throwPoseShown,starVariant} from './view-rules.js';
import {platformMotionModel} from './platform-motion.js';
import powerupRules from '../data/powerup-rules.json';
import popupAssemblies from '../data/popup-assemblies.json';
import shellLaunchRules from '../data/shell-goomba-launch-rules.json';
import type {Area,Enemy} from './types.js';
const A=(import.meta.env?.BASE_URL??'/')+'assets/graphics/';
export class GameRenderer {
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=pixelCamera(THREE);textures=new Map<string,THREE.Texture>();
 private pools=new Map<string,THREE.Mesh[]>();private used=new Map<string,number>();private worldClip=false;private textZ=5;
 private rects=new Map(manifest.metatiles.map(t=>[t.id,t.rect]));
 private originalArea?:Area;private originalTiles=new Map<string,number>();
 private hudCoinTextures:string[]=[];private skyBand?:THREE.Mesh;
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
  const clipTop=sprite?0:32;
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
 private spriteTile(id:number,x:number,y:number,palette='0f-1a-30-27',flipX=false,flipY=false,z=2){
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
  const x=Math.floor(e.x-s.camera),y=Math.floor(e.y)-23,phase=Math.floor(e.age/8)%2;
  const openingCannonShot=s.level.id==='8-3'&&e.kind==='bullet'&&e.originX===288&&e.vx<0&&!e.dead;
  const fiveThreeLeftShot=s.level.id==='5-3'&&s.area.id==='main'&&e.kind==='bullet'&&e.vx<0&&!e.dead&&e.palette===undefined;
  let cell=14,palette='0f-0f-36-17';
  if(e.kind==='koopa'||e.kind==='redKoopa'){cell=e.shell?17+phase:2+phase;palette=e.kind==='redKoopa'?'0f-16-30-27':'0f-1a-30-27';}
  if(e.kind==='paratroopa'){cell=4+phase;palette='0f-1a-30-27';}
  if(e.kind==='beetle'){cell=e.shell?19+phase:phase;palette='0f-1a-30-27';}
  if(e.kind==='spiny'){cell=(e.motion==='falling'?8:6)+phase;palette='0f-16-30-27';}
  if(e.kind==='piranha'){cell=32+phase;palette='0f-1a-30-27';}
  if(e.kind==='blooper'){cell=10+phase;palette='0f-00-30-10';}
  if(e.kind==='cheep'){cell=12+phase;palette='0f-16-30-27';}
  if(e.kind==='bullet'){cell=39;palette=openingCannonShot||fiveThreeLeftShot?'0f-0f-36-17':'0f-00-30-10';}
  if(e.kind==='lakitu'){cell=24+phase;palette='0f-1a-30-27';}
  if(e.kind==='hammerBro'){cell=28+Math.floor(e.age/8)%4;palette='0f-1a-30-27';}
  if(e.kind==='podoboo'){cell=34;palette='0f-16-30-27';}
  if(e.dead&&e.kind==='goomba'&&e.dead<20){cell=23;}
  if(e.kind==='bowser'){
   const flipY=e.dead>0&&!s.castleBowserFalls(e);
   // The head half is the native anchor: at the body's left edge when he faces left, 16 px in (the body's right half) when he faces right.
   const right=e.bowser?e.bowser.side>0:e.vx>0,headX=e.bowser&&right?x+16:x;
   this.enemyCell(35+phase*2,headX,y-8,e.palette??'0f-1a-30-27',right,flipY);
   this.enemyCell(36+phase*2,headX+(right?-16:16),y,e.palette??'0f-1a-30-27',right,flipY);return;
  }
  palette=e.palette??palette;
  if(e.kind==='spiny'&&e.motion==='falling'&&!e.dead&&e.vx<=0&&palette==='0f-16-30-27'){
   const tiles=tables.enemy_cells[cell].tiles;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)this.spriteTile(tiles[(row+1)*2+1-col],x+col*8,Math.floor(e.y)-15+row*8,palette,col===1,col===1);
   return;
  }
  if(e.kind==='podoboo'&&!e.dead){
   // The observed body is16px tall; the table's leading8px row is transparent.
   const tiles=tables.enemy_cells[34].tiles,falling=e.podobooFalling===true;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)
    this.spriteTile(tiles[(falling?2-row:row+1)*2+col],x+col*8,Math.floor(e.y)-15+row*8,palette,col===1,falling);
   return;
  }
  if(e.greenShellLaunchFrame!==undefined){
   const top=Math.floor(e.y)+shellLaunchRules.visibleBodyTopFromFeet,tiles=tables.enemy_cells[14].tiles;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++)this.spriteTile(tiles[(2-row)*2+col],x+col*8,top+row*8,palette,false,true);
   return;
  }
  if(e.squashed){
   const top=Math.floor(e.y)-6;
   this.spriteTile(239,x,top,palette,false,true);this.spriteTile(239,x+8,top,palette,true,true);return;
  }
  if(e.shell&&(e.kind==='koopa'||e.kind==='redKoopa')){
   const shell=tables.enemy_cells[17+phase],launched=e.dead>0;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++){
    const sourceRow=launched?2-row:row+1;
    this.spriteTile(shell.tiles[sourceRow*2+col],x+col*8,y+10+row*8,palette,col===1,!launched);
   }
   return;
  }
  const redVerticalFacing=e.kind==='paratroopa'&&!e.dead&&palette==='0f-16-30-27'&&(e.paratroopaMotion??'vertical')==='vertical';
  const koopaFacing=!e.dead&&e.vx!==0&&(palette==='0f-1a-30-27'&&(e.kind==='koopa'&&!e.shell||e.kind==='paratroopa'&&(e.paratroopaMotion??'bounce')==='bounce')||palette==='0f-16-30-27'&&e.kind==='redKoopa'&&!e.shell);
  if(e.kind==='goomba'&&!e.dead){
   const tiles=tables.enemy_cells[cell].tiles;
   for(let row=1;row<3;row++)for(let col=0;col<2;col++){
    const flip=row===2&&phase===1;
    this.spriteTile(tiles[row*2+col],x+(flip?1-col:col)*8,y+row*8,palette,flip,false);
   }
  }else this.enemyCell(cell,x,y+(cell===23?1:openingCannonShot?-1:0),palette,openingCannonShot||fiveThreeLeftShot?true:e.kind==='cheep'&&!e.dead?e.vx<0:e.kind==='hammerBro'&&!e.dead?s.player.x<e.x:redVerticalFacing?true:koopaFacing||e.kind==='beetle'&&!e.dead&&!e.shell&&e.vx!==0&&palette==='0f-0f-36-17'||e.kind==='spiny'&&!e.dead&&e.motion!=='falling'&&e.vx!==0&&palette==='0f-16-30-27'?e.vx<0:e.vx>0,e.dead>20,e.kind==='piranha'?-0.1:2);
 }
 private enemyCell(cell:number,x:number,y:number,palette:string,flipX=false,flipY=false,z=2){
  const data=tables.enemy_cells[cell];
  for(let i=0;i<6;i++){
   const col=i%2,row=Math.floor(i/2),symmetric=data.tiles[row*2]===data.tiles[row*2+1];
   const bottomFlip=cell===40&&row===2||cell===41&&row===1||cell===23&&row===2;
   this.spriteTile(data.tiles[i],x+(flipX?1-col:col)*8,y+(flipY?2-row:row)*8,palette,flipX!==(symmetric&&col===1),flipY!==bottomFlip,z);
  }
 }
 render(s:Simulation){
  this.scene.clear();this.used.clear();const boot=s.phase==='title'?titleBootColor(s.titleFrame):undefined;if(boot){this.renderer.setClearColor(boot);this.renderer.render(this.scene,this.camera);return;}const preview=s.pipePreviewArea;if(preview){this.renderer.setClearColor(preview.background??'#000000');this.worldClip=true;for(const [col,row,id]of preview.tiles)if(row>=2)this.tile(id,col*16,row*16,preview.palette);this.worldClip=false;this.hud(s,preview.palette,true);this.renderer.render(this.scene,this.camera);return;}const dark=['underground','castle','night'].includes(s.area.theme);
  if(this.originalArea!==s.area){this.originalArea=s.area;this.originalTiles=new Map(s.area.tiles.map(([x,y,id])=>[`${x},${y}`,id]));}
  this.renderer.setClearColor(s.area.background??(dark?'#000000':'#6888fc'));
  const black=['intro','gameover'].includes(s.phase)||s.pipeLoading||s.pipeClearing;
  if(black)this.renderer.setClearColor(s.pipeClearing||s.phase==='intro'&&s.phaseFrame>=TRANSITIONS.introUniformSkyFromFrame?(s.area.background??'#6888fc'):'#000000');
  if(!black){
   this.waterSurfaceSky(s);
   this.worldClip=true;
   for(const[key,id]of s.tiles){const[col,row]=key.split(',').map(Number);const x=col*16-Math.floor(s.camera);if(x<-16||x>=256||row<2)continue;
    if(id===95||id===96)continue;let y=row*16;
    const below=doorwayBottomTile(id,s.tiles.has(`${col},${row+1}`));if(below!==undefined)this.tile(below,x,y+16,s.area.palette);
    const age=s.bump.get(key);if(age!==undefined&&!s.usedBlockRehits.has(key))y-=Math.round(Math.sin(age/16*Math.PI)*4);
    if(s.level.id==='8-4'&&s.area.id==='area-2'&&col===38&&row===9&&id===196){
     // The revealed foothold uses the observed gray castle palette.
     for(const [index,tile] of [87,88,89,90].entries())this.quad('background-tiles-0f-30-10-00.png',[(tile%16)*8,Math.floor(tile/16)*8,8,8],x+(index%2)*8,y+Math.floor(index/2)*8,0,false,false,false);
    }else{
     const entryQuestion=s.level.id==='1-2'&&s.area.id==='area-2'&&row===9&&col>=10&&col<=14&&id===192;
     const palette=entryQuestion?[3,3,3,4,5,4][Math.floor((Math.max(0,s.areaFrame-1+(s.paused?1:0))%48)/8)]:s.area.palette;
     this.tile(id,x,y,palette);
    }
   }
   const freeTiles=s.freeTiles.filter(piece=>!s.area.hiddenFreeTiles?.some(hidden=>hidden.x===piece.x&&hidden.y===piece.y&&hidden.id===piece.id&&hidden.palette===piece.palette));
   for(const piece of [...s.area.decorations??[],...freeTiles])if(piece.x-s.camera>-16&&piece.x-s.camera<256){const age=piece.interactive?s.bump.get(`${piece.x/16},${piece.y/16}`):undefined;const y=piece.y-(age===undefined?0:Math.round(Math.sin(age/16*Math.PI)*4));this.tile(piece.id,piece.x-s.camera,y,piece.palette,'aboveFreeTiles'in piece&&piece.aboveFreeTiles===true?0.15:0.1);}
   for(const [col,row,id,file]of s.area.patternOverrides??[]){
    const key=`${Math.floor(col/2)},${Math.floor(row/2)}`;if(this.originalTiles.has(key)&&this.originalTiles.get(key)!==s.tiles.get(key))continue;
    const x=col*8-s.camera;if(x>-8&&x<256&&row>=4)this.quad(file,[id%16*8,Math.floor(id/16)*8,8,8],x,row*8,0.2,false,false,false);
   }
   for(const overlay of s.area.overlays??[])this.text(overlay.text,overlay.x-s.camera,overlay.y);
   if(s.warpZoneActive)for(const overlay of s.area.warpZone?.overlays??[])this.text(overlay.text,overlay.x-s.camera,overlay.y);
   for(const platform of s.area.platforms??[]){const pos=s.platformPosition(platform);
    if(platformMotionModel(platform,{levelId:s.level.id,areaId:s.area.id})==='contact-cloud')this.special(platform.width===32?'large_platforms-3':'large_platforms-2',pos.x-s.camera,pos.y);
    else for(let i=0;i<platform.width;i+=8)this.spriteTile(91,pos.x+i-s.camera,pos.y,'0f-16-30-27');
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
   for(const e of s.enemies)if(e.active&&e.x-s.camera>-40&&e.x-s.camera<272&&e.dead<90)this.enemy(e,s);
   for(const i of s.items){const x=i.x-s.camera;
    if(i.kind==='mushroom'||i.kind==='flower'||i.kind==='star'||i.kind==='1up')this.special(`powerups-${{mushroom:0,flower:1,star:2,'1up':3}[i.kind]}`,x,i.y,i.emerging?-0.1:1.5);
    if(i.kind==='coin')this.special('jumping_coins-'+Math.floor(i.age/4)%4,x,i.y);
    if(i.kind==='fireball')this.special('fireball_or_firebar-'+Math.floor(s.frame/4)%4,x,i.y);
    if(i.kind==='hammer'){const phase=Math.floor(i.age/4)%4,descriptor=specialSprites.records.find(record=>record.file===`sprite-hammers-${phase}.png`)!.descriptor;const palette=manifest.palette_observations[s.area.palette].palette.slice(28,32).map(n=>n.toString(16).padStart(2,'0')).join('-');for(const piece of descriptor.sprites)this.spriteTile(piece.tile,x+piece.x,i.y+piece.y,palette,piece.flip_x,piece.flip_y);}
    if(i.kind==='flame')this.special('bowser_flame-'+Math.floor(i.age/8)%2,x,i.y);
    if(i.kind==='debris')this.tile(81,x,i.y,s.area.palette,2);
   }
   for(const popup of s.popups){
    const assembly=popupAssemblies.records.find(record=>record.value===popup.value);if(!assembly)continue;
    for(const piece of assembly.pieces)this.spriteTile(piece.tile,popup.x+piece.x,popup.y+piece.y,'0f-16-30-27',false,false,2.5);
   }
   for(const bar of s.area.firebars??[])for(const {x,y}of s.firebarCenters(bar))this.special('fireball_or_firebar-'+Math.floor(s.frame/4)%4,x-4-s.camera,y-4+(bar.visualOffsetY??0));
   const pole=s.area.exit;
   if(pole?.kind==='flag'){
    this.special('flagpole_flag',pole.x-16-s.camera,s.phase==='flag'?s.flagTop:FLAG_COMPLETION.flagTopY,1);
    if(s.phase==='flag'){
     const pairs=tables.tables.find(t=>t.symbol==='FlagpoleScoreNumTiles')!.bytes,index=[5000,2000,800,400,100].indexOf(s.flagBonus);
     if(index>=0)for(let col=0;col<2;col++)this.spriteTile(pairs[index*2+col],pole.x+FLAG_COMPLETION.scorePopupXOffset+col*8-s.camera,FLAG_COMPLETION.scorePopupYPlusFlagY-s.flagTop,'0f-1a-30-27');
     const flag=s.castleFlag;
     if(flag){
      this.worldClip=false;this.special('castle_star_flag',flag.x-s.camera,flag.y,1.5);this.worldClip=true;
      for(const [key,id] of s.tiles){const [col,row]=key.split(',').map(Number);if(id>=69&&id<=73&&col*16<flag.x+16&&col*16+16>flag.x&&row*16<flag.y+16&&row*16+16>flag.y)this.castlePriorityTile(id,col*16-s.camera,row*16,s.area.palette);}
      for(const piece of s.freeTiles)if(piece.id>=69&&piece.id<=73&&piece.x<flag.x+16&&piece.x+16>flag.x&&piece.y<flag.y+16&&piece.y+16>flag.y)this.castlePriorityTile(piece.id,piece.x-s.camera,piece.y,piece.palette);
     }
     for(const firework of s.flagFireworks)this.special('explosions-'+firework.phase,firework.x-s.camera,firework.y);
    }
   }
   if(s.vineEntryStage!=='grow'&&!s.entryFallHidden&&!s.flagInside&&!s.pipeHidden&&(s.powerChange||!s.player.invincible||Math.floor(s.frame/4)%2===0))this.player(s);
   this.worldClip=false;
  }
  const introLoading=s.phase==='intro'&&(!s.introFromGameover&&s.phaseFrame<TRANSITIONS.introHiddenBeforeFrame||s.introHiddenLate);
  if(!s.pipeLoading&&!s.pipeClearing&&!introLoading&&!s.gameoverClosing)this.hud(s);
  if(s.phase==='title')this.title(s);
  if(s.timeUpScreen&&!introLoading)this.text('TIME UP',96,128);
  else if(s.phase==='intro'&&!introLoading){
   this.text('WORLD '+s.level.id,88,80);this.quad('player-'+(s.currentPlayer?'luigi':'mario')+'-right.png',[160,32,16,32],96,89,3);this.text('×  '+s.lives,120,112);
  }
  if(s.phase==='gameover'&&!s.gameoverClosing){if(s.twoPlayer)this.text(s.currentPlayer?'LUIGI':'MARIO',104,112);this.text('GAME OVER',88,128);}
  this.castleRescue(s);
  this.renderer.render(this.scene,this.camera);
 }
 private castleRescue(s:Simulation){
  const exit=s.area.exit;if(exit?.kind!=='axe'||exit.retainerX===undefined||['intro','gameover','title'].includes(s.phase))return;
  this.enemyCell(s.level.id==='8-4'?26:27,exit.retainerX-s.camera,185,'0f-16-30-27');
  if(s.castleStage!=='message'&&s.phase!=='ending')return;
  const elapsed=s.phase==='ending'?s.phaseFrame:s.phaseFrame-s.castleArrivalFrame;
  // The terminal reference image precedes ending dialogue. Subsequent ending
  // text is an inferred presentation; its timing cannot be observed via the tool.
  if(s.phase==='ending'&&elapsed===0)return;
  const actorScreenX=exit.retainerX-s.camera;
  if(elapsed>=0)this.text('THANK YOU '+(s.currentPlayer?'LUIGI':'MARIO')+'!',actorScreenX-80,80);
  if(elapsed>=CASTLE_COMPLETION.secondMessageFrames){
   if(s.level.id==='8-4'){
    this.text('YOUR QUEST IS OVER.',actorScreenX-96,112);
   }else{this.text('BUT OUR PRINCESS IS IN',actorScreenX-104,112);this.text('ANOTHER CASTLE!',actorScreenX-104,128);}
  }
 }
 private player(s:Simulation){
  const p=s.player,pose=s.phase==='play'?(s.wallDisplayPose??s.locomotionPose):undefined;let cell=p.size?25:23;
  if(p.dead)cell=22;else if(s.waterEntryStanding)cell=p.size?25:23;else if(s.entryFallPose)cell=p.size?0:12;else if(p.climbing)cell=(p.size?8:20)+(s.phase==='flag'?(p.y>=191?0:Math.floor(s.frame/8)%2):Math.floor(p.anim/12)%2);
  else if(s.phase==='flag'&&!s.flagInside)cell=(p.size?0:12)+Math.floor(p.anim/5)%3;
  else if(p.duck)cell=10;else if(s.area.theme==='water'&&!p.grounded)cell=(p.size?5:17)+s.swimPoseFrame;
  else if(pose)cell=pose.kind==='jump'?(p.size?4:16):pose.kind==='skid'?(p.size?3:15):pose.kind==='walk'?(p.size?0:12)+pose.frame:cell;
  else if(!p.grounded)cell=p.size?4:16;
  else if(Math.abs(p.vx)>0.1)cell=p.vx*p.facing<0?(p.size?3:15):(p.size?0:12)+Math.floor(p.anim/5)%3;
  const change=s.powerChange;
  // Pose cadence between7/8-frame observations remains inferred. All three
  // supplied growth sizes are used while the measured gameplay freeze runs.
  if(change?.kind==='grow')cell=growCell(POWERUPS.transformFreezeNativeFrames.mushroomGrowthValue-change.remaining)??cell;
  if(change?.kind==='shrink'&&!shrinkBig(POWERUPS.transformFreezeNativeFrames.shrinkValue-change.remaining)&&cell<13)cell=cell===25?23:cell===10?23:cell+12; // native: the big pose flickers against the small one every frame for 16 rows, then small
  let variant:string=(change?.kind==='fire'?fireFlashVariant(POWERUPS.transformFreezeNativeFrames.fireValue-change.remaining):undefined)??(p.size===2?'fire':s.currentPlayer?'luigi':'mario');
  if(p.star)variant=starVariant(p.star,s.frame,variant);
  const facing=pose&&s.area.theme!=='water'&&!p.climbing&&!p.duck&&!s.entryFallPose?pose.facing:p.facing;
  const sheet=`player-${variant}-${facing<0?'left':'right'}.png`,z=s.phase==='pipe'||s.pipeRising?-0.1:3;
  const throwing=p.size===2&&throwPoseShown(s.fireballThrowAge,p.grounded,Math.abs(p.vx))&&!p.duck&&!p.dead&&!p.climbing;
  if(throwing&&Math.abs(p.vx)<=0.1)cell=11;
  this.quad(sheet,[cell%13*16,Math.floor(cell/13)*32,16,32],p.x-s.camera,p.y-31,z);
  if(throwing&&Math.abs(p.vx)>0.1)this.quad(sheet,[176,0,16,24],p.x-s.camera,p.y-31,z+0.1);
 }
 private hud(s:Simulation,paletteIndex=s.area.palette,hideTime=false){
  this.textZ=1;
  this.text(s.currentPlayer?'LUIGI':'MARIO',24,16);this.text(String(s.score).padStart(6,'0'),24,24);
  if(s.phase==='intro'||s.phase==='gameover')this.quad('background-tiles-0f-27-17-1c.png',[112,16,8,8],88,24,1);
  else{
   // Supplied OAM [24,255,0x23,88]: palette3, behind the HUD background.
   const palette=manifest.palette_observations[paletteIndex].palette.slice(28,32).map(n=>n.toString(16).padStart(2,'0')).join('-');
   this.spriteTile(255,88,25,palette,false,false,0.9);
   this.quad(this.hudCoinTextures[paletteIndex],[0,0,8,8],88,24,1);
  }
  this.text('×'+String(s.coins).padStart(2,'0'),96,24);
  this.text('WORLD',144,16);this.text(s.level.id,152,24);this.text('TIME',200,16);if(!hideTime&&s.phase!=='title'&&s.phase!=='intro'&&s.phase!=='gameover'&&!s.vineEntryStage&&!s.area.autoWalk&&!s.entryTimerHidden)this.text(String(Math.max(0,s.time)).padStart(3,'0'),208,24);
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
