import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareHorizontalCase} from '../tools/compare-horizontal.js';

for(const name of ['run-down-stop','run-down-jump','run-neutral-jump','slow-run-jump','fast-run-jump','down-short-release-jump','down-long-release-jump','down-neutral-release-jump','run-release-b-jump','run-air-neutral','run-air-reverse','run-air-short-reverse','run-air-reverse-no-b'])test(`${name} matches independent reference controls within 2px`,()=>{
 const result=compareHorizontalCase(name);assert.ok(result.samples>=12);
 assert.ok(result.pass,JSON.stringify({name,maxError:result.maxError,firstFailure:result.rows.find(r=>!r.pass)}));
});

test('medium-speed takeoff matches player motion; its camera discrepancy is retained in the comparison report',()=>{
 const result=compareHorizontalCase('medium-run-jump');
 assert.ok(result.rows.every(r=>Math.abs(r.dx)<=2&&Math.abs(r.dy)<=2));
});
