import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Original r7 pad streams re-captured with zero x/y/vx/vy/engine mismatches.
// The slow fall begins with positive speed fractions several rows before integer y moves;
// native UR+B already steps152 then, while a grounded B press would step228.
const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/native-motor-fraction-labels.json','utf8'));
test('motor rows use native fractions at walk-off and landing, preserving exact legacy output without them',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'motor-fraction-labels-'));
 try{
  const stem=path.join(dir,'mood0'),trace=stem+'-ppu-native.jsonl',actions=stem+'-actions.json',out=path.join(dir,'rows.json');
  for(const fixture of fixtures){
   fs.writeFileSync(actions,JSON.stringify({actions:fixture.actions}));
   const run=(fractions:boolean)=>{
    fs.writeFileSync(trace,fixture.rows.map((r:any)=>JSON.stringify(fractions?r:Object.fromEntries(Object.entries(r).filter(([k])=>k!=='suby'&&k!=='vyFrac')))).join('\n')+'\n');
    execFileSync(process.execPath,['tools/harness/model-motor-rows.mjs',out,dir]);
    return fs.readFileSync(out,'utf8');
   };
   assert.equal(run(false).replaceAll(stem,'<capture>'),fixture.legacy,fixture.source+' legacy bytes');
   const rows=JSON.parse(run(true));
   if(fixture.name==='slow-walkoff'){
    for(const i of [5,6,7]){ // original rows23-25, integer y80 throughout
     const r=rows.find((r:any)=>r.i===i);
     assert.equal(r.aira,true);assert.equal(r.air,true);
     assert.equal(r.Sb-r.Sa,152);assert.equal(r.ya,r.yb);
    }
   }else if(fixture.name==='neutral-walkoff'){
    const r=rows.find((r:any)=>r.i===4); // original row421, Down only: native stops braking
    assert.equal(r.eff,'D');assert.equal(r.Sb,r.Sa);assert.equal(r.aira,true);assert.equal(r.air,true);
   }else{
    const r=rows.find((r:any)=>r.i===5); // original row1092: flat ground after landing
    assert.equal(r.aira,false);assert.equal(r.air,false);assert.equal(r.Sb-r.Sa,208);
   }
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
