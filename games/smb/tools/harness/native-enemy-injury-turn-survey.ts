/** One genuine cold-start World1-1 prefix; independent STATE rows, no reseeds. */
import {createHash}from'node:crypto';import{gunzipSync}from'node:zlib';import{Simulation}from'../../src/simulation.js';import{observedLevels}from'../../src/levels.js';import{captureLiveWorld1State,compareLiveWorld1Start,LiveWorld1StateAudit}from'./native-continuous-state.js';import data from'../../tests/fixtures/native-enemy-injury-turn-visit.json';
export function surveyEnemyInjuryTurn(){
 const unpack=(key:'initial'|'ram'|'pads')=>{const b=gunzipSync(Buffer.from(data[key],'base64'));if(createHash('sha256').update(b).digest('hex')!==data[`${key}Sha256`])throw Error('native source hash mismatch');return b;},ram=unpack('ram'),pads=unpack('pads'),sim:any=new Simulation(observedLevels());sim.reset(false);
 const initial=compareLiveWorld1Start(unpack('initial'),captureLiveWorld1State(sim,true)),audit=new LiveWorld1StateAudit(),counts={match:0,mismatch:0,unchecked:0},fields:Record<string,number>={},gaps:Record<string,number>={},turnRows:any[]=[],bodyCounts={match:0,mismatch:0,unchecked:0},bodyFields:Record<string,number>={};let first:any,bodyFirstMismatch:any,hitFrame:number|undefined,bodyEnded=false;
 const names=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<pads.length;f++){
  sim.step(names.filter((_,i)=>pads[f]>>i&1),1);const r=ram.subarray(f*2048,(f+1)*2048),check=audit.compare(r,captureLiveWorld1State(sim));counts[check.status]++;if(check.status!=='match')first??={frame:f,...check};for(const d of check.differences)fields[d.field]=(fields[d.field]??0)+1;for(const g of check.gaps)gaps[g]=(gaps[g]??0)+1;
  if(hitFrame===undefined&&r[14]===11&&(f===0||ram[(f-1)*2048+14]!==11))hitFrame=f;
  if(hitFrame!==undefined&&!bodyEnded){
   if(!r[0x10]||r[0x17]!==6)bodyEnded=true;
   else{const e=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.enemySlot===1),native={x:r[0x6f]*256+r[0x88]+r[0x402]/256,speed:r[0x59],direction:r[0x47]},model=e?{x:e.x,speed:Math.round(e.vx*16)&255,direction:e.vx===0?(e.direction===1?1:2):e.vx>0?1:2}:null;
    if(JSON.stringify(native)===JSON.stringify(model))bodyCounts.match++;else{bodyCounts.mismatch++;for(const k of ['x','speed','direction'] as const)if(native[k]!==model?.[k])bodyFields[k]=(bodyFields[k]??0)+1;bodyFirstMismatch??={frame:f,native,model};}
   }
  }
  if(f>=524&&f<=529){const e=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.enemySlot===1);turnRows.push({frame:f,native:{x:r[0x6f]*256+r[0x88]+r[0x402]/256,speed:r[0x59],direction:r[0x47],held:Boolean(r[0x747])},sim:e?{x:e.x,speed:Math.round(e.vx*16)&255,direction:e.vx===0?(e.direction===1?1:2):e.vx>0?1:2,held:sim.nativeTimersStopped}:null});}
 }
 return {role:data.role,sourceInputSha256:data.sourceInputSha256,frames:pads.length,world11Frames:data.world11Frames,initial,counts,fields,gaps,first,hitFrame,bodyCounts,bodyFields,bodyFirstMismatch,turnRows};
}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(surveyEnemyInjuryTurn(),null,2));
