/** Opt-in audit readout. Unlike the legacy gate, this includes birth rows, extra remake actors, six enemy slots,
 * cannon Bullet Bills, and projectile items. Unsupported native objects are coverage gaps, never successful matches. */
import {nativeVineControl,simVineControl,type NativeVineControl} from './native-strict-vines.js';
import {nativePlatformObject} from '../../src/platform-motion.js';
import type {NativeFirebarBytes} from '../../src/native-firebar.js';
import {NATIVE_ENEMY_KIND} from './native-entities.js';
export type StrictEntity={bank:'enemy'|'misc',slot:number|undefined,kind:string,x:number,y:number,source:string,state?:number,firebar?:NativeFirebarBytes,owner?:number,vine?:NativeVineControl};
export type CoverageGap={code:string,detail:string,slot?:number,id?:number};
export type EntityReadout={entities:StrictEntity[],gaps:CoverageGap[],live:number,reserved:Set<string>};
export type EntityMismatch={code:string,native?:StrictEntity,sim?:StrictEntity};
const OBJECTS:Record<number,string>={23:'bullet-cheep-frenzy-control',24:'end-frenzy-control',27:'firebar',28:'firebar',29:'firebar',30:'firebar',31:'firebar',32:'firebar',33:'firebar',34:'firebar',21:'bowser-flame',22:'firework',36:'balance-platform',37:'vertical-platform',38:'up-lift',39:'down-lift',40:'horizontal-platform',41:'falling-platform',42:'right-platform',43:'small-up-lift',44:'small-down-lift',46:'powerup',47:'vine',48:'flagpole-flag',49:'castle-flag',50:'spring',52:'warp-zone-control',53:'retainer'};
export function strictNativeEntities(r:Uint8Array,offset=0):EntityReadout{
 const entities:StrictEntity[]=[],gaps:CoverageGap[]=[],reserved=new Set<string>();let live=0;
 for(let slot=0;slot<6;slot++){
  const flag=r[0x0f+slot],id=r[0x16+slot];if(!flag)continue;live++;reserved.add(`enemy:${slot}`);
  if(flag&128){const owner=flag&127;if(owner<6&&r[0xf+owner]&&!(r[0xf+owner]&128)&&r[0x16+owner]>=27&&r[0x16+owner]<=34){entities.push({bank:'enemy',slot,kind:'firebar-alias',x:r[0x6e+slot]*256+r[0x87+slot]+offset,y:(r[0xb6+slot]-1)*256+r[0xcf+slot],source:'firebar-alias',owner});continue;}if(owner<6&&r[0xf+owner]&&!(r[0xf+owner]&128)&&r[0x16+owner]===45){entities.push({bank:'enemy',slot,kind:'bowser-rear',x:r[0x6e+slot]*256+r[0x87+slot]+offset,y:(r[0xb6+slot]-1)*256+r[0xcf+slot],source:'bowser-rear'});continue;}gaps.push({code:'native-alias',detail:`slot ${slot} aliases owner ${flag&127}; composite part position is not compared`,slot,id});continue;}
  const firebar=id>=27&&id<=34?{id,high:r[0xa0+slot],low:r[0x58+slot],speed:r[0x388+slot],direction:r[0x34+slot]}:undefined;
  const kind=firebar?'firebar':id===47?'vine':id===23?OBJECTS[23]:id===48?'flagpole-flag':id===49?'castle-flag':id===22?'firework':id===53?'retainer':id===52?'warp-zone-control':id===50?'spring':id===51?'bullet':id===21?'flame':id===46?['mushroom','flower','star','1up'][r[0x39]]:id>=36&&id<=44?OBJECTS[id]:NATIVE_ENEMY_KIND[id];
  if(firebar&&id>31)gaps.push({code:'unverified-native-firebar-id',detail:`firebar id ${id}: handler bytes are read, but initializer/geometry coverage is unverified`,slot,id});
  if(!kind){gaps.push({code:'unsupported-native-object',detail:OBJECTS[id]??`native object id ${id}`,slot,id});continue;}
  entities.push({bank:'enemy',slot,kind,x:r[0x6e+slot]*256+r[0x87+slot]+offset,y:(id===48?0:r[0xb6+slot]-1)*256+r[0xcf+slot],...(firebar?{firebar}:{}),...(id===47&&slot===5?{vine:nativeVineControl(r)}:{}),source:id===47?'vine':firebar?'firebar':id===50?'spring':id===52?'controller':id>=36&&id<=44?'platform':id===21?'flame':id===46?'powerup':'enemy',state:r[0x1e+slot]});
 }
 // Misc slots are a separate bank: bit 7 selects held/flying hammers; low states 1..47 are jumping/spinning coins.
 for(let slot=0;slot<9;slot++){
  const state=r[0x2a+slot];if(!state)continue;live++;reserved.add(`misc:${slot}`);
  const kind=state&128?'hammer':state<0x30?'coin':undefined;
  if(!kind){gaps.push({code:'unsupported-native-misc',detail:`misc slot ${slot} state ${state}`,slot});continue;}
  entities.push({bank:'misc',slot,kind,x:r[0x7a+slot]*256+r[0x93+slot]+offset,y:(r[0xc2+slot]-1)*256+r[0xdb+slot],source:kind,state});
 }
 for(let slot=0;slot<2;slot++)if(r[0x24+slot])gaps.push({code:'unsupported-native-fireball',detail:`player fireball state ${r[0x24+slot]}`,slot});
 return {entities,gaps,live,reserved};
}
/** Native IDs distinguish repeated small lifts from large lifts; a wrap
 * object without nativeId remains unresolved instead of guessing its size. */
