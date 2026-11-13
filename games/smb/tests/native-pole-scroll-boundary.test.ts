import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import witness from './fixtures/native-pole-scroll-boundary.json';
import controls from '../data/native-area-controls.json';

test('native engine5 scroll is bounded by ScrollLock and side contact, not compiled area width',()=>{
 const bytes=gunzipSync(Buffer.from(witness.ram,'base64'));assert.equal(createHash('sha256').update(bytes).digest('hex'),witness.windowSha256);
 const row=(n:number)=>bytes.subarray(n*2048,(n+1)*2048);let beyond=0,held=0;
 for(let f=0;f<=witness.to-witness.from;f++){
  const before=row(f),r=row(f+1),camera=(a:Uint8Array)=>a[0x71a]*256+a[0x71c],position=before[0x755],timer=Math.max(0,before[0x785]-1),motion=r[0x6ff];
  assert.equal(r[14],5);assert.equal(r[0x723],0);assert.equal(r[0x3a1],0);
  const scroll=before[0x723]||position<80||timer||motion===0?0:position>=112||motion<2?motion:motion-1;
  assert.equal(r[0x775],scroll,`frame${witness.from+f} source ScrollAmount`);assert.equal(camera(r)-camera(before),scroll);
  assert.equal(r[0x71b]*256+r[0x71d],camera(r)+255,'GetScreenPosition remains relative to actual scroll');
  if(camera(r)>3136)beyond++;if(timer)held++;
 }
 assert.ok(beyond>0&&held>0);
 const binding=controls.bindings['1-1/main'],stream=controls.streams[binding.stream as keyof typeof controls.streams];
 assert.deepEqual(stream.objects.filter(o=>o.command>=5&&o.command<=7),[],'native ROM has no terminal ScrollLock command here');
});
