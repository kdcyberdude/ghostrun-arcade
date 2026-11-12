/** One-time capture initialization from observed RAM, never a mid-run correction. Roles: research docs/NATIVE_ROLES.md and tools/harness/{power-cases,shot-pairs}. */
export function decodeEntrance(ram,receipt){
 if(ram.length!==2048)throw Error('Expected 2048 observed RAM bytes');
 const signed=v=>v<128?v:v-256,digits=(a,n)=>Array.from(ram.slice(a,a+n)).reduce((sum,v)=>{if(v>9)throw Error('Invalid observed HUD digit');return sum*10+v;},0);
 const level=`${ram[0x75f]+1}-${ram[0x75c]+1}`;
 if(level!==receipt.level||ram[0x770]!==1||ram[0x772]!==3||![7,8].includes(ram[14]))throw Error('Observed entrance is not a supported live level start');
 const grounded=ram[0x1d]===0;
 if(ram[0xb5]!==1||(!grounded&&(ram[0x1d]!==1||ram[14]!==8||![96,112,144].includes(ram[0x70a]))))throw Error('Unsupported observed entrance motion');
 if(grounded&&(signed(ram[0x9f])!==0||ram[0x433]!==0))throw Error('Ground state has vertical motion');
 return {level,engine:ram[14],grounded,vy:signed(ram[0x9f])+ram[0x433]/256,fallForce:ram[0x70a],x:signed(ram[0x6d])*256+ram[0x86]+ram[0x400]/256,y:ram[0xce]+32+ram[0x416]/256,speed:signed(ram[0x57])*256+ram[0x705],facing:ram[0x33]===2?-1:1,size:ram[0x756],camera:ram[0x71a]*256+ram[0x71c],time:digits(0x7f8,3),score:digits(0x7dd,6)*10,coins:ram[0x75e],lives:(ram[0x75a]+1)&255,random:Array.from(ram.slice(0x7a7,0x7ae)),counter:ram[9]};
}
export function initializeEntrance(sim,start){
 const index=sim.levels.findIndex(level=>level.id===start.level);if(index<0)throw Error('Unmapped level');
 sim.levelIndex=index;sim.checkpoint=false;sim.loadArea(sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;
 if(Math.abs(sim.area.spawn[0]-start.x)>8||Math.abs(sim.area.spawn[1]-start.y)>(start.grounded?1:32))throw Error('Observed pose does not match the mapped main-area entrance');
 if(start.engine===7&&!sim.area.autoWalk)throw Error('Unsupported observed entry routine');
 Object.assign(sim.player,{x:start.x,y:start.y,vx:start.speed/4096,vy:start.vy,grounded:start.grounded,facing:start.facing,size:start.size});
 if(!start.grounded){sim.fallGravity=start.fallForce/256;sim.lastJumpFallForce=start.fallForce/256;sim.jumpArc=true;sim.walkingOff=false;sim.bouncing=false;sim.runJump=start.fallForce===144;sim.mediumJump=start.fallForce===96;sim.landJump='held';}
 sim.motor.reset(start.speed,start.facing);sim.motor.airRun=start.fallForce===144;if(Math.floor(start.speed/256)!==0)sim.motor.moving=Math.sign(start.speed);
 sim.camera=start.camera;sim.time=start.time;sim.score=start.score;sim.coins=start.coins;sim.lives=start.lives;
 sim.random.bytes=[...start.random];sim.random.frame=start.counter;sim.broClock=start.counter;
 sim.inputs=[new Set(),new Set()];sim.previous=new Set();sim.recordedRoute=false;
 return {initialized:['level main area','observed pose, subpixels, velocity, takeoff force and motor','camera','power','HUD score/coins/lives/time','random register and counter','neutral prior inputs'],notReconstructed:['full native emulator state','enemy slot allocation and hidden per-enemy state','timer subphase and other hidden engine clocks','pre-existing audio phase'],method:'One initialization before the first retained action. Existing simulation, collisions, damage and deaths remain active. Controller transport is declared separately. No future action is pre-applied and no later state correction occurs.'};
}
