import {decodeNativeLoad,initializeNativeLoad} from './native-load-seed.mjs';
import {decodeNativeWater,initializeNativeWater} from './native-water-seed.mjs';
import {seedNativeEndLevelMusic} from '../../src/native-event-music.ts';
import {seedNativeFrenzyControllers} from '../../src/native-frenzy-controllers.ts';
/** One-time capture initialization from observed RAM, never a mid-run correction. Roles: research docs/NATIVE_ROLES.md and tools/harness/{power-cases,shot-pairs}. */
export function decodeEntrance(ram,receipt,nativeArea=receipt.schema==='native-mood-entry-v1'?receipt.areaBinding:undefined){
 if(ram.length!==2048)throw Error('Expected 2048 observed RAM bytes');
 const signed=v=>v<128?v:v-256,digits=(a,n)=>Array.from(ram.slice(a,a+n)).reduce((sum,v)=>{if(v>9)throw Error('Invalid observed HUD digit');return sum*10+v;},0);
 const level=`${ram[0x75f]+1}-${ram[0x75c]+1}`,nativeLoad=nativeArea?decodeNativeLoad(ram):undefined;
 if(level!==receipt.level||ram[0x770]!==1||(!nativeLoad&&(ram[0x772]!==3||![7,8].includes(ram[14]))))throw Error('Observed entrance is not a supported live level start');
 const grounded=ram[0x1d]===0;
 if(!nativeArea&&(ram[0xb5]!==1||(!grounded&&(ram[0x1d]!==1||ram[14]!==8||![96,112,144].includes(ram[0x70a])))))throw Error('Unsupported observed entrance motion');
 if(!nativeArea&&grounded&&(signed(ram[0x9f])!==0||ram[0x433]!==0))throw Error('Ground state has vertical motion');
 const offset=nativeArea?.offset??0;
 const flagSlot=[0,1,2,3,4,5].find(s=>ram[0xf+s]===1&&ram[0x16+s]===49);
 const castleFlag=flagSlot===undefined?undefined:{slot:flagSlot,x:ram[0x6e+flagSlot]*256+ram[0x87+flagSlot]+offset,y:ram[0xcf+flagSlot],state:ram[0x1e+flagSlot],task:ram[0x746],interval:ram[0x796+flagSlot],draw:false};
 return {nativeLoad,playerBackgroundPriority:Boolean(ram[0x3c4]&32),playerDrawBackgroundPriority:Boolean(ram[0x202+ram[0x6e4]]&32),spriteShuffle:{offsets:Array.from(ram.slice(0x6e4,0x6f3)),amounts:Array.from(ram.slice(0x6e1,0x6e4)),index:ram[0x6e0]},cannonOffset:ram[0x46a],enemyDataPage:ram[0x73a],enemyDataSelected:Boolean(ram[0x73b]),castleFlag,fireworksCounter:ram[0x6d7],nativeFrenzyTimer:ram[0x78f],endLevelMusic:seedNativeEndLevelMusic(ram),endLevelMusicQueue:ram[0xfc],endLevelMusicAreaQueue:ram[0xfb],flagNumber:{y:ram[0x10d],fraction:ram[0x10e]},playerXScroll:ram[0x6ff],platformScroll:ram[0x3a1],enemyDataOffset:ram[0x739],...(nativeArea?{area:nativeArea.area,nativeAreaSnapshot:true,areaOffset:offset,nativeWater:nativeLoad?undefined:decodeNativeWater(ram,offset)}:{}),lakituReappear:ram[0x6d1],specialSlot:{flag:ram[0x14],id:ram[0x1b],x:ram[0x73]*256+ram[0x8c]+offset,y:ram[0xd4],vineHeight:ram[0x399],vineCount:ram[0x398],vineStartY:ram[0x39d],vineSlots:Array.from(ram.slice(0x39a,0x39a+ram[0x398])),frenzyQueue:ram[0x6cd],frenzyBuffer:ram[0x6cb]},fetchGameTimer:Boolean(ram[0x757]),screenTimer:ram[0x7a0],sideCollisionTimer:ram[0x785],scrollPosition:ram[0x755],stompTimer:ram[0x791],level,parserColumn:ram[0x725]*16+ram[0x726],scrollLocked:Boolean(ram[0x723]),parserTask:ram[0x71f],parserScroll:ram[0x73d],scroll32:ram[0x73d],primaryHardMode:Boolean(ram[0x76a]),secondaryHardMode:Boolean(ram[0x6cc]),engine:ram[14],grounded,vy:signed(ram[0x9f])+ram[0x433]/256,fallForce:ram[0x70a],x:signed(ram[0x6d])*256+ram[0x86]+ram[0x400]/256+offset,y:(ram[0xb5]-1)*256+ram[0xce]+32+ram[0x416]/256,speed:signed(ram[0x57])*256+ram[0x705],facing:ram[0x33]===2?-1:1,size:ram[0x756],star:ram[0x79f],starPalette:ram[0x3c4]&3,starDrawPalette:ram[0x202+ram[0x6e4]]&3,camera:ram[0x71a]*256+ram[0x71c]+offset,time:digits(0x7f8,3),score:digits(0x7dd,6)*10,coins:ram[0x75e],lives:(ram[0x75a]+1)&255,random:Array.from(ram.slice(0x7a7,0x7ae)),counter:ram[9],timerControl:ram[0x787],movingDir:ram[0x45]===1?1:ram[0x45]===2?-1:0,speedAbsolute:ram[0x700],runningTimer:ram[0x783],runningSpeed:ram[0x703],intervalControl:ram[0x77f],frenzyBag:ram[0x6dd],slots:[0,1,2,3,4].map(s=>({flag:ram[0xf+s],id:ram[0x16+s],x:ram[0x6e+s]*256+ram[0x87+s]+ram[0x401+s]/256+offset,y:ram[0xb6+s]*256+ram[0xcf+s],speed:signed(ram[0xa0+s]),force:ram[0x434+s],fraction:ram[0x417+s],timer:ram[0x796+s],xSpeed:signed(ram[0x58+s]),state:ram[0x1e+s],frameTimer:ram[0x78a+s]})),cannons:ram[0x74e]===0?undefined:[0,1,2,3,4,5].map(k=>({x:(ram[0x46b+k]||ram[0x471+k]||ram[0x477+k])?ram[0x46b+k]*256+ram[0x471+k]+offset:0,y:ram[0x477+k],timer:ram[0x47d+k]})),colorRotate:ram[0x6d4],anim:{ctrl:ram[0x70d],timer:ram[0x781],timerSet:ram[0x70c]},flameTimer:ram[0x78f],flameTimerCounter:ram[0x367],flameFrenzy:ram[0x6cb]===21};
}
export function initializeEntrance(sim,start){
 const snapshotActors=[];
 const index=sim.levels.findIndex(level=>level.id===start.level);if(index<0)throw Error('Unmapped level');
 sim.levelIndex=index;sim.checkpoint=false;sim.loadArea(start.area??sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;
 if(!start.nativeAreaSnapshot&&(Math.abs(sim.area.spawn[0]-start.x)>8||Math.abs(sim.area.spawn[1]-start.y)>(start.grounded?1:32)))throw Error('Observed pose does not match the mapped main-area entrance');
 if(start.engine===7&&!sim.area.autoWalk&&!start.nativeWater)throw Error('Unsupported observed entry routine');
 if(start.nativeAreaSnapshot&&start.engine===8){sim.entryTimerDelay=0;sim.entryInputDelay=0;sim.entryFalling=false;sim.entryVineActive=false;sim.autoVineActive=false;sim.pipeRise=0;}
 Object.assign(sim.player,{x:start.x,y:start.y,vx:start.speed/4096,vy:start.vy,grounded:start.grounded,facing:start.facing,size:start.size,star:start.star??0});
 if(start.castleFlag)sim.nativeCastleFlag={...start.castleFlag};if(start.fireworksCounter!==undefined)sim.nativeFireworksCounter=start.fireworksCounter;
 if(start.nativeFrenzyTimer!==undefined)sim.nativeFrenzyTimer=start.nativeFrenzyTimer;
 if(start.endLevelMusic)sim.nativeEndLevelMusic={...start.endLevelMusic};sim.nativeEndLevelMusicQueue=start.endLevelMusicQueue??0;sim.nativeEndLevelMusicAreaQueue=start.endLevelMusicAreaQueue??0;
 sim.playerBackgroundPriority=start.playerBackgroundPriority??sim.playerBackgroundPriority;sim.playerDrawBackgroundPriority=start.playerDrawBackgroundPriority??sim.playerBackgroundPriority;
 if(start.spriteShuffle)Object.assign(sim.spriteShuffle,structuredClone(start.spriteShuffle));
 sim.starPalette=start.starPalette??0;sim.starDrawPalette=start.star?start.starDrawPalette:undefined;
 if(!start.grounded){sim.fallGravity=start.fallForce/256;sim.lastJumpFallForce=start.fallForce/256;sim.jumpArc=true;sim.walkingOff=false;sim.bouncing=false;sim.runJump=start.fallForce===144;sim.mediumJump=start.fallForce===96;sim.landJump='held';sim.jumpPose=true;}
 if(start.nativeAreaSnapshot&&!start.grounded&&start.vy>=0&&sim.area.theme!=='water'){sim.jumpArc=false;sim.walkingOff=true;sim.landJump='inactive';}
 /* the motor is the native bytes: speed $57/$0705, facing $33, Player_MovingDir $45, Player_XSpeedAbsolute $0700, RunningTimer $0783, RunningSpeed $0703 */
 sim.motor.reset(start.speed,start.facing,start.movingDir,start.speedAbsolute);sim.motor.runningTimer=start.runningTimer??0;sim.motor.runningSpeed=start.runningSpeed??0;
 if(start.movingDir!==undefined){sim.movingDir=start.movingDir;sim.marioMotion=start.movingDir;}
 if(start.screenTimer!==undefined)sim.screenTimer=start.screenTimer;
 if(start.sideCollisionTimer!==undefined)sim.sideCollisionTimer=start.sideCollisionTimer;
 sim.camera=start.camera;if(start.scrollPosition!==undefined)sim.waterScrollX=start.scrollPosition;
 if(start.parserColumn!==undefined&&sim.areaControls){sim.areaControls.seedNative(start.parserColumn,start.scrollLocked);}
 if(start.parserTask!==undefined){sim.parserClock.task=start.parserTask;sim.parserClock.scroll=start.parserScroll;sim.parserLoaderWasBlocked=sim.parserClock.blocked;}
 if(start.flagNumber)Object.assign(sim.flagNumber,start.flagNumber);if(start.specialSlot?.id===48)sim.flagTop=start.specialSlot.y;
 if(start.lakituReappear!==undefined)sim.lakituReappearCount=start.lakituReappear;if(start.specialSlot)Object.assign(sim.specialSlot5,start.specialSlot);
 if(start.stompTimer!==undefined)sim.nativeStompTimer=start.stompTimer;
 sim.fetchGameTimer=start.fetchGameTimer??Boolean(sim.area.autoWalk&&start.time===0);sim.time=start.time;{
  /* native GameTimerCtrl ($0787) counts down to the next digit tick (24 frames); timerFrames counts up to 24 */
  if(start.timerControl!==undefined)sim.timerFrames=24-start.timerControl;}
 sim.score=start.score;sim.coins=start.coins;sim.lives=start.lives;
 /* cannon table RAM 0x46B/0x471/0x477 (page, x, y) and timers 0x47D: the level load already filled it and ran its first passes before the first retained row */
 if(start.cannons){const list=(sim.area.cannons??[]).filter(c=>c.native);let loaded=0;
  sim.cannonTable=start.cannons.map(c=>{if(!c.x&&!c.y)return undefined;const i=list.findIndex(k=>k.x===c.x&&k.y===c.y);if(i<0)throw Error(`Observed cannon ${c.x},${c.y} is not mapped`);loaded=Math.max(loaded,i+1);return {cannon:list[i],timer:c.timer};});
  sim.cannonsLoaded=loaded;sim.cannonOffset=start.cannonOffset??loaded%6;sim.cannonStartTable=sim.cannonTable;}
 /* objects already live in enemy slots: a frenzy Bullet Bill (id 8) and lava Podoboos (id 12) take their native slot, position and vertical state */
 /* Enemy_Y_Speed $A0+s (a firebar's angle) and the y fraction $0417+s stay in a slot between objects (src/firebar-slots.ts) */
 if(start.flameTimer!==undefined){sim.flameTimer=start.flameTimer;sim.flameTimerCounter=start.flameTimerCounter;sim.flameFrenzy=start.flameFrenzy;}
 if(start.slots){sim.slotSub=start.slots.map(o=>Math.round((o.x-Math.floor(o.x))*256)&255);sim.slotYSpeed=start.slots.map(o=>o.speed&255);sim.slotYFraction=start.slots.map(o=>o.fraction);}
 if(start.nativeAreaSnapshot&&start.enemyDataOffset!==undefined)for(const e of sim.enemies){const offset=e.nativeOffset??e.nativeGroup?.offset;if(offset!==undefined&&offset<start.enemyDataOffset)e.slotLost=true;}
 for(const [s,o] of (start.slots??[]).entries()){
  if(!o.flag)continue;
  if(o.id===50){const spring=sim.area.springs?.find(p=>p.nativeColumn===Math.floor(o.x));if(!spring)throw Error(`Observed Spring at ${o.x} is not mapped`);sim.springSlots.set(spring,s);}
  if(o.id===8){sim.spawnNativeBullet(o.x,o.y-256+24,-1);Object.assign(sim.enemies[sim.enemies.length-1],{enemySlot:s,age:2,frenzy:true});}
  if(o.id===51){sim.spawnNativeBullet(o.x,o.y-256+24,o.xSpeed<0?-1:1);const e=sim.enemies[sim.enemies.length-1];Object.assign(e,{enemySlot:s,age:2,vx:o.xSpeed/16,bbCheck:o.state===0,cannonFrameTimer:o.frameTimer});if(o.state&32)Object.assign(e,{dead:1,pod:{y:o.y-256+24,speed:o.speed,force:o.force,fraction:o.fraction,timer:0}});}
  if(o.id===13){let e=sim.enemies.find(e=>e.kind==='piranha'&&!e.active&&e.originX===Math.floor(o.x)&&e.originY-24===o.force);if(!e&&start.nativeAreaSnapshot){const candidates=sim.enemies.filter(e=>e.kind==='piranha'&&!e.active&&e.originX===Math.floor(o.x));if(candidates.length===1)e=candidates[0];else if(candidates.length===0){e=sim.makeEnemy({kind:'piranha',x:Math.floor(o.x),y:o.force+24,evidence:'Native snapshot: fixed Piranha x and DownYPos from its active enemy slot'});sim.enemies.push(e);snapshotActors.push({code:'snapshot-native-actor-not-declared',kind:'piranha',slot:s,x:o.x,downY:o.force});}}
   if(!e)throw Error(`Observed Piranha at ${o.x} is not mapped`);
   /* PiranhaPlant_Y_Speed = $58, MoveFlag = $A0, UpYPos = $0417, DownYPos = $0434, EnemyFrameTimer $078A */
   Object.assign(e,{active:true,slotHeld:true,enemySlot:s,age:2,pir:{y:o.y-256,speed:o.xSpeed,flag:o.speed,up:o.fraction,down:o.force,timer:o.frameTimer},y:o.y-256+24});}
  const walker={0:'koopa',2:'beetle',3:'redKoopa',4:'koopa',6:'goomba',14:'paratroopa'}[o.id];
  const lowState=o.state&7,flat=o.id===6&&o.state===lowState&&[2,3,4].includes(lowState),shell=[0,2,3].includes(o.id)&&!(o.state&0x38)&&((o.state&128)!==0||[2,3,4].includes(lowState));
  if(walker&&(o.state===0||flat||shell)){let best;for(const e of sim.enemies)if(e.kind===walker&&!e.active&&!e.dead&&Math.abs(e.originX-o.x)<=48&&(!best||Math.abs(e.originX-o.x)<Math.abs(best.originX-o.x)))best=e;
   if(!best&&start.nativeAreaSnapshot){best=sim.makeEnemy({kind:walker,x:Math.floor(o.x),y:o.y-256+24,nativeId:o.id,direction:o.xSpeed<0?-1:1,evidence:'Native one-time snapshot: current walker kind/slot/coordinates/motor bytes'});sim.enemies.push(best);snapshotActors.push({code:'snapshot-native-walker-source-origin-not-retained',kind:walker,slot:s,x:o.x});}
   if(!best)throw Error(`Observed ${walker} at ${o.x} is not mapped`);
   /* a walker already on screen keeps its native x (with sub-pixel), Enemy_X_Speed $58 (1/16 px) and feet y; a jumping Paratroopa also its 8.8 vertical state */
   Object.assign(best,{active:true,slotLost:false,enemySlot:s,age:2,x:o.x,y:o.y-256+24,vx:o.xSpeed/16});
   if(flat||shell){Object.assign(best,{walkerState:lowState,fall:{speed:o.speed,force:o.force,fraction:o.fraction},shellTimer:o.timer});if(flat)Object.assign(best,{squashed:true,dead:1});else Object.assign(best,{shell:true,movingShell:Boolean(o.state&128),shellFalling:Boolean(o.state&64)});}
   if(o.id===14)best.pod={y:o.y-256+24,speed:o.speed,force:o.force,fraction:o.fraction,timer:0};}
  if(o.id===12){const e=sim.enemies.find(e=>e.kind==='podoboo'&&e.launch&&e.originX===Math.floor(o.x));if(!e)throw Error(`Observed Podoboo at ${o.x} is not mapped`);
   Object.assign(e,{active:true,enemySlot:s,age:2,pod:{y:o.y,speed:o.speed,force:o.force,fraction:o.fraction,timer:o.timer},y:o.y-256+24});}
 }
 if(start.slots)sim.slotVertical=start.slots.map(o=>({speed:o.speed,force:o.force,fraction:o.fraction})); /* Enemy_Y_Speed / MoveForce / y fraction left in each slot */
 if(start.playerXScroll!==undefined)sim.playerXScroll=start.playerXScroll;if(start.platformScroll!==undefined)sim.platformScroll=start.platformScroll;
 if(sim.placedStream&&start.enemyDataOffset!==undefined)Object.assign(sim.placedStream,{offset:start.enemyDataOffset,page:start.enemyDataPage??0,selected:start.enemyDataSelected??false});
 if(sim.walkerStream&&start.enemyDataOffset!==undefined)Object.assign(sim.walkerStream,{offset:start.enemyDataOffset,page:start.enemyDataPage??0,selected:start.enemyDataSelected??false});
 if(start.enemyDataOffset!==undefined){seedNativeFrenzyControllers(sim.frenzyControllers,start.enemyDataOffset,start.slots??[]);if(sim.frenzyControllers.length)sim.spinyTimer=start.flameTimer??0;}
 if(start.frenzyBag!==undefined)sim.swimBag=start.frenzyBag; /* BitMFilter $06DD: heights already used by the Cheep / Bullet Bill frenzy */
 if(start.intervalControl!==undefined){sim.intervalControl=start.intervalControl;sim.alignLifeClock(start.intervalControl);} /* IntervalTimerControl $077F: phase of the 21-frame interval timers (also the lives-screen clock) */
 if(start.primaryHardMode!==undefined)sim.primaryHardMode=start.primaryHardMode;
 if(start.secondaryHardMode!==undefined)sim.secondaryHardMode=start.secondaryHardMode;
 sim.random.bytes=[...start.random];sim.random.frame=start.counter;if(start.colorRotate!==undefined)sim.colorRotations=start.colorRotate;sim.broClock=start.counter;sim.paletteClock.reset(start.scroll32??(Math.floor(start.camera)&31),start.parserTask??0,sim.colorRotations);
 /* PlayerAnimCtrl $070D, PlayerAnimTimer $0781, PlayerAnimTimerSet $070C: the walk/swim frame phase (src/player-anim.ts) */
 if(start.anim)sim.playerAnim.reset(start.anim.ctrl,start.anim.timer,start.anim.timerSet,false);
 sim.inputs=[new Set(),new Set()];sim.previous=new Set();sim.recordedRoute=false;
 const waterInitialization=initializeNativeWater(sim,start.nativeWater),loadInitialization=initializeNativeLoad(sim,start.nativeLoad);
 return {snapshotActors,waterInitialization,loadInitialization,initialized:['level main area','observed pose, subpixels, velocity, takeoff force and motor','camera','power and native Star interval timer','HUD score/coins/lives/time','random register and counter','cannon table and timers','interval timer phase','frenzy height filter','live frenzy Bullet Bills, Podoboos, Piranha Plants and walkers (x, sub-pixel, speed, vertical state)','palette rotation offset','player animation frame and timer','game timer subphase','neutral prior inputs'],notReconstructed:['full native emulator state','enemy slot allocation and hidden per-enemy state','other hidden engine clocks','pre-existing audio phase'],method:'One initialization before the first retained action. Existing simulation, collisions, damage and deaths remain active. Controller transport is declared separately. No future action is pre-applied and no later state correction occurs.'};
}
