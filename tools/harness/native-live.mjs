#!/usr/bin/env node
// Live policy on the NATIVE reference from the first control row of any level (black box: only the reference process touches the ROM; pixel-policy sees screenshots only).
//   node tools/harness/native-live.mjs checkpoints [--ckpt evidence/local/native-live/ckpt]     one pass over the recorded route, saves a checkpoint 8 rows before each level's first control row
//   node tools/harness/native-live.mjs play --level 3-2 --mood 0 [--frames 2000] [--seed 12345] [--random 0.15] [--ckpt DIR] [--out evidence/local/model-play/worlds-20261111]
//   node tools/harness/native-live.mjs verify --level 3-2 --mood 0     replays the saved pads from the checkpoint and compares x, y, engine on every row
// play: load the level checkpoint, step_ppu_frame one frame per policy tick (policy mask applied as answered; --random P = a random held mask for 8-40 frames, started with
// probability P per tick while Mario has not moved right for 90 rows, so a stalled policy still explores), and write <out>/<level>/mood<M>-ppu-native.jsonl (native-trace row format,
// row i = state after i+1 frames, row 0 = the zero-mask warm-up frame) + mood<M>-actions.json ({start,level,actions:[[mask,frames]]}, native-trace mask bits up,down,left,right,A,B,start,select).
//   play --replay <saved-actions.json> --frames 2000 --out <new-dir> re-captures original pads and checks every original position/speed/engine row.
// Each play process gets its own copy of the checkpoint directory (the reference writes journals/images into --output). The policy binary is policy-player-live/pixel-policy
// (POLICY_PLAYER env or the main checkout's copy). compare with: tools/harness/model-local.mjs <out>/<level> (campaign-compare seeds a stream that begins mid-route, see MODEL_LOCAL).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [cmd,...rest]=process.argv.slice(2);
const {values:a}=parseArgs({args:rest,options:{ckpt:{type:'string',default:'evidence/local/native-live/ckpt'},level:{type:'string'},mood:{type:'string',default:'0'},frames:{type:'string',default:'2000'},seed:{type:'string',default:'12345'},random:{type:'string',default:'0'},replay:{type:'string'},out:{type:'string',default:'evidence/local/model-play/worlds-20261111'},'reference-root':{type:'string',default:'/home/kd/Desktop/proj/llm_gameplay'}}});
const ckptDir=path.resolve(root,a.ckpt),refRoot=a['reference-root'],lead=8;
const names=['up','down','left','right','a','b','start','select'];
function startReference(output){
 const p=spawn(path.join(refRoot,'run-reference-lab.sh'),['--rom',path.join(refRoot,'roms/mario.nes'),'--output',output,'--diagnostics'],{stdio:['pipe','pipe','pipe']});
 let err='';p.stderr.on('data',b=>{err=(err+b).slice(-2048);});const it=createInterface({input:p.stdout})[Symbol.asyncIterator]();
 return {p,async call(req){p.stdin.write(JSON.stringify(req)+'\n');const l=await it.next();assert.ok(!l.done,'reference closed: '+err);const r=JSON.parse(l.value);assert.equal(r.ok,true,r.error??'request failed');return r;}};
}
const buttons=m=>names.filter((_,b)=>m&(1<<b));
if(cmd==='checkpoints'){
 fs.mkdirSync(ckptDir,{recursive:true});
 const route=JSON.parse(fs.readFileSync(path.join(root,'data/observed-winning-inputs.json'),'utf8')).actions;
 const trace=fs.readFileSync(path.join(root,'evidence/local/native-trace-winning-route-ram-20261109.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
 const starts=[];let prev='';
 trace.forEach((r,i)=>{const L=`${r.world}-${r.stage}`;if(r.engine===8&&r.task===3&&r.mode===1&&L!==prev){prev=L;starts.push({level:L,control:i,frames:Math.max(0,i+1-lead)});}});
 const ref=startReference(ckptDir);await ref.call({op:'hello'});await ref.call({op:'reset'});
 const out={};let done=0,ri=0,used=0;
 for(const s of starts){
  // replay the recorded route (same slice clock as the trace) up to this level's checkpoint frame
  while(done<s.frames){const [m,c]=route[ri];const n=Math.min(c-used,s.frames-done,240);await ref.call({op:'step_frames',buttons:buttons(m),frames:n});done+=n;used+=n;if(used===c){ri++;used=0;}}
  const id=(await ref.call({op:'save'})).checkpoint.id,o=(await ref.call({op:'diagnostics'})).decoded_existing_observer;
  out[s.level]={id,routeFrame:done,firstControlRow:s.control,row:{world:o.world,stage:o.stage,x:o.player_x_raw,y:o.player_y_raw,engine:o.engine_raw,task:o.task_raw}};console.error(s.level,JSON.stringify(out[s.level]));
 }
 fs.writeFileSync(path.join(ckptDir,'level-checkpoints.json'),JSON.stringify(out,null,1)+'\n');ref.p.stdin.end();process.exit(0);
}
assert.ok(cmd==='play'||cmd==='verify','usage: checkpoints | play | verify');
assert.ok(a.level,'--level required');
const meta=JSON.parse(fs.readFileSync(path.join(ckptDir,'level-checkpoints.json'),'utf8'))[a.level];assert.ok(meta,'no checkpoint for '+a.level);
const work=fs.mkdtempSync(path.join(os.tmpdir(),'native-live-'));
for(const f of fs.readdirSync(ckptDir))if(f!=='level-checkpoints.json')fs.cpSync(path.join(ckptDir,f),path.join(work,f),{recursive:true});
const ref=startReference(work);
if(cmd==='verify'){ // replays a saved run's pads from its checkpoint and compares every row: the saved stream must be reproducible without the policy
 const stem=path.resolve(root,a.out,a.level,`mood${a.mood}`),rows=fs.readFileSync(stem+'-ppu-native.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)),pads=JSON.parse(fs.readFileSync(stem+'-actions.json','utf8')).actions.flatMap(([m,n])=>Array(n).fill(m));
 await ref.call({op:'hello'});await ref.call({op:'load',id:meta.id});let bad=0;
 for(let k=0;k<pads.length;k++){await ref.call({op:'step_ppu_frame',buttons:buttons(pads[k])});const o=(await ref.call({op:'diagnostics'})).decoded_existing_observer;if(o.player_x_raw!==rows[k].x||o.player_y_raw!==rows[k].y||o.engine_raw!==rows[k].engine){if(bad++<3)console.log('row',k,'saved',rows[k].x,rows[k].y,rows[k].engine,'replay',o.player_x_raw,o.player_y_raw,o.engine_raw);}}
 console.log(JSON.stringify({level:a.level,mood:a.mood,rows:pads.length,mismatches:bad}));ref.p.stdin.end();fs.rmSync(work,{recursive:true,force:true});process.exit(bad?1:0);
}
const mood=Number(a.mood),frames=Number(a.frames),randP=Number(a.random);
const dir=path.resolve(root,a.out,a.level);fs.mkdirSync(dir,{recursive:true});
const stem=path.join(dir,`mood${mood}`);assert.ok(!fs.existsSync(stem+'-ppu-native.jsonl'),'output exists: '+stem);
const rowsOut=fs.openSync(stem+'-ppu-native.jsonl','wx');
const masks=[];let buf=[],i=0;
async function stepRow(mask){ // mask in native bits; returns the decoded row
 await ref.call({op:'step_ppu_frame',buttons:buttons(mask)});masks.push(mask);
 const d=await ref.call({op:'diagnostics'}),o=d.decoded_existing_observer,ram=Buffer.from(d.raw_ram_hex,'hex');
 const row={i,world:o.world,stage:o.stage,x:o.player_x_raw,y:o.player_y_raw,vx:o.x_velocity_raw_signed*256+ram[0x705],vy:o.y_velocity_raw_signed,engine:o.engine_raw,mode:o.mode_raw,task:o.task_raw,lives:(ram[0x75a]+1)&255,size:ram[0x756],playerState:ram[0x0e],subx:ram[0x400],suby:ram[0x416],vyFrac:ram[0x433],fallForce:ram[0x70a],yPage:ram[0xb5],time:ram[0x7f8]*100+ram[0x7f9]*10+ram[0x7fa],
  ram:[[15,19],[22,26],[30,34],[110,114],[135,139],[207,211],[1876,1877],[0x416,0x416],[0x433,0x433],[0x70a,0x70a]].map(([lo,hi])=>ram.subarray(lo,hi+1).toString('hex')).join(',')};
 i++;buf.push(JSON.stringify(row));if(buf.length>=500){fs.writeSync(rowsOut,buf.join('\n')+'\n');buf=[];}return row;
}
// Re-capture an immutable pad stream; never ask the policy for fresh actions.
if(a.replay){
 const source=path.resolve(root,a.replay),original=JSON.parse(fs.readFileSync(source,'utf8'));
 assert.equal(original.level,a.level,'replay level differs from checkpoint');
 const expected=fs.readFileSync(source.replace(/-actions\.json$/,'-ppu-native.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
 const pads=original.actions.flatMap(([m,n])=>Array(n).fill(m)).slice(0,frames);let mismatches=0;
 try{
  await ref.call({op:'hello'});await ref.call({op:'load',id:meta.id});
  for(const [k,mask]of pads.entries()){
   const row=await stepRow(mask),old=expected[k];
   if(!old||['x','y','vx','vy','engine','mode','task'].some(key=>row[key]!==old[key]))mismatches++;
  }
  if(buf.length)fs.writeSync(rowsOut,buf.join('\n')+'\n');
  const actions=[];for(const m of masks){const last=actions.at(-1);if(last?.[0]===m)last[1]++;else actions.push([m,1]);}
  fs.writeFileSync(stem+'-actions.json',JSON.stringify({...original,actions,replaySource:source})+'\n');
  console.log(JSON.stringify({level:a.level,mood,frames:i,mismatches,replay:source}));
  assert.equal(mismatches,0,'original pad replay is not deterministic');
 }finally{fs.closeSync(rowsOut);ref.p.stdin.end();fs.rmSync(work,{recursive:true,force:true});}
 process.exit(0);
}
const policyBin=path.join(process.env.POLICY_PLAYER??'/home/kd/Desktop/proj/build_games_from_scratch_in_threejs/policy-player-live','pixel-policy');
const pol=spawn(policyBin,['--game','mario','--mood',String(mood),'--seed',a.seed,'--dropout','on'],{stdio:['pipe','pipe','inherit']});
const pit=createInterface({input:pol.stdout})[Symbol.asyncIterator]();
const pcall=async req=>{pol.stdin.write(JSON.stringify(req)+'\n');const l=await pit.next();assert.ok(!l.done,'policy closed');const r=JSON.parse(l.value);assert.equal(r.ok,true,r.error??'policy error');return r;};
const png=async()=>fs.readFileSync((await ref.call({op:'observe',image_kind:'completed'})).image.path).toString('base64');
// policy bits up,down,left,right,a,b,x,y,start,select -> native-trace bits (x presses A, y presses B)
const toNative=m=>(m&63)|(m>>6&1)<<4|(m>>7&1)<<5|(m>>8&1)<<6|(m>>9&1)<<7;
try{
 await ref.call({op:'hello'});await ref.call({op:'load',id:meta.id});await pcall({op:'hello'});
 let row=await stepRow(0);
 let r=await pcall({op:'reset',image_png_base64:await png()});
 let rand=0,randMask=0,lastProgress=0,bestX=-1,randTicks=0,deaths=0,prevEng=row.engine;
 const rng=(()=>{let s=(Number(a.seed)*2654435761+mood*97+meta.routeFrame)>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);})();
 for(let tick=0;tick<frames;tick++){
  const pm=r.mask??(await pcall({op:'suggest'})).mask;let mask=toNative(pm);
  if(rand>0){mask=randMask;rand--;randTicks++;}
  else if(randP>0&&tick-lastProgress>90&&rng()<randP){rand=8+Math.floor(rng()*32);randMask=(rng()<0.7?8:rng()<0.5?4:0)|(rng()<0.5?16:0)|(rng()<0.4?32:0)|(rng()<0.1?2:0);mask=randMask;}
  row=await stepRow(mask);
  if(row.engine===6&&prevEng!==6)deaths++;prevEng=row.engine;
  if(row.engine===8&&row.task===3&&row.x>bestX+2){bestX=row.x;lastProgress=tick;}
  r=await pcall({op:'advance',tick,applied_mask:(mask&15)|(mask>>4&3)<<4|(mask>>6&3)<<8,frames_advanced:1,image_png_base64:await png()});
 }
 if(buf.length)fs.writeSync(rowsOut,buf.join('\n')+'\n');
 const actions=[];for(const m of masks){const l=actions.at(-1);if(l?.[0]===m)l[1]++;else actions.push([m,1]);}
 fs.writeFileSync(stem+'-actions.json',JSON.stringify({start:'level_checkpoint',level:a.level,mood,seed:a.seed,random:randP,routeFrame:meta.routeFrame,actions})+'\n');
 console.log(JSON.stringify({level:a.level,mood,frames:i,deaths,randTicks,end:{world:row.world,stage:row.stage,x:row.x,engine:row.engine}}));
}finally{fs.closeSync(rowsOut);ref.p.stdin.end();pol.stdin.end();fs.rmSync(work,{recursive:true,force:true});}
