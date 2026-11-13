/** Continuous ID49/level-end audit from retained entrance. Earlier gameplay divergence is never reset. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import type {Button} from '../../src/types.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';import {nativeAreaLoads} from './native-area-identity.js';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
export function auditFlag(dir:string,receipts:string,level:string){
 const initial=fs.readFileSync(path.join(dir,level,'initial.ram')),pads=fs.readFileSync(path.join(dir,level,'pads.bin')),ram=fs.readFileSync(path.join(dir,level,'ram.bin'));
 return auditFlagBuffers(initial,pads,ram,JSON.parse(fs.readFileSync(path.join(receipts,level,'entrance.json'),'utf8')),level);
}
export function auditFlagBuffers(initial:Uint8Array,pads:Uint8Array,ram:Uint8Array,receipt:unknown,level:string){
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,receipt));sim.inputs=[];
 const visits=nativeAreaLoads(sim.level,ram).loads,fields:Record<string,number|null>={},samples:unknown[]=[];let visit=-1,rows=0,firstBorn:number|null=null;
 const check=(f:number,k:string,n:unknown,s:unknown)=>{fields[k]??=null;if(JSON.stringify(n)!==JSON.stringify(s)&&fields[k]===null){fields[k]=f;samples.push({frame:f,field:k,native:n,sim:s});}};
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);while(visit+1<visits.length&&visits[visit+1].frame<=f)visit++;
  const nativeLevel=`${r[0x75f]+1}-${r[0x75c]+1}`;if(nativeLevel!==level){if(firstBorn!==null)check(f,'level',nativeLevel,sim.level.id);break;}
  let slot=-1;for(let s=0;s<6;s++)if(r[0xf+s]===1&&r[0x16+s]===49)slot=s;
  if(slot<0)continue;rows++;firstBorn??=f;const flag=sim.nativeCastleFlag,offset=visits[visit]?.offset;
  check(f,'level',nativeLevel,sim.level.id);check(f,'owned',true,Boolean(flag));check(f,'slot',slot,flag?.slot);check(f,'task',r[0x746],flag?.task);
  if(offset!==undefined){check(f,'x',r[0x6e+slot]*256+r[0x87+slot]+offset,flag?.x);check(f,'camera',r[0x71a]*256+r[0x71c]+offset,Math.floor(sim.camera));check(f,'playerX',r[0x6d]*256+r[0x86]+offset,Math.floor(sim.player.x));check(f,'playerY',(r[0xb5]-1)*256+r[0xce]+32,Math.floor(sim.player.y));}
  check(f,'y',r[0xcf+slot],flag?.y);if(r[0x746]>=4)check(f,'interval',r[0x796+slot],flag?.interval);check(f,'frenzyTimer',r[0x78f],sim.nativeFrenzyTimer);
  if(r[0x746]>=2){check(f,'state',r[0x1e+slot],flag?.state);check(f,'fireworks',r[0x6d7],sim.nativeFireworksCounter);}
  if(r[14]===5){check(f,'music',r[0x7b1],sim.nativeEndLevelMusic.eventMusicBuffer);for(const [name,a,b]of [['counter',0x7b4,'counter'],['length',0x7b3,'length'],['offset',0xf7,'offset']] as const)if(r[0x7b1]===32)check(f,`music.${name}`,r[a],sim.nativeEndLevelMusic[b]);}
 }
 return {level,rows,firstBorn,fields,samples,status:!rows?'not-reached':Object.values(fields).some(v=>v!==null)?'diverged':'pass'};
}
if(import.meta.url===`file://${process.argv[1]}`){const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},levels:{type:'string'},json:{type:'string'}}});if(!a.traces||!a.entrances)throw Error('--traces and --entrances required');const reports=(a.levels?.split(',')??Array.from({length:32},(_,i)=>`${Math.floor(i/4)+1}-${i%4+1}`)).map(l=>auditFlag(a.traces!,a.entrances!,l));if(a.json)fs.writeFileSync(a.json,JSON.stringify(reports,null,1)+'\n');for(const r of reports)console.log(`${r.level} ${r.status} rows=${r.rows} ${JSON.stringify(r.fields)}`);}
