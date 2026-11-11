import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Exercise the checkpoint replay protocol without a ROM or policy binary. Each diagnostics row
// carries distinct vertical fractions so accidentally substituting the integer vy cannot pass.
test('native-live replays saved pads and captures vertical fractions without calling the policy',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-live-test-'));
 try{
  const ckpt=path.join(dir,'ckpt'),source=path.join(dir,'mood0-actions.json'),out=path.join(dir,'out');
  fs.mkdirSync(ckpt);
  fs.writeFileSync(path.join(ckpt,'level-checkpoints.json'),JSON.stringify({'5-3':{id:'fixture',routeFrame:42}}));
  fs.writeFileSync(source,JSON.stringify({level:'5-3',start:'level_checkpoint',actions:[[8,1],[24,2]]}));
  const expected=Array.from({length:3},(_,i)=>({x:41+i,y:96+i,vx:1024+17,vy:i,engine:8,mode:1,task:3}));
  fs.writeFileSync(source.replace('-actions.json','-ppu-native.jsonl'),expected.map(r=>JSON.stringify(r)).join('\n'));
  fs.writeFileSync(path.join(dir,'reference.mjs'),`
import readline from 'node:readline';
let i=-1;
for await(const line of readline.createInterface({input:process.stdin})){
 const q=JSON.parse(line);let r={ok:true};
 if(q.op==='step_ppu_frame'){i++;if(JSON.stringify(q.buttons)!==JSON.stringify(i===0?['right']:['right','a']))throw Error('pads changed');}
 if(q.op==='diagnostics'){
  const ram=Buffer.alloc(2048);ram[0x705]=17;ram[0x400]=34;ram[0x416]=64+i;ram[0x433]=144+i;ram[0x70a]=112;ram[0x75a]=2;
  r={...r,raw_ram_hex:ram.toString('hex'),decoded_existing_observer:{world:5,stage:3,player_x_raw:41+i,player_y_raw:96+i,x_velocity_raw_signed:4,y_velocity_raw_signed:i,engine_raw:8,mode_raw:1,task_raw:3}};
 }
 console.log(JSON.stringify(r));
}`);
  const launcher=path.join(dir,'run-reference-lab.sh');
  fs.writeFileSync(launcher,'#!/bin/sh\nexec node "'+path.join(dir,'reference.mjs')+'"\n',{mode:0o755});
  const args=['tools/harness/native-live.mjs','play','--level','5-3','--mood','0','--frames','3','--replay',source,'--out',out,'--ckpt',ckpt,'--reference-root',dir];
  const run=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,POLICY_PLAYER:'/nonexistent-policy'}});
  assert.equal(run.status,0,run.stderr);
  assert.equal(JSON.parse(run.stdout).mismatches,0);
  const rows=fs.readFileSync(path.join(out,'5-3/mood0-ppu-native.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s));
  assert.deepEqual(rows.map(r=>[r.suby,r.vyFrac,r.fallForce]),[[64,144,112],[65,145,112],[66,146,112]]);
  assert.deepEqual(rows.map(r=>r.ram.split(',').slice(-3)),[['40','90','70'],['41','91','70'],['42','92','70']]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'5-3/mood0-actions.json'),'utf8')).actions,[[8,1],[24,2]]);
  expected[1].y++;fs.writeFileSync(source.replace('-actions.json','-ppu-native.jsonl'),expected.map(r=>JSON.stringify(r)).join('\n'));
  args[args.indexOf('--out')+1]=path.join(dir,'bad');
  const bad=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.notEqual(bad.status,0,'a nondeterministic replay must fail');
  assert.equal(JSON.parse(bad.stdout).mismatches,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
