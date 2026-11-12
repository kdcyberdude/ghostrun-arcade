import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Native r7 5-3 mood2, rows 1721-1736, recaptured with the same pads and zero
// original-row mismatches. Initial vy byte -1 means -0.375, y byte 110 means 110.75. RAM0x70a is112
// (walk), although current x-speed byte17 previously inferred medium class.
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/native-live-fractions.json','utf8'));
test('MODEL_LOCAL reads the sweep vertical fractions and VYRAM=0 restores the old midpoint seed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-live-fractions-'));
 try{
  const trace=path.join(dir,'trace.jsonl'),actions=path.join(dir,'actions.json');
  fs.writeFileSync(trace,fixture.rows.map((r:unknown)=>JSON.stringify(r)).join('\n')+'\n');
  fs.writeFileSync(actions,JSON.stringify({actions:fixture.actions}));
  const run=(disabled:boolean)=>execFileSync('npx',['tsx','tools/campaign-compare.ts',trace,`--actions=${actions}`,'--from=1-1','--to=8-4','--threshold=3'],{encoding:'utf8',env:{...process.env,MODEL_LOCAL:'1',FRAC0:'1',VYRAM:disabled?'0':'',TRACE:'1,15',SEEDLOG:'1'}});
  const measured=run(false);
  assert.match(measured,/simy 142\.3750 simvy -0\.2500/);
  const trajectory=[...measured.matchAll(/^T (\d+) .* simy (-?[\d.]+) simvy (-?[\d.]+)$/gm)];
  assert.equal(trajectory.length,15);
  for(const row of trajectory){
   const native=fixture.rows[+row[1]];
   assert.equal(+row[2],native.y+32+native.suby/256,`native position row ${row[1]}`);
   assert.equal(+row[3],Number((native.vy+native.vyFrac/256).toFixed(4)),`native speed row ${row[1]}`);
  }
  assert.deepEqual([...measured.matchAll(/^S (\d+)$/gm)].map(m=>+m[1]),[0],'the complete arc runs without later re-seeding');
  assert.match(run(true),/simy 141\.5000 simvy -0\.3828/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