function platformKind(sim:any,platform:any){
 const object=nativePlatformObject(platform,sim.platformMotion?.context??{levelId:sim.level?.id??'',areaId:sim.area.id??''});
 if(!object)return;
 const id=object.nativeId??({balance:36,lift:37,horizontal:40,drop:41} as Record<string,number>)[object.kind];
 return id>=36&&id<=44?OBJECTS[id]:undefined;
}
export function strictSimEntities(sim:any):StrictEntity[]{
 const entities:StrictEntity[]=sim.enemies.filter((e:any)=>e.active&&e.dead<90).map((e:any)=>({bank:'enemy',slot:e.enemySlot,kind:e.kind,x:Math.floor(e.kind==='bowser'?(e.nativeBowser?.x??e.bowser?.anchor??e.x):e.x),y:Math.floor(e.y)-(e.kind==='bowser'?32:24),source:'enemy'}));
 for(const e of sim.enemies)if(e.active&&e.dead<90&&e.nativeBowser?.rearSlot!==undefined){const b=e.nativeBowser;entities.push({bank:'enemy',slot:b.rearSlot,kind:'bowser-rear',x:b.rearX??((Math.floor(b.x)&~255)|((Math.floor(b.x)+(b.direction&1?-16:16))&255)),y:b.rearY??((Math.floor(b.y)+8)&255),source:'bowser-rear'});}
 for(const [platform,slot] of sim.platformSlots??[]){
  const kind=platformKind(sim,platform);if(!kind)continue;
  const position=sim.platformMotion.collisionPosition(platform,sim.platformFrame);
  entities.push({bank:'enemy',slot,kind,x:Math.floor(position.x),y:Math.floor(position.y),source:'platform'});
 }
 if(typeof sim.firebarSlots?.nativeBytes==='function'){
  for(const bar of sim.area.firebars??[]){const slot=sim.firebarSlots.slotOf(bar),firebar=sim.firebarSlots.nativeBytes(bar);if(slot===undefined||!firebar)continue;
   entities.push({bank:'enemy',slot,kind:'firebar',x:Math.floor(bar.x)-4,y:Math.floor(bar.y)-4,source:'firebar',state:0,firebar});
  }
  if(typeof sim.firebarSlots.aliasStates==='function')for(const alias of sim.firebarSlots.aliasStates())entities.push({bank:'enemy',slot:alias.slot,kind:'firebar-alias',x:alias.x,y:alias.y,owner:alias.owner,source:'firebar-alias'});
 }
 if(typeof sim.springCompression==='function')for(const [spring,slot]of sim.springSlots??[])entities.push({bank:'enemy',slot,kind:'spring',x:Math.floor(spring.x),y:spring.y-24+sim.springCompression(spring)*8,source:'spring'});
 for(const controller of sim.frenzyControllers??[])if(controller.id===52&&controller.slot!==undefined&&!controller.lost)entities.push({bank:'enemy',slot:controller.slot,kind:'warp-zone-control',x:Math.floor(controller.x??controller.column),y:controller.y,source:'controller',state:0});
 for(const c of sim.frenzyControllers??[])if(c.id===23&&c.slot!==undefined)entities.push({bank:'enemy',slot:c.slot,kind:OBJECTS[23],x:Math.floor(c.x??c.column),y:c.y,source:'controller',state:0});

 const pole=sim.specialSlot5;if(pole?.flag&&pole.id===47)entities.push({bank:'enemy',slot:5,kind:'vine',x:Math.floor(pole.x),y:(pole.yHigh-1)*256+pole.y,source:'vine',vine:simVineControl(pole)});if(pole?.flag&&pole.id===23)entities.push({bank:'enemy',slot:5,kind:OBJECTS[23],x:Math.floor(pole.x),y:(pole.yHigh-1)*256+pole.y,source:'controller',state:0});if(pole?.flag&&pole.id===48)entities.push({bank:'enemy',slot:5,kind:'flagpole-flag',x:Math.floor(pole.x),y:Math.floor(sim.phase==='flag'?sim.flagTop:pole.y),source:'flagpole-flag'});
 const flag=sim.nativeCastleFlag;if(flag)entities.push({bank:'enemy',slot:flag.slot,kind:'castle-flag',x:Math.floor(flag.x),y:flag.y,source:'castle-flag',state:flag.task>=2?flag.state:undefined});
 for(const f of sim.nativeFireworks??[])if(f.active)entities.push({bank:'enemy',slot:f.slot,kind:'firework',x:Math.floor(f.x),y:f.y,source:'firework',state:0});
 for(const item of sim.items){
  if(item.life<=0)continue;
  if(item.kind==='flame')entities.push({bank:'enemy',slot:item.nativeFlame?.slot,kind:'flame',x:Math.floor(item.x),y:Math.floor(item.y),source:'flame'});
  if(item.kind==='hammer'||item.kind==='coin'){const misc=item.nativeHammer??item.nativeCoin;entities.push({bank:'misc',slot:misc?.slot,kind:item.kind,x:Math.floor(item.x),y:Math.floor(item.y),source:item.kind,state:misc?.state});}
  if(['mushroom','flower','star','1up'].includes(item.kind))entities.push({bank:'enemy',slot:5,kind:item.kind,x:Math.floor(item.x),y:Math.floor(item.y)-8,source:'powerup',state:item.nativePowerState});
 }
 const retainer=sim.castleRetainer;if(retainer)entities.push({bank:'enemy',slot:retainer.slot,kind:'retainer',x:retainer.x,y:retainer.y,source:'retainer'});
 return entities;
}
/** Native slot identity prevents a nearby identical enemy from hiding a missing or misplaced actor. */
export function strictEntityDifferences(native:EntityReadout,sim:StrictEntity[]):{mismatches:EntityMismatch[],gaps:CoverageGap[]}{
 const pool=[...sim],mismatches:EntityMismatch[]=[],gaps=[...native.gaps];
 for(const n of native.entities){
  const i=pool.findIndex(s=>s.bank===n.bank&&s.slot===n.slot);
  if(i<0){mismatches.push({code:'missing',native:n});continue;}
  const s=pool.splice(i,1)[0];
  if(n.kind!==s.kind)mismatches.push({code:'kind',native:n,sim:s});
  else if(n.x!==s.x||n.y!==s.y)mismatches.push({code:'position',native:n,sim:s});
  if(s.state!==undefined&&n.state!==undefined&&s.state!==n.state)mismatches.push({code:'state',native:n,sim:s});
  if(n.kind==='firebar'&&s.kind==='firebar'){
   if(!s.firebar)gaps.push({code:'unsupported-sim-firebar-phase',detail:'firebar raw A0/58/speed/direction readout unavailable',slot:s.slot});
   else if(n.firebar)for(const key of ['id','high','low','speed','direction'] as const)if(n.firebar[key]!==s.firebar[key])mismatches.push({code:`firebar.${key}`,native:n,sim:s});
  }
  if(n.kind==='vine'&&s.kind==='vine'&&n.slot===5){
   if(!s.vine)gaps.push({code:'unsupported-sim-vine-control',detail:'vine0398/0399/039A/039D state unavailable',slot:5});
   else if(n.vine)for(const key of ['count','height','startY','slots'] as const)if(JSON.stringify(n.vine[key])!==JSON.stringify(s.vine[key]))mismatches.push({code:`vine.${key}`,native:n,sim:s});
  }
  if(n.kind==='firebar-alias'&&s.kind==='firebar-alias'&&n.owner!==s.owner)mismatches.push({code:'alias.owner',native:n,sim:s});
 }
 for(const s of pool){
  if(s.slot===undefined){gaps.push({code:'unassigned-sim-slot',detail:`${s.kind} has no native slot`,slot:s.slot});mismatches.push({code:'extra',sim:s});}
  else if(!native.reserved.has(`${s.bank}:${s.slot}`)||native.entities.some(n=>n.bank===s.bank&&n.slot===s.slot))mismatches.push({code:'extra',sim:s});
  else gaps.push({code:'unsupported-slot-counterpart',detail:`${s.kind} occupies a native slot whose object readout is unsupported`,slot:s.slot});
 }
 return {mismatches,gaps};
}

