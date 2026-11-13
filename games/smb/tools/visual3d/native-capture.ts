// Paired render captures of a recorded entrance and exact pad prefix (no staged object state).
// Usage: npx tsx tools/visual3d/native-capture.ts OUT --traces=DIR --entrances=DIR LEVEL:FRAME [LEVEL:FRAME ...]
// FRAME is the number of pads applied (1-based displayed frame). V25_PORT selects the private dev server.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {openGame,savePng} from './lib.js';
import {decodeEntrance} from '../harness/native-entrance.mjs';
const args=process.argv.slice(2),out=args[0],arg=(k:string)=>args.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3);
const traces=arg('traces'),entrances=arg('entrances'),specs=args.slice(1).filter(a=>!a.startsWith('--'));
if(!out||!traces||!entrances||!specs.length)throw Error('Expected OUT --traces=DIR --entrances=DIR LEVEL:FRAME ...');
const keys=['a','b','select','start','up','down','left','right'];
const runs=await Promise.all(specs.map(async spec=>{
 const [level,n]=spec.split(':'),frame=Number(n),dir=path.join(traces,level),pads=await readFile(path.join(dir,'pads.bin'));
 if(!Number.isInteger(frame)||frame<0||frame>pads.length)throw Error(`Invalid frame: ${spec}`);
 return {level,frame,entrance:decodeEntrance(new Uint8Array(await readFile(path.join(dir,'initial.ram'))),JSON.parse(await readFile(path.join(entrances,level,'entrance.json'),'utf8'))),buttons:[...pads.subarray(0,frame)].map(b=>keys.filter((_,i)=>b&(1<<i)))};
}));
for(const view of ['orig','3d']){
 const g=await openGame({view,query:'quality=high&scale=2'});
 try{
  for(const run of runs){const img=await g.page.evaluate(async run=>{
   const w=window as any,s=w.marioDebug.simulation,{initializeEntrance}=await import('/tools/harness/native-entrance.mjs');
   w.mario.reset({playing:true});initializeEntrance(s,run.entrance);s.step([],0);s.inputs=[];
   for(const b of run.buttons)s.step(b,1,[]);w.mario.pause();w.mario.step([],0);return w.mario.observe().image;
  },run);await savePng(img,`${out}/${view}/${run.level}_${run.frame}.png`);}
  if(g.errors.length)throw Error(g.errors.join('\n'));
 }finally{await g.close();}
}
