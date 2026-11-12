import{test}from'node:test';import assert from'node:assert/strict';import{Simulation}from'../src/simulation.js';import type{EnemySpec,Level,Tile}from'../src/types.js';
import forecasts from'../evidence/shell-launch-proposal-forecasts.json';
function shellFixture(kind:EnemySpec['kind']='koopa',left=false,before=false,targetKind:EnemySpec['kind']='goomba'){
 const shell:EnemySpec={kind,x:left?72:48,y:208,direction:left?1:-1},victim:EnemySpec={kind:targetKind,x:left?16:160,y:208,direction:left?1:-1};
 const level:Level={id:'launch-component-fixture',main:'main',time:400,evidence:'Declared real stomp/kick fixture; no state changes after reset and no campaign-win claim',areas:[{id:'main',width:1280,palette:0,theme:'ground',spawn:[left?80:40,176],tiles:Array.from({length:80},(_,x)=>[x,13,84]as Tile),enemies:before?[victim,shell]:[shell,victim],evidence:'Ordinary controls thereafter'}]};const s=new Simulation([level]);s.reset(true);return s;
}
function realHit(s:Simulation,left=false){const shell=s.enemies.find(e=>e.kind==='koopa'||e.kind==='redKoopa')!,victim=s.enemies.find(e=>e!==shell)!;const away=left?'right':'left',toward=left?'left':'right';for(let i=0;i<100&&!shell.shell&&s.phase==='play';i++)s.step([away],1);assert.equal(shell.shell,true);s.step([away],45);for(let i=0;i<100&&!shell.movingShell&&s.phase==='play';i++)s.step([toward,'b'],1);assert.equal(shell.movingShell,true);assert.equal(s.score,500);for(let i=0;i<150&&!victim.dead&&s.phase==='play';i++)s.step([toward,'b'],1);assert.ok(victim.dead);assert.equal(s.score,1000);assert.equal(s.popups.some(p=>p.value===500||p.value===800),false);return victim;}
test('ordinary rightward green-shell hit preserves birth position and first moves on the following native update for either enemy order',()=>{
 for(const before of[false,true]){const s=shellFixture('koopa',false,before),e=realHit(s),x=e.x,y=e.y;assert.equal(y,208);assert.equal(e.greenShellLaunchFrame,s.frame);assert.equal(e.vy,-3);assert.notEqual(e.squashed,true);s.step([],1);assert.equal(e.x,x+1);assert.equal(e.y,y-3);assert.equal(e.vy,-3+31/128);}
});
test('actual Simulation forecasts the independently reserved source trajectories within1px without future state replacement',()=>{
 for(const observed of forecasts.cases){const s=shellFixture(),e=realHit(s),x=e.x;let age=0;for(const point of observed.points){s.step([],point.age-age);age=point.age;assert.equal(e.x,x+age);assert.ok(Math.abs(Math.floor(e.y)-15-point.visibleBodyTop)<=1,JSON.stringify({case:observed.name,age,actual:Math.floor(e.y)-15,reference:point.visibleBodyTop}));assert.ok(e.vy<=3);}assert.equal(s.player.invincible,0);assert.equal(s.score,1000);}
});
test('ordinary pause freezes the qualified launch and reset clears its cause',()=>{
 const s=shellFixture(),e=realHit(s),before=[e.x,e.y,e.vy,e.dead,s.frame];s.step(['start'],1);s.step([],44);assert.deepEqual([e.x,e.y,e.vy,e.dead,s.frame],before);s.step(['start'],1);assert.equal(e.x,before[0]+1);assert.equal(e.y,before[1]-3);s.reset(true);assert.ok(s.enemies.every(e=>e.greenShellLaunchFrame===undefined));
});
test('red shells, opposite kicks and non-Goomba victims retain their unqualified legacy launch path',()=>{
 for(const[kind,left,target]of[['redKoopa',false,'goomba'],['koopa',true,'goomba'],['koopa',false,'redKoopa']]as const){const s=shellFixture(kind,left,false,target),e=realHit(s,left),x=e.x;assert.equal(e.greenShellLaunchFrame,undefined);s.step([],40);assert.equal(e.x,x);assert.ok(e.vy>3);}
});
function contactFixture(block=false){const level:Level={id:'other-cause-fixture',main:'main',time:400,evidence:'Declared initial item/power fixture, actual production collision thereafter',areas:[{id:'main',width:1280,palette:0,theme:'ground',spawn:[40,208],tiles:[...Array.from({length:80},(_,x)=>[x,13,84]as Tile),...(block?[[3,9,81]as Tile]:[])],enemies:[{kind:'goomba',x:block?48:70,y:block?144:208,direction:block?1:-1}],evidence:'Ordinary controls thereafter'}]};const s=new Simulation([level]);s.reset(true);return s;}
test('Star and fired-fireball Goomba deaths keep their separate legacy motor',()=>{
 for(const cause of['star','fireball']){const s=contactFixture();if(cause==='star'){s.items.push({kind:'star',x:40,y:192,vx:0,vy:0,age:0,life:100});s.step([],1);}else s.player.size=2;const e=s.enemies[0];for(let i=0;i<80&&!e.dead&&s.phase==='play';i++)s.step(cause==='star'?['right','b']:['b'],1);assert.ok(e.dead);assert.equal(e.greenShellLaunchFrame,undefined);const x=e.x;s.step([],40);assert.equal(e.x,x);assert.ok(e.vy>3);}
});
test('a real block bump retains its separate Goomba defeat path',()=>{
 const s=contactFixture(true),e=s.enemies[0];for(let i=0;i<40&&!e.dead&&s.phase==='play';i++)s.step(['a'],1);assert.ok(e.dead);assert.equal(e.greenShellLaunchFrame,undefined);const x=e.x;s.step([],40);assert.equal(e.x,x);assert.ok(e.vy>3);
});
test('an initially declared airborne Goomba hit by a moving green shell remains unqualified',()=>{
 const s=contactFixture();s.player.x=180;const target=s.enemies[0];target.x=56;target.y=202;target.motion='flying';const shell={...target,kind:'koopa' as const,x:48,y:208,motion:undefined,active:true,shell:true,movingShell:true,vx:3};s.enemies=[target,shell];s.step([],1);assert.ok(target.dead);assert.equal(target.greenShellLaunchFrame,undefined);
});
