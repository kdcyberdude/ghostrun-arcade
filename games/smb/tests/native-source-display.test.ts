import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs') as {PNG:{sync:{read:(input:Buffer)=>{data:Uint8Array}}}};
import {NativeSourceMachine} from '../src/native-source-machine.js';import {nativeSourcePatternsFromRgba,nativeSourceDisplay} from '../src/native-source-display.js';import fixture from './fixtures/native-source-display.json';
type Case={capture:string;pads:string;pixelsSha256:string[];emphasisSha256:string[]};
const cases=JSON.parse(zlib.gunzipSync(Buffer.from(fixture.proof,'base64')).toString()) as Case[];
const patterns=nativeSourcePatternsFromRgba(PNG.sync.read(fs.readFileSync(new URL('../assets/graphics/patterns-index.png',import.meta.url))).data);
const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
function hashes(frame:ReturnType<NativeSourceMachine['predictNextDisplay']>){assert.ok(frame);const result=nativeSourceDisplay(frame,patterns),crop=new Uint8Array(240*224);for(let y=0;y<224;y++)crop.set(result.pixels.subarray((y+8)*256+8,(y+8)*256+248),y*240);return {pixels:sha(crop),emphasis:sha(result.emphasis.subarray(8,232))};}
test('owned vblank frontiers match every captured native pixel and emphasis row',()=>{
 assert.equal(fixture.pixels,152570880);
 for(const c of cases){const m=new NativeSourceMachine(),pads=Buffer.from(c.pads,'base64');let retained:typeof m.ppu.displayFrontier|undefined,retainedHash:string|undefined;
  for(let f=0;f<fixture.samples;f++){m.step(pads[f]);const actual=hashes(m.ppu.displayFrontier);assert.equal(actual.pixels,c.pixelsSha256[f],`${c.capture} PPU${f} pixels`);assert.equal(actual.emphasis,c.emphasisSha256[f],`${c.capture} PPU${f} emphasis`);
   if(f===935){retained=m.ppu.displayFrontier;retainedHash=actual.pixels;}
   if(f>=935&&f<=940){const before=m.snapshot(),ram=sha(m.ram),frontier=m.ppu.displayFrontier,projected=m.predictNextDisplay();assert.deepEqual(m.snapshot(),before,'view projection cannot advance owned CPU/PPU');assert.equal(sha(m.ram),ram);assert.equal(m.ppu.displayFrontier,frontier);
    if(f===937){assert.ok(projected,'pending source parser needs no future input');assert.equal(projected.frame,f+1);const predicted=hashes(projected);assert.equal(predicted.pixels,c.pixelsSha256[f+1]);assert.equal(predicted.emphasis,c.emphasisSha256[f+1]);}
    else assert.equal(projected,undefined,'fresh NMI needs unknown controller feedback and must decline');
   }
  }
  assert.equal(hashes(retained).pixels,retainedHash,'many steps before rendering cannot mutate an older frozen frame');
 }
});
