/** Extract authenticated walker-defeat bounds/reuse evidence and independent one-time replay seeds.
 * npx tsx tools/harness/native-walker-corpse-events.ts --captures DIR --report REPORT --out FILE
 */
import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
import {observedLevels} from '../../src/levels.js';import {moodNativeTimeline} from './native-mood-audit.js';import {nativeAreaBindings,selectNativeAreaBinding} from './native-area-identity.js';import {NATIVE_ENEMY_KIND} from './native-entities.js';
const {values:a}=parseArgs({options:{captures:{type:'string'},report:{type:'string'},out:{type:'string'}}});if(!a.captures||!a.report||!a.out)throw Error('--captures, --report and --out required');
const report=JSON.parse(fs.readFileSync(a.report,'utf8')),hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),ids=new Set([0,1,2,3,4,6,14,15,16]);
const selected=['54e749cc0fc3c5e733989f7062ab1da43479e582f8c7d42e067459dee3faad58','24f632f61c8af92ab7028fb588041a758b3bf143d4ddcb6daec6916c89d7a667','2b723cc8d7a5d872337aee3033a7fc98c4a1d2cafe7f0685a770f5b937440d11'];
const runs=selected.map(sha256=>{
 const example=report.clusters.flatMap((c:any)=>c.examples).find((e:any)=>e.sha256===sha256&&e.entry===2&&e.traceDirectory),sourceFrameOffset=example.sourceFrame-example.localFrame,dir=path.join(a.captures!,sha256),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8')),pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin'));
 if(hash(pads)!==sha256||hash(ram)!==capture.ramSha256)throw Error('Native capture integrity mismatch');
 const endFrame=moodNativeTimeline(ram).loads.find(f=>f>sourceFrameOffset)??pads.length,initial=ram.subarray((sourceFrameOffset-1)*2048,sourceFrameOffset*2048),segmentPads=pads.subarray(sourceFrameOffset,endFrame),segmentRam=ram.subarray(sourceFrameOffset*2048,endFrame*2048),level=`${initial[0x75f]+1}-${initial[0x75c]+1}`,compiled=observedLevels().find(l=>l.id===level)!,camera=initial[0x71a]*256+initial[0x71c],binding=selectNativeAreaBinding(compiled,nativeAreaBindings(compiled).bindings,initial[0xe7]+256*initial[0xe8],camera);
 if(binding.length!==1)throw Error('Native room binding is not unique');
 const events:any[]=[];for(let frame=1;frame<segmentPads.length;frame++){
  const before=segmentRam.subarray((frame-1)*2048,frame*2048),after=segmentRam.subarray(frame*2048,(frame+1)*2048);if(before[0x770]!==1||after[0x770]!==1||before[0x772]!==3||after[0x772]!==3||before[14]!==8||after[14]!==8||before[0xe7]!==after[0xe7]||before[0xe8]!==after[0xe8])continue;
  for(let slot=0;slot<5;slot++){
   const id=before[0x16+slot];if(!before[0xf+slot]||(before[0xf+slot]&128)||!ids.has(id)||!(before[0x1e+slot]&32))continue;
   const x=after[0x6e+slot]*256+after[0x87+slot]+after[0x401+slot]/256,y=after[0xb6+slot]*256+after[0xcf+slot]-256,cam=after[0x71a]*256+after[0x71c],left=cam-(id<13?73:72),right=cam+327+Number(left>=0),owned=Boolean(after[0xf+slot]&&after[0x16+slot]===id&&(after[0x1e+slot]&32));
   if(y>=256||Math.abs(Math.floor(x)-left)>5&&Math.abs(Math.floor(x)-right)>5)continue;
   const oam=after[0x6e5+slot];events.push({frame,slot,id,kind:NATIVE_ENEMY_KIND[id],beforeState:before[0x1e+slot],floatyBefore:before[0x110+slot],floatyAfter:after[0x110+slot],x,y,camera:cam,owned,speed:(after[0xa0+slot]<<24)>>24,force:after[0x434+slot],fraction:after[0x417+slot],spriteYs:Array.from({length:6},(_,i)=>after[0x200+((oam+4*i)&255)])});
  }
 }
 return {sha256,romSha256:capture.romSha256,sourceRamSha256:capture.ramSha256,entry:2,level,sourceFrameOffset,endFrame,initial:initial.toString('base64'),receipt:{schema:'native-mood-entry-v1',level,areaBinding:binding[0],initialRamSha256:hash(initial),actionsSha256:sha256,sourcePadSha256:sha256,sourceFrameOffset,initializationRole:'gameplay'},epochFrames:segmentPads.length,pads:sha256===selected[0]?[...segmentPads.subarray(0,430)]:[],...(sha256===selected[0]?{ramGzip:gzipSync(segmentRam.subarray(0,430*2048)).toString('base64')}:{}),events};
});
fs.writeFileSync(a.out,JSON.stringify({source:'Unchanged POWER-ON native RAM/pads; one-time entrance seed only. RunNormalEnemies returns through OffscreenBoundsCheck even when state bit5 is set.',runs})+'\n');console.log({runs:runs.length,frames:runs.reduce((n,r)=>n+r.pads.length,0),events:runs.reduce((n,r)=>n+r.events.length,0)});
