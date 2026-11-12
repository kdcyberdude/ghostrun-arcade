/** Level-by-level physics/geometry check of the production simulation against a native per-frame trace
 * (tools/fidelity-lab/native-trace.mjs) of the recorded winning route. The remake follows native control segments
 * (engine 8) using the same controller frames; after each deviation larger than the threshold it is re-seeded from the
 * native state and the event is logged. Events cluster where the remake's physics, collisions or level geometry differ.
 * Usage: npx tsx tools/campaign-compare.ts trace.jsonl [--from=world-stage] [--to=world-stage] [--threshold=3] [--events=N]
 * --actions=<json> replays model inputs continuously (deaths enabled). MODEL_PHASE=2 measures the input queue separately;
 * MODEL_LOCAL=1 uses the original re-seeding diagnostic, with PHASES/LATENCY as for the winning route.
 * Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import {nativeMaxX} from './native-camera.js';
import {nativeVisitOffset} from './harness/native-visit.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {geoAuditRow,geoAuditReport,geoDriftRow,geoDriftReport} from './harness/geometry-audit.js';
import winningInputs from '../data/observed-winning-inputs.json';
import randomAnchors from '../data/native-random-anchors.json';
import checkpointCounter from '../data/native-checkpoint-counter.json';
import {NativeRandom} from '../src/native-random.js';

type Row={i:number,world:number,stage:number,x:number,y:number,vx:number,vy:number,engine:number,mode:number,task:number,ram?:string,visit:number,off:number,lives?:number,size?:number,subx?:number,suby?:number,vyFrac?:number,fallForce?:number,yPage?:number,time?:number};
const [tracePath,...rest]=process.argv.slice(2);
const opt=(name:string,fallback:string)=>rest.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const from=opt('from','1-1'),to=opt('to','8-4'),threshold=Number(opt('threshold','3')),showEvents=Number(opt('events','12'));
const actionsPath=opt('actions','');
const modelContinuous=Boolean(actionsPath)&&!process.env.MODEL_LOCAL;
const inputs=actionsPath?JSON.parse(fs.readFileSync(actionsPath,'utf8')):winningInputs;
const levels=observedLevels();
const rows:Row[]=fs.readFileSync(tracePath,'utf8').trim().split('\n').map(l=>JSON.parse(l));
// Native y is one byte: above the screen it wraps (253 means -3); it only exceeds ~232 there while the player has control.
// A jump can carry the sprite top up to about -36 (byte 220), so rows that continue a controlled row are unwrapped by continuity.
rows.forEach((r,i)=>{
 const prev=rows[i-1],ctl=(q?:Row)=>q!==undefined&&q.engine===8&&q.task===3&&q.mode===1;
 if(ctl(r)&&ctl(prev)){while(r.y-prev.y>128)r.y-=256;while(prev.y-r.y>128)r.y+=256;}else if(r.y>=232)r.y-=256;
});
// The native random register on every row (data/native-random-anchors.json): the recorded route as its list of discontinuities, a level-checkpoint model run from its first row (it holds for one row at a load).
const randomRows=(()=>{
 const list:[number,string][]=actionsPath?(inputs.start==='level_checkpoint'?[[0,(randomAnchors.levels as Record<string,string>)[inputs.level]]]:[]):randomAnchors.route as [number,string][];
 if(!list.length)return undefined;
 const random=new NativeRandom(),out:number[][]=[];let k=0;
 rows.forEach((r,i)=>{const p=rows[i-1];
  if(list[k]?.[0]===i){const v=list[k++][1].match(/../g)!.map(h=>parseInt(h,16));random.bytes=v.slice(0,7);random.frame=v[7];}
  else if(!(actionsPath&&p?.engine===0&&p.mode===1&&p.task===0&&r.engine===0&&r.mode===1&&r.task===1))random.tick();
  out[i]=[...random.bytes,random.frame];});
 return out;
})();
// Native area visits: the trace has no area id, but every area load shows as task 0-2 and a visit starts when task is 3 again.
// Inside a level native x is absolute: pipe/flag rooms continue at a later page (entry x 56 on page 11 reads 2872), so each
// visit's x is made area-local by subtracting the page start of its first positioned row (measured, not an area-id lookup).
{
 let level='',visit=0,first=true;
 for(let i=0;i<rows.length;i++){
  const r=rows[i],l=`${r.world}-${r.stage}`;
  if(l!==level){level=l;visit=0;first=true;}
  if(r.task===3&&(first||rows[i-1].task!==3||`${rows[i-1].world}-${rows[i-1].stage}`!==l)){visit++;first=false;}
  r.visit=visit;r.off=0;
 }
 for(let i=0;i<rows.length;){
  let j=i;while(j<rows.length&&rows[j].visit===rows[i].visit&&rows[j].world===rows[i].world&&rows[j].stage===rows[i].stage)j++;
  const entry=rows.slice(i,j).find(r=>r.task===3&&r.x>0);
  let before=i-1;while(before>=0&&rows[before].task!==3)before--; // MODEL_LOCAL: a visit after a native death respawns in level coordinates (midway x 1064 is not a room on page 4)
  const level=levels.find(l=>l.id===`${rows[i].world}-${rows[i].stage}`);
  const returns=level?.areas.filter(a=>a.id!==level.main).flatMap(a=>a.pipes.filter(p=>p.to===level.main&&!p.targetLevel).map(p=>p.spawn[0]))??[];
  const off=entry?nativeVisitOffset(entry,rows[rows.indexOf(entry)+1],returns,Boolean(process.env.MODEL_LOCAL)&&rows[before]?.engine===6):0;
  // 8-4 style mazes subtract 1024 (four pages) from Mario and the camera when a corridor is taken wrongly; the remake keeps the
  // repeated stream as one longer area instead, so native x is 'unrolled' by adding 1024 per observed wrap inside the visit.
  let wraps=0;const raw=rows.slice(i,j).map(r=>r.x>=32768?r.x-65536:r.x); // native x is a u16: a wrong corridor at x 1018 reads 65530
  for(let k=i;k<j;k++){
   if(k>i&&rows[k].task===3&&rows[k-1].task===3&&raw[k-1-i]-raw[k-i]>=900)wraps++;
   rows[k].off=off-1024*wraps;if(rows[k].task===3)rows[k].x=raw[k-i]-(off-1024*wraps);
  }
  i=j;
 }
}
const keys=['up','down','left','right','a','b','start','select'] as const;
const frameInputs:string[][]=[];
for(const [mask,frames] of inputs.actions as number[][])for(let f=0;f<frames;f++)frameInputs.push(keys.filter((_,b)=>mask&(1<<b)));
const levelOf=(r:Row)=>`${r.world}-${r.stage}`;
const order=levels.map(l=>l.id);
// Native control segments: runs of engine 8 with task 3 (playing) inside one level; engine 8 with task 0-2 is level loading.
const controlled=(r:Row)=>r.engine===8&&r.task===3&&r.mode===1;
type Segment={level:string,start:number,end:number};
const segments:Segment[]=[];
for(let i=0;i<rows.length;){
 if(!controlled(rows[i])){i++;continue;}
 let j=i;while(j<rows.length&&controlled(rows[j])&&levelOf(rows[j])===levelOf(rows[i]))j++;
 if(j-i>=12)segments.push({level:levelOf(rows[i]),start:i,end:j});
 i=j;
}
// PHASES=1 prints a LATENCY string and exits: the native capture phase seen at every A press from the ground (jump on the press row = early, on the next row =
// the default), per level; a change is applied 3 rows before the press that shows it. Also the first one: a level start runs in the default phase until then (native
// right-run starts: in 20 of 20 early levels the start acceleration matches the default and leads native by one row, x +2 px, when fed early). Measure with LATENCY="$(PHASES=1 npx tsx tools/campaign-compare.ts <trace>)".
if(process.env.PHASES){const out:string[]=[],state=new Map<string,number>(),a=(f:number)=>!!frameInputs[f]?.includes('a');
 for(const seg of segments){for(let r=Math.max(seg.start,2);r<seg.end-1;r++){
  if(!a(r)||a(r-1)||!(rows[r-1].vy===0&&rows[r-2].y===rows[r-1].y))continue;
  const early=rows[r].vy<0?1:rows[r+1].vy<0?0:state.get(seg.level)??0;
  if(early!==(state.get(seg.level)??0)){out.push(`${seg.level}:${early?0:1}@${Math.max(seg.start,r-3)}`);state.set(seg.level,early);}}}
 console.log('LATENCY='+out.join(','));process.exit(0);}
// Optional enemy comparison (trace captured with --ram 0x0F-0x13,0x16-0x1A,0x1E-0x22,0x6E-0x72,0x87-0x8B,0xCF-0xD3,0x754-0x755).
// Slot roles (flag, id, state, page, x, y) were matched empirically against the remake's 1-1 Goombas, not read from game code.
const natEnemies=(r:Row)=>{if(!r.ram)return [];const [flag,id,state,page,xl,yy]=r.ram.split(',').map(h=>Buffer.from(h,'hex'));const out:{id:number,state:number,x:number,y:number}[]=[];// Bowser is two 16 px objects: the second half has flag bit 7 set and sits 16 px beside the primary one (data/bowser-native-rules.json); it is skipped
// here (IDCOV_PARTS=1 counts it) so one remake Bowser is compared with one native Bowser, and a share can reach 100%.
for(let i=0;i<5;i++)if(flag[i]&&!(flag[i]&0x80&&id[i]===45&&!process.env.IDCOV_PARTS))out.push({id:id[i],state:state[i],x:page[i]*256+xl[i]-r.off,y:yy[i]});return out;};
type Run={key:string,first:number,last:number,n:number};
type EnemyStat={native:number,matched:number,missing:number,extra:number,absDx:number[],missingRuns:Run[],extraRuns:Run[]};
const appearNative:{level:string,f:number,id:number,x:number,mario:number,y?:number,state?:number,cam?:number,area?:string,initial?:boolean}[]=[];const appearSim:{level:string,f:number,kind:string,x:number,y?:number,mario:number,cam?:number,area?:string,index?:number}[]=[];const activeSeen=new WeakSet<object>();
const fitSamples=new Map<string,{kind:string,specX:number,specY:number,frames:number[],offsets:number[]}>();
const nearestOffsets=new Map<string,number[]>();
const idKind=new Map<string,number>();
const bowserStats=new Map<string,{n:number,missing:number,dx:number[],dy:number[]}>();
const idCov=new Map<string,{n:number,ok:number,kinds:Map<string,number>}>(); // IDCOV=1: per level and native object id, how often a remake enemy stands within 20 px

const enemyStats=new Map<string,EnemyStat>();
const enemyStat=(id:string)=>{if(!enemyStats.has(id))enemyStats.set(id,{native:0,matched:0,missing:0,extra:0,absDx:[],missingRuns:[],extraRuns:[]});return enemyStats.get(id)!;};
const trackRun=(runs:Run[],key:string,f:number)=>{for(let k=runs.length-1;k>=0&&k>=runs.length-8;k--){const r=runs[k];if(r.key===key&&f-r.last<=6){r.last=f;r.n++;return;}}runs.push({key,first:f,last:f,n:1});};
const compareEnemies=(level:string,f:number,n:Row)=>{
 if(!n.ram)return;const st=enemyStat(level),mx=sim.player.x;
 const native=natEnemies(n).filter(e=>e.x>=mx-128&&e.x<=mx+144);
 const mine=sim.enemies.filter((e:any)=>e.active&&!e.dead&&e.x>=mx-128&&e.x<=mx+144).map((e:any)=>({kind:e.kind,x:e.x,used:false}));
 if(process.env.SWIMSPAWN===level){const g=globalThis as any;g.__sp=g.__sp||[null,null,null,null,null];const [fl,id,,pg,xl,yy]=n.ram?n.ram.split(',').map(h=>Buffer.from(h,'hex')):[];if(fl)for(let i=0;i<5;i++){const live=fl[i]&&[7,10,11].includes(id[i]);const x=pg[i]*256+xl[i]-n.off,pv=g.__sp[i];if(live&&(!pv||pv.id!==id[i]||Math.abs(pv.x-x)>12))console.log('SP',f,'slot',i,'id',id[i],'x',x,'y',yy[i],'mario',Math.floor(sim.player.x),Math.floor(sim.player.y),'cam',Math.floor(sim.camera),'rnd',sim.random.bytes.join(','),'frame9',(sim as any).areaFrame,'slots',Array.from(fl).map((v:number,j:number)=>v?id[j]:'-').join(''));g.__sp[i]=live?{id:id[i],x}:null;}}
 if(process.env.SWIMLOG===level){const nf=natEnemies(n).filter(e=>e.id===10||e.id===11||e.id===7),mf=sim.enemies.filter((e:any)=>e.active&&!e.dead&&(e.kind==='blooper'||(e.kind==='cheep'&&e.motion!=='flying')));const sig=nf.map(e=>e.id+'@'+e.x).join(' ')+'|'+mf.map((e:any)=>e.kind[0]+Math.round(e.x)).join(' ');if(sig!==(globalThis as any).__sl){(globalThis as any).__sl=sig;console.log('SL',f,'mario',Math.floor(sim.player.x),Math.floor(sim.player.y),'cam',Math.floor(sim.camera),'native',nf.map(e=>e.id+'@'+e.x+','+e.y).join(' '),'| remake',mf.map((e:any)=>e.kind[0]+Math.round(e.x)+','+Math.round(e.y)+'s'+e.enemySlot).join(' '));}}
 if(process.env.SWIMEV===level){const g=globalThis as any;g.__sv=g.__sv||new Set();for(const e of sim.enemies as any[])if(e.kind==='cheep'&&e.swim&&e.active&&!g.__sv.has(e)){g.__sv.add(e);console.log('RS',f,'slot',e.enemySlot,'x',Math.round(e.x),'y',Math.round(e.y),'cam',Math.floor(sim.camera),'pal',e.palette);}} // remake generator spawns (compare with SWIMSPAWN native rows)
 if(process.env.FISHLOG===level){const nf=natEnemies(n).filter(e=>e.id===20),mf=sim.enemies.filter((e:any)=>e.active&&!e.dead&&e.kind==='cheep'&&e.motion==='flying');const sig=nf.length+'/'+mf.length;if(sig!==(globalThis as any).__fl){(globalThis as any).__fl=sig;console.log('FL',f,'mario',Math.floor(mx),'cam',Math.floor(sim.camera),'rnd',sim.random.bytes.join(','),'timer',(sim as any).fishTimer,'native',nf.map(e=>e.x+','+e.y).join(' '),'allnat',natEnemies(n).map(e=>e.id+'@'+e.x).join(' '),'allsim',sim.enemies.filter((e:any)=>e.active&&!e.dead).map((e:any)=>e.kind+'@'+Math.round(e.x)+'s'+e.enemySlot).join(' '),'| remake',mf.map((e:any)=>Math.round(e.x)+','+Math.round(e.y)).join(' '));}}
 if(process.env.FISHEV===level){const g=globalThis as any;g.__fn=g.__fn||[null,null,null,null,null];g.__nx=g.__nx||[0,0,0,0,0];g.__rd=g.__rd||new Map();setTimeout(()=>{},0);g.__fr=g.__fr||new Set();const [fl,id,,pg,xl,yy]=n.ram.split(',').map(h=>Buffer.from(h,'hex'));const occ=[0,1,2,3,4].map(i=>fl[i]?id[i]:0).join('/');for(let i=0;i<5;i++){const live=fl[i]&&id[i]===20,pv=g.__fn[i];if(live&&!pv)console.log('NL',f,'slot',i,'dx',pg[i]*256+xl[i]-n.off-Math.floor(mx),'cam',Math.floor(sim.camera),'spd',Math.floor(sim.player.vx*16),'occ',occ,'nx',n.x,'pnx',g.__px);if(!live&&pv)console.log('ND',f,'slot',i,'life',f-pv,'x',g.__nx[i]-Math.floor(mx),'camnat',n.x);if(live){g.__nx[i]=pg[i]*256+xl[i]-n.off;}g.__fn[i]=live?(pv||f):0;}for(const e of sim.enemies as any[])if(e.kind==='cheep'&&e.motion==='flying'&&!g.__fr.has(e)){g.__fr.add(e);g.__rd.set(e,f);console.log('RL',f,'slot',e.enemySlot,'dx',Math.round(e.x-mx),'cam',Math.floor(sim.camera),'spd',Math.floor(sim.player.vx*16),'occ',occ);}}
 if(process.env.FISHEV===level){const g=globalThis as any;g.__px=n.x;for(const [e,f0] of [...g.__rd])if(!sim.enemies.includes(e)||e.dead||!e.active){g.__rd.delete(e);console.log('RD',f,'slot',e.enemySlot,'life',f-f0,'dx',Math.round(e.x-mx),'y',Math.round(e.y));}}
 if(process.env.FISHCAM===level&&f>=Number(process.env.FC0||84)&&f<=Number(process.env.FC1||90))console.log('FC',f,'cam',sim.camera,'off',n.off,'mx',mx,'vx',sim.player.vx,'timer',(sim as any).fishTimer,'nx',n.x);
 if(process.env.FIT_JSON){ // offsets between each remake enemy and the nearest native enemy of the same kind while both are young
  const natKind:Record<number,string>={0:'koopa',3:'redKoopa',6:'goomba',2:'beetle',14:'paratroopa',15:'paratroopa'};
  sim.enemies.forEach((m:any,idx:number)=>{
   if(!m.active||m.dead||!['koopa','redKoopa','goomba','beetle','paratroopa'].includes(m.kind))return;
   if(!(idx in (sim.area.enemies??[])))return;
   const key=`${level}|${sim.area.id}|${idx}`;const list=fitSamples.get(key)??fitSamples.set(key,{kind:m.kind,specX:sim.area.enemies[idx].x,specY:sim.area.enemies[idx].y,frames:[],offsets:[]}).get(key)!;
   if(list.offsets.length>=40)return;
   let best:number|undefined;for(const e of natEnemies(n)){if(natKind[e.id]!==m.kind||e.state>1)continue;const d=e.x-m.x;if(Math.abs(d)<=48&&(best===undefined||Math.abs(d)<Math.abs(best)))best=d;}
   if(best!==undefined){list.offsets.push(best);list.frames.push(f);}
  });
 }
 const kindOf:Record<number,string>={0:'koopa',3:'redKoopa',6:'goomba',2:'beetle',14:'paratroopa',15:'paratroopa',17:'lakitu',13:'piranha',5:'hammerBro'};
 if(process.env.NEAREST)for(const e of native){
  const kind=kindOf[e.id];if(!kind||e.state>1)continue;
  let best:any,bm:any;for(const m of sim.enemies){if(m.kind!==kind||m.dead||!m.active)continue;const d=e.x-m.x;if(Math.abs(d)<160&&(best===undefined||Math.abs(d)<Math.abs(best))){best=d;bm=m;}}
  if(process.env.TRACKE===`${level} ${kind}`&&f%(+process.env.TRACKE_STEP||8)===0)console.log('E',f,kind,'native x',e.x,'y',e.y,'| sim',best===undefined?'-':(e.x-best).toFixed(1),'| offset',best,'| sim y',bm?.y?.toFixed(1),'vx',bm?.vx,'| mario',Math.floor(sim.player.x),'cam',Math.floor(sim.camera));
  const key=`${level} ${kind}`;(nearestOffsets.get(key)??nearestOffsets.set(key,[]).get(key)!).push(best??9999);
 }
 for(const e of native){
  st.native++;let best=-1,bestD=21;const cov=idCov.get(`${level} id${e.id}`)??idCov.set(`${level} id${e.id}`,{n:0,ok:0,kinds:new Map()}).get(`${level} id${e.id}`)!;cov.n++;
  mine.forEach((m:any,k:number)=>{const d=Math.abs(m.x-e.x);if(!m.used&&d<bestD){bestD=d;best=k;}});
  if(best>=0){mine[best].used=true;st.matched++;cov.ok++;cov.kinds.set(mine[best].kind,(cov.kinds.get(mine[best].kind)??0)+1);st.absDx.push(bestD);const key=`id${e.id}->${mine[best].kind}`;idKind.set(key,(idKind.get(key)??0)+1);}
  else{st.missing++;trackRun(st.missingRuns,`native id${e.id} state${e.state} x${Math.round(e.x/16)*16}`,f);}
 }
 for(const m of mine)if(!m.used){st.extra++;trackRun(st.extraRuns,`remake ${m.kind} x${Math.round(m.x/16)*16}`,f);}
 // TRACKB=1: native Bowser primary half against the remake Bowser anchor (x) and feet (native y + 32); TRACKB=<level> also lists rows (TRACKE_STEP rows apart).
 if(process.env.TRACKB){
  const nb=natEnemies(n).find(e=>e.id===45&&e.state===0),mb=sim.enemies.find((e:any)=>e.kind==='bowser'&&e.active&&!e.dead);
  if(nb){
   const b=bowserStats.get(level)??bowserStats.set(level,{n:0,missing:0,dx:[],dy:[]}).get(level)!;b.n++;
   if(!mb)b.missing++;else{const dx=(mb.bowser?.anchor??mb.x)-nb.x,dy=mb.y-(nb.y+32);b.dx.push(Math.abs(dx));b.dy.push(Math.abs(dy));
    if(process.env.TRACKB===level&&f%(+process.env.TRACKE_STEP||8)===0)console.log('B',f,'native',nb.x,nb.y+32,'| sim',mb.bowser?.anchor?.toFixed(1),mb.y.toFixed(1),'| dx',dx.toFixed(1),'dy',dy.toFixed(1),'| mario',Math.floor(sim.player.x),'speed',mb.bowser?.speed,'side',mb.bowser?.side);}
  }
 }
};
const sim:any=new Simulation(levels);
const timeSeed:number[]|undefined=process.env.TIMESEED?fs.readFileSync(process.env.TIMEFILE??'evidence/local/levelend/levelend-route-timer.jsonl','utf8').split('\n').filter(Boolean).map(l=>{const h=JSON.parse(l).ram.split(',')[1] as string;return Number(h.slice(0,2))*100+Number(h.slice(2,4))*10+Number(h.slice(4,6));}):undefined;
// Native frame counter (RAM 0x09, restarted by each area load; rows of a trace with --ram 9,...). In the route trace a row is a fixed slice of the CPU that drifts through the native frame by
// 0.5 cycle per row (period 59,561 rows, seen as the 1-1 and 7-2 bands where the byte alternates between two row offsets), so a row can show Mario's frame k with the counter already at k+1:
// the slice then ends between the counter increment and Mario's motion. rowFrame(segment,row) is k for Mario's position on that row; PPU-clock model traces have one row per frame and don't use it.
const clockFile=process.env.CLOCKFILE??'evidence/local/levelend/levelend-route-timer.jsonl';
const routeClock:number[]|undefined=!actionsPath&&fs.existsSync(clockFile)?fs.readFileSync(clockFile,'utf8').split('\n').filter(Boolean).map(l=>parseInt(JSON.parse(l).ram.slice(0,2),16)):undefined;
const clockDrift=59561,clockAheadRows=8500;
const rowFrame=(seg:Segment,row:number)=>{
 const first=(routeClock![seg.start]-seg.start)&255;let low=first,both=false;
 for(let i=seg.start;i<Math.min(seg.end,seg.start+200);i++){const d=(routeClock![i]-i)&255;if(d===first)continue;if(d===((first+1)&255)){both=true;}else if(d===((first+255)&255)){both=true;low=d;}}
 return both?low+row:first+row-(row%clockDrift<clockAheadRows?1:0); // both reads occur in a band: the lower offset is the frame
};
// Area agreement (optional AREASYNC=1|2 output): the native visit index (see above) against the remake's count of area loads in
// the level; every native control frame counts as in the same area when both indices match. AREASYNC=2 also lists the runs.
let remakeVisit=0,remakeLevel='';const remakeAreas:string[]=[];
let rowNow=0;const remakeLoads:{level:string,visit:number,area:string,row:number}[]=[];
{const load=sim.loadArea.bind(sim);sim.loadArea=(...a:any[])=>{load(...a);if(sim.level.id!==remakeLevel){remakeLevel=sim.level.id;remakeVisit=0;remakeAreas.length=0;}remakeVisit++;remakeAreas.push(sim.area.id);remakeLoads.push({level:remakeLevel,visit:remakeVisit,area:sim.area.id,row:rowNow});};}
sim.reset(true);
type AreaRun={nativeVisit:number,remakeVisit:number,area:string,first:number,last:number};
const areaStats=new Map<string,{total:number,same:number,runs:AreaRun[]}>();
const noteArea=(level:string,f:number,n:Row)=>{
 const st=areaStats.get(level)??areaStats.set(level,{total:0,same:0,runs:[]}).get(level)!;
 const same=remakeLevel===level&&remakeVisit===n.visit;st.total++;if(same)st.same++;
 const area=remakeLevel===level?sim.area.id:`(${remakeLevel})`,last=st.runs[st.runs.length-1];
 if(last&&last.nativeVisit===n.visit&&last.remakeVisit===remakeVisit&&last.area===area)last.last=f;else st.runs.push({nativeVisit:n.visit,remakeVisit,area,first:f,last:f});
};
// The remake is never allowed to die or shrink during this comparison (that would derail every later frame); each blocked
// hurt/death is logged with the nearest enemies so contact differences can be examined separately.
const blocked:{level:string,f:number,what:string,x:number,y:number,size:number,near:string}[]=[];let currentFrame=0,currentLevel='';
const describeNear=()=>sim.enemies.filter((e:any)=>!e.dead&&Math.abs(e.x-sim.player.x)<40&&Math.abs(e.y-sim.player.y)<48).map((e:any)=>`${e.kind}@${Math.round(e.x)},${Math.round(e.y)}`).join(' ');
if(!modelContinuous)sim.hurt=function(){if(this.player.invincible||this.player.star||this.powerChange||this.phase!=='play')return;blocked.push({level:currentLevel,f:currentFrame,what:'hurt',x:Math.floor(this.player.x),y:Math.floor(this.player.y)-32,size:this.player.size,near:describeNear()});this.player.invincible=Math.max(this.player.invincible,60);};
if(!modelContinuous)sim.die=function(){if(this.phase!=='play')return;blocked.push({level:currentLevel,f:currentFrame,what:'die',x:Math.floor(this.player.x),y:Math.floor(this.player.y)-32,size:this.player.size,near:describeNear()});};
// INCONTROL=native: control (engine 8) starts at row 17 of an underground fall and row 34 of a water-room fall, not at the landing, so the remake's resume rows and its enemy/timer clocks at the segment seed line up with native (default keeps the landing definition).
const inControl=()=>sim.phase==='play'&&!sim.area.autoWalk&&(process.env.INCONTROL==='native'?!sim.entryControlLocked:!sim.entryFalling)&&!sim.pipeRising&&sim.destination===undefined;
const clampCamera=(x:number)=>{const end=sim.area.cameraEnd??sim.area.warpZone?.cameraEnd??Math.max(0,sim.area.width-256);return Math.max(0,Math.min(end,Math.max(sim.camera,x-112)));};
// Optional exact swimming state for re-seeds: WATER_RAM=captures made by tools/fidelity-lab/water-probe.mjs (comma-separated
// .jsonl paths; ram ranges 0x0-0xff,0x400-0x4ff,0x700-0x7ff). Without it a re-seed only knows the native speed byte.
const exactWater=new Map<number,{speed:number,force:number,frac:number,rise:number,fall:number,timer:number,sub:number}>();
for(const path of (process.env.WATER_RAM??'').split(',').filter(Boolean))for(const line of fs.readFileSync(path,'utf8').trim().split('\n')){
 const r=JSON.parse(line),[low,mid,high]=r.ram.split(',').map((h:string)=>Buffer.from(h,'hex')),s8=(v:number)=>v>=128?v-256:v;
 exactWater.set(r.i,{speed:s8(low[0x9f]),force:mid[0x33],frac:mid[0x16],rise:high[0x09],fall:high[0x0a],timer:high[0x82],sub:mid[0x00]});
}
const latencySpec=(process.env.LATENCY??'').split(',').filter(Boolean).map(s=>{const [level,rest]=s.split(':'),[phase,from]=rest.split('@');return {level,early:phase==='0'?1:0,from:Number(from??0)};});
// A model stream is PPU-clocked: a pad acts on its own row on every row (evidence/water2-findings-20261111.md), also before the first ground press PHASES can see (a swimmer may not touch the floor for 1,400 rows).
// FRAMEPHASE=1: the capture phase comes from the native frame counter instead of LATENCY: while the counter runs ahead of Mario's frame (rows since the slice clock's wrap < clockAheadRows, see rowFrame) a press acts one row later
// (the default); outside that band it acts on its own row (early). Same constants as rowFrame (derived from the byte, no per-level choice); applies only to the route trace.
const framePhase=process.env.FRAMEPHASE==='1'&&!actionsPath;
const earlyAt=(level:string,row:number)=>framePhase?(row%clockDrift>=clockAheadRows?1:0):latencySpec.filter(s=>s.level===level&&s.from<=row).slice(-1)[0]?.early??(process.env.MODEL_LOCAL&&actionsPath?1:0);
// FRAC0=1 seeds Mario with a zero sub-pixel fraction instead of the remake's own: with it, event counts of phase-sensitive levels (4-1, 7-1, 3-1) stop depending on how long
// the preceding castle exit took (a 7-11 frame change there moved 4-1 from 46 to 119 events and back); use it to tell a real change from that noise.
// The trace vy byte is floor(speed): seeding a mid-air row with the byte itself makes the remake rise/fall up to 1 px/frame too fast and drift 9-15 px over ~13 frames.
// VYADJ (default 0.5, the midpoint) corrects that; VYADJ=0 restores the old seeding.
const vyAdj=Number(process.env.VYADJ??0.5);
// VYRAM: native y sub-pixel (RAM 0x416) and vertical speed fraction (0x433), the last two-but-one RAM groups of a trace taken with ...,0x416,0x433,0x70a
// (route: evidence/local/hot6-route-vyfrac-20261111.jsonl, same inputs, rows by index). A mid-air re-seed takes them instead of the VYADJ guess. VYRAM=0 disables.
const vyRamPath=process.env.VYRAM??(actionsPath?'':'evidence/local/hot6-route-vyfrac-20261111.jsonl');
const exactVy=new Map<number,{sub:number,frac:number}>();
if(vyRamPath&&vyRamPath!=='0'&&fs.existsSync(vyRamPath))for(const line of fs.readFileSync(vyRamPath,'utf8').trim().split('\n')){const r=JSON.parse(line),g=r.ram.split(','),n=g.length;exactVy.set(r.i,{sub:parseInt(g[n-3],16),frac:parseInt(g[n-2],16)});}
// New native-live sweeps carry the measured bytes on their own rows; old sweeps retain VYADJ.
if(process.env.VYRAM!=='0')for(const r of rows)if(r.suby!==undefined&&r.vyFrac!==undefined)exactVy.set(r.i,{sub:r.suby,frac:r.vyFrac});
// The whirlpool pull follows the native frame counter, whose parity against the row index depends on the checkpoint a model stream starts from (2-2 odd rows, 7-2 even): read it off the rows whose x is not the speed's own step.
const modelPullShift=(()=>{if(!actionsPath)return 0;const odd=[0,0];rows.forEach((b,k)=>{const a=rows[k-1];if(a&&controlled(a)&&controlled(b)&&a.subx!==undefined&&b.x!==a.x+((a.subx+Math.floor(b.vx/256)*16)>>8))odd[b.i%2]++;});return odd[0]>odd[1]?1:0;})();
const scoreRows=process.env.SCOREROWS?new Set<number>(JSON.parse(fs.readFileSync(process.env.SCOREROWS,'utf8'))):undefined;
// The native fall class (RAM 0x70a) is the class of the last takeoff of the area visit, by the speed byte the takeoff starts from; 40/256 before any jump. Rows only: most traces lack that byte.
const looksGrounded=(a:Row,b:Row)=>a.vy===0&&a.y===b.y&&(a.y&15)===0;
const nativeFallState=(all:Row[],index:number)=>{
 let walking=false,seenGround=false;
 for(let j=index;j>=2;j--){
  const a=all[j],b=all[j-1],c=all[j-2];
  if(a.engine!==8||Math.abs(a.x-b.x)>16)return {gravity:0.15625,walking};
  if(!seenGround&&looksGrounded(a,b)){seenGround=true;walking=j<index;}
  if(a.vy<=-4&&looksGrounded(b,c)){const byte=Math.abs(Math.floor(b.vx/256));if(!seenGround)walking=false;return {gravity:byte>=25?0.5625:byte>=16?0.375:0.4375,walking};}
 }
 return {gravity:0.15625,walking};
};
// Native camera = running max of (x - 112) over the area visit (the scroll never goes back). A free-play re-seed only knew the CURRENT native x, so after a
// left-turn the remake camera lagged by the x the remake never reached (2-4/3-4 x 2020, 7-4 x 1056: native pinned at the screen edge, remake walked 9-14 px on).
// CAMHIST=1 enables it (opt-in: r3 free play events -102 but over 8 px +35, 2-3 +23).
const nativeCameraX=(index:number)=>nativeMaxX(rows,index);
// A segment that starts inside a native underground entry fall (1-2 area-2, 4-2 area-3: the seed row is still an engine-7 hold row, the control row is the skip row) resumes the remake's own
// entry timeline at the same age (age 0 = the first engine-7 row of the visit) instead of an ordinary air seed, which took the skip row as a fall step and the walk-off/jump gravity after it
// (free play: one row ahead, then 1 px/row more; ENTRYSEED=0 disables).
let entrySeeded=false;
const ENTRY_HOLD_Y=32;
const seedEntryFall=(r:Row,p:any)=>{
 entrySeeded=false;const entry=sim.area.entryFall,nat=entry?.native;if(!nat||r.engine!==7||p.grounded||process.env.ENTRYSEED==='0')return;
 let a=rows.indexOf(r);while(a>0&&rows[a-1].engine===7)a--;
 const fall=(age:number)=>{let vy=0,y=0;for(let k=1;k<=age;k++){if(k===nat.skipAge)continue;y+=vy;if(k>=nat.gravityStartAge){vy+=entry.gravity;if(vy>=nat.resetAt)vy=nat.resetTo;}}return {y,vy};};
 // A level-checkpoint stream can begin mid-fall (1-2 / 4-2 model runs: first row y 36-37, the hold rows at y 32 already passed): its first row is not age 0;
 // take the first age whose timeline row matches it (native hold y 32).
 let start=0,base=rows[a].y;if(a===0&&rows[0].y>ENTRY_HOLD_Y){while(start<40&&Math.floor(ENTRY_HOLD_Y+fall(start).y)!==rows[0].y)start++;if(start<40)base=ENTRY_HOLD_Y;else start=0;}
 const age=rows.indexOf(r)-a+start;
 const {y,vy}=fall(age);
 sim.area={...sim.area,entryFall:{...entry,native:{...nat,inputAge:nat.inputAge-1}}};/* the remake's own input age (and landing grace, cleared after the landing step) carry its extra frame of input latency, which the seeded input queue already removes */sim.motor.reset(0);sim.motor.facing=1;/* the area load resets the motor (no press reaches it before the entry's input age); Mario enters facing right */entrySeeded=true;sim.entryFalling=true;sim.entryFallAge=age;sim.walkingOff=false;sim.jumpArc=false;p.vy=vy;
 if(Math.floor(base+y)===r.y)p.y=base+y+32; // the model's sub-pixel when it agrees with the native row
};
const seed=(r:Row,prev:Row|undefined)=>{
 if(process.env.SEEDLOG)console.log('S',rows.indexOf(r)); // SEEDLOG=1: one line per re-seed (native row index), for multi-step drift analysis with TRACE
 {const fall=nativeFallState(rows,rows.indexOf(r));sim.fallGravity=fall.gravity;sim.walkingOff=fall.walking&&!(r.vy===0&&prev?.y===r.y);if(sim.walkingOff){sim.jumpArc=false;sim.bouncing=false;}}
 // Native RAM0x70a keeps the last takeoff class even after horizontal speed changes (112 walk,96 medium,144 run).
 const measuredForce=process.env.VYRAM!=='0'&&[96,112,144].includes(r.fallForce??0)?r.fallForce:undefined;
 if(measuredForce!==undefined){sim.fallGravity=measuredForce/256;sim.lastJumpFallForce=measuredForce/256;}
 const p=sim.player;p.x=r.x+(process.env.MODEL_LOCAL&&r.subx!==undefined?r.subx/256:process.env.FRAC0?0:(p.x-Math.floor(p.x)));p.y=r.y+32;p.vx=r.vx/4096; // model traces carry the exact sub-pixel x
 p.grounded=r.vy===0&&prev!==undefined&&(prev.y===r.y||(Boolean(process.env.MODEL_LOCAL)&&!controlled(prev)&&sim.hasSupportAt(p.x,p.y)));sim.camera=clampCamera(process.env.CAMHIST!=='1'?p.x:Math.max(p.x,nativeCameraX(rows.indexOf(r)))); // the row before a segment holds no position (level load)
 sim.motor.speed=r.vx;sim.motor.airRun=Math.abs(Math.floor(r.vx/256))>=25;
 if(p.grounded)p.vy=0;
 else{const ev=exactVy.get(r.i);p.vy=ev?r.vy+ev.frac/256:r.vy+vyAdj;if(ev)p.y=r.y+32+ev.sub/256;const fast=measuredForce!==undefined?measuredForce===144:Math.abs(Math.floor(r.vx/256))>=25;sim.runJump=fast;sim.mediumJump=measuredForce!==undefined?measuredForce===96:!fast&&Math.abs(Math.floor(r.vx/256))>16;sim.landJump='held';if(measuredForce!==undefined&&!sim.walkingOff&&!sim.bouncing)sim.jumpArc=true;}
 // The whirlpool pull follows the frame parity: keep the remake's counter on the native row parity (frame = row index + 1).
 if(sim.swimActive&&(sim.frame-(r.i+1+modelPullShift))%2!==0)sim.frame++;
 seedEntryFall(r,p);
 if(sim.swimActive){if(p.grounded)p.grounded=sim.hasSupportAt(p.x,p.y);const e=exactWater.get(r.i);if(e)p.x=r.x+e.sub/256;sim.seedSwim({...(e?{...e,speed:p.grounded?0:e.speed}:{speed:p.grounded?0:r.vy,...(actionsPath&&r.engine===7&&r.y===49&&r.vy===3?{force:157,frac:96,rise:40,fall:40}:{})}),hold:r.engine===7});} // the entry-fall hold row of a level-start checkpoint (2-2/7-2 model runs: 49,52,56,60,64,69,.. exact from force 157 frac 96)
};
type Stat={frames:number,events:{f:number,area:string,x:number,y:number,dx:number,dy:number,vy:number,note:string}[],missed:number,mismatch:number};
const ledgeSamples:{level:string,f:number,dir:number,offset:number,x:number,edge:number,vx?:number,nx?:number}[]=[];
const stats=new Map<string,Stat>();
// WITHIN=1 adds one line per level for the frames the remake spends in water areas: exact-row position error within 1 and 2 px.
const waterStats=new Map<string,{frames:number,within1:number,within2:number,events:number}>();
// WITHIN_ROWS=12430-15622,58300-60363 restricts those statistics to native row ranges (the water rooms themselves).
const withinRows=(process.env.WITHIN_ROWS??'').split(',').filter(Boolean).map(s=>s.split('-').map(Number));
const inWithinRows=(row:number)=>!withinRows.length||withinRows.some(([a,b])=>row>=a&&row<b);
const waterStat=(id:string)=>{if(!waterStats.has(id))waterStats.set(id,{frames:0,within1:0,within2:0,events:0});return waterStats.get(id)!;};
const stat=(id:string)=>{if(!stats.has(id))stats.set(id,{frames:0,events:[],missed:0,mismatch:0});return stats.get(id)!;};
// A saved model stream is a continuous replay, with ordinary deaths and transitions enabled.
// Align only the initial playable origin (boot/title are reported separately); never re-seed after a divergence.
if(modelContinuous){
 const first=rows.findIndex(controlled);if(first<0)throw new Error('No controllable row');
 sim.reset(true);sim.player.x=rows[first].x+(rows[first].subx??0)/256;sim.player.y=rows[first].y+32;
 sim.player.vx=rows[first].vx/4096;sim.motor.speed=rows[first].vx;
 sim.inputs=[new Set(frameInputs[first-1]??[]),new Set(frameInputs[first]??[])];
 const raw=new Simulation(levels) as any;let rawFirst=-1;
 for(let f=0;f<=first+300;f++){raw.step(frameInputs[f]??[],1);if(raw.phase==='play'){rawFirst=f;break;}}
 console.log(`MODEL origin native f${first} remake f${rawFirst}; initial alignment ${first-rawFirst} rows; continuous replay, no later re-seeding`);
 const delay=Number(process.env.MODEL_PHASE??0);if(![0,1,2].includes(delay))throw new Error('MODEL_PHASE must be 0, 1 or 2');
 console.log(`MODEL input phase diagnostic: native row = remake input frame minus ${delay}; no input bytes changed`);
 const [lo,hi]=opt('frames',`0-${rows.length-1}`).split('-').map(Number);
 const clusters:{cause:string,first:number,last:number,frames:number,native:string,remake:string,dx:number,dy:number}[]=[];
 const camErr=new Map<number,number>();let camPrev=0,camShown=0;
 const totals=new Map<string,number>(),out:any[]=[];let previousCause='',cluster:typeof clusters[number]|undefined;
 const nativePhase=(r:Row)=>r.mode===0?'title':r.mode===3?'gameover':r.task<3?'intro':r.engine===11||r.engine===6?'dying':r.engine===4||r.engine===5?'flag':r.engine===2||r.engine===3?'pipe':r.engine===8?'play':'entry';
 for(let step=first+1;step<rows.length+delay;step++){
  if(process.env.CAMFEED&&(process.env.CAMFEED==='1'||+process.env.CAMFEED===step-1)&&sim.phase==='play'&&rows[step-1]&&controlled(rows[step-1])&&levelOf(rows[step-1])===sim.level.id&&rows[step-1].ram){ // CAMFEED=1: teacher-force Mario and camera from native row step-1, then compare one step (isolates the camera rule)
   const q=rows[step-1],qp=rows[step-2],g=q.ram.split(',')[2];sim.player.x=q.x+(q.subx??0)/256;sim.player.y=q.y+32;sim.player.vx=q.vx/4096;sim.motor.speed=q.vx;sim.player.vy=q.vy;sim.player.grounded=q.vy===0&&qp!==undefined&&qp.y===q.y;
   sim.camera=parseInt(g.slice(0,2),16)*256+parseInt(g.slice(4,6),16);
  }
  sim.step(frameInputs[step]??[],1);const f=step-delay;if(f<=first)continue;const n=rows[f],level=levelOf(n),np=nativePhase(n);
  const snap={i:f,level:sim.level.id,area:sim.area.id,phase:sim.phase,x:sim.player.x,y:sim.player.y-32,vx:sim.player.vx*4096,vy:sim.player.vy,lives:sim.lives,size:sim.player.size,time:sim.time,areaFrame:sim.areaFrame};out.push(snap);
  if(process.env.TRACE&&f>=+process.env.TRACE.split(',')[0]&&f<=+process.env.TRACE.split(',')[1])console.log('T',f,frameInputs[f]?.join('+'),'cam',sim.camera,'hold',(sim as any).cameraHold,'sim',snap,'native',n);
  if(f<lo||f>hi)continue;
  const st=stat(level);if(controlled(n)){st.frames++;if(sim.level.id!==level)st.mismatch++;if(sim.phase!=='play')st.missed++;}
  let cause='',dx=Math.floor(sim.player.x)-n.x,dy=Math.floor(sim.player.y)-32-n.y;
  if(sim.level.id!==level)cause='level flow';
  else if(np!==sim.phase&&!(np==='entry'&&['play','pipe'].includes(sim.phase))&&!(np==='intro'&&['pipe','flag'].includes(sim.phase)))cause=np==='dying'||sim.phase==='dying'?'collision / death':np==='gameover'||np==='title'||sim.phase==='gameover'||sim.phase==='title'?'game over / title':'level flow';
  else if(n.lives!==undefined&&sim.lives!==n.lives)cause='death / respawn / lives';
  else if(controlled(n)&&sim.phase==='play'){
   compareEnemies(level,f,n);
   if(process.env.CAMCMP&&n.ram){ // CAMCMP=<n>: remake camera vs native screen-left (trace --ram must have 0x71a-0x71d as 3rd group); histogram + first n error onsets; CAMDX = max |x error| counted (1)
    const g=n.ram.split(',')[2],S=parseInt(g.slice(0,2),16)*256+parseInt(g.slice(4,6),16),ce=Math.floor(sim.camera)-S;
    if(Math.abs(Math.floor(sim.player.x)-n.x)>(+(process.env.CAMDX??1)))camPrev=0;
    else{camErr.set(ce,(camErr.get(ce)??0)+1);
     if(ce!==0&&camPrev===0&&camShown++<(+process.env.CAMCMP||40))console.log('CAM f',f,level,'err',ce,'native S',S,'sim',Math.floor(sim.camera),'x native',n.x,'sim',sim.player.x.toFixed(1),'inputs',frameInputs[f]?.join('+'));
     camPrev=ce;}
   }
   let err=Infinity;
   for(const r of [rows[f-1],n,rows[f+1]])if(r&&controlled(r)&&levelOf(r)===level){const x=Math.floor(sim.player.x)-r.x,y=Math.floor(sim.player.y)-32-r.y,e=Math.max(Math.abs(x),Math.abs(y));if(e<err){err=e;dx=x;dy=y;}}
   if(err>threshold){cause=Math.abs(dx)>threshold?'horizontal / x-pinned':sim.enemies.some((e:any)=>e.active&&!e.dead&&Math.abs(e.x-n.x)<40&&Math.abs(e.y-n.y-32)<48)?'enemy-near vertical':'jump / fall physics';st.events.push({f,area:sim.area.id,x:n.x,y:n.y,dx,dy,vy:n.vy,note:cause});}
   else if(n.size!==undefined&&sim.player.size!==n.size)cause='damage / power-up';
  }
  if(cause){totals.set(cause,(totals.get(cause)??0)+1);if(previousCause===cause&&cluster){cluster.last=f;cluster.frames++;}else{cluster={cause,first:f,last:f,frames:1,native:`${level}/${np} lives${n.lives}`,remake:`${sim.level.id}/${sim.phase} lives${sim.lives}`,dx,dy};clusters.push(cluster);}}
  previousCause=cause;
 }
 fs.writeFileSync(tracePath.replace(/\.jsonl$/, '')+`-remake-phase${delay}.jsonl`,out.map(r=>JSON.stringify(r)).join('\n')+'\n');
 fs.writeFileSync(tracePath.replace(/\.jsonl$/, '')+`-clusters-phase${delay}.json`,JSON.stringify({frames:out.length,firstControl:first,rawFirst,delay,totals:Object.fromEntries(totals),clusters:clusters.filter(c=>c.frames>1)},null,2)+'\n');
 if(process.env.CAMCMP)console.log('CAMERA error histogram (sim - native)',JSON.stringify([...camErr].sort((a,b)=>a[0]-b[0])));
 console.log('MODEL cause classes (downstream differences after the first divergence are not independent root causes)');
 for(const [cause,frames]of totals)console.log(`${cause}: ${frames} frames; first persistent cluster`,JSON.stringify(clusters.find(c=>c.cause===cause&&c.frames>1)??null));
 for(const c of clusters.filter(c=>c.frames>1).slice(0,showEvents))console.log('CLUSTER',JSON.stringify(c));
 for(const [id,st]of stats){console.log(`${id.padEnd(4)} frames ${st.frames} events ${st.events.length} (>8px ${st.events.filter(e=>Math.max(Math.abs(e.dx),Math.abs(e.dy))>8).length}) per-1000 ${(1000*st.events.length/Math.max(1,st.frames)).toFixed(1)} missedControl ${st.missed} levelMismatch ${st.mismatch}`);for(const e of st.events.slice(0,showEvents))console.log(`     f${e.f} ${e.area} x${e.x} y${e.y} dx${e.dx} dy${e.dy} vy${e.vy} ${e.note}`);}
 for(const [level,st]of enemyStats)console.log(`MODEL enemies ${level}: native ${st.native}, matched ${st.matched}, missing ${st.missing}, extra ${st.extra}; interpreted only while both players share level and play phase`);
 for(const [key,values]of nearestOffsets)console.log(`MODEL enemy ${key}: ${values.filter(v=>Math.abs(v)<=2).length}/${values.length} within 2 px`);
 process.exit(0);
}
let simLevel='1-1';
for(let s=0;s<segments.length;s++){
 const seg=segments[s];
 if(order.indexOf(seg.level)<order.indexOf(from)||order.indexOf(seg.level)>order.indexOf(to))continue;
 const st=stat(seg.level);currentLevel=seg.level;
 if(s>0){
  // Let the remake finish its own transition (pipe, flag walk, room load) driven by the native inputs, then wait for control.
  const previous=segments[s-1];let f=previous.end,waited=0;
  let leave:number|undefined,resume:number|undefined; // TRANSITIONS=1: remake's own timeline, as the native row index it lines up with
  let flagSeeded=false;
  // MODEL_LOCAL: a native death (engine 6) between two segments: the remake (whose deaths are blocked here) respawns by its own rule at once, with no steps, as at a level start.
  if(process.env.MODEL_LOCAL&&rows.slice(previous.end,seg.start).some(r=>r.engine===6)){
   if(rows[previous.end]?.engine===11)for(let k=0;k<2;k++){currentFrame=previous.end+k;rowNow=previous.end+k;sim.step(frameInputs[previous.end+1+k]??[],1);} // the native hit lands on the first engine-11 row, past the control segment, and native tests every second row: give the remake those rows too
   const near=blocked.some(b=>b.level===previous.level&&b.f>=previous.end-8),last=rows[previous.end-1];console.log(`NATIVEDEATH ${previous.level} f${previous.end-1} x${last.x} y${last.y} ${near?'remake-too':'remake-no'} ${last.y>=200?'pit':'contact'} [${describeNear()}]`);
   sim.lives=9;sim.respawn();sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;sim.powerChange=undefined;remakeVisit=rows[seg.start].visit;waited=1500;
  }
  const stages:string[]=[];let stageKey=''; // TRANSITIONS=2: the remake's stage changes (phase, castle stage, flag state, time) at their native row index
  while(waited<1500&&!(inControl()&&f>=seg.start-40&&sim.level.id===seg.level)){
   rowNow=f-1;sim.step(frameInputs[Math.min(f,seg.start-1)]??[],1);f++;waited++;
   if(process.env.WAITTRACE===seg.level)console.log('W',f-2,sim.phase,'area',sim.area.id,'rise',sim.pipeRising,'fall',sim.entryFalling,'x',sim.player.x.toFixed(1),'y',sim.player.y.toFixed(1),'g',sim.player.grounded,'cam',sim.camera.toFixed(0),'stage',sim.castleStage,'bowser y',sim.enemies.find((e:any)=>e.kind==='bowser')?.y?.toFixed(1)??'-');
   if(leave===undefined&&sim.phase!=='play')leave=f-2;
   // TIMESEED=1: at the flag grab the remake takes the native timer value of that row (its own clock can differ by one unit, which changes the firework count and countdown length)
   if(timeSeed&&!flagSeeded&&sim.phase==='flag'&&timeSeed[f-1]!==undefined){flagSeeded=true;sim.time=timeSeed[f-1];sim.flagFireworkCount=[1,3,6].includes(sim.time%10)?sim.time%10:0;}
   if(process.env.TRANSITIONS==='2'){const k=`${sim.phase}${sim.castleStage??''}${sim.flagInside?'+in':''}${sim.phase==='flag'&&sim.time===0?'+t0':''}`;if(k!==stageKey){stageKey=k;stages.push(`${f-2-previous.end}:${k}${sim.phase==='flag'||sim.phase==='castle'?`(time ${sim.time})`:''}`);}}
   if(leave!==undefined&&resume===undefined&&inControl())resume=f-2;
   if(sim.phase==='gameover')break;
  }
  if(process.env.TRANSITIONS&&leave===undefined)console.log(`   remake stayed in control: ${sim.level.id}/${sim.area.id} (exit x ${sim.area.exit?.x}, width ${sim.area.width}) x ${sim.player.x.toFixed(1)} y ${sim.player.y.toFixed(1)} camera ${sim.camera.toFixed(1)} | native last control row ${previous.end-1}: x ${rows[previous.end-1].x} y ${rows[previous.end-1].y+32}`);
  if(process.env.TRANSITIONS==='2')console.log(`   remake stages (rows after native control end): ${stages.join(' ')}`);
  if(process.env.TRANSITIONS)console.log(`transition ${previous.level}->${seg.level} native: control ends row ${previous.end}, resumes row ${seg.start} (${seg.start-previous.end} rows) | remake: leaves control ${leave===undefined?'never':leave-previous.end+' rows later'}, resumes ${resume===undefined?'never':resume-seg.start+' rows after native'} (${leave===undefined||resume===undefined?'-':resume-leave} rows)`);
  if(sim.level.id!==seg.level){
   // Remake missed a transition (e.g. death or a different level): start the level fresh so later levels stay comparable.
   st.mismatch++;sim.levelIndex=order.indexOf(seg.level);sim.checkpoint=false;(sim as any).activatedCheckpointArea=undefined;sim.loadArea(sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;
  }
  if(!inControl()){st.missed++;sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;}
 }
 else if(sim.level.id!==seg.level){ // a stream that begins mid-route (tools/harness/native-live.mjs: native checkpoint at a level's first control row): start the remake in that level, small Mario, main area
  sim.levelIndex=order.indexOf(seg.level);sim.checkpoint=false;(sim as any).activatedCheckpointArea=undefined; // a forced level switch starts from the level start (the game's own level changes reset the checkpoint; a stale 4-2 checkpoint area crashed respawn in 4-3)
  sim.loadArea(sim.level.respawnArea??sim.level.main);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;
 }
 simLevel=sim.level.id;
 // AREA=8-4:78289:area-4 loads that area when the segment starting at that native row begins (the remake may have missed the transition).
 const forced=(process.env.AREA??'').split(',').map(s=>s.split(':')).find(([l,r])=>l===seg.level&&Number(r)===seg.start);
 if(forced){sim.loadArea(forced[2]);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;}
 // Alignment (measured): the remake after step f matches native row f-1 (the remake has one more frame of input latency),
 // so the remake is seeded from row q-1 with its two-frame input queue holding the matching controller frames.
 const q=seg.start;
 // LATENCY=2-2:0,7-2:0@59038 feeds a level one frame earlier from the given native row on (the capture phase of the native
 // trace is one frame ahead there; default 1 = the remake's two-frame input queue).
 let early=earlyAt(seg.level,q);
 if(sim.water)sim.water.pullFromStart=!actionsPath;
 if(sim.water)sim.water.whirlFirst=early===1&&!actionsPath; // the same capture phase also shows the whirlpool gravity pass before the ordinary one
 // TIMESEED=1: the remake's level timer is re-synced to the native timer digits (a trace made with --ram 9,2040-2042, default evidence/local/levelend/levelend-route-timer.jsonl, override with TIMEFILE) at each segment start; without it the remake's
 // own clock runs from its own (slightly different) level start, which moves the flag-time digit (fireworks count) and the countdown length by one in some levels.
 if(timeSeed&&q>0){const t=timeSeed[q-1];if(t!==undefined){let j=q-1;while(j<timeSeed.length-1&&timeSeed[j+1]===t)j++;sim.time=t;sim.timerFrames=Math.max(0,24-(j+1-(q-1)));}}/* the frames until the NEXT native change decide the phase: the first period after a load is 17 rows, not 24 */
 sim.recordedRoute=!actionsPath; // fish and cannons of the recorded route replay its attempts; model runs use the native rules
 if(q>0&&randomRows){sim.random.bytes=randomRows[q-1].slice(0,7);sim.random.frame=randomRows[q-1][7];}
 if(q>0&&process.env.MODEL_LOCAL){sim.freshA=true;sim.controlGrace=1;} // native control starts with no earlier A edge: an A held through the load jumps on the first control row
 if(q>0){seed(rows[q-1],rows[q-2]);sim.inputs=early?[new Set(frameInputs[q]??[]),new Set(frameInputs[q+1]??[])]:[new Set(),new Set(frameInputs[q]??[])];}
 // MODEL_LOCAL control starts: native ignores the pad on the first control row (none of 1,799 model-run control starts from rest with a direction held on it moves Mario on it; he moves
 // one row later, evidence/levelstart-lead-findings-20261111.md); the default phase gets that from its queue, the early phase fed it and ran one row (1-3 px) ahead.
 if(q>0&&process.env.MODEL_LOCAL&&early)sim.inputs[0]=new Set();
 // The remake's area clock for recorded timers (cannon attempts) is re-synced like the player: native rows since the visit start (the remake may have been in control earlier than native).
 if(q>0){let v=q;while(v>0&&rows[v-1].task===3&&levelOf(rows[v-1])===seg.level)v--;sim.areaPlayFrame=q-1-v;}
 // The Hammer Bro patrol runs on the native frame counter of the area (frames since its load, docs/NATIVE_ROLES.md): re-sync the remake's copy (broClock) to the native rows since the first
 // row of the task-1 load run before the visit; a level where the remake's own intro/castle timeline differs from native would otherwise start with a clock that is ahead (3-1 by ~15, 7-1 by ~42 frames).
 // BROCLOCK=show prints both clocks at every segment start, BROCLOCK=0 keeps the remake's own.
 if(process.env.BROCLOCK!=='0'&&q>0){let v=q;while(v>0&&rows[v-1].task===3&&levelOf(rows[v-1])===seg.level)v--;let l=v;while(l>0&&levelOf(rows[l-1])===seg.level&&!controlled(rows[l-1]))l--;l=v-1;while(l>0&&!(rows[l].engine===0&&rows[l].task===1))l--;while(l>0&&rows[l-1].engine===0&&rows[l-1].task===1)l--;/* the clock restarts at the LAST load before control (1-2 style levels load twice) */if(l<v){if(process.env.BROCLOCK==='show')console.log(`CLOCK ${seg.level} row ${q} area ${sim.area.id}: remake broClock ${sim.broClock}, native frames since load ${q-1-l}`);sim.broClock=q-1-l;}}
 // A level-checkpoint stream starts after its last area load, so the load search above lands on row 0 (or nothing): seed from the native counter read at the checkpoint
 // (data/native-checkpoint-counter.json, value on row 0, +1 per row) until the stream's own first load. CTRSEED=0 disables it.
 if(process.env.CTRSEED!=='0'&&process.env.BROCLOCK!=='0'&&q>0&&inputs.start==='level_checkpoint'&&!rows.slice(0,q).some((r,i)=>i>0&&r.engine===0&&r.task===1&&!(rows[i-1].engine===0&&rows[i-1].task===1))){const c0=(checkpointCounter as Record<string,number>)[inputs.level];if(c0!==undefined)sim.broClock=c0+q-1;}
 if(process.env.BROCLOCK!=='0'&&routeClock)sim.broClock=rowFrame(seg,q)-(q>0?1:2); // the step that shows row q ticks it to the native frame of that row (the very first segment has one step more)
 let cool=0;
 for(let f=q>0?q+1:0;f<=seg.end;f++){
  // The pushed frame becomes effective two steps later, i.e. it decides row f+1.
  early=earlyAt(seg.level,f+1);if(sim.water)sim.water.whirlFirst=earlyAt(seg.level,f-1)===1&&!actionsPath;
  const evBefore=sim.events.length;
  const scoreBefore=sim.score,coinsBefore=sim.coins;
  currentFrame=f-1;rowNow=f-1;sim.step(frameInputs[f+early]??[],1);if(entrySeeded&&sim.entryLanding){sim.entryLanding=false;entrySeeded=false;} /* its landing-row air step is the same latency offset: native steps +228 on the row after the landing */
  if(process.env.SCORELOG&&(sim.score!==scoreBefore||sim.coins!==coinsBefore))fs.appendFileSync(process.env.SCORELOG,JSON.stringify({f:f-1,level:sim.level.id,area:sim.area.id,x:Math.floor(sim.player.x),y:Math.floor(sim.player.y)-32,ds:sim.score-scoreBefore,dc:sim.coins-coinsBefore,coins:sim.coins})+'\n'); // SCORELOG=<file>: one line per remake score/coin change in control (compare per event with native score digits)
  const n=rows[f-1];if(!n||f-1>=seg.end)continue;
  if(scoreRows?.has(f-1))console.log('SR',f-1,seg.level,sim.area.id,n.x,n.y+32,rows[f-2].x,rows[f-2].y+32,n.vy); // SCOREROWS=<json array of rows>: area and area-local native position at those rows
  noteArea(seg.level,f-1,n);
  if(process.env.ROWOUT)fs.appendFileSync(process.env.ROWOUT,JSON.stringify({f:f-1,level:seg.level,x:sim.player.x,y:sim.player.y-32,vy:sim.player.vy,ph:sim.phase})+'\n'); // ROWOUT=<file>: remake x/y/vy per compared native row (takeoff-onset study)
  if(sim.phase!=='play'&&sim.phase!=='pipe'){ // sim died or changed phase while native keeps control
   if(process.env.EXPLAIN&&f-1>=+process.env.EXPLAIN){const near=sim.enemies.filter((e:any)=>Math.abs(e.x-sim.player.x)<48).map((e:any)=>`${e.kind}@${e.x.toFixed(1)},${e.y.toFixed(1)} vx${e.vx} dead${e.dead} shell${e.shell}`);console.log('EXPLAIN f',f-1,'phase',sim.phase,'sim x',sim.player.x.toFixed(1),'y',sim.player.y.toFixed(1),'vy',sim.player.vy,'size',sim.player.size,'native',n.x,n.y+32,n.vy,'enemies',near.join(' | '));for(let k=f-8;k<=f;k++)if(rows[k])console.log('   native row',k,rows[k].x,rows[k].y+32,rows[k].vy,frameInputs[k]?.join('+'));process.exit(0);}
   st.events.push({f,area:sim.area.id,x:Math.floor(sim.player.x),y:Math.floor(sim.player.y)-32,dx:0,dy:0,vy:n.vy,note:`sim phase ${sim.phase}`});
   sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;seed(n,rows[f-2]);cool=2;continue;
  }
  if(timeSeed&&process.env.TIMEDIFF===seg.level&&(f-1)%60===0)console.log('T',f-1,'native time',timeSeed[f-1],'remake',sim.time,'diff',sim.time-timeSeed[f-1],'timerFrames',sim.timerFrames); // TIMEDIFF=<level> with TIMESEED=1: remake vs native timer along a level
  if(process.env.STOMPS){ // STOMPS=1: native bounces (Mario vy >=1 -> <=-3 without a jump press) and remake stomps (sfx_stomp) with the enemies around; enemy-near vertical study
   const prev=rows[f-2],pressedA=frameInputs[f-1]?.includes('a')||frameInputs[f]?.includes('a');
   const simStomp=sim.events.slice(evBefore).includes('sfx_stomp');
   if(simStomp)console.log('SS',f-1,seg.level,'sim stomp at sim',sim.player.x.toFixed(1),sim.player.y.toFixed(1),'native',n.x,n.y+32,'vy',n.vy,'| size',sim.player.size,'bro',(sim as any).broClock,'pvy',rows[f-2]?.vy,'| native',natEnemies(n).filter(e=>Math.abs(e.x-n.x)<=40).map(e=>`id${e.id}s${e.state}@${e.x},${e.y}`).join(' '),'| remake',sim.enemies.filter((e:any)=>e.active&&Math.abs(e.x-sim.player.x)<=40).map((e:any)=>`${e.kind}${e.dead?'(dead)':e.shell?'(shell)':''}@${e.x.toFixed(1)},${e.y.toFixed(1)}`).join(' '));
   if(process.env.STOMPS==='2')console.log('SR',f-1,sim.player.x.toFixed(2),sim.player.y.toFixed(2),sim.player.vy.toFixed(2),(sim as any).broClock,sim.enemies.filter((e:any)=>e.active&&Math.abs(e.x-sim.player.x)<=32).map((e:any)=>`${e.kind}${e.dead?'(dead)':e.shell?'(shell)':''}@${e.x.toFixed(1)},${e.y.toFixed(1)}`).join(' '));
   if(prev&&prev.vy>=1&&n.vy<=-3&&!pressedA){
    const nat=natEnemies(n).filter(e=>Math.abs(e.x-n.x)<=40).map(e=>`id${e.id}s${e.state}@${e.x},${e.y}`).join(' ');
    const mine=sim.enemies.filter((e:any)=>e.active&&Math.abs(e.x-sim.player.x)<=40).map((e:any)=>`${e.kind}${e.dead?'(dead)':''}@${e.x.toFixed(1)},${e.y.toFixed(1)}`).join(' ');
    console.log('SN',f-1,seg.level,'af',sim.areaFrame,'area',sim.area.id,'apf',sim.areaPlayFrame,'fr',sim.frame,'tf',(sim as any).timerFrames,'bro',(sim as any).broClock,'native bounce at',n.x,n.y+32,'vy',prev.vy,'->',n.vy,'| native',nat,'| remake',mine,'| sim',sim.player.x.toFixed(1),sim.player.y.toFixed(1),'vy',sim.player.vy.toFixed(2));
   }
  }
  st.frames++;compareEnemies(seg.level,f-1,n);
  if(process.env.GEODRIFT&&remakeLevel===seg.level&&remakeVisit===n.visit)geoDriftRow(sim,seg.level,n,rows[f-2],rows[f]); // GEODRIFT=1: drift scan per level/area/x window (tools/harness/geometry-audit.ts)
  if(process.env.GEOAUDIT&&remakeLevel===seg.level&&remakeVisit===n.visit)geoAuditRow(sim,seg.level,n,rows[f-2],rows[f]); // GEOAUDIT=1|2: native positions against the remake's collision cells (tools/harness/geometry-audit.ts)
  if(process.env.AFPRINT&&f-1===seg.start+1)console.log('AF',seg.level,'nativeRow',f-1,'areaFrame',sim.areaFrame,'area',sim.area.id); // AFPRINT=1: remake areaFrame at each control segment's first compared row (maps native rows to areaFrame)
  if(process.env.DUMPE&&process.env.DUMPE.split(' ')[0]===seg.level&&f-1>=+(process.env.DUMPE_FROM??0)&&f-1<=+(process.env.DUMPE_TO??0))console.log('D',f-1,sim.enemies.map((e:any,i:number)=>(process.env.DUMPE!.split(' ')[1]==='*'?e.active&&!e.dead&&Math.abs(e.x-sim.player.x)<200:e.kind===process.env.DUMPE!.split(' ')[1])?`${e.kind}#${i}${e.active?'':'(inactive)'}${e.dead?'(dead'+e.dead+')':''} x${e.x.toFixed(1)} y${e.y.toFixed(1)} vx${e.vx} vy${e.vy.toFixed(2)}${e.lak?` s${e.lak.s} ${e.lak.mode}`:''}`:'').filter(Boolean).join(' | '),'mario',Math.floor(sim.player.x),Math.floor(sim.player.y));
  if(process.env.WITHIN&&sim.area.theme==='water'&&inWithinRows(f-1)){const ws=waterStat(seg.level);ws.frames++;const e=Math.max(Math.abs(Math.floor(sim.player.x)-n.x),Math.abs(Math.floor(sim.player.y)-32-n.y));if(e<=1)ws.within1++;if(e<=2)ws.within2++;}
  if(process.env.APPEAR&&n.ram){ // first appearances: native slot flag 0 -> set, remake enemy inactive -> active
   const prev=rows[f-2];if(prev?.ram){
    const initial=f===(q>0?q+1:0); // APPEAR: objects already in the slots at the first compared row of a segment (level start) count too
    const cur=natEnemies(n),old=initial?[]:natEnemies(prev);
    for(const e of cur)if(!old.some(o=>Math.abs(o.x-e.x)<6&&o.id===e.id))appearNative.push({level:seg.level,f:f-1,id:e.id,x:e.x,mario:n.x,y:e.y,state:e.state,cam:Math.floor(sim.camera),area:sim.area.id,initial});
   }
   for(const e of sim.enemies){if(e.active&&!activeSeen.has(e))appearSim.push({level:seg.level,f:f-1,kind:e.kind,x:e.x,y:e.y,mario:Math.floor(sim.player.x),cam:Math.floor(sim.camera),area:sim.area.id,index:sim.enemies.indexOf(e)});if(e.active)activeSeen.add(e);}
  }
  if(process.env.LEDGES){ // native support loss while moving horizontally: last supported x versus the ledge edge in the remake's tile map
   const a=rows[f-3],b=rows[f-2],c=rows[f-1];
   if(a&&b&&c&&a.vy===0&&b.vy===0&&b.y===a.y&&c.vy>0&&c.y>b.y&&c.y-b.y<=2&&Math.abs(b.vx)>=256&&frameInputs[f-3]&&!frameInputs[f-3].includes('a')&&!frameInputs[f-4]?.includes('a')){
    const feet=b.y+32,dir=b.vx>0?1:-1;let edge:number|undefined;
    if(dir>0){for(let xx=b.x+20;xx>=b.x-12;xx--)if(sim.isSolid(xx,feet)){edge=xx+1;break;}}
    else{for(let xx=b.x-6;xx<=b.x+26;xx++)if(sim.isSolid(xx,feet)){edge=xx;break;}}
    if(edge!==undefined)ledgeSamples.push({level:seg.level,f:f-2,dir,offset:dir>0?edge-b.x:b.x-edge,x:b.x,edge,vx:b.vx,nx:c.x});
   }
  }
  // The reference harness's input latency varies by one frame between jumps (phase of the controller read), so a remake
  // state that matches any native row within +/-1 frame counts as agreeing.
  let best=n,bestError=Infinity,bestDx=0,bestDy=0;
  for(const r of [rows[f-2],rows[f-1],rows[f]]){if(!r||f-1>=seg.end)continue;const rx=Math.floor(sim.player.x)-r.x,ry=Math.floor(sim.player.y)-32-r.y,e=Math.max(Math.abs(rx),Math.abs(ry));if(e<bestError){bestError=e;best=r;bestDx=rx;bestDy=ry;}}
  if(process.env.TRACE&&f-1>=+process.env.TRACE.split(',')[0]&&f-1<=+process.env.TRACE.split(',')[1])console.log('T',f-1,frameInputs[f-1]?.join('+'),'sim',sim.player.x.toFixed(1),Math.floor(sim.player.y)-32,Math.round(sim.player.vx*4096),sim.player.grounded?'G':'a','nat',n.x,n.y,n.vx,n.vy,'subx',sim.player.x-Math.floor(sim.player.x),'natsub',exactWater.get(n.i)?.sub,'simy',sim.player.y.toFixed(4),'simvy',sim.player.vy.toFixed(4));
  if(cool>0){cool--;continue;}
  if(bestError>threshold){
   if(process.env.WITHIN&&sim.area.theme==='water'&&inWithinRows(f-1))waterStat(seg.level).events++;
   const nativeGrounded=n.vy===0&&rows[f-2]?.y===n.y;
   const nearEnemy=sim.enemies.some((e:any)=>e.active&&!e.dead&&Math.abs(e.x-sim.player.x)<80&&Math.abs(e.y-sim.player.y)<80);
   const platform=(sim.area.platforms??[]).length>0&&sim.player.grounded;
   st.events.push({f:f-1,area:sim.area.id,x:n.x,y:n.y,dx:bestDx,dy:bestDy,vy:n.vy,note:(sim.player.grounded?'sim grounded':'sim air')+(nearEnemy?' ENEMY':'')+(platform?' PLATFORMS':'')+((sim.area.platforms??[]).some((q:any)=>{const c=(sim as any).platformPosition(q);return [n.x,sim.player.x].some(x=>x>c.x-20&&x<c.x+q.width+8)&&[n.y+32,sim.player.y].some(y=>Math.abs(y-c.y)<=24);})?' NEARPLAT':'')+(process.env.MODEL_LOCAL&&(remakeLevel!==seg.level||remakeVisit!==n.visit)?' AREADESYNC':'')+(process.env.MODEL_LOCAL&&n.y>208?' OFFSCREEN':'')+(process.env.EXACTROW?` EXACT ${Math.floor(sim.player.x)-n.x},${Math.floor(sim.player.y)-32-n.y}`:'')});
   if(nativeGrounded||bestError>12){seed(n,rows[f-2]);cool=2;}
  }
 }
}
console.log(JSON.stringify({segments:segments.length,from,to,threshold}));
if(process.env.AREASYNC){
 for(const [id,st] of areaStats){
  const off=st.runs.filter(r=>r.nativeVisit!==r.remakeVisit),firstOff=off[0];
  console.log(`areaSync ${id.padEnd(4)} native-control-frames ${String(st.total).padStart(5)} same-area ${String(st.same).padStart(5)} (${(100*st.same/Math.max(1,st.total)).toFixed(1)}%)${firstOff?` first-divergence f${firstOff.first} native-visit ${firstOff.nativeVisit} remake-visit ${firstOff.remakeVisit} (${firstOff.area})`:''}`);
  if(process.env.AREASYNC==='2')for(const r of st.runs)console.log(`   ${r.nativeVisit===r.remakeVisit?'same':'DIFF'} f${r.first}-${r.last} native-visit ${r.nativeVisit} remake-visit ${r.remakeVisit} ${r.area}`);
  if(process.env.AREASYNC==='2'){
   const visits=new Map<number,{start:number,end:number}>();
   rows.forEach((r,i)=>{if(`${r.world}-${r.stage}`!==id||r.task!==3)return;const v=visits.get(r.visit)??visits.set(r.visit,{start:i,end:i}).get(r.visit)!;v.end=i;});
   for(const [k,v] of visits){const l=remakeLoads.find(l=>l.level===id&&l.visit===k);console.log(`   timeline visit ${k}: native rows ${v.start}-${v.end} (${v.end-v.start+1})${l?` | remake load ${l.area} at row ${l.row} (${l.row-v.start>=0?'+':''}${l.row-v.start} vs native start)`:' | remake never loaded it'}`);}
  }
 }
}
for(const [id,w] of waterStats)console.log(`WATER ${id.padEnd(4)} frames ${String(w.frames).padStart(5)} within1px ${(100*w.within1/Math.max(1,w.frames)).toFixed(1)}% within2px ${(100*w.within2/Math.max(1,w.frames)).toFixed(1)}% events ${w.events} re-seeds-per-1000 ${(1000*w.events/Math.max(1,w.frames)).toFixed(1)}`);
for(const [id,st] of stats){
 const big=st.events.filter(e=>Math.abs(e.dx)>8||Math.abs(e.dy)>8).length;
 console.log(`${id.padEnd(4)} frames ${String(st.frames).padStart(6)} events ${String(st.events.length).padStart(4)} (>8px ${big}) per-1000 ${(1000*st.events.length/Math.max(1,st.frames)).toFixed(1)} missedControl ${st.missed} levelMismatch ${st.mismatch}`);
 const hits=blocked.filter(b=>b.level===id);
 if(hits.length){let last=-100;const shown:string[]=[];for(const b of hits){if(b.f-last>30)shown.push(`f${b.f} ${b.what} x${b.x} y${b.y} size${b.size} [${b.near}]`);last=b.f;}console.log(`     blocked remake hurts/deaths: ${hits.length} (${shown.length} contacts)`);for(const t of shown.slice(0,showEvents))console.log('       '+t);}
 for(const e of st.events.filter(e=>process.env.DEATHS?e.note.startsWith('sim phase'):process.env.CLEAN?(!e.note.includes('ENEMY')&&!e.note.startsWith('sim phase')):true).slice(0,showEvents))console.log(`     f${e.f} ${e.area} x${e.x} y${e.y} dx${e.dx} dy${e.dy} vy${e.vy} ${e.note}`);
}

if(enemyStats.size){
 console.log('--- enemy comparison (native slots vs remake, within the screen window) ---');
 if(process.env.TRACKB)for(const [k,v] of bowserStats){const share=(a:number[],lim:number)=>a.length?Math.round(100*a.filter(x=>x<=lim).length/v.n):0,mean=(a:number[])=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'-';console.log(`TRACKB ${k} native-frames ${String(v.n).padStart(4)} missing ${String(v.missing).padStart(4)} x within2 ${String(share(v.dx,2)).padStart(3)}% within4 ${String(share(v.dx,4)).padStart(3)}% within8 ${String(share(v.dx,8)).padStart(3)}% mean|dx| ${mean(v.dx)} | feet y within2 ${String(share(v.dy,2)).padStart(3)}% within4 ${String(share(v.dy,4)).padStart(3)}% mean|dy| ${mean(v.dy)}`);}
 if(process.env.IDCOV)for(const [k,v] of idCov)console.log(`IDCOV ${k.padEnd(10)} native-frames ${String(v.n).padStart(5)} matched ${String(Math.round(100*v.ok/v.n)).padStart(3)}% remake-kinds ${[...v.kinds].sort((a,b)=>b[1]-a[1]).map(([x,c])=>x+':'+c).join(',')||'-'}`);
 console.log('native id -> remake kind pairings:',[...idKind].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(' '));
 for(const [id,st] of enemyStats){
  const sorted=[...st.absDx].sort((a,b)=>a-b),median=sorted.length?sorted[Math.floor(sorted.length/2)]:0;
  console.log(`${id.padEnd(4)} native-enemy-frames ${st.native} matched ${(100*st.matched/Math.max(1,st.native)).toFixed(1)}% median|dx| ${median} missing ${st.missing} extra ${st.extra}`);
  if(process.env.RUNS){const top=(runs:Run[],label:string)=>[...runs].sort((x,y)=>y.n-x.n).slice(0,+process.env.RUNS!).map(r=>`     ${label} ${r.key} f${r.first}-${r.last} (${r.n})`);for(const line of [...top(st.missingRuns,'missing'),...top(st.extraRuns,'extra')])console.log(line);}
 }
}

if(process.env.GEOAUDIT)geoAuditReport(process.env.GEOAUDIT==='2');
if(process.env.GEODRIFT)geoDriftReport();
if(ledgeSamples.length){
 const hist=(dir:number)=>{const h=new Map<number,number>();for(const l of ledgeSamples.filter(l=>l.dir===dir))h.set(l.offset,(h.get(l.offset)??0)+1);return [...h].sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(' ');};
 console.log('--- support-loss samples: ledge edge minus last supported x (right) / x minus edge (left) ---');
 console.log('right-moving',hist(1));console.log('left-moving',hist(-1));
 if(process.env.LEDGES==='2')for(const l of ledgeSamples)console.log(`LEDGE ${l.level} f${l.f} dir${l.dir} x${l.x} edge${l.edge} offset${l.offset} vx${l.vx} nextx${l.nx}`); // LEDGES=2: every sample
}

if(process.env.APPEAR_LIST){const lv=process.env.APPEAR_LIST;for(const a of appearNative.filter(a=>a.level===lv))console.log('N',a.f,'id'+a.id,'x',a.x,'mario',a.mario,'x-mario',a.x-a.mario);for(const a of appearSim.filter(a=>a.level===lv))console.log('S',a.f,a.kind,'x',a.x.toFixed(1),'mario',a.mario,'x-mario',(a.x-a.mario).toFixed(1));}
if(process.env.APPEAR){
 console.log('--- first appearances: native Mario x at native enemy appearance versus remake Mario x at the remake enemy activation (same enemy by spawn x) ---');
 const byLevel=new Map<string,number[]>();
 for(const a of appearNative){
  const m=appearSim.filter(b=>b.level===a.level&&Math.abs(b.x-a.x)<12&&Math.abs(b.f-a.f)<240).sort((p,q)=>Math.abs(p.x-a.x)-Math.abs(q.x-a.x))[0];
  if(!m)continue;(byLevel.get(a.level)??byLevel.set(a.level,[]).get(a.level)!).push(a.mario-m.mario);
 }
 for(const [lv,d] of byLevel){const sorted=[...d].sort((a,b)=>a-b);console.log(lv.padEnd(4),'pairs',d.length,'native Mario x minus remake Mario x at appearance: median',sorted[Math.floor(sorted.length/2)],'range',sorted[0],sorted[sorted.length-1]);}
}

const walkerTotals={n:0,ok:0};
if(nearestOffsets.size){
 console.log('--- nearest same-kind remake enemy offset (native x - remake x), alive walkers; histogram buckets of 8px ---');
 for(const [key,list] of nearestOffsets){
  const none=list.filter(v=>v===9999).length,v=list.filter(v=>v!==9999).sort((a,b)=>a-b);if(!v.length){console.log(key.padEnd(18),'n',list.length,'no remake counterpart');continue;}
  const buckets=new Map<number,number>();for(const d of v)buckets.set(Math.round(d/8)*8,(buckets.get(Math.round(d/8)*8)??0)+1);
  const top=[...buckets].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([b,c])=>`${b}:${c}`).join(' ');
  const within=v.filter(d=>Math.abs(d)<=2).length;
  console.log(key.padEnd(18),'n',list.length,'within2px',(100*within/list.length).toFixed(0)+'%','none',none,'median',v[Math.floor(v.length/2)],'top buckets',top);
  walkerTotals.n+=list.length;walkerTotals.ok+=within;
 }
}

if(process.env.APPEAR_JSON)fs.writeFileSync(process.env.APPEAR_JSON,JSON.stringify({native:appearNative,sim:appearSim}));
if(nearestOffsets.size)console.log('walker enemy-frames within 2px of the native enemy:',walkerTotals.ok,'/',walkerTotals.n,'('+(100*walkerTotals.ok/Math.max(1,walkerTotals.n)).toFixed(1)+'%)');

if(process.env.FIT_JSON)fs.writeFileSync(process.env.FIT_JSON,JSON.stringify([...fitSamples].map(([k,v])=>({key:k,...v}))));
