import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,FLAG_COMPLETION} from '../src/simulation.js';
import {flagPoleTouched} from '../src/award-rules.js';
import type {Level,Tile} from '../src/types.js';

// Native RAM evidence from the v2 traces: score digits $07DD, coins $075E, block buffer $0500, engine $0E, GameTimerCtrlTimer $0787.
function fixture(extra:Tile[],exit?:Level['areas'][0]['exit']){
 const tiles:Tile[]=[...Array.from({length:60},(_,x)=>[x,13,84] as Tile),...extra];
 const level:Level={id:'award-fixture',time:400,main:'main',evidence:'synthetic',areas:[{id:'main',width:960,palette:0,theme:'ground',tiles,enemies:[],spawn:[80,208],exit,evidence:'test'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim as any;
}

// 1-2 v2 row 865: small Mario bumps the brick at column 59 (block buffer 52 -> 23) and the coin above it (C2 -> 0) goes with it: coins 12 -> 13, score +200 on that row.
for(const [name,id,taken] of [['brick',82,true],['question block',192,true],['used block',196,false]] as const)
 test(`bumping a ${name} ${taken?'takes':'leaves'} the coin on top (native CheckTopOfBlock)`,()=>{
  const s=fixture([[10,9,id],[10,8,194]]),p=s.player;p.x=152;p.y=176;p.vy=-4;p.grounded=false;
  for(let f=0;f<6&&p.vy<0;f++)s.step([],1);
  assert.equal(s.tiles.get('10,8'),taken?undefined:194);
  const blockCoin=id===192?1:0;assert.equal(s.coins,(taken?1:0)+blockCoin);assert.equal(s.score,((taken?1:0)+blockCoin)*200);
 });

// [level, x after the row before the touch, x after the touch row's move (before the snap), pole column x]: 4-1 rows 1571/1572, 1-1 2180/2181, 5-1 3647/3648, 6-2 3987/3988, 7-1 2971/2972.
const TOUCHES:[string,number,number,number][]=[['4-1',3587.81,3590.31,3600],['1-1',3157.81,3159.27,3168],['5-1',3171.56,3174.06,3184],['6-2',3445.62,3446.68,3456],['7-1',2853.94,2856.44,2864],['3-1',3189.94,3192.25,3200]];
test('the pole is taken when floor(x)+10 reaches the pole column (native engine 4 rows)',()=>{
 for(const [level,before,at,pole] of TOUCHES){assert.equal(flagPoleTouched(before,pole+8),false,`${level} row before`);assert.equal(flagPoleTouched(at,pole+8),true,`${level} touch row`);}
});

// Native FlagpoleYPosData $22/$50/$68/$90 on Mario's y of the touch row: [level, y, award] from the v2 traces (score digits at the engine 4 -> 5 row).
const GRABS:[string,number,number][]=[['1-1',142,400],['2-1',152,100],['3-3',153,100],['4-1',110,400],['4-3',143,400],['6-1',60,2000],['6-2',151,100],['7-1',158,100],['3-1',137,400]];
test('flag award follows the native y table',()=>{
 const award=(feet:number)=>FLAG_COMPLETION.scoreThresholds.find((t:{feetBelow:number})=>feet<t.feetBelow)?.score??FLAG_COMPLETION.lowestScore;
 for(const [level,y,score] of GRABS)assert.equal(award(y+32),score,`${level} y ${y}`);
 assert.equal(award(33+32),5000);assert.equal(award(34+32),2000);assert.equal(award(103+32),800);assert.equal(award(104+32),400);
});

test('flag points land on the last slide row, 62 rows after the touch (18 of 19 v2 grabs; 4-1 1572 -> 1634)',()=>{
 const s=fixture([],{x:248,doorX:400,kind:'flag'});const p=s.player;p.x=230;p.y=150;p.vy=0;p.grounded=false;
 let touch=-1,paid=-1;
 for(let f=0;f<120&&paid<0;f++){s.step([],1);if(s.phase==='flag'&&touch<0)touch=s.frame;if(touch>=0&&s.score>0)paid=s.frame;}
 assert.ok(touch>=0);assert.equal(paid-touch,FLAG_COMPLETION.slideFrames);
});

test('a timer tick due on the pole-touch row does not happen (1-1 v2 row 2181: $0787 reaches 0, digits stay 358)',()=>{
 const s=fixture([],{x:248,doorX:400,kind:'flag'});const p=s.player;p.x=230;p.y=150;p.vy=0;p.grounded=false;s.timerFrames=23;
 s.step([],1);assert.equal(s.phase,'flag');assert.equal(s.time,400);
});
