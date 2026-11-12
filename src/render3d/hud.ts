// HUD and text screens: drawn at the original 256 x 240 layout positions into a 2D canvas (OFL pixel font), then composited over the finished 3D frame.
import * as THREE from 'three';
import fontUrl from '@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2?url';
import {Simulation,TRANSITIONS,CASTLE_COMPLETION} from '../simulation.js';
import {NES_W,NES_H} from './coords.js';
import {trackedLoad} from './loading.js';
export class Hud{
 private canvas=document.createElement('canvas');private ctx:CanvasRenderingContext2D;private texture:THREE.CanvasTexture;private material:THREE.MeshBasicMaterial;
 readonly scene=new THREE.Scene();readonly camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);private last='';
 constructor(private scale:number){
  this.ctx=this.canvas.getContext('2d')!;this.texture=this.makeTexture();
  this.material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,toneMapped:false});this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
 }
 private makeTexture(){this.canvas.width=NES_W*this.scale;this.canvas.height=NES_H*this.scale;const t=new THREE.CanvasTexture(this.canvas);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;}
 /** New text resolution (texture storage is immutable in WebGL2, so the texture is recreated). */
 resize(scale:number){this.scale=scale;this.texture.dispose();this.texture=this.makeTexture();this.material.map=this.texture;this.last='';}
 async load(){const f=new FontFace('PressStart2P',`url(${fontUrl})`);await trackedLoad(fontUrl,()=>f.load());document.fonts.add(f);}
 private text(t:string,x:number,y:number,color='#ffffff',size=8){
  const c=this.ctx;c.font=`${size}px PressStart2P`;c.textBaseline='top';c.fillStyle='rgba(0,0,0,0.55)';c.fillText(t,x+1,y+1);c.fillStyle=color;c.fillText(t,x,y);
 }
 private centered(t:string,y:number,color?:string,size=8){this.ctx.font=`${size}px PressStart2P`;const w=this.ctx.measureText(t).width;this.text(t,Math.round((NES_W-w)/2),y,color,size);}
 private coin(x:number,y:number){const c=this.ctx,g=c.createLinearGradient(x,y,x+5,y+9);g.addColorStop(0,'#ffe27a');g.addColorStop(1,'#d98a00');c.fillStyle=g;c.beginPath();c.ellipse(x+2.5,y+4.5,2.6,4.4,0,0,7);c.fill();c.strokeStyle='#8a4a00';c.lineWidth=0.6;c.stroke();}
 /** Returns true when anything is drawn (so the caller can skip the overlay pass for an empty HUD). */
 draw(s:Simulation,showHud:boolean){
  const player=s.currentPlayer?'LUIGI':'MARIO';
  const introLoading=s.phase==='intro'&&(!s.introFromGameover&&s.phaseFrame<TRANSITIONS.introHiddenBeforeFrame||s.phaseFrame>=TRANSITIONS.introHiddenFromFrame);
  const lines:string[]=[];
  const hudOn=showHud&&!s.pipeLoading&&!s.pipeClearing&&!introLoading&&!s.gameoverClosing;
  const timeOn=s.phase!=='title'&&s.phase!=='intro'&&s.phase!=='gameover'&&!s.vineEntryStage&&!s.area.autoWalk&&!s.entryTimerHidden&&!s.pipePreviewArea;
  if(hudOn)lines.push(`H|${player}|${String(s.score).padStart(6,'0')}|${String(s.coins).padStart(2,'0')}|${s.level.id}|${timeOn?String(Math.max(0,s.time)).padStart(3,'0'):''}`);
  if(s.phase==='title')lines.push(`T|${s.twoPlayer?1:0}`);
  if(s.phase==='intro'&&!introLoading)lines.push(`I|${s.level.id}|${s.lives}`);
  if(s.phase==='gameover'&&!s.gameoverClosing)lines.push(`G|${s.twoPlayer?player:''}`);
  const exit=s.area.exit;let rescue='';
  if(exit?.kind==='axe'&&exit.retainerX!==undefined&&!['intro','gameover','title'].includes(s.phase)&&(s.castleStage==='message'||s.phase==='ending')){
   const elapsed=s.phase==='ending'?s.phaseFrame:s.phaseFrame-s.castleArrivalFrame;
   if(!(s.phase==='ending'&&elapsed===0)&&elapsed>=0)rescue=`R|${player}|${elapsed>=CASTLE_COMPLETION.secondMessageFrames?(s.level.id==='8-4'?2:1):0}`;
  }
  if(rescue)lines.push(rescue);
  if(hudOn||s.phase==='flag')for(const pu of s.popups)lines.push(`P|${pu.value}|${Math.round(pu.x)}|${Math.round(pu.y)}`);
  const key=lines.join('~');if(key===this.last)return key!=='';this.last=key;
  const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.canvas.width,this.canvas.height);c.setTransform(this.scale,0,0,this.scale,0,0);
  for(const l of lines){const [t,...a]=l.split('|');
   if(t==='H'){this.text(a[0],24,16);this.text(a[1],24,24);this.coin(89,23);this.text('×'+a[2],96,24);this.text('WORLD',144,16);this.text(a[3],152,24);this.text('TIME',200,16);if(a[4])this.text(a[4],208,24);}
   if(t==='T'){this.centered('SUPER MARIO BROS.',64,'#ffd84a',10);this.centered('1 PLAYER GAME',144);this.centered('2 PLAYER GAME',160);this.text('▶',72,a[0]==='1'?160:144,'#ffd84a');this.centered('©1985 NINTENDO',120,'#ffffff');this.centered('TOP- 000000',184);}
   if(t==='I'){this.text('WORLD '+a[0],88,80);this.text('×  '+a[1],120,112);}
   if(t==='G'){if(a[0])this.text(a[0],104,112);this.text('GAME OVER',88,128);}
   if(t==='P')this.text(a[0]==='1up'?'1UP':a[0],Number(a[1]),Number(a[2]),'#ffffff',6);
   if(t==='R'){this.text('THANK YOU '+a[0]+'!',40,80);if(a[1]==='1'){this.text('BUT OUR PRINCESS IS IN',20,112);this.text('ANOTHER CASTLE!',20,128);}if(a[1]==='2')this.text('YOUR QUEST IS OVER.',28,112);}
  }
  this.texture.needsUpdate=true;return key!=='';
 }
}
