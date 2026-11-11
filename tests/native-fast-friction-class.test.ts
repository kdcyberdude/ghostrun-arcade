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

// r4 2-1 mood1 rows 664-757 (explore-r4): a neutral run-speed coast decelerates at the fast step 208, B stops it at byte 10 (2780 -> 0),
// Mario stands 40 rows without a direction, jumps from rest and presses Right in the air: native steps 208 (the 208 jump class). The
// friction latch was gone after the stop, so the remake stepped 152. Over r3+r4 jumps below byte 25 whose last informative ground step
// was a fast (208) friction step without Down: 181 of 186 step 208 in the air.
test('a fast (208) friction step keeps the 208 jump class through a B stop and a stand (r4 2-1 rows 664-757)',()=>{
 const {native,predicted}=replay('R:10264:10492:A RB:10492:10464:A R:10464:10436:A RB:10436:10408:G R:10408:10380:G RB:10380:10352:G R:10352:10324:G RB:10324:10296:G R:10296:10268:G UB:10268:10060:G U:10060:9852:G UB:9852:9644:G U:9644:9436:G UB:9436:9228:G U:9228:9020:G UB:9020:8812:G U:8812:8604:G UB:8604:8396:G U:8396:8188:G UB:8188:7980:G U:7980:7772:G UB:7772:7564:G U:7564:7356:G UB:7356:7148:G U:7148:6940:G UB:6940:6732:G U:6732:6524:G UB:6524:6316:G U:6316:6108:G UB:6108:5900:G U:5900:5692:G UB:5692:5484:G U:5484:5276:G UB:5276:5068:G U:5068:4860:G UB:4860:4652:G U:4652:4444:G UB:4444:4236:G U:4236:4028:G UB:4028:3820:G U:3820:3612:G UB:3612:3404:G U:3404:3196:G UB:3196:2988:G U:2988:2780:G UB:2780:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UAB:0:0:G UA:0:0:A UAB:0:0:A UA:0:0:A RAB:0:208:A RA:208:416:A RAB:416:624:A RA:624:832:A RAB:832:1040:A');
 assert.deepEqual(predicted.slice(-5),native.slice(-5)); // 208 x5
});

// r3 1-2 mood2 rows 640-671: a skid at the doubled fast step (416) turns around to -416, then a jump pressing Right: native steps 208
// (416 once the motion agrees with the facing again). The turnaround cleared the friction latch, so the remake stepped 152.
test('a turnaround out of a fast skid keeps the 208 jump class (r3 1-2 rows 640-671)',()=>{
 const {native,predicted}=replay('RB:10352:10324:G RB:10324:10296:G RB:10296:10268:G RB:10268:10240:G RB:10240:10468:G ULB:10468:10260:G ULB:10260:9844:G ULB:9844:9428:G ULB:9428:9012:G ULB:9012:8596:G ULB:8596:8180:G ULB:8180:7764:G ULB:7764:7348:G ULB:7348:6932:G ULB:6932:6516:G ULB:6516:6100:G ULB:6100:5684:G ULB:5684:5268:G ULB:5268:4852:G ULB:4852:4436:G ULB:4436:4020:G ULB:4020:3604:G ULB:3604:3188:G ULB:3188:2772:G ULB:2772:-416:G URAB:-416:-208:G URAB:-208:0:A URAB:0:208:A URAB:208:416:A RB:416:832:A R:832:1248:A RB:1248:1664:A');
 assert.deepEqual(predicted.slice(-6),native.slice(-6));
});

// r3 6-1 mood2 rows 3852-3890: the same fast deceleration with Down + Right held (Down along the motion) and a wall stop: native steps 152.
test('Down pressed along the motion clears the fast friction class (r3 6-1 rows 3852-3890)',()=>{
 const {native,predicted}=replay('DRA:10476:10268:G DRA:10268:10060:G DRA:10060:9852:G DRA:9852:9644:G DRA:9644:9436:G DRA:9436:9228:G DRA:9228:9020:G DRA:9020:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G DRA:108:108:G B:108:0:G B:0:0:G B:0:0:G B:0:0:G B:0:0:G B:0:0:G RAB:0:152:G RAB:152:304:A RAB:304:456:A RAB:456:608:A RAB:608:760:A RAB:760:912:A RAB:912:1064:A');
 assert.deepEqual(predicted.slice(-6),native.slice(-6));
});

