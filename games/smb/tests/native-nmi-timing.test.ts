import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyTimingRow} from '../tools/harness/native-nmi-survey.js';
import survey from '../evidence/native-nmi-corpus-survey.json';
import probes from '../evidence/native-nmi-workload-probes.json';

type Sample={kind:'sample';branch:string;row:number;counter:number;parser:number;pc:number;sp:number};
type Nmi={kind:'nmi';branch:string;startRow:number;endRow:number;cycles:number;shortFrameDots:number;startCycles:number;endCycles:number;startPpuAbsolute:number;endPpuAbsolute:number;rootCalls:{caller:number;entry:number;cycles:number}[]};
const native=()=>{const r=new Uint8Array(2048);r[0x770]=1;r[0x772]=3;r[14]=8;r[9]=77;return r;};

test('timing survey distinguishes pause, RNG changes, normal increments and scope boundaries',()=>{
 const p=native(),r=native();r[9]++;assert.equal(classifyTimingRow(p,r),undefined);
 r[9]=p[9];assert.equal(classifyTimingRow(p,r)?.kind,'held-counter-and-rng');
 r[0x7a7]=1;assert.equal(classifyTimingRow(p,r)?.kind,'held-counter-rng-changed');
 r[0x776]=1;assert.equal(classifyTimingRow(p,r)?.kind,'paused-hold');
 r[0x776]=0;r[9]=p[9]+2;assert.equal(classifyTimingRow(p,r)?.kind,'counter-delta-2');
 r[14]=7;assert.equal(classifyTimingRow(p,r),undefined);
});

test('complete retained and mood survey preserves every normal-play non-unit clock event',()=>{
 assert.equal(survey.inputs,368);assert.equal(survey.frames,5178452);assert.equal(survey.normalRows,3773647);
 assert.equal(survey.hashesVerified,true);assert.equal(survey.events.length,6);assert.equal(survey.receipts.length,368);
 assert.equal(survey.events.filter(e=>e.input==='v2').length,1);assert.equal(survey.events.filter(e=>e.input==='mood').length,5);
 for(const e of survey.events){assert.equal(e.kind,'held-counter-and-rng');assert.equal(e.oamStable,true);assert.equal(e.rngStable,true);assert.equal(e.before.counter,e.after.counter);assert.equal(e.before.parser-e.after.parser,1);}
 assert.deepEqual(new Set(survey.events.map(e=>e.before.parser)),new Set([7,8]),'both graphics and column-parser work can straddle the sample');
});

test('native CPU probes reproduce all mood partial passes and restore the same snapshot for controls',()=>{
 assert.equal(probes.cases.length,5);
 for(const c of probes.cases){
  const records=c.records as unknown as (Sample|Nmi)[],samples=records.filter((r):r is Sample=>r.kind==='sample'),nmis=records.filter((r):r is Nmi=>r.kind==='nmi');
  const partial=samples.find(r=>r.branch==='baseline'&&r.row===c.heldRow-1)!,held=samples.find(r=>r.branch==='baseline'&&r.row===c.heldRow)!;
  assert.notEqual(partial.pc,0x8057);assert.equal(partial.sp,0xf5);assert.equal(held.pc,0x8057);assert.equal(held.sp,0xff);assert.equal(partial.counter,held.counter);
  assert.deepEqual(samples.filter(r=>r.branch==='repeat').map(({branch,...r})=>r),samples.filter(r=>r.branch==='baseline'&&r.row>=c.branchStart).map(({branch,...r})=>r));
  for(const n of nmis){assert.equal(n.endCycles-n.startCycles,n.cycles);assert.ok(n.shortFrameDots===0||n.shortFrameDots===1);assert.equal(n.endPpuAbsolute-n.startPpuAbsolute,n.cycles*probes.ppuProtocol.ppuCyclesPerCpuCycle+n.shortFrameDots);}
  const heavy=nmis.find(n=>n.branch==='baseline'&&n.startRow===c.branchStart)!;
  const repeated=nmis.find(n=>n.branch==='repeat'&&n.startRow===c.branchStart)!;assert.equal(repeated.cycles,heavy.cycles);
  const deadline=(Math.floor(heavy.startPpuAbsolute/probes.ppuProtocol.frameDots)+1)*probes.ppuProtocol.frameDots+probes.ppuProtocol.vblankDot;
  assert.ok(heavy.endPpuAbsolute>deadline);assert.equal(heavy.endRow,c.heldRow);
  for(const branch of ['no-running-enemies','no-sprite0-wait']){const control=nmis.find(n=>n.branch===branch&&n.startRow===c.branchStart)!;assert.ok(control.endPpuAbsolute<deadline);assert.equal(control.endRow,c.branchStart);}
  const main=heavy.rootCalls.at(-1)!,withoutWait=nmis.find(n=>n.branch==='no-sprite0-wait'&&n.startRow===c.branchStart)!;
  assert.equal(withoutWait.rootCalls.at(-1)!.entry,main.entry);assert.equal(withoutWait.rootCalls.at(-1)!.cycles,main.cycles,'diagnostic removes wait budget without shortening the GameEngine work');
 }
});

test('native counter-parity intervention does not justify a universal odd-frame overrun rule',()=>{
 const outcomes=probes.cases.map(c=>(c.records as unknown as Nmi[]).find(r=>r.kind==='nmi'&&r.branch==='counter-plus-one'&&r.startRow===c.branchStart)!).map(n=>n.startRow!==n.endRow);
 assert.deepEqual(new Set(outcomes),new Set([true,false]));
});
