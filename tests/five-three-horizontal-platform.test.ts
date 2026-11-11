import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PlatformMotion} from '../src/platform-motion.js';
import {observedLevels} from '../src/levels.js';

const level=observedLevels().find(l=>l.id==='5-3')!;
const area=level.areas.find(a=>a.id==='main')!;
const target=area.platforms!.find(p=>p.x===1346&&p.y===129&&p.width===32)!;
const context={levelId:'5-3',areaId:'main'};

test('later 5-3 platform retains its offscreen position until activation and resets',()=>{
 // The native object exists from scroll position 1074 on (reference RAM), not from the earlier inferred 1090.
 const motion=new PlatformMotion(context);
 const initial=motion.artworkPosition(target,0);
 assert.equal(initial.x,1376);
 motion.advance(188,1073);
 assert.deepEqual(motion.artworkPosition(target,188),initial);
 motion.advance(189,1074);
 assert.deepEqual(motion.artworkPosition(target,189),initial);
 assert.notDeepEqual(motion.artworkPosition(target,260),initial);
 motion.reset();
 assert.deepEqual(motion.artworkPosition(target,500),initial);
});

test('later 5-3 platform predicts held-out registered positions at the native spawn epoch',()=>{
 const source=JSON.parse(fs.readFileSync('evidence/five-three-later-platform-heldout-observation.json','utf8'));
 const points=source.rows.flatMap((r:any)=>r.matches.filter((p:any)=>p.y===129&&p.worldX!==null).map((p:any)=>({frame:r.nativeFrame,x:p.worldX})));
 assert.equal(points.length,62);
 // The reference RAM shows the object appearing at route row 43186 (native frame 43187 in these labels), 9 frames before the
 // earlier inferred epoch 43195; started there, all 62 independently registered positions agree within 2 px.
 const motion=new PlatformMotion(context);motion.advance(43187,1074);
 assert.ok(Math.max(...points.map((p:any)=>Math.abs(motion.artworkPosition(target,p.frame).x-p.x)))<=2);
 // The measured registration is sensitive to the spawn time.
 for(const delta of [-2,8]){
  const shifted=new PlatformMotion(context);shifted.advance(43187+delta,1074);
  assert.ok(points.some((p:any)=>Math.abs(shifted.artworkPosition(target,p.frame).x-p.x)>2));
 }
});
