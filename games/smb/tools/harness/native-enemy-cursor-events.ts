/** Validate every read-only CPU observer attempt, retaining distinct control outcomes. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import readline from 'node:readline';import {parseArgs} from 'node:util';import {NativeEnemyStream,type NativeEnemyInit} from '../../src/native-enemy-stream.js';import {nativeEnemyBytes} from '../../src/native-enemy-catalog.js';
const {values:a}=parseArgs({options:{observations:{type:'string'},out:{type:'string',default:'tests/fixtures/native-enemy-cursor-instructions.json'}}});if(!a.observations)throw Error('--observations comma-separated observer JSONL files required');
const cases=new Map<string,any>();let checked=0,initialized=0;
for(const file of a.observations.split(','))for await(const line of readline.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity})){
 const r=JSON.parse(line),bytes=nativeEnemyBytes(r.pointer);assert.ok(bytes,`Unknown physical stream ${r.pointer}`);
 const stream=new NativeEnemyStream(bytes,r.before[0],r.before[1],Boolean(r.before[2]));let called:NativeEnemyInit|undefined;
 stream.attempt({camera:r.camera,hard:Boolean(r.hard),primaryHard:Boolean(r.primaryHard),slot:r.slot,frenzy:r.frenzy,vine:r.vine,queue:r.queue},event=>{called=event;return r.flag;});
 const label=`${path.basename(file)} frame${r.frame} slot${r.slot}`;assert.deepEqual([stream.offset,stream.page,Number(stream.selected)],r.after,label);
 if(called){initialized++;if(called.source!=='group'){assert.ok(r.init.length>0,label);assert.deepEqual([called.slot,called.id,called.flag],r.init[0].slice(0,3),label);if(called.source==='placed')assert.deepEqual([called.x,called.y],r.init[0].slice(3),label);}}
 else assert.equal(r.init.length,0,label);
 const key=JSON.stringify([r.pointer,r.slot,r.hard,r.primaryHard,r.frenzy,r.vine,r.queue,r.before,r.after,r.flag,r.init.map((i:number[])=>i.slice(0,3))]),prior=cases.get(key);if(prior)prior.count++;else cases.set(key,{...r,source:path.basename(file),count:1});checked++;
}
fs.writeFileSync(a.out!,JSON.stringify({source:'Read-only ChkEnemyFrenzy/InitEnemyRoutines/return-PC observations during authenticated power-on replay. Callback result is native returned flag; initializer side effects remain separate. All attempts validated before distinct control outcomes were retained.',checked,initialized,rows:[...cases.values()]})+'\n');console.log({checked,initialized,cases:cases.size});
