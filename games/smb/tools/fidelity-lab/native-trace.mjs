/** Trace-only native replay: drive the reference process with a list of [mask, frames] controller actions and record the
 * decoded read-only observer per native frame (no images retained by this tool). Development measurement only.
 * Usage: node tools/fidelity-lab/native-trace.mjs --actions data/observed-winning-inputs.json --out file.jsonl [--limit N]
 * Each line: {i, world, stage, x, y, vx (signed speed byte*256+fraction), vy, engine, mode, task, ram}. Sample i is the state after
 * i+1 frames. `ram` holds the raw bytes of the ranges listed in --ram (default none), for read-only validation of tentative
 * state roles such as enemy slots; their meanings are inferred by comparison with the remake, not taken from the game's code.
 * Output must not already exist. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {values:args}=parseArgs({options:{actions:{type:'string'},out:{type:'string'},limit:{type:'string'},'reference-root':{type:'string',default:'/home/kd/Desktop/proj/llm_gameplay'},ram:{type:'string'},start:{type:'string'},clock:{type:'string',default:'slices'},shots:{type:'string'},'shots-dir':{type:'string'}}});
const ranges=(args.ram??'').split(',').filter(Boolean).map(r=>{const [a,b]=r.split('-').map(v=>Number(v));return [a,b??a];});
assert.ok(args.actions&&args.out,'--actions and --out are required');
assert.ok(['slices','ppu'].includes(args.clock),'--clock must be slices or ppu');
const keys=['up','down','left','right','a','b','start','select'];
const shots=new Set((args.shots??'').split(',').filter(Boolean).map(Number));
if(shots.size)await fs.mkdir(args['shots-dir'],{recursive:true});
const table=JSON.parse(await fs.readFile(path.resolve(args.actions),'utf8')).actions;
const limit=args.limit?Number(args.limit):table.length;
const scratch=await fs.mkdtemp('/tmp/native-trace-');
const out=await fs.open(path.resolve(args.out),'wx');
const reference=spawn(path.join(args['reference-root'],'run-reference-lab.sh'),['--rom',path.join(args['reference-root'],'roms/mario.nes'),'--output',scratch,'--diagnostics'],{stdio:['pipe','pipe','pipe']});
let stderr='';reference.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-4096);});
const lines=createInterface({input:reference.stdout})[Symbol.asyncIterator]();
async function call(request){
 reference.stdin.write(JSON.stringify(request)+'\n');
 const line=await lines.next();assert.ok(!line.done,'Reference closed: '+stderr);
 const response=JSON.parse(line.value);assert.equal(response.ok,true,response.error??'request failed');return response;
}
await call({op:'hello'});await call({op:'reset',...(args.start?{start:args.start}:{})});
let i=0,buffer=[];const started=Date.now();
try{
for(let a=0;a<limit;a++){
 const [mask,frames]=table[a],buttons=keys.filter((_,bit)=>mask&(1<<bit));
 for(let f=0;f<frames;f++){
  await call(args.clock==='ppu'?{op:'step_ppu_frame',buttons}:{op:'step_frames',buttons,frames:1});
  const d=await call({op:'diagnostics'});
  const o=d.decoded_existing_observer,ram=Buffer.from(d.raw_ram_hex,'hex');
  buffer.push(JSON.stringify({i,world:o.world,stage:o.stage,x:o.player_x_raw,y:o.player_y_raw,vx:o.x_velocity_raw_signed*256+ram[0x705],vy:o.y_velocity_raw_signed,engine:o.engine_raw,mode:o.mode_raw,task:o.task_raw,lives:(ram[0x75a]+1)&255,size:ram[0x756],playerState:ram[0x0e],subx:ram[0x400],yPage:ram[0xb5],time:ram[0x7f8]*100+ram[0x7f9]*10+ram[0x7fa],...(ranges.length?{ram:ranges.map(([a,b])=>ram.subarray(a,b+1).toString('hex')).join(',')}:{})}));
  if(shots.has(i)){const shot=await call({op:'observe',image_kind:'completed'});await fs.copyFile(shot.image.path,path.join(args['shots-dir'],`f${i}-native.png`));}
  i++;
  if(buffer.length>=500){await out.write(buffer.join('\n')+'\n');buffer=[];}
 }
 if(a%50===0)console.error(`action ${a}/${limit} frame ${i} ${((Date.now()-started)/1000).toFixed(0)}s`);
}
if(buffer.length)await out.write(buffer.join('\n')+'\n');
}finally{await out.close();reference.stdin.end();await new Promise(resolve=>reference.once('close',resolve));await fs.rm(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({frames:i,seconds:(Date.now()-started)/1000}));
