import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor,type Direction} from '../src/native-motor.js';

// Native one-step rows from free-play model run explore-r3 ('eff:speed before:speed after:G|A', G a ground row, A an air row), replayed
// teacher-forced like tools/fidelity-lab/native-motor-score.ts: every row starts from the native speed, motor flags carry across rows,
// a blocked step keeps the fraction (hitWall). Returns the predicted speed after each row.
function replay(rows:string,facing:-1|0|1=1):{native:number[],predicted:number[]}{
 const motor=new NativeMotor();motor.reset(0,facing);
 const list=rows.split(' ').map(r=>{const [eff,a,b,g]=r.split(':');return {eff,Sa:+a,Sb:+b,air:g==='A'};});
 const native:number[]=[],predicted:number[]=[];let lastAir:boolean|undefined;
 for(const [k,r] of list.entries()){
  motor.speed=r.Sa;
  const direction=(Number(r.eff.includes('R'))-Number(r.eff.includes('L')))as Direction;
  const takeoff=!r.air&&r.eff.includes('A')&&!!list[k+1]?.air;
  const groundDown=r.eff.includes('D')&&!r.air;
  const running=motor.updateRun(groundDown||r.air?0:direction,r.eff.includes('B'));
  let next:number;
  if(!r.air){
   if(r.eff.includes('D')){motor.tickFreeze();next=takeoff?r.Sa:motor.groundDown(direction,true);}
   else next=direction===0?motor.groundCoast(r.eff.includes('B')):motor.groundPress(direction as 1|-1,running,takeoff);
  }else{if(lastAir!==true)motor.takeoff();next=motor.air(direction,r.eff.includes('B'));}
  if(next!==r.Sb&&Math.abs(r.Sa)>=256&&r.Sb===((next%256)+256)%256){motor.hitWall(next,direction===0||direction*r.Sa>0,0,r.air);next=r.Sb;}
  native.push(r.Sb);predicted.push(next);lastAir=r.air;
 }
 return {native,predicted};
}

// r3 1-2 mood1 rows 3520-3526 (start of world 1-3): Mario jumps from rest pressing Left right after the load. Native steps 304 on every air
// row: he still faces right (a load faces right), so the press against the facing doubles the walk step. With no facing after the load the
// remake stepped 304 once and then 152 (r3+r4 one-step score +2,346 rows with the load facing right).
test('after a load Mario faces right: a jump from rest pressing Left steps 304 per air row (r3 1-3 rows 3520-3526)',()=>{
 const {native,predicted}=replay('LA:0:-304:A LA:-304:-608:A LA:-608:-912:A LA:-912:-1216:A LA:-1216:-1520:A LA:-1520:-1824:A');
 assert.deepEqual(predicted,native);
 assert.notDeepEqual(replay('LA:0:-304:A LA:-304:-608:A LA:-608:-912:A',0).predicted,[-304,-608,-912]); // no facing: 152 from the second row
});

// r3 3-1 mood0 rows 286-322: a run-speed coast (fast friction 208) hits a wall on the ground (8840 -> 184), then 18 neutral/Up ground rows,
// a jump from rest and air presses: native steps 208 (the walled run-class jump), the wall latch survives ground rows without a direction.
test('a run-speed ground wall stop keeps the 208 jump class through neutral ground rows (r3 3-1 rows 286-322)',()=>{
 const {native,predicted}=replay('U:9880:9880:A UB:9880:9880:A U:9880:9672:G UB:9672:9464:G U:9464:9256:G UB:9256:9048:G U:9048:8840:G UB:8840:184:G U:184:184:G UB:184:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UAB:0:0:G UA:0:0:A UAB:0:0:A UA:0:0:A UAB:0:0:A UA:0:0:A UAB:0:0:A UA:0:0:A UAB:0:0:A UA:0:0:A UAB:0:0:A UA:0:0:A DRA:0:208:A DRA:208:416:A DRA:416:624:A DRA:624:832:A DRA:832:16:A DRA:16:16:A');
 assert.deepEqual(predicted.slice(-6,-2),native.slice(-6,-2)); // 208, 208, 208, 208 (the remake cleared the latch on the first neutral row: 152)
});

// r3 1-1 mood5 rows 1040-1052: a run-speed jump lands with Down held, walls on the second ground row (10116 -> 180), two more Down rows
// and a jump with no direction on the ground: native steps 208 in the air.
test('a run-class jump class survives a landing with only Down rows on the ground (r3 1-1 rows 1040-1052)',()=>{
 const {native,predicted}=replay('D:10324:10324:A DB:10324:10324:A D:10324:10116:G DB:10116:180:G D:180:180:G DAB:180:180:G DA:180:180:A DAB:180:180:A DA:180:180:A RAB:180:388:A RA:388:596:A RAB:596:804:A RA:804:1012:A');
 assert.deepEqual(predicted.slice(-4),native.slice(-4));
});

// r3 7-1 mood4 rows 1727-1753: the same wall stop with Down + Right held on the ground for 15 rows clears it: native steps 152.
test('ground rows with a direction held (Down too) clear the 208 jump class (r3 7-1 rows 1727-1753)',()=>{
 const {native,predicted}=replay('DRA:10392:10184:G DRA:10184:9976:G DRA:9976:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G DRA:40:40:G B:40:0:G B:0:0:G B:0:0:G B:0:0:G UAB:0:0:G RA:0:152:A RA:152:304:A RA:304:456:A RA:456:608:A');
 assert.deepEqual(predicted.slice(-4),native.slice(-4));
});
