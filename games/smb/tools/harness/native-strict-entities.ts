/** Opt-in audit readout. Unlike the legacy gate, this includes birth rows, extra remake actors, six enemy slots,
 * cannon Bullet Bills, and projectile items. Unsupported native objects are coverage gaps, never successful matches. */
import {NATIVE_ENEMY_KIND} from './native-entities.js';
export type StrictEntity={bank:'enemy'|'misc',slot:number|undefined,kind:string,x:number,y:number,source:string,state?:number};
export type CoverageGap={code:string,detail:string,slot?:number,id?:number};
export type EntityReadout={entities:StrictEntity[],gaps:CoverageGap[],live:number,reserved:Set<string>};
export type EntityMismatch={code:string,native?:StrictEntity,sim?:StrictEntity};
const OBJECTS:Record<number,string>={23:'bullet-cheep-frenzy-control',24:'end-frenzy-control',27:'firebar',28:'firebar',29:'firebar',30:'firebar',31:'firebar',32:'firebar',33:'firebar',34:'firebar',21:'bowser-flame',22:'firework',36:'balance-platform',37:'vertical-platform',38:'up-lift',39:'down-lift',40:'horizontal-platform',41:'falling-platform',42:'right-platform',43:'small-up-lift',44:'small-down-lift',46:'powerup',47:'vine',48:'flagpole-flag',49:'castle-flag',50:'spring',53:'retainer'};
export function strictNativeEntities(r:Uint8Array,offset=0):EntityReadout{
 const entities:StrictEntity[]=[],gaps:CoverageGap[]=[],reserved=new Set<string>();let live=0;
 for(let slot=0;slot<6;slot++){
  const flag=r[0x0f+slot],id=r[0x16+slot];if(!flag)continue;live++;reserved.add(`enemy:${slot}`);
  if(flag&128){gaps.push({code:'native-alias',detail:`slot ${slot} aliases owner ${flag&127}; composite part position is not compared`,slot,id});continue;}
  const kind=id===51?'bullet':id===21?'flame':id===46?['mushroom','flower','star','1up'][r[0x39]]:NATIVE_ENEMY_KIND[id];
  if(!kind){gaps.push({code:'unsupported-native-object',detail:OBJECTS[id]??`native object id ${id}`,slot,id});continue;}
  entities.push({bank:'enemy',slot,kind,x:r[0x6e+slot]*256+r[0x87+slot]+offset,y:(r[0xb6+slot]-1)*256+r[0xcf+slot],source:id===21?'flame':id===46?'powerup':'enemy',state:r[0x1e+slot]});
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
export function strictSimEntities(sim:any):StrictEntity[]{
 const entities:StrictEntity[]=sim.enemies.filter((e:any)=>e.active&&e.dead<90).map((e:any)=>({bank:'enemy',slot:e.enemySlot,kind:e.kind,x:Math.floor(e.kind==='bowser'?(e.nativeBowser?.x??e.bowser?.anchor??e.x):e.x),y:Math.floor(e.y)-(e.kind==='bowser'?32:24),source:'enemy'}));
 for(const item of sim.items){
  if(item.life<=0)continue;
  if(item.kind==='flame')entities.push({bank:'enemy',slot:item.nativeFlame?.slot,kind:'flame',x:Math.floor(item.x),y:Math.floor(item.y),source:'flame'});
  if(item.kind==='hammer'||item.kind==='coin'){const misc=item.nativeHammer??item.nativeCoin;entities.push({bank:'misc',slot:misc?.slot,kind:item.kind,x:Math.floor(item.x),y:Math.floor(item.y),source:item.kind,state:misc?.state});}
  if(['mushroom','flower','star','1up'].includes(item.kind))entities.push({bank:'enemy',slot:5,kind:item.kind,x:Math.floor(item.x),y:Math.floor(item.y)-8,source:'powerup',state:item.nativePowerState});
 }
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
 for(const [kind,objects] of [['platform',sim.area.platforms],['firebar',sim.area.firebars],['spring',sim.area.springs],['vine',sim.area.vines]] as const)
  if(objects?.length)gaps.push({code:'unsupported-sim-object-family',detail:`${kind}: ${objects.length} declared area objects; activation/position adapter missing`});
 if(sim.area.exit?.kind==='flag')gaps.push({code:'unsupported-sim-object-family',detail:'flagpole/castle flags: activation and position adapters missing'});
 if(sim.flagFireworks?.length)gaps.push({code:'unsupported-sim-object-family',detail:'fireworks: enemy-slot position adapter missing'});
 if(sim.items.some((i:any)=>i.kind==='fireball'&&i.life>0))gaps.push({code:'unsupported-sim-fireball',detail:'player fireball position adapter missing'});
 return gaps;
}
