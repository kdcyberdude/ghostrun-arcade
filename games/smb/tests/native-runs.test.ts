import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {excerptReplay,type Excerpt} from '../tools/harness/native-excerpt.js';

// Every recorded native run (evidence/native-runs/<level>.<run>.json, made by tools/harness/native-excerpt.ts). Runs of the same level come from
// different decisions, so random-register and timer phases differ: an entity rule must hold in all of them. Each field (death, timer, score,
// coins, camera, Mario x/y, enemies) may diverge no earlier than when the excerpt was taken; regenerate the excerpts after a fix to ratchet.
const dir=new URL('../evidence/native-runs/',import.meta.url);
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort()){
 const x:Excerpt=JSON.parse(fs.readFileSync(new URL(file,dir),'utf8'));
 test(`native run ${x.level} ${x.run}: no field diverges earlier than recorded`,()=>{
  const got=excerptReplay(x).fields,late:Record<string,unknown>={};
  for(const [k,was] of Object.entries(x.firsts)){const now=got[k]??null;if(now!==null&&(was===null||now<was))late[k]={recorded:was,now};}
  assert.deepEqual(late,{},`${file}: earlier divergence`);
 });
}
