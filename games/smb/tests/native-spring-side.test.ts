import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native springboard rows (free-play model runs, PPU frames; y = feet - 32): the spring's 16x32 cells are a wall to Mario's side probes, and while he rides it
// a held direction steps the speed like the ground. 5-2 area-2 spring at x 400 (base y 200).
const sim5_2=(spawn:[number,number],speed:number)=>{
 const level=observedLevels().find(l=>l.id==='5-2')!;
 const s=new Simulation([level]);s.reset(true);s.loadArea('area-2',spawn,spawn[0]-100);(s as any).enemies=[];
 s.phase='play';s.phaseFrame=0;const p=(s as any).player;p.vx=speed/4096;(s as any).motor.speed=speed;return s;
};

test('5-2 spring side: walking right at feet 208 is stopped and backs out to x 386 (explore-r2 5-2 mood3 rows 1017-1022: 386, 387, 386, 386, 386, 386)',()=>{
 // the old remake walked into the spring column (x 389+); tolerance 1 px on the contact rows (the remake backs out one row slower)
 const s=sim5_2([372,208],10252),p=(s as any).player;
 const xs:number[]=[];for(let i=0;i<12;i++){s.step(['right','b'] as any,1);xs.push(Math.floor(p.x));}
 assert.ok(Math.max(...xs)<=388,`x ${xs}`);
 assert.equal(xs[xs.length-1],386,`settles at 386: ${xs}`);
 assert.equal(Math.floor(p.y),208,'still on the floor beside the spring');
});

test('5-2 spring ride: the speed steps 228 per row with right held and B within the run grace (explore-r4 5-2 mood0 rows 224-237)',()=>{
 // native: lands on the spring at x 388 rising-then-falling (y 146 at row 224), speed 1876 -> 2104 -> ... 4840, +228 every row while x stays 388
 const s=sim5_2([388,178],1876),p=(s as any).player;p.vy=0;p.grounded=false;
 const speeds:number[]=[],xs:number[]=[];
 for(let i=0;i<12;i++){s.step((i%2?['right','b']:['right']) as any,1);speeds.push(Math.round(p.vx*4096));xs.push(Math.floor(p.x));}
 const riding=speeds.slice(2,10);
 for(let k=1;k<riding.length;k++)assert.equal(riding[k]-riding[k-1],228,`speeds ${speeds}`);
 assert.ok(xs.slice(1,10).every(x=>x===388),`x pinned: ${xs}`);
});
