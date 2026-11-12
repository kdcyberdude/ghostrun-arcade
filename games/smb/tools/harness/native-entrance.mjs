/** One-time capture initialization from observed RAM, never a mid-run correction. Roles: research docs/NATIVE_ROLES.md and tools/harness/{power-cases,shot-pairs}. */
export function decodeEntrance(ram,receipt){
 if(ram.length!==2048)throw Error('Expected 2048 observed RAM bytes');
 const signed=v=>v<128?v:v-256,digits=(a,n)=>Array.from(ram.slice(a,a+n)).reduce((sum,v)=>{if(v>9)throw Error('Invalid observed HUD digit');return sum*10+v;},0);
 const level=`${ram[0x75f]+1}-${ram[0x75c]+1}`;
 if(level!==receipt.level||ram[0x770]!==1||ram[0x772]!==3||![7,8].includes(ram[14]))throw Error('Observed entrance is not a supported live level start');
 const grounded=ram[0x1d]===0;
 if(ram[0xb5]!==1||(!grounded&&(ram[0x1d]!==1||ram[14]!==8||![96,112,144].includes(ram[0x70a]))))throw Error('Unsupported observed entrance motion');
 if(grounded&&(signed(ram[0x9f])!==0||ram[0x433]!==0))throw Error('Ground state has vertical motion');
 return {level,engine:ram[14],grounded,vy:signed(ram[0x9f])+ram[0x433]/256,fallForce:ram[0x70a],x:signed(ram[0x6d])*256+ram[0x86]+ram[0x400]/256,y:ram[0xce]+32+ram[0x416]/256,speed:signed(ram[0x57])*256+ram[0x705],facing:ram[0x33]===2?-1:1,size:ram[0x756],camera:ram[0x71a]*256+ram[0x71c],time:digits(0x7f8,3),score:digits(0x7dd,6)*10,coins:ram[0x75e],lives:(ram[0x75a]+1)&255,random:Array.from(ram.slice(0x7a7,0x7ae)),counter:ram[9],timerControl:ram[0x787],movingDir:ram[0x45]===1?1:ram[0x45]===2?-1:0,speedAbsolute:ram[0x700],runningTimer:ram[0x783],runningSpeed:ram[0x703],intervalControl:ram[0x77f],frenzyBag:ram[0x6dd],slots:[0,1,2,3,4].map(s=>({flag:ram[0xf+s],id:ram[0x16+s],x:ram[0x6e+s]*256+ram[0x87+s]+ram[0x401+s]/256,y:ram[0xb6+s]*256+ram[0xcf+s],speed:signed(ram[0xa0+s]),force:ram[0x434+s],fraction:ram[0x417+s],timer:ram[0x796+s]})),cannons:[0,1,2,3,4,5].map(k=>({x:ram[0x46b+k]*256+ram[0x471+k],y:ram[0x477+k],timer:ram[0x47d+k]})),colorRotate:ram[0x6d4]};
}
export function initializeEntrance(sim,start){
 const index=sim.levels.findIndex(level=>level.id===start.level);if(index<0)throw Error('Unmapped level');
 sim.levelIndex=index;sim.checkpoint=false;sim.loadArea(sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;
 if(Math.abs(sim.area.spawn[0]-start.x)>8||Math.abs(sim.area.spawn[1]-start.y)>(start.grounded?1:32))throw Error('Observed pose does not match the mapped main-area entrance');
 if(start.engine===7&&!sim.area.autoWalk)throw Error('Unsupported observed entry routine');
 Object.assign(sim.player,{x:start.x,y:start.y,vx:start.speed/4096,vy:start.vy,grounded:start.grounded,facing:start.facing,size:start.size});
 if(!start.grounded){sim.fallGravity=start.fallForce/256;sim.lastJumpFallForce=start.fallForce/256;sim.jumpArc=true;sim.walkingOff=false;sim.bouncing=false;sim.runJump=start.fallForce===144;sim.mediumJump=start.fallForce===96;sim.landJump='held';}
 /* the motor is the native bytes: speed $57/$0705, facing $33, Player_MovingDir $45, Player_XSpeedAbsolute $0700, RunningTimer $0783, RunningSpeed $0703 */
 sim.motor.reset(start.speed,start.facing,start.movingDir,start.speedAbsolute);sim.motor.runningTimer=start.runningTimer??0;sim.motor.runningSpeed=start.runningSpeed??0;
 if(start.movingDir)sim.movingDir=start.movingDir;
 sim.camera=start.camera;
 /* A pipe intro (auto-walk area) shows blank 000 digits natively; the level clock (400) is loaded when the main area starts, so keep the remake's own intro clock there. */
 if(!(sim.area.autoWalk&&start.time===0)){sim.time=start.time;
  /* native GameTimerCtrl ($0787) counts down to the next digit tick (24 frames); timerFrames counts up to 24 */
  if(start.timerControl!==undefined)sim.timerFrames=start.timerControl===0?23:(24-start.timerControl)%24;}
 sim.score=start.score;sim.coins=start.coins;sim.lives=start.lives;
 /* cannon table RAM 0x46B/0x471/0x477 (page, x, y) and timers 0x47D: the level load already filled it and ran its first passes before the first retained row */
 if(start.cannons){const list=(sim.area.cannons??[]).filter(c=>c.native);let loaded=0;
  sim.cannonTable=start.cannons.map(c=>{if(!c.x&&!c.y)return undefined;const i=list.findIndex(k=>k.x===c.x&&k.y===c.y);if(i<0)throw Error(`Observed cannon ${c.x},${c.y} is not mapped`);loaded=Math.max(loaded,i+1);return {cannon:list[i],timer:c.timer};});
  sim.cannonsLoaded=loaded;sim.cannonStartTable=sim.cannonTable;}
 /* objects already live in enemy slots: a frenzy Bullet Bill (id 8) and lava Podoboos (id 12) take their native slot, position and vertical state */
 for(const [s,o] of (start.slots??[]).entries()){
  if(!o.flag)continue;
  if(o.id===8){sim.spawnNativeBullet(o.x,o.y-256+24,-1);Object.assign(sim.enemies[sim.enemies.length-1],{enemySlot:s,age:2,frenzy:true});}
  if(o.id===12){const e=sim.enemies.find(e=>e.kind==='podoboo'&&e.launch&&e.originX===Math.floor(o.x));if(!e)throw Error(`Observed Podoboo at ${o.x} is not mapped`);
   Object.assign(e,{active:true,enemySlot:s,age:2,pod:{y:o.y,speed:o.speed,force:o.force,fraction:o.fraction,timer:o.timer},y:o.y-256+24});}
 }
 if(start.frenzyBag!==undefined)sim.swimBag=start.frenzyBag; /* BitMFilter $06DD: heights already used by the Cheep / Bullet Bill frenzy */
 if(start.intervalControl!==undefined){sim.intervalControl=start.intervalControl;sim.alignLifeClock(start.intervalControl);} /* IntervalTimerControl $077F: phase of the 21-frame interval timers (also the lives-screen clock) */
 sim.random.bytes=[...start.random];sim.random.frame=start.counter;if(start.colorRotate!==undefined)sim.colorRotations=start.colorRotate;sim.broClock=start.counter;
 sim.inputs=[new Set(),new Set()];sim.previous=new Set();sim.recordedRoute=false;
 return {initialized:['level main area','observed pose, subpixels, velocity, takeoff force and motor','camera','power','HUD score/coins/lives/time','random register and counter','cannon table and timers','interval timer phase','frenzy height filter','live frenzy Bullet Bills and Podoboos','palette rotation offset','game timer subphase','neutral prior inputs'],notReconstructed:['full native emulator state','enemy slot allocation and hidden per-enemy state','other hidden engine clocks','pre-existing audio phase'],method:'One initialization before the first retained action. Existing simulation, collisions, damage and deaths remain active. Controller transport is declared separately. No future action is pre-applied and no later state correction occurs.'};
}
