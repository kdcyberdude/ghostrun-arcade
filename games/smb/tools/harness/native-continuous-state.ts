/** Read-only live browser adapter. Native bytes never enter the model or initializer.
 * Default World1-1, optional World1-2; unsupported controls and missing source ownership stay unchecked. */
import {nativeAreaBindings,type AreaBinding} from '../../src/native-area-catalog.js';
import {strictNativeEntities,strictSimEntities,strictSimCoverage,strictEntityDifferences,type StrictEntity,type CoverageGap} from './native-strict-entities.js';
export type LiveControl={mode?:number;task?:number;engine?:number;screen?:number;disable?:number;timer?:number;columns?:number;initializing?:boolean;unsupported?:string};
export type LiveWorld1State={level:string;area:string;phase:string;main:string;areas:{id:string;width:number}[];bindings:AreaBinding[];bindingGaps:string[];physicalScene?:{level:string;area:string;bindings:AreaBinding[]};startup?:LiveControl;screen?:LiveControl;coldRam?:number[];loadReady:boolean;parserColumnX?:number;scrollLocked?:boolean;frameCounter:number;interval:number;random:number[];dead:boolean;time:number;score:number;coins:number;cam:number;x:number;y:number;entities:StrictEntity[];entityGaps:CoverageGap[]};
export type LiveStateCheck={status:'match'|'mismatch'|'unchecked';scope:string;checked:string[];gaps:string[];differences:{field:string;native:unknown;model:unknown}[]};
/** The level/death load objects are source GameMode1 routines, not phase guesses. */
export function liveScreenControl(sim:any):LiveControl|undefined{
 const n=sim.nativeScreen;if(!n)return;
 return {...n,...(n===sim.levelLoad||n===sim.deathLoad?.state?{mode:1}:{})};
}
/** Called inside page.evaluate, without native RAM, previous/future samples or a reset. */
export function captureLiveWorld1State(sim:any,initial=false):LiveWorld1State{
 const binding=nativeAreaBindings(sim.level);
 const sceneLevel=sim.levels.find((l:any)=>l.areas.includes(sim.mazeSource)),physicalScene=sceneLevel?{level:sceneLevel.id,area:sim.mazeSource.id,bindings:nativeAreaBindings(sceneLevel).bindings.filter(b=>b.area===sim.mazeSource.id)}:undefined;
 const control=(n:any):LiveControl|undefined=>n?{mode:n.mode,task:n.task,engine:n.engine,screen:n.screen,disable:n.disable,timer:n.timer,columns:n.columns,initializing:n.initializing,unsupported:n.unsupported}:undefined;
 return {coldRam:initial&&sim.nativeColdRam?Array.from(sim.nativeColdRam):undefined,level:sim.level.id,area:sim.area.id,phase:sim.phase,main:sim.level.main,physicalScene,areas:sim.level.areas.map((a:any)=>({id:a.id,width:a.width})),bindings:binding.bindings,bindingGaps:binding.diagnostics,startup:control(sim.nativeStartup),screen:control(liveScreenControl(sim)),loadReady:!sim.levelLoad&&sim.phase==='play'&&!sim.powerChange&&!sim.pipeRising&&!sim.entryControlLocked&&!sim.area.autoWalk,parserColumnX:sim.parserColumnX,scrollLocked:sim.areaControls?.locked,frameCounter:sim.random.frame,interval:sim.intervalControl,random:[...sim.random.bytes],dead:['dying','gameover'].includes(sim.phase),time:sim.time,score:sim.score,coins:sim.coins,cam:Math.floor(sim.camera),x:Math.floor(sim.player.x),y:Math.floor(sim.player.y)-32,entities:strictSimEntities(sim),entityGaps:strictSimCoverage(sim)};
}
const controlAddresses={mode:0x770,task:0x772,engine:0xe,screen:0x73c,disable:0x774} as const;
function checks(scope:string){
 const out:LiveStateCheck={status:'unchecked',scope,checked:[],gaps:[],differences:[]};
 const check=(field:string,native:unknown,model:unknown)=>{if(model===undefined){out.gaps.push('unowned:'+field);return;}out.checked.push(field);if(JSON.stringify(native)!==JSON.stringify(model))out.differences.push({field,native,model});};
 const finish=()=>{out.status=out.differences.length?'mismatch':out.gaps.length?'unchecked':'match';return out;};return {out,check,finish};
}
/** Verify the declared cold start before the first input; absence is never success.
 * This establishes only the supported boot-control contract, not all2048 RAM bytes. */
