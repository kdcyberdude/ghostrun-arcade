import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {nativeHurtHeight} from '../src/native-hurtbox.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';

// Native rows of the all-worlds model runs (evidence/local/model-play/worlds-20261111): [kind, dy, touches?, run.row]. dy = enemy y of the row before - Mario y of the row, on rows where the contact test runs.
const NATIVE_ROWS:[string,number,boolean,string][]=[
 ['koopa',23,true,'5-2/mood0.r1434 death'],['koopa',24,false,'no contact in 1018 rows at dy >= 24'],
 ['redKoopa',23,true,'4-3/mood0.r905 death'],
 ['goomba',18,true,'stomp rows at dy 18'],['goomba',19,false,'1-2/mood0.r106 lives'],
 ['spiny',17,true,'6-1/mood5.r1233 death'],['spiny',19,false,'alive row'],
 ['piranha',18,true,'controlled3-1 neutral.r2966 death; rectangle144..150 vs Mario132..144'],['piranha',19,false,'controlled3-1 original.r2968 lives; rectangle145..151 vs Mario132..144'],['piranha',24,false,'4-1 and 8-1 alive rows'],
 ['podoboo',16,true,'3-4/mood5.r182 death'],['podoboo',17,false,'alive row'],
 ['cheep',12,true,'leaping Cheep death'],['cheep',13,false,'7-3/mood0.r487 lives'],['cheep',0,true,'2-3/mood5.r500 death'],['cheep',-1,false,'2-3/mood3.r1812 lives'],
 ['blooper',0,true,'2-2/mood5.r958 death'],['blooper',-1,false,'2-2/mood0.r1086 lives'],
 ['paratroopa',-1,true,'8-2/mood3.r220 death'],['paratroopa',-2,false,'alive row'],
];

test('touching height per kind follows the native death and survival rows',()=>{
 for(const [kind,dy,touch,row]of NATIVE_ROWS)assert.equal(nativeHurtHeight(kind,dy,false,false),touch,`${kind} dy ${dy}: ${row}`);
});

test('kinds with no native death keep the existing box, and a big Mario is not cut at the small head',()=>{
 assert.equal(nativeHurtHeight('bowser',5,false,true),true);assert.equal(nativeHurtHeight('bowser',40,false,false),false);
 assert.equal(nativeHurtHeight('cheep',-10,true,false),true);
});

function contact(kind:EnemySpec['kind'],dy:number,vy:number,setup?:(sim:Simulation)=>void){
 const tiles:Tile[]=Array.from({length:64},(_,x)=>[x,13,84]);
 const my=100,feet=my+dy+24;
 const level:Level={id:'fixture',time:400,main:'main',evidence:'Synthetic hurt fixture at native offsets',areas:[{id:'main',width:1024,palette:0,theme:'ground',spawn:[100,208],tiles,enemies:[{kind,x:109,y:feet}],evidence:'Synthetic'}]};
 const sim=new Simulation([level]);sim.reset(true);
 sim.player.y=my+32;sim.player.vy=vy;sim.player.grounded=false;setup?.(sim);
 (sim as any).updateEnemies(sim.player.y);
 return sim.phase;
}

test('5-2 mood0 r1434: a rising Mario touches a Koopa at dy 23, one row lower he does not',()=>{
 assert.equal(contact('koopa',23,-4),'dying');
 assert.equal(contact('koopa',24,-4),'play');
});

test('rising off a stomp is not a touch in the extended Koopa reach',()=>{
 assert.equal(contact('koopa',20,-4,sim=>{(sim as any).bouncing=true;}),'play');
});

test('a Cheep below its native reach no longer hurts (old 16 px box reached dy 22)',()=>{
 assert.equal(contact('cheep',12,0),'dying');
 assert.equal(contact('cheep',13,0),'play');
});
