import assert from 'node:assert/strict';
export const BUTTONS=['up','down','left','right','a','b','x','y','start','select'];
export const CYCLES=29781;
const integer=(value,lo,hi)=>Number.isInteger(value)&&value>=lo&&value<=hi;
const fields=(value,allowed)=>assert.ok(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k)),'Unknown or invalid fields');
export function actionMask(action){
 assert.notEqual('buttons' in action,'mask' in action,'Provide buttons or mask');
 if('mask' in action){assert.ok(integer(action.mask,0,1023),'Invalid controller mask');return action.mask;}
 assert.ok(Array.isArray(action.buttons)&&action.buttons.every(b=>BUTTONS.includes(b)),'Unknown button');
 return [...new Set(action.buttons)].reduce((mask,b)=>mask|(1<<BUTTONS.indexOf(b)),0);
}
export function secondActionMask(action){
 if(!('buttons2' in action)&&!('mask2' in action))return 0;
 assert.notEqual('buttons2' in action,'mask2' in action,'Provide buttons2 or mask2');
 return 'mask2' in action?actionMask({mask:action.mask2}):actionMask({buttons:action.buttons2});
}
export function controllerButtons(mask){
 assert.ok(integer(mask,0,1023),'Invalid controller mask');
 return ['up','down','left','right','a','b','start','select'].filter((_,i)=>Boolean(mask&[1,2,4,8,80,160,256,512][i]));
}
export function validatePlan(plan){
 fields(plan,['schema','tolerances','regions','prefix','cases']);assert.equal(plan.schema,'reference-experiment-v1');
 assert.ok(plan.tolerances,'Declare quantitative tolerances before capture');
 fields(plan.tolerances,['differentPixelFraction','meanAbsoluteChannelError']);
 for(const [key,max] of [['differentPixelFraction',1],['meanAbsoluteChannelError',255]])assert.ok(Number.isFinite(plan.tolerances[key])&&plan.tolerances[key]>=0&&plan.tolerances[key]<=max,`Invalid tolerance ${key}`);
 const regions=plan.regions??[{name:'scene',x:0,y:0,width:256,height:240}];
 assert.ok(Array.isArray(regions)&&regions.length>0);
 for(const r of regions){fields(r,['name','x','y','width','height']);assert.ok(typeof r.name==='string'&&r.name.length>0);assert.ok(integer(r.x,0,255)&&integer(r.y,0,239)&&integer(r.width,1,256-r.x)&&integer(r.height,1,240-r.y),'Invalid image region');}
 assert.ok(new Set(regions.map(r=>r.name)).size===regions.length,'Region names must be unique');
 assert.ok(Array.isArray(plan.prefix)&&Array.isArray(plan.cases)&&plan.cases.length>0);
 let policyValid=true;
 const manual=action=>{actionMask(action);secondActionMask(action);assert.ok(integer(action.frames,1,240),'frames must be integer 1..240');};
 for(const p of plan.prefix){
  if(p.op==='auto'){fields(p,['op','ticks']);assert.ok(policyValid,'Cannot use auto after manual native stepping invalidates history');assert.ok(Number.isSafeInteger(p.ticks)&&p.ticks>0,'ticks must be a positive safe integer');}
  else{fields(p,['op','buttons','mask','buttons2','mask2','frames']);assert.equal(p.op,'step_frames');manual(p);policyValid=false;}
 }
 const names=new Set();
 for(const c of plan.cases){
  fields(c,['name','actions']);assert.ok(typeof c.name==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(c.name)&&c.name!=='prefix','Use a safe case name other than prefix');
  assert.ok(!names.has(c.name),'Case names must be unique');names.add(c.name);
  assert.ok(Array.isArray(c.actions)&&c.actions.length>0);
  for(const a of c.actions){fields(a,['buttons','mask','buttons2','mask2','frames']);manual(a);}
 }
 return {...plan,regions};
}
export function timingMetrics(source,remake,expectedFrame){
 const pass=Number.isInteger(source.cycles)&&source.cycles===expectedFrame*CYCLES&&source.cycles_advanced===source.frames_advanced*CYCLES&&remake.framesAdvanced===source.frames_advanced&&remake.frame===expectedFrame;
 return {referenceCycles:source.cycles,referenceCyclesAdvanced:source.cycles_advanced,referenceFramesAdvanced:source.frames_advanced,remakeFrame:remake.frame,remakeFramesAdvanced:remake.framesAdvanced,expectedFrame,pass};
}
export function pixelMetrics(a,b,region,limits){
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 const {name,x,y,width,height}=region;
 assert.ok(integer(x,0,a.width-1)&&integer(y,0,a.height-1)&&integer(width,1,a.width-x)&&integer(height,1,a.height-y),'Region outside image');
 let different=0,total=0,max=0;
 for(let row=y;row<y+height;row++)for(let col=x;col<x+width;col++){
  const offset=(row*a.width+col)*4;let changed=false;
  for(let channel=0;channel<3;channel++){const d=Math.abs(a.data[offset+channel]-b.data[offset+channel]);total+=d;max=Math.max(max,d);changed||=d>0;}
  if(changed)different++;
 }
 const pixels=width*height,fraction=different/pixels,mean=total/(pixels*3);
 return {name,pixels,differentPixels:different,differentPixelFraction:fraction,meanAbsoluteChannelError:mean,maxChannelError:max,pass:fraction<=limits.differentPixelFraction&&mean<=limits.meanAbsoluteChannelError};
}

// Tolerate only an isolated visual failure with passing adjacent native slices.
// Missing samples, timing failures and runs of failures remain failures.
export function singleFrameComparison(samples,operationalPass){
 const pass=s=>s.timing.pass&&s.regions.every(r=>r.pass),groups=new Map(),tolerated=[];
 for(const s of samples){if(!groups.has(s.case))groups.set(s.case,[]);groups.get(s.case).push(s);}
 for(const rows of groups.values())for(let i=1;i<rows.length-1;i++){
  const [previous,current,next]=[rows[i-1],rows[i],rows[i+1]];
  if(current.timing.pass&&!pass(current)&&pass(previous)&&pass(next)&&previous.frame+1===current.frame&&current.frame+1===next.frame)tolerated.push(current);
 }
 const skipped=new Set(tolerated),firstFailure=samples.find(s=>!pass(s)&&!skipped.has(s))??null;
 return {comparisonPassed:Boolean(operationalPass&&samples.length&&firstFailure===null),strictComparisonPassed:Boolean(operationalPass&&samples.length&&samples.every(pass)),firstFailedCheckpoint:firstFailure,strictFirstFailedCheckpoint:samples.find(s=>!pass(s))??null,toleratedSingleFrames:tolerated.map(s=>({case:s.case,index:s.index,frame:s.frame}))};
}