export function compareLiveWorld1Start(initial:Uint8Array,model:LiveWorld1State):LiveStateCheck{
 const {out,check,finish}=checks('cold-recorded-start');
 if(initial.length!==2048||!initial.every(v=>v===255)){out.gaps.push('unsupported-native-cold-start');return finish();}
 if(model.startup?.unsupported){out.gaps.push(model.startup.unsupported);return finish();}
 if(model.coldRam){check('cold.RAM',Array.from(initial),model.coldRam);return finish();}
 if(!model.startup){out.gaps.push('source-startup-owner-unavailable');return finish();}
 check('initializing',true,model.startup.initializing);
 for(const [key,address]of Object.entries(controlAddresses))check(key,initial[address],model.startup[key as keyof LiveControl]);
 check('frameCounter',initial[9],model.frameCounter);check('interval',initial[0x77f],model.interval);check('random',Array.from(initial.subarray(0x7a7,0x7ae)),model.random);return finish();
}
/** Maintains only native scene-identity context, never model state or a fitted origin. */
export class LiveWorld1StateAudit{
 private binding?:AreaBinding;private previousTask=-1;private previousPtr=-1;
 private readonly multi:boolean;
 constructor(private readonly levels:readonly string[]=['1-1']){this.multi=levels.some(l=>l!=='1-1');}
 compare(raw:Uint8Array,model:LiveWorld1State):LiveStateCheck{
  const mode=raw[0x770],level=`${raw[0x75f]+1}-${raw[0x75c]+1}`,{out,check,finish}=checks(mode===0?'boot-title':this.multi?'world'+level:'world1-1');
  if(raw.length!==2048){out.gaps.push('native-row-length');return finish();}
  if(model.startup?.unsupported&&!model.screen){out.gaps.push(model.startup.unsupported);return finish();}
  if(mode===0||mode===255){
   const control=model.startup??model.screen;
   if(!control){out.gaps.push('source-startup-owner-unavailable');return finish();}
   for(const [key,address]of Object.entries(controlAddresses))check('startup.'+key,raw[address],control[key as keyof LiveControl]);
   check('frameCounter',raw[9],model.frameCounter);check('interval',raw[0x77f],model.interval);check('random',Array.from(raw.subarray(0x7a7,0x7ae)),model.random);return finish();
  }
  const selected=this.levels.includes(level),contextOnly=!selected&&this.multi;
  if(!selected&&!contextOnly){out.gaps.push('outside-world1-1');return finish();}
  if(selected)check('level',level,model.level);
  const ptr=raw[0xe7]+256*raw[0xe8],task=raw[0x772];
  if(!this.binding||ptr!==this.previousPtr||task===1&&this.previousTask===0){
   const page=raw[0x71a],candidates=model.bindings.filter(b=>b.data===ptr&&page*256+b.offset>=0&&page*256+b.offset<(model.areas.find(a=>a.id===b.area)?.width??0)),exact=candidates.filter(b=>b.entryPage===page),selected=exact.length===1?exact:candidates;
   this.binding=selected.length===1?selected[0]:undefined;
  }
  this.previousPtr=ptr;this.previousTask=task;
  if(contextOnly){out.gaps.push('outside-selected-levels:'+level);return finish();}
  if(mode!==1&&mode!==3){out.gaps.push('unsupported-world'+level+'-control-mode:'+mode);return finish();}
  check('frameCounter',raw[9],model.frameCounter);check('interval',raw[0x77f],model.interval);check('random',Array.from(raw.subarray(0x7a7,0x7ae)),model.random);
  check('load.ready',mode===1&&raw[0x772]===3&&raw[14]===8,model.loadReady);
  const loadPhase=mode===3||raw[0x772]<3||raw[14]===0||model.screen!==undefined;
  if(loadPhase){
   const control=model.screen??model.startup;
   if(!control)out.gaps.push('source-load-control-owner-unavailable');
   else{
    for(const [key,address]of Object.entries(controlAddresses))check('load.'+key,raw[address],control[key as keyof LiveControl]);
    check('load.timer',raw[0x7a0],control.timer);check('load.columns',raw[0x71e],control.columns);
   }
   if(this.binding)check('load.parserColumn',raw[0x725]*256+raw[0x726]*16+this.binding.offset,model.parserColumnX);
   check('load.scrollLocked',Boolean(raw[0x723]),model.scrollLocked);
  }
  for(const key of model.bindingGaps)out.gaps.push('native-binding:'+key);
  if(!this.binding){out.gaps.push('unresolved-native-area');return finish();}
  check('area',this.binding.area,model.area);
  const digits=(a:number,n:number)=>Array.from(raw.subarray(a,a+n)).reduce((s,v)=>10*s+v,0);
  check('dead',raw[14]===6||raw[14]===11,model.dead);check('time',digits(0x7f8,3),model.time);check('score',digits(0x7dd,6)*10,model.score);check('coins',raw[0x75e],model.coins);
  if(model.area!==this.binding.area||model.level!==level){out.gaps.push('scene-ownership-mismatch');return finish();}
  if(this.multi){
   if(!model.physicalScene){out.gaps.push('model-physical-scene-unavailable');return finish();}
   if(!model.physicalScene.bindings.some(b=>b.data===ptr&&b.offset===this.binding!.offset)){out.gaps.push('post-level-scene-ownership-mismatch');return finish();}
  }
  check('cam',raw[0x71a]*256+raw[0x71c]+this.binding.offset,((model.cam-this.binding.offset)&65535)+this.binding.offset); // ScreenLeft is a 16-bit page/x pair: a camera wound back before 0 (4-4 maze loop) reads 65536 less, as in native-strictcheck('x',raw[0x6d]*256+raw[0x86]+this.binding.offset,model.x);check('y',(raw[0xb5]-1)*256+raw[0xce],model.y);
  const native=strictNativeEntities(raw,this.binding.offset),difference=strictEntityDifferences(native,model.entities);
  out.checked.push('entities.slot-kind-position-cardinality');out.gaps.push(...[...difference.gaps,...model.entityGaps].map(g=>g.code+':'+g.detail));
  for(const d of difference.mismatches)out.differences.push({field:'entities.'+d.code,native:d.native,model:d.sim});return finish();
 }
}