// r4 2-1 mood1 rows 758-783: the 208-class jump above lands pressing Right without B: the landing row still steps 208 (6032 -> 6240); the
// next rows with B step 228. r3+r4 landing rows below the walk cap after a 208-class air spell, along press without B: about 146 of 155
// step 208 (or 416 doubled, or the clamp at the cap); after a 152-class spell 152.
test('the landing row of a 208-class jump steps 208 for a press along the motion (r4 2-1 rows 664-783)',()=>{
 const {native,predicted}=replay('R:10264:10492:A RB:10492:10464:A R:10464:10436:A RB:10436:10408:G R:10408:10380:G RB:10380:10352:G R:10352:10324:G RB:10324:10296:G R:10296:10268:G UB:10268:10060:G U:10060:9852:G UB:9852:9644:G U:9644:9436:G UB:9436:9228:G U:9228:9020:G UB:9020:8812:G U:8812:8604:G UB:8604:8396:G U:8396:8188:G UB:8188:7980:G U:7980:7772:G UB:7772:7564:G U:7564:7356:G UB:7356:7148:G U:7148:6940:G UB:6940:6732:G U:6732:6524:G UB:6524:6316:G U:6316:6108:G UB:6108:5900:G U:5900:5692:G UB:5692:5484:G U:5484:5276:G UB:5276:5068:G U:5068:4860:G UB:4860:4652:G U:4652:4444:G UB:4444:4236:G U:4236:4028:G UB:4028:3820:G U:3820:3612:G UB:3612:3404:G U:3404:3196:G UB:3196:2988:G U:2988:2780:G UB:2780:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UB:0:0:G U:0:0:G UAB:0:0:G UA:0:0:A UAB:0:0:A UA:0:0:A RAB:0:208:A RA:208:416:A RAB:416:624:A RA:624:832:A RAB:832:1040:A RA:1040:1248:A RAB:1248:1456:A RA:1456:1664:A RAB:1664:1872:A RA:1872:2080:A RAB:2080:2288:A RA:2288:2496:A RAB:2496:2704:A RA:2704:2912:A RAB:2912:3120:A RA:3120:3328:A RAB:3328:3536:A RA:3536:3744:A RAB:3744:3952:A RA:3952:4160:A RAB:4160:4368:A RA:4368:4576:A RAB:4576:4784:A RA:4784:4992:A RB:4992:5200:A R:5200:5408:A RB:5408:5616:A R:5616:5824:A RB:5824:6032:A R:6032:6240:G RB:6240:6468:G');
 assert.deepEqual(predicted.slice(-2),native.slice(-2)); // 6240 (+208), 6468 (+228)
});

// r3 3-1 mood5 rows 3000-3038: a 208-class air spell (air wall stop, then 208 steps) lands with no direction: the coast brakes at 208 from
// byte 16 (4256 -> 4048 -> ...), where a fresh ground deceleration brakes at 152. r3+r4 first coast steps below byte 28 after a 208-class
// air spell: 49 of 53 at 208 or 416; after a 152-class spell none.
test('a coast right after a 208-class landing brakes at 208 (r3 3-1 rows 3000-3038)',()=>{
 const {native,predicted}=replay('RAB:10460:192:A RAB:192:192:A RAB:192:400:A RAB:400:96:A RAB:96:96:A RAB:96:304:A RAB:304:512:A RAB:512:720:A RAB:720:928:A RAB:928:1136:A RAB:1136:1344:A RAB:1344:1552:A RAB:1552:1760:A RAB:1760:1968:A RAB:1968:2176:A RAB:2176:2384:A RAB:2384:2592:A RAB:2592:2800:A RAB:2800:3008:A RAB:3008:3216:A RAB:3216:3424:A RAB:3424:3632:A RAB:3632:3840:A RAB:3840:4048:A RAB:4048:4256:A A:4256:4256:A A:4256:4256:A A:4256:4256:A A:4256:4256:A A:4256:4256:A A:4256:4256:A A:4256:4256:A A:4256:4256:A A:4256:4048:G A:4048:3840:G A:3840:3632:G A:3632:3424:G A:3424:3216:G A:3216:3008:G');
 assert.deepEqual(predicted.slice(-6),native.slice(-6));
});

// r3 1-2 mood2 rows 3095-3152: a run-class jump taken at byte 25 (no 208 class) reaches byte 40 in the air, brakes in the air at 228 and lands
// at byte 29 pressing Left: native brakes 152 on the landing row, then 416 (the speed latch). The remake kept the 208 air brake (416, 416).
// r3+r4 run-class jumps taken below byte 29 landing with an opposite press: 152 at landing bytes 23-31 (15 of 15), 208 at 33-40 (5 of 5).
test('a run-class jump taken below byte 29 brakes by its landing speed (r3 1-2 rows 3095-3152)',()=>{
 const {native,predicted}=replay('R:4740:4892:G R:4892:5044:G R:5044:5196:G R:5196:5348:G R:5348:5500:G R:5500:5652:G R:5652:5804:G R:5804:5956:G URB:5956:6184:G UR:6184:6412:G URAB:6412:6640:G URA:6640:6868:A URAB:6868:7096:A URA:7096:7324:A URAB:7324:7552:A URA:7552:7780:A URAB:7780:8008:A URA:8008:8236:A URAB:8236:8464:A URA:8464:8692:A URAB:8692:8920:A R:8920:9148:A R:9148:9376:A R:9376:9604:A R:9604:9832:A R:9832:10060:A R:10060:10288:A R:10288:10260:A R:10260:10488:A R:10488:10460:A R:10460:10432:A R:10432:10404:A R:10404:10376:A R:10376:10348:A R:10348:10320:A R:10320:10292:A R:10292:10264:A R:10264:10492:A R:10492:10464:A R:10464:10436:A R:10436:10408:A LA:10408:10180:A LA:10180:9952:A LA:9952:9724:A LA:9724:9496:A LA:9496:9268:A LA:9268:9040:A LA:9040:8812:A LA:8812:8584:A LA:8584:8356:A LA:8356:8128:A LA:8128:7900:A LA:7900:7672:A LA:7672:7444:A LA:7444:7292:G LA:7292:6876:G LA:6876:6460:G LA:6460:6044:G');
 assert.deepEqual(predicted.slice(-4),native.slice(-4)); // -152, -416, -416, -416
});
