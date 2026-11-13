import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import {NativePlatformClock,stepNativePlatform,type NativePlatformBytes} from '../src/native-platform-clock.js';
import fixture from './fixtures/native-platform-clock.json';
const events=JSON.parse(zlib.gunzipSync(Buffer.from(fixture.gzipBase64,'base64')).toString()) as {level:string;frame:number;slot:number;counter:number;run:boolean;load:number;before:NativePlatformBytes;after:NativePlatformBytes}[];
test('explicit platform turns match every native byte with actual FrameCounter and TimerControl holds',()=>{
 assert.equal(events.length,15830);assert.ok(fixture.heldTurns>200);
 for(const e of events){const n={...e.before};stepNativePlatform(n,e.counter,e.run,e.load);assert.deepEqual(n,e.after,`${e.level} row${e.frame} slot${e.slot} ID${e.before.id}`);}
});
test('a held object does not catch up elapsed display frames and resumes using the actual counter phase',()=>{
 const clock=new NativePlatformClock<string>(),initial={id:40,x:768,y:112,a:0,b:0,c:0,d:0,e:0};clock.create('lift',initial);
 for(let counter=1;counter<60;counter++)clock.turn('lift',counter,false);
 assert.deepEqual(clock.state('lift'),initial);
 assert.deepEqual(clock.turn('lift',60),{dx:-1,dy:0});
 assert.deepEqual(clock.state('lift'),{...initial,x:767,b:1,c:240});
});
test('platform state getters preserve both current RAM and the previous draw-before-move anchor',()=>{
 const clock=new NativePlatformClock<string>();clock.create('small',{id:43,x:1372,y:160,a:255,b:0,c:0,d:16,e:240});
 const before=clock.state('small')!;clock.turn('small',1);const current=clock.state('small')!;
 assert.equal(current.y,160);assert.equal(current.e,0);assert.deepEqual(clock.state('small',true),before);
 const snapshot=structuredClone(clock);for(let n=0;n<5;n++){clock.state('small');clock.state('small',true);}assert.deepEqual(structuredClone(clock),snapshot);
 current.y=999;assert.notEqual(clock.state('small')!.y,999,'readout returns a copy');
});
