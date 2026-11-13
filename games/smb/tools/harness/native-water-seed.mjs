/** One-time native water snapshot initialization. This is a harness adapter,
 * never a replay correction. Values are RAM bytes from the initial source row.
 * Player: $9f/$0433/$0416 (vertical 8.8 speed/fraction), $0709/$070a,
 * $0782 (stroke timer), $047d (Whirlpool_Flag), $0700 (absolute X speed),
 * $33/$45 (facing/moving), $0490 (collision mask), $0701/$0702 (friction).
 * Bubbles: $83/$9c, $cb/$e4, $042c, shared timer $0792.
 */
const signed=v=>v<128?v:v-256;
const direction=v=>v===1?1:v===2?-1:0;
export function decodeNativeWater(ram,offset=0){
 if(ram[0x74e]!==0)return undefined;
 return {nativeFacing:ram[0x33],nativeMoving:ram[0x45],running:ram[0x703],cursor:{offset:ram[0x739],page:ram[0x73a],selected:Boolean(ram[0x73b])},engine:ram[14],state:ram[0x1d],swimming:Boolean(ram[0x704]),x:ram[0x6d]*256+ram[0x86]+ram[0x400]/256+offset,y:(ram[0xb5]-1)*256+ram[0xce]+32,
  speed:signed(ram[0x9f]),force:ram[0x433],fraction:ram[0x416],rise:ram[0x709],fall:ram[0x70a],timer:ram[0x782],whirlpool:Boolean(ram[0x47d]),
  xSpeed:signed(ram[0x57])*256+ram[0x705],absolute:ram[0x700],facing:direction(ram[0x33]),moving:direction(ram[0x45]),collision:ram[0x490],friction:ram[0x701]*256+ram[0x702],previousAB:ram[0x0d],savedButtons:ram[0x6fc],
  scrollPosition:ram[0x755],sideTimer:ram[0x785],frenzyTimer:ram[0x78f],bag:ram[0x6dd],bubbleTimer:ram[0x792],bubbles:[0,1,2].map(s=>({x:ram[0x83+s]*256+ram[0x9c+s]+offset,y:ram[0xe4+s],page:ram[0xcb+s],fraction:ram[0x42c+s]})),
  slots:[0,1,2,3,4,5].map(s=>({flag:ram[0xf+s],id:ram[0x16+s],state:ram[0x1e+s],x:ram[0x6e+s]*256+ram[0x87+s]+ram[0x401+s]/256+offset,y:ram[0xcf+s],counter:ram[0xa0+s],force:ram[0x434+s],fraction:ram[0x417+s],direction:ram[0x46+s],moveFlag:ram[0x58+s],timer:ram[0x796+s]}))};
}
/** Call after generic pose/area/clocks and prior-input initialization. The
 * water fraction is stored separately: generic fractional player Y is replaced.
 * Controller decoding uses native NES bits (A=$80, B=$40), not pads.bin order. */
export function initializeNativeWater(sim,state){
 if(!state)return;
 if(sim.area.theme!=='water')throw Error('Native water snapshot mapped to a non-water area');
 const w=sim.water,m=w.motor;
 if(sim.waterEnemyStream&&state.cursor)Object.assign(sim.waterEnemyStream,state.cursor);
 sim.waterSlotPositions=state.slots.map(o=>({x:o.x,y:o.y}));
 w.reset();Object.assign(w.horizontalState,{speed:state.xSpeed,facing:state.nativeFacing??(state.facing===1?1:state.facing===-1?2:0),moving:state.nativeMoving??(state.moving===1?1:state.moving===-1?2:0),absolute:state.absolute,collision:state.collision,running:state.running??0,grounded:state.state===0});Object.assign(w,{speed:state.speed,force:state.force,frac:state.fraction,rise:state.rise,fall:state.fall,timer:state.timer,whirl:state.whirlpool});
 m.reset(state.xSpeed,state.facing);m.moving=state.moving;m.cap=state.state===0?16:24;
 m.friction=state.friction/(state.facing!==state.moving?2:1);m.skid=state.facing!==state.moving;m.freeze=(state.collision&3)===3?0:1;
 w.moving=state.moving===0?0:state.facing;w.lastDirection=direction(state.savedButtons&3);
 sim.player.x=state.x;sim.player.y=state.y;sim.player.vx=state.xSpeed/4096;sim.player.vy=state.speed+state.force/256;sim.player.grounded=state.state===0;
 sim.swimActive=state.swimming;sim.swimAbsolute=state.absolute;sim.marioMotion=state.moving;sim.swimDirection=0;sim.swimFreshA=state.engine===7;sim.freshA=false;sim.controlGrace=0;
 // PlayerEntrance reads native low Y against $30. The first grounded entry
 // row only changes Player_State; the next row starts the gravity pass.
 sim.swimLock=state.engine===8?0:(state.y-32&255)>=48?1:state.state===0?3:2;
 sim.entryFalling=false;sim.entryVineActive=false;sim.autoVineActive=false;sim.pipeRise=0;
 sim.swimDy=0;sim.swimPull=0;sim.waterEntryFall=false;sim.waterEntryTimerHold=0;
 sim.waterScrollX=state.scrollPosition;sim.sideCollisionTimer=state.sideTimer;sim.swimTimer=state.frenzyTimer;sim.swimBag=state.bag;
 sim.bubbleState.timer=state.bubbleTimer;state.bubbles.forEach((b,s)=>Object.assign(sim.bubbles[s],b));sim.bubblesInitialized=true;
 sim.previous=new Set();if(state.previousAB&128)sim.previous.add('a');if(state.previousAB&64)sim.previous.add('b');
 for(const [key,bit]of [['select',32],['start',16],['up',8],['down',4],['left',2],['right',1]])if(state.savedButtons&bit)sim.previous.add(key);
 for(const [slot,o]of state.slots.entries()){
  if(slot===5)continue;
  sim.slotSub[slot]=Math.round((o.x-Math.floor(o.x))*256)&255;sim.slotYFrac[slot]=o.fraction;
  if(o.flag&&o.id===23){sim.frenzyControllers.push({id:23,offset:-1,column:Math.floor(o.x),x:o.x,y:o.y,hardOnly:false,slot});continue;}
  if(!o.flag||![7,10,11].includes(o.id))continue;
  if(o.state!==0)throw Error(`Unsupported initial native water enemy state ${o.state} in slot ${slot}`);
  let e;
  if(o.id===7){e=sim.enemies.find(e=>e.kind==='blooper'&&!e.active&&e.originX===Math.floor(o.x));if(!e)throw Error(`Initial native Blooper ${o.x} is not mapped`);e.bloop={counter:o.counter,force:o.force,timer:o.timer,dir:o.direction};}
  else{e=sim.makeEnemy({kind:'cheep',x:o.x,y:o.y+24,direction:-1,palette:o.id===11?'0f-16-30-27':'0f-10-30-27',swim:{},evidence:'Initial source RAM water actor'});e.nativeSwim={y:o.y,fraction:o.fraction,flag:o.moveFlag,originY:o.force};sim.enemies.push(e);}
  Object.assign(e,{active:true,enemySlot:slot,x:o.x,y:o.y+24,age:1,dead:0,slotFreed:false,nativeDir:o.direction===2?-1:1});
 }
 return {initialized:['native swimming state, vertical speed/force/fraction and stroke timer','native horizontal bytes, facing/moving, absolute speed and collision mask','native pre-whirlpool scroll position and side timer','native prior controller bits','all three bubble slots and shared timer','native water actors and frenzy timer/filter'],notReconstructed:['native emulator CPU/PPU state','unsupported defeated water actors']};
}
