import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows from evidence/local/model-play/live-20261111 (PPU clock, trainer pads): the title start is pressed on row 60, the player
// then stands still in the remake and dies on the listed native death rows (first engine-11 row d). Remake step f <-> native row f-1.
// Native control rows after each death follow the 21-row interval clock (tick rows == 7 mod 21, frozen n+2 rows per death), the
// lives screen ends 19 rows after its 7th tick; native dying lengths are 207 or 208 rows (hidden), so rows are compared within 1.
function replay(deaths:number[]){
 const sim=new Simulation(structuredClone(observedLevels()));
 const out:{playRow:number;dyingRows:number;lives:number;time:number;x:number}[]=[];let titleRow=-1;
 let dieStep=0,dyingStart=0,pending=false;
 for(let f=1;f<=3400;f++){
  if(deaths.length&&f===deaths[0]+1){sim.die();deaths.shift();dieStep=f;dyingStart=f;pending=true;}
  const before=sim.phase;sim.step(f===61?['start']:[],1);
  if(pending&&before==='dying'&&sim.phase!=='dying'){out.push({playRow:-1,dyingRows:f-dyingStart+1,lives:sim.lives,time:sim.time,x:sim.player.x});}
  if(pending&&before==='intro'&&sim.phase==='play'){out.at(-1)!.playRow=f-1;out.at(-1)!.time=sim.time;pending=false;}
  if(before==='gameover'&&sim.phase==='title'){titleRow=f-1;break;}
 }
 void dieStep;return {out,titleRow};
}
const near=(a:number,b:number,tol:number,label:string)=>assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} vs native ${b}`);

test('native mood0 live run: control rows after deaths 1013, 2083 and the game-over title row 2843 (within 1 row)',()=>{
 const {out,titleRow}=replay([642,1711,2215]);
 near(out[0].dyingRows,208,1,'dying rows (native 208)');near(out[0].playRow,1013,1,'control after death 1');
 assert.equal(out[0].lives,2);assert.equal(out[0].time,400);assert.equal(out[0].x,40);
 near(out[1].dyingRows,207,1,'dying rows (native 207)');near(out[1].playRow,2083,1,'control after death 2');assert.equal(out[1].lives,1);
 near(titleRow,2843,1,'title row after game over');
});
test('native mood1 and mood7 live runs: control rows 1013/1726 and 1894/2419',()=>{
 let r=replay([646,1363]);near(r.out[0].playRow,1013,1,'mood1 death 1');near(r.out[1].playRow,1726,1,'mood1 death 2');
 r=replay([1526,2042]);near(r.out[0].playRow,1894,1,'mood7 death 1');near(r.out[1].playRow,2419,1,'mood7 death 2');
});
test('lives screen end depends on the interval clock: native 1-1 control rows after deaths on rows 642..646 coincide (1013) although the deaths differ by 4 rows',()=>{
 const a=replay([642]).out[0].playRow,b=replay([646]).out[0].playRow;
 assert.equal(a,b);
});
test('a death from the ground ends when Mario has fallen out of the native death arc: 207/208 rows from y 176, 219 from y 128 (1-4 native)',()=>{
 for(const [startFeet,native] of [[208,207.5],[160,219]]){
  const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
  const sim=new Simulation([level]);sim.reset(true);sim.step([],5);sim.player.y=startFeet;sim.die();
  let n=0;while(sim.phase==='dying'&&n<400){sim.step([],1);n++;}
  near(n,native,1,`dying rows from feet ${startFeet}`);
 }
});
test('1-2 respawn after the checkpoint is at native x 1576 (page 6 + 40), time 400',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-2')!);
 const sim=new Simulation([level]);sim.reset(true);
 const s=sim as unknown as {checkpoint:boolean;activatedCheckpointArea?:string};s.checkpoint=true;s.activatedCheckpointArea='area-2';
 sim.die();let n=0;while(sim.phase!=='play'&&n++<700)sim.step([],1);
 assert.equal(sim.phase,'play');assert.equal(Math.round(sim.player.x),1576);assert.equal(sim.time,400);
});

// Native rows from it000972 replays (PPU clock, RAM 0x77f = 21-row interval clock). A level reached through a next-level screen starts its clock at a fixed phase
// (0x77f == 1 on the control row) whatever came before; area loads and power changes freeze it, so later lives screens follow from there.
function fromNextLevel(id:string,control:number,act:(sim:Simulation,row:number)=>boolean){
 const levels=observedLevels(),sim=new Simulation(structuredClone([levels[0],levels.find(l=>l.id===id)!]));sim.reset(true);
 (sim as unknown as {nextLevel():void}).nextLevel();let n=0;while(sim.phase!=='play'&&n++<400)sim.step([],1);assert.equal(sim.phase,'play');
 for(let row=control+1;row<control+12000;row++){sim.player.invincible=99;if(act(sim,row))return;sim.step([],1);}
 assert.fail('native scenario did not finish');
}
function controlAfter(sim:Simulation){let n=0;while(sim.phase==='dying'&&n<700){sim.step([],1);n++;}const dying=n;while(sim.phase==='intro'&&n<1400){sim.step([],1);n++;}assert.equal(sim.phase,'play');return {dying,total:n};}
test('1-3 lives screen after a pit has 7 ticks, not 14: native pit passes y 240 on row 6056, control row 6478, level control row 5322',()=>{
 fromNextLevel('1-3',5322,(sim,row)=>{if(row<6057)return false;sim.player.y=274;sim.player.vy=4;sim.die(false,true);const {total}=controlAfter(sim);near(row-1+total,6478,1,'control after 1-3 pit');return true;});
});
test('1-2 clock runs through the auto-walk and pipe: native death row 3821 from feet 160 gives control 4197 (level screen control 2442)',()=>{
 fromNextLevel('1-2',2442,(sim,row)=>{if(row<3821)return false;assert.equal(sim.phase,'play');sim.player.y=160;sim.die();const {dying,total}=controlAfter(sim);near(dying,219,1,'dying rows');near(row+total-1,4197,1,'control after 1-2 death');return true;});
});
test('time-out: native 1-4 digits reach 000 on row 15044, death row 15068 and a 14-tick screen; control 318 rows after the last death row',()=>{
 let zero=0;
 fromNextLevel('1-4',7844,(sim,row)=>{
  sim.player.invincible=99;if(sim.time===0&&!zero)zero=row-1;
  if(sim.phase==='play')return false;
  near(zero,15044,1,'digits reach 000');near(row-1,15068,1,'time-out death row');
  assert.equal(sim.timeUpScreen,false);
  const {dying,total}=controlAfter(sim);near(total-dying,318,1,'rows from last death row to control');return true;
 });
});
test('title start: native timer shows 400 on control row 215, 399 on 239, 398 on 263',()=>{
 const sim=new Simulation(structuredClone(observedLevels()));let row=-1;const ticks:number[]=[];let last=-1;
 for(let f=1;f<=300;f++){sim.step(f===61?['start']:[],1);row=f-1;if(sim.phase==='play'){if(last>=0&&sim.time!==last)ticks.push(row);last=sim.time;}}
 assert.deepEqual(ticks.slice(0,2),[239,263]);
});
test('power changes freeze the clock: native 59 rows growing, 55 shrinking (0x77f held)',()=>{
 const sim=new Simulation(structuredClone([observedLevels()[0]]));sim.reset(true);sim.step([],2);
 const s=sim as unknown as {lifeFrozen:number};const before=s.lifeFrozen;
 sim.powerChange={from:0,to:1,remaining:59,kind:'grow'};sim.step([],59);assert.equal(s.lifeFrozen-before,59);assert.equal(sim.powerChange,undefined);
});
test('pit fall rows follow the last jump force: native 259-260 run, 246 walk, 248 medium',()=>{
 for(const [force,native] of [[0.5625,259.5],[0.4375,246],[0.375,248]]){
  const sim=new Simulation(structuredClone([observedLevels()[0]]));sim.reset(true);
  (sim as unknown as {lastJumpFallForce:number}).lastJumpFallForce=force;sim.player.y=274;sim.player.vy=4;sim.die(false,true);
  let n=0;while(sim.phase==='dying'&&n<400){sim.step([],1);n++;}near(n+1,native,1.5,`rows at force ${force}`);
 }
});
test('pause freezes the clock for exactly the paused rows (native 370-469, 0x77f held) and start does not skip a lives screen (native t1 150 rows with start at row 140)',()=>{
 const sim=new Simulation(structuredClone([observedLevels()[0]]));sim.reset(true);sim.step([],2);
 const s=sim as unknown as {lifeFrozen:number};const before=s.lifeFrozen;
 sim.step(['start'],1);assert.equal(sim.paused,true);sim.step([],99);assert.equal(s.lifeFrozen-before,100);
 const t=new Simulation(structuredClone(observedLevels()));let f=1;for(;f<=400;f++){t.step(f===61||f===141?['start']:[],1);if(t.phase==='play')break;}
 assert.equal(f-1,215,'control row unchanged by start during the screen');
});
test('a mid-air death keeps the speed fraction: native arcs by first row of speed -3 (t) at absolute y0 last 203..229 rows',()=>{
 for(const [n,y0,t] of [[203,404,16],[204,412,18],[207,417,20],[217,360,18],[229,339,22],[223,359,21],[222,366,22],[207,432,22],[215,351,16],[224,314,16]]){
  const sim=new Simulation(structuredClone([observedLevels()[0]]));sim.reset(true);sim.step([],5);
  sim.player.y=y0-256+32;sim.player.grounded=false;sim.player.vy=Math.max(0,22.4-t)*0.15625+1;sim.die();
  let rows=0;while(sim.phase==='dying'&&rows<400){sim.step([],1);rows++;}near(rows,n,1.5,`rows from y0 ${y0} t ${t}`);
 }
});
test('4-2 area-3 respawn after the checkpoint is at native x 1576 (death at x 2207, control x 1576 y 176, time 400)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);
 const sim=new Simulation([level]);sim.reset(true);
 const s=sim as unknown as {checkpoint:boolean;activatedCheckpointArea?:string};s.checkpoint=true;s.activatedCheckpointArea='area-3';
 sim.die();let n=0;while(sim.phase!=='play'&&n++<700)sim.step([],1);
 assert.equal(Math.round(sim.player.x),1576);assert.equal(sim.time,400);
 sim.step([],3);assert.equal(sim.player.y,208,'stands on the ground like native y 176');
});
