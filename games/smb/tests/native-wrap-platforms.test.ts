import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {PlatformMotion,nativePlatformObject,nativePlatformSpawnCamera,nativeWrapY,platformMotionModel,platformSupportsX} from '../src/platform-motion.js';
import nativePlatformMotion from '../data/native-platform-motion.json';

// Native excerpts [age in frames since the object appeared, y byte] of the recorded route's wrapping lifts (object ids 39 and 44 move down,
// 38 and 43 up; native trace rows, RAM object slots), method in tools/harness/derive-wrap-platforms.mjs, roles in docs/NATIVE_ROLES.md.
const EXCERPTS:Array<{level:string;area:string;spec:[number,number];ages:Array<[number,number]>}>=[
 {level:'1-2',area:'area-2',spec:[2236,112],ages:[[0,112],[1,113],[13,125],[14,126],[15,126],[16,127],[30,141],[31,141],[32,142],[36,146]]},
 // down lift crossing the 256 wrap: 253,253,254,255,0,1
 {level:'1-2',area:'area-2',spec:[2236,208],ages:[[44,249],[48,253],[49,253],[50,254],[51,255],[52,0],[53,1],[64,12]]},
 // castle lift (id 43) going up through 0 to 255
 {level:'2-4',area:'main',spec:[1372,160],ages:[[160,10],[169,1],[170,0],[171,255],[175,251],[176,251],[177,250],[185,242]]},
 {level:'4-2',area:'area-3',spec:[1836,80],ages:[[0,80],[15,95],[16,95],[17,96],[24,103]]},
 // castle lift (id 44) going down through 255 to 0, idle step at ages 111->112 and 127->128
 {level:'5-4',area:'main',spec:[1420,160],ages:[[100,254],[101,255],[102,0],[111,9],[112,9],[113,10],[127,24],[128,24],[129,25],[140,36]]},
];
const specOf=(level:string,area:string,xy:[number,number])=>observedLevels().find(l=>l.id===level)!.areas.find(a=>a.id===area)!.platforms!.find(p=>p.x===xy[0]&&p.y===xy[1])!;

test('wrapping lifts follow the native y bytes of the recorded route (15/16 px per frame, hidden idle-step phase, wrap at 256)',()=>{
 for(const {level,area,spec,ages} of EXCERPTS){
  const platform=specOf(level,area,spec);
  assert.ok(platform,`${level}/${area} has the spec ${spec}`);
  assert.equal(platformMotionModel(platform,{levelId:level,areaId:area}),'native-wrap');
  const object=nativePlatformObject(platform,{levelId:level,areaId:area})!;
  for(const [age,y] of ages)assert.equal(nativeWrapY(object,age),y,`${level} ${spec} age ${age}`);
 }
});

test('a wrapping lift starts at its own spawn camera and a restart re-arms it',()=>{
 const level='1-2',area='area-2',platform=specOf(level,area,[2236,112]),object=nativePlatformObject(platform,{levelId:level,areaId:area})!;
 const motion=new PlatformMotion({levelId:level,areaId:area}),spawn=nativePlatformSpawnCamera(object);
 motion.slotFraction(platform,104); // v2 slot2's actual fraction when the object is initialized
 motion.advance(0,spawn-3);
 assert.equal(motion.collisionPosition(platform,0).y,112);
 for(let f=1;f<=40;f++)motion.advance(f,spawn+f-1);
 // the clock started on frame 1 (the first frame whose scroll reached the spawn camera): age 36 at frame 37 is native y 146
 assert.equal(motion.collisionPosition(platform,37).y,146);
 assert.equal(motion.collisionPosition(platform,37).x,2236);
 motion.reset();motion.advance(0,spawn);
 assert.equal(motion.collisionPosition(platform,0).y,112);
 motion.advance(1,spawn);
 assert.equal(motion.collisionPosition(platform,1).y,112,'a freshly cleared fraction starts with an idle motion row');
});

test('every platform of the replaced lift areas has a native object, the 4-3 ghost specs are gone',()=>{
 const level=(id:string,area:string)=>observedLevels().find(l=>l.id===id)!.areas.find(a=>a.id===area)!;
 const counts:Record<string,number>={'1-2/area-2':4,'4-2/area-3':7,'4-3/main':11};
 for(const [key,count] of Object.entries(counts)){
  const [id,area]=key.split('/'),platforms=level(id,area).platforms!;
  assert.equal(platforms.length,count,key);
  for(const p of platforms)assert.ok(nativePlatformObject(p,{levelId:id,areaId:area}),`${key} spec ${p.x},${p.y} has a native object`);
 }
 const ghosts:Array<[number,number]>=[[1291,83],[1740,142],[2182,94]];
 for(const [x,y] of ghosts)assert.ok(!level('4-3','main').platforms!.some(p=>p.x===x&&p.y===y),`4-3 ghost ${x},${y}`);
 // the castle lift columns: one lift up, one down, each next to the area's horizontal platform
 for(const id of ['2-4','5-4'])assert.deepEqual(level(id,'main').platforms!.map(p=>nativePlatformMotion.objects[`${id}/main` as keyof typeof nativePlatformMotion.objects].find(o=>o.spec[0]===p.x&&o.spec[1]===p.y)!.kind).sort(),['horizontal','wrap','wrap']);
});

test('the 8-4 camera-lava platform is the native horizontal object (x 1120 at the right end, 240-frame cycle over 53 px)',()=>{
 const platform=specOf('8-4','main',[918,209]);
 assert.equal(platformMotionModel(platform,{levelId:'8-4',areaId:'main'}),'native-horizontal');
 const object=nativePlatformObject(platform,{levelId:'8-4',areaId:'main'})!,motion=new PlatformMotion({levelId:'8-4',areaId:'main'});
 motion.advance(0,object.spawnCamera);
 // native 8-4 id 40 object, age -> x: 0 1120, 40 1107, 80 1077, 120 1067, 160 1080, 200 1109, 239 1120 (table interpolation is within 2.5 px)
 for(let f=1;f<=240;f++)motion.advance(f,object.spawnCamera+4);
 for(const [age,x] of [[0,1120],[40,1107],[80,1077],[120,1067],[160,1080],[200,1109],[239,1120]])assert.ok(Math.abs(motion.collisionPosition(platform,age).x-x)<=2.5,`age ${age}`);
 assert.equal(motion.collisionPosition(platform,40).y,208);
});

test('platform support uses the native inclusive player and platform boxes',()=>{
 // 4-3 v2 row713: x1501 on platform1456..1504 remains supported.
 // Row714: x1504 has left edge1507, no support, and native enters falling.
 for(const width of [24,32,48]){
  assert.ok(platformSupportsX(100-13,100,width),'small right edge touches platform left');
  assert.ok(!platformSupportsX(100-14,100,width),'small Mario is one pixel short');
  assert.ok(platformSupportsX(100+width-3,100,width),'small left edge touches platform right');
  assert.ok(!platformSupportsX(100+width-2,100,width),'small Mario has walked off');
  assert.ok(platformSupportsX(100-14,100,width,true),'big Mario has a wider box');
  assert.ok(platformSupportsX(100+width-2,100,width,true));
 }
});
