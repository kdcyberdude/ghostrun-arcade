import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {nativeLiftY,nativeHorizontalX} from '../src/platform-motion.js';
import type {Excerpt} from '../tools/harness/native-excerpt.js';

// Native platform objects integrated from their spawn row (src/platform-motion.ts nativeLiftY / nativeHorizontalX), checked on every row of every
// id 37 (YMovingPlatform) and id 40 (XMovingPlatform) object in all recorded native runs (evidence/native-runs/*.json: slot flags $0F, ids $16,
// x $6E/$87/$401, y $CF and FrameCounter $09 per frame). Inputs are native state only: spawn position, the slot's leftover x sub-pixel, FrameCounter.
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
const dir=new URL('../evidence/native-runs/',import.meta.url);
const runs=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync(new URL(f,dir),'utf8')) as Excerpt);

function objects(x:Excerpt,id:number){
 const ram=unpack(x.ram),n=x.addrs.length,at=(f:number,a:number)=>ram[f*n+x.addrs.indexOf(a)];
 const out:{level:string,slot:number,spawn:number,rows:{x:number,y:number,counter:number,frozen:boolean}[]}[]=[];
 for(let s=0;s<5;s++){
  let cur:(typeof out)[number]|undefined;
  for(let f=0;f<x.frames;f++){
   const live=at(f,0x0f+s)!==0&&at(f,0x16+s)===id;
   if(!live){cur=undefined;continue;}
   if(!cur){if(f===0||at(f-1,0x0f+s)!==0)continue;cur={level:x.level,slot:s,spawn:f,rows:[]};out.push(cur);}
   cur.rows.push({x:(at(f,0x6e+s)*256+at(f,0x87+s))*256+at(f,0x401+s),y:at(f,0xcf+s),counter:at(f,0x09),frozen:at(f,0x0e)===11||at(f,0x0e)===6});
  }
 }
 return out;
}

test('id 37 lifts follow the native YMovingPlatform integration from their spawn row (all v2 runs)',()=>{
 let rows=0;
 for(const run of runs)for(const o of objects(run,37)){
  const y0=o.rows[0].y,c0=o.rows[0].counter;
  o.rows.forEach((r,age)=>{assert.equal(nativeLiftY(y0,age,c0),r.y,`${o.level} slot ${o.slot} spawn ${o.spawn} age ${age}`);rows++;});
 }
 assert.ok(rows>1000,`${rows} lift rows`);
});

test('id 40 platforms follow the native XMovingPlatform integration from their spawn row, keeping the slot sub-pixel (all v2 runs)',()=>{
 let rows=0;const subs=new Set<number>();
 for(const run of runs)for(const o of objects(run,40)){
  const first=o.rows[0],x0=Math.floor(first.x/256),sub=first.x&255;subs.add(sub);
  for(let age=0;age<o.rows.length;age++){
   const want=o.rows[age].x/256,got=nativeHorizontalX(x0,age,first.counter,sub);
   if(o.rows[age].frozen){
    assert.ok(want===o.rows[age-1].x/256||want===got,`${o.level}: a death freezes slots that have not stepped yet`);
    break; // Area/death processing no longer advances this object trajectory.
   }
   assert.equal(got,want,`${o.level} slot ${o.slot} spawn ${o.spawn} age ${age}`);
   rows++;
  }
 }
 assert.ok(rows>3000,`${rows} horizontal rows`);
 assert.ok(subs.size>3,'spawn sub-pixels vary with the slot history (1-3 row 508: 128 left by a Goomba)');
});
