import {test} from 'node:test';
import assert from 'node:assert/strict';
import controls from '../data/native-area-controls.json';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import zlib from 'node:zlib';
import snapshots from './fixtures/native-water-seed-cases.json';
import {NativeAreaControls} from '../src/native-area-controls.js';
import {decodeAreaControlObjects} from '../tools/harness/native-area-controls.js';

test('the shared water ROM stream retains source frenzy and scroll-lock objects',()=>{
 assert.deepEqual(controls.bindings['2-2/area-2'],{stream:'ae47',origin:0});
 assert.deepEqual(controls.bindings['7-2/area-4'],{stream:'ae47',origin:0});
 assert.deepEqual(controls.streams.ae47.objects,[{column:80,command:9,offset:34},{column:96,command:9,offset:42},{column:192,command:10,offset:116},{column:199,command:7,offset:118}]);
});
test('row13 source decoder skips the header, handles page selects, and keeps command offsets',()=>{
 const rom=new Uint8Array(32);rom.set([0x0d,0x47,0x0d,0x03,0x7d,0xc7,0xfd],16);
 assert.deepEqual(decodeAreaControlObjects(rom,0x8000),{objects:[{column:71,command:7,offset:4}]});
});

test('native water row22048 task3 toggles column199 lock, so the next row stays locked',()=>{
 const n=new NativeAreaControls('2-2','area-2');n.seedNative(199,false);
 n.advance(3);assert.deepEqual({column:n.column,locked:n.locked},{column:199,locked:true});
 n.advance(2);assert.deepEqual({column:n.column,locked:n.locked},{column:199,locked:true});
});
test('water snapshot columns distinguish fresh and nonzero-page checkpoint preload',()=>{
 const n=new NativeAreaControls('7-2','area-4');n.seedNative(24,false);assert.equal(n.column,24);
 // Native v2 checkpoint engine7 row3112: camera1280, CurrentPageLoc6/column8.
 n.seedNative(104,false);assert.equal(n.column,104);assert.equal(n.locked,false);
});

for(const row of [352,3112,3113])test(`natural water load starts at native parser column from7-2 row${row}`,()=>{
 const sample=snapshots.find(s=>s.level==='7-2'&&s.row===row)!;
 const r=zlib.gunzipSync(Buffer.from(sample.initial,'base64'));
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=sim.levels.findIndex((l:any)=>l.id==='7-2');
 sim.loadArea('area-4',undefined,r[0x71a]*256+r[0x71c]);
 assert.equal(sim.areaControls.column,r[0x725]*16+r[0x726]);
 assert.equal(sim.areaControls.locked,false);
});
test('initial source page accounts for the8-4 room origin exactly once',()=>{
 const n=new NativeAreaControls('8-4','area-5',0);assert.equal(n.column,24);
 const checkpoint=new NativeAreaControls('8-4','area-5',256);assert.equal(checkpoint.column,40);
});
