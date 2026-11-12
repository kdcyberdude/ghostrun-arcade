import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Native excerpt (worlds-20261111 3-3 mood3, rows 1060-1329): a stream that begins mid-level, dies in a pit at row 1075 and respawns at the midway point, native x 1064, row 1248.
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/model-local-midroute.json','utf8')) as {rows:unknown[],actions:number[][]};

function compare(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'model-local-')),trace=path.join(dir,'t.jsonl'),actions=path.join(dir,'a.json');
 fs.writeFileSync(trace,fixture.rows.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync(actions,JSON.stringify({actions:fixture.actions}));
 try{return execFileSync('npx',['tsx','tools/campaign-compare.ts',trace,`--actions=${actions}`,'--from=1-1','--to=8-4','--threshold=3','--events=1000'],{encoding:'utf8',env:{...process.env,MODEL_LOCAL:'1',FRAC0:'1'}});}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
}

test('MODEL_LOCAL seeds a stream that starts mid-route and follows a native death to the midway respawn',()=>{
 const out=compare();
 assert.match(out,/^NATIVEDEATH 3-3 f14 x90 /m); // the excerpt opens mid-visit, so its first visit reads page-local (1626 - 1536)
 assert.match(out,/^3-3\s+frames\s+\d+ events\s+\d+ \(>8px \d+\) per-1000 \S+ missedControl 0 levelMismatch 0/m);
 // the midway respawn stays in level coordinates: the remake stands where native stands
 const big=[...out.matchAll(/^\s+f(\d+) \S+ x-?\d+ y-?\d+ dx(-?\d+) /gm)].filter(m=>Math.abs(+m[2])>64);
 assert.deepEqual(big.map(m=>m[0]),[]);
});
