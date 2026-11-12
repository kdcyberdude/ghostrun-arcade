// Experimental 3D presentation of the unchanged Simulation. Selected with ?view=3d (see main.ts); never mutates the simulation.
import * as THREE from 'three';
import type {Simulation} from '../simulation.js';
import {Atmosphere,type Quality} from './atmosphere.js';
import {Kit} from './kit.js';
import {World,TILE_MODELS} from './world.js';
import {Entities,ACTOR_MODELS} from './entities.js';
import {Hud} from './hud.js';
import {Props} from './props.js';
import {NES_W,NES_H} from './coords.js';
import {loadImpostors} from './nature.js';
import {IntroAvatar} from './avatar.js';
import {TRANSITIONS} from '../simulation.js';
const query=new URLSearchParams(location.search);
/** Output heights (16:15 game frame): 0.5K (480p), 1K (960p), 2K (1440p), 4K (2160p). `?res=` picks one at load (older 960p/1080p links still work), `?scale=` too. */
export const RESOLUTIONS:Record<string,number>={'0.5K':480,'1K':960,'960p':960,'1080p':1080,'2K':1440,'4K':2160};
export class Renderer3D{
 private gl:THREE.WebGLRenderer;private atmosphere:Atmosphere;private kit=new Kit();private world!:World;private entities!:Entities;private hud:Hud;private props=new Props();private avatar?:IntroAvatar;scale:number;
 constructor(private canvas:HTMLCanvasElement){
  const res=RESOLUTIONS[query.get('res')??''];this.scale=res?res/NES_H:Number(query.get('scale')??4);
  this.gl=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,preserveDrawingBuffer:import.meta.env.DEV,powerPreference:'high-performance'});
  this.gl.info.autoReset=false;
  this.atmosphere=new Atmosphere(this.gl,NES_W*this.scale,NES_H*this.scale,(['ultra','low'].includes(query.get('quality')??'')?query.get('quality'):'high') as Quality);
  this.hud=new Hud(this.scale);
  if(import.meta.env.DEV)(window as unknown as {render3d:Renderer3D}).render3d=this;
 }
 /** Internal render resolution by output height; gameplay and timing are unaffected (the simulation never sees the renderer). */
 setQuality(quality:Quality){this.atmosphere.setQuality(quality);}
 setResolution(height:number){this.scale=height/NES_H;this.atmosphere.resize(NES_W*this.scale,height);this.hud.resize(this.scale);}
 async load(){
  await Promise.all([this.kit.load([...TILE_MODELS,...ACTOR_MODELS]),this.hud.load(),this.atmosphere.loadSkies(),loadImpostors()]);
  this.world=new World(this.kit);this.entities=new Entities(this.kit,query.has('debug'));
  this.atmosphere.scene.add(this.world.group,this.entities.group,this.props.group);
  this.avatar=new IntroAvatar(this.kit);
 }
 render(s:Simulation){
  this.gl.info.reset();
  const camPx=Math.floor(s.camera);const black=['intro','gameover'].includes(s.phase)||s.pipeLoading;
  this.atmosphere.setTheme(s.area.theme,s.area.id);
  this.world.group.visible=this.entities.group.visible=this.props.group.visible=!black;
  this.atmosphere.setBlackout(black);
  this.atmosphere.place(camPx);
  if(!black){this.world.sync(s,camPx);this.entities.sync(s,camPx);this.props.sync(s);}
  this.atmosphere.render();
  // Same visibility rule as the HUD's lives screen.
  if(s.phase==='intro'&&!(!s.introFromGameover&&s.phaseFrame<TRANSITIONS.introHiddenBeforeFrame||s.phaseFrame>=TRANSITIONS.introHiddenFromFrame))this.avatar?.render(this.gl,s.frame,Boolean(s.currentPlayer));
  if(this.hud.draw(s,true)){this.gl.autoClear=false;this.gl.clearDepth();this.gl.render(this.hud.scene,this.hud.camera);this.gl.autoClear=true;}
 }
 /** What is still drawn by stand-ins (honest coverage reporting; read by tools/visual3d). */
 coverage(){return {missingModels:[...this.kit.missing].sort(),unmappedTiles:[...this.world.unmapped].sort((a,b)=>a-b),standIns:[...this.entities.standIns].sort()};}
 /** Renderer statistics of the last frame (for tools/visual3d/perf.ts). */
 stats(){const i=this.gl.info;return {calls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures};}
 screenshot(){return this.canvas.toDataURL('image/png');}
}
