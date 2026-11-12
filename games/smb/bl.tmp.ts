import fs from 'node:fs';
import {Simulation} from './src/simulation.js';
import {observedLevels} from './src/levels.js';
import {decodeEntrance,initializeEntrance} from './tools/harness/native-entrance.mjs';
import {nativeEntities,simEntities,unmatchedEntity} from './tools/harness/native-entities.js';
const T=process.env.S+'/native/traces',E='/home/kd/Desktop/proj/ghostrun/media/recordings/threejs-2d';
const names=['a','b','select','start','up','down','left','right'];
for(const L of process.argv[2].split(',')){
 const dir=`${T}/${L}`,initial=new Uint8Array(fs.readFileSync(dir+'/initial.ram')),ram=fs.readFileSync(dir+'/ram.bin'),pads=fs.readFileSync(dir+'/pads.bin');
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,JSON.parse(fs.readFileSync(`${E}/${L}/entrance.json`,'utf8'))));sim.step([],0);sim.inputs=[];
 let bad=0,tot=0,first=-1;const end=Number(process.argv[3]??99999);
 for(let f=0;f<Math.min(end,pads.length);f++){sim.step(names.filter((_,b)=>pads[f]&(1<<b)) as any,1);const r=ram.subarray(f*2048,f*2048+2048),pr=f?ram.subarray(f*2048-2048,f*2048):undefined;
  if(r[0x770]!==1||sim.level.id!==L)break;
  const n=nativeEntities(r,pr).filter(e=>e.kind==='blooper');if(!n.length)continue;tot++;
  const u=unmatchedEntity(n,simEntities(sim).filter((e:any)=>e.kind==='blooper'));if(u){bad++;if(first<0){first=f;console.log(L,'first',f,JSON.stringify(n),JSON.stringify(simEntities(sim).filter((e:any)=>e.kind==='blooper')));}}}
 console.log(L,'blooper frames',tot,'unmatched',bad);
}
