import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeEntities} from '../tools/harness/native-entities.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage,type StrictEntity} from '../tools/harness/native-strict-entities.js';

const ramEnemy=(id=6,slot=0)=>{const r=new Uint8Array(2048);r[0xf+slot]=1;r[0x16+slot]=id;r[0x6e+slot]=2;r[0x87+slot]=40;r[0xb6+slot]=1;r[0xcf+slot]=184;return r;};
const actor=(slot=0):StrictEntity=>({bank:'enemy',slot,kind:'goomba',x:552,y:184,source:'enemy'});
test('strict readout includes the birth row excluded by the legacy comparison',()=>{
 const r=ramEnemy();assert.equal(nativeEntities(r,new Uint8Array(2048)).length,0);
 assert.deepEqual(strictNativeEntities(r).entities,[{...actor(),state:0}]);
});
test('strict readout covers cannon Bullet Bills and preserves vertical pages and native area offsets',()=>{
 const r=ramEnemy(51);r[0xb6]=2;
 assert.equal(nativeEntities(r).length,0);
 assert.deepEqual(strictNativeEntities(r,-256).entities,[{bank:'enemy',slot:0,kind:'bullet',x:296,y:440,source:'enemy',state:0}]);
});
test('strict matching rejects extra and duplicate remake enemies',()=>{
 assert.equal(strictEntityDifferences(strictNativeEntities(new Uint8Array(2048)),[actor()]).mismatches[0].code,'extra');
 assert.equal(strictEntityDifferences(strictNativeEntities(ramEnemy()),[actor(),actor()]).mismatches[0].code,'extra');
});
test('strict matching uses slot identity and distinguishes missing, kind and position differences',()=>{
 const n=strictNativeEntities(ramEnemy());
 assert.deepEqual(strictEntityDifferences(n,[actor(1)]).mismatches.map(m=>m.code),['missing','extra']);
 assert.equal(strictEntityDifferences(n,[{...actor(),kind:'koopa'}]).mismatches[0].code,'kind');
 assert.equal(strictEntityDifferences(n,[{...actor(),y:183}]).mismatches[0].code,'position');
});
test('native flame and power-up item readouts use their enemy slot and actual coordinate conventions',()=>{
 const r=ramEnemy(21,2);r[0xcf+2]=128;
 const sim={enemies:[],items:[{kind:'flame',x:552,y:128,life:10,nativeFlame:{slot:2}},{kind:'mushroom',x:40,y:32,life:10,nativePowerState:1}]};
 const entities=strictSimEntities(sim);assert.deepEqual(strictEntityDifferences(strictNativeEntities(r),entities.slice(0,1)).mismatches,[]);
 assert.deepEqual(entities[1],{bank:'enemy',slot:5,kind:'mushroom',x:40,y:24,source:'powerup',state:1});
});
test('unsupported native objects and aliases are explicit gaps, never a clean comparison',()=>{
 const r=ramEnemy(35);r[0xf+1]=0x80;r[0x16+1]=27;
 const out=strictEntityDifferences(strictNativeEntities(r),[]);
 assert.deepEqual(out.gaps.map(g=>g.code),['unsupported-native-object','native-alias']);assert.equal(out.mismatches.length,0);
});
test('unassigned remake slots are explicit coverage gaps and extra actors',()=>{
 const out=strictEntityDifferences(strictNativeEntities(new Uint8Array(2048)),[{...actor(),slot:undefined}]);
 assert.equal(out.gaps[0].code,'unassigned-sim-slot');assert.equal(out.mismatches[0].code,'extra');
});
test('misc hammer slots are separate from enemy slots and include native first-frame state',()=>{
 const r=ramEnemy();r[0x2a]=0x90;r[0x7a]=2;r[0x93]=40;r[0xc2]=1;r[0xdb]=96;
 const sim={enemies:[{active:true,dead:0,enemySlot:0,kind:'goomba',x:552,y:208}],items:[{kind:'hammer',x:552,y:96,life:10,nativeHammer:{slot:0,state:0x90}}]};
 assert.deepEqual(strictEntityDifferences(strictNativeEntities(r),strictSimEntities(sim)).mismatches,[]);
 r[0x2a]=0x30;assert.equal(strictNativeEntities(r).gaps[0].code,'unsupported-native-misc');
});
test('missing model adapters remain explicit even when no native counterpart was encountered',()=>{
 const gaps=strictSimCoverage({area:{platforms:[{}],firebars:[{}],springs:[{}],vines:[{}]},items:[{kind:'fireball',life:1}]});
 assert.equal(gaps.length,5);assert.equal(gaps[4].code,'unsupported-sim-fireball');
});
test('native item state mismatches are reported separately from correct positions',()=>{
 const r=ramEnemy(46,5);r[0x39]=0;r[0x23]=128;
 const sim=strictSimEntities({enemies:[],items:[{kind:'mushroom',x:552,y:192,life:1,nativePowerState:192}]});
 assert.deepEqual(strictEntityDifferences(strictNativeEntities(r),sim).mismatches.map(m=>m.code),['state']);
});
test('declared flags and active fireworks cannot masquerade as complete entity coverage',()=>{
 const gaps=strictSimCoverage({area:{exit:{kind:'flag'}},items:[],flagFireworks:[{}]});
 assert.equal(gaps.length,2);assert.ok(gaps.every(g=>g.code==='unsupported-sim-object-family'));
});

test('nativeCoin misc objects are compared explicitly by slot, position and state',()=>{
 const r=new Uint8Array(2048);r[0x2a+8]=2;r[0x7a+8]=1;r[0x93+8]=32;r[0xc2+8]=1;r[0xdb+8]=64;
 const sim={enemies:[],items:[{kind:'coin',x:288,y:64,life:10,nativeCoin:{slot:8,state:2}}]};
 assert.deepEqual(strictEntityDifferences(strictNativeEntities(r),strictSimEntities(sim)).mismatches,[]);
 sim.items[0].x++;assert.equal(strictEntityDifferences(strictNativeEntities(r),strictSimEntities(sim)).mismatches[0].code,'position');
 assert.equal(strictSimEntities({enemies:[],items:[{kind:'coin',x:0,y:0,life:1}]}).length,1);
});

test('strict retainer readout includes its active birth row before the first graphics pass',()=>{
 const r=ramEnemy(53);r[0x6e]=9;r[0x87]=144;
 const sim={enemies:[],items:[],castleRetainer:{slot:0,x:2448,y:184,graphicsVisible:false}};
 const native=strictNativeEntities(r),actors=strictSimEntities(sim),result=strictEntityDifferences(native,actors);
 assert.equal(native.entities[0].kind,'retainer');assert.equal(actors.length,1);assert.deepEqual(result,{mismatches:[],gaps:[]});
 sim.castleRetainer.x++;assert.equal(strictEntityDifferences(native,strictSimEntities(sim)).mismatches[0].code,'position');
});