/** Static/runtime model objects without position adapters must also prevent a false complete-coverage result. */
export function strictSimCoverage(sim:any):CoverageGap[]{
 const gaps:CoverageGap[]=[];
 for(const platform of sim.area.platforms??[])if(!platformKind(sim,platform)||!sim.platformSlots||!sim.platformMotion)gaps.push({code:'unsupported-sim-platform',detail:`platform at ${platform.x},${platform.y}: native object identity or slot/position adapter unavailable`});
 for(const bar of sim.area.firebars??[])if(typeof sim.firebarSlots?.nativeBytes!=='function'||typeof sim.firebarSlots.slotOf!=='function'||typeof sim.firebarSlots.aliasStates!=='function'||typeof sim.firebarSlots.tracks!=='function'||!sim.firebarSlots.tracks(bar))gaps.push({code:'unsupported-sim-object-family',detail:`firebar at ${bar.x},${bar.y}: slot/raw phase/alias registry unavailable`});
 const vine=sim.specialSlot5;
 if(sim.area.vines?.length&&!simVineControl(vine))gaps.push({code:'unsupported-sim-object-family',detail:'vine: native activation/position registry unavailable'});
 if(vine?.flag&&vine.id===47){
  gaps.push({code:'unsupported-sim-vine-state',detail:'Setup_Vine retains Enemy_State; raw state is not modelled',slot:5,id:47});
  for(const slot of vine.vineSlots??[])if(slot!==5&&!sim.erasedVineSlots?.has(slot))gaps.push({code:'unsupported-sim-vine-segment',detail:'secondary Setup_Vine raw Block_* anchor and retained slot state unavailable',slot,id:47});
 }else if(sim.vines?.some((v:any)=>v.height>0||v.growing))gaps.push({code:'unsupported-sim-vine-activation',detail:'visible/growing model vine has no live native slot5 owner'});
 for(const spring of sim.area.springs??[])if(spring.nativeColumn===undefined||spring.nativeOffset===undefined||!sim.springSlots||typeof sim.springCompression!=='function')gaps.push({code:'unsupported-sim-object-family',detail:`spring at ${spring.x},${spring.y}: native parser identity or slot/compression adapter missing`});
 if(sim.area.exit?.kind==='flag'&&!sim.specialSlot5)gaps.push({code:'unsupported-sim-object-family',detail:'flagpole/castle flag slot registry missing'});
 if(sim.flagFireworks?.length&&!Array.isArray(sim.nativeFireworks))gaps.push({code:'unsupported-sim-object-family',detail:'fireworks normal-slot registry missing'});
 if(sim.items.some((i:any)=>i.kind==='fireball'&&i.life>0))gaps.push({code:'unsupported-sim-fireball',detail:'player fireball position adapter missing'});
 return gaps;
}
