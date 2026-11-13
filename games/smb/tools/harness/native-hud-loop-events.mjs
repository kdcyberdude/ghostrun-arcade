/** Preserve native loopback/parser clock evidence: --traces DIR --entrances DIR [--out FILE]. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';import {divergence} from './native-divergence.ts';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string',default:'tests/fixtures/native-hud-loops.json'},'entrances-only':{type:'boolean'}}});if(!a.traces||!a.entrances)throw Error('--traces and --entrances required');const runs=[],excluded=[];
if(a['entrances-only']){
 const fixture=JSON.parse(fs.readFileSync(a.out,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
 for(const run of fixture.runs){
  const dir=path.join(a.traces,run.level),initial=fs.readFileSync(path.join(dir,'initial.ram')),ram=fs.readFileSync(path.join(dir,'ram.bin'));
  if(hash(initial)!==run.source.initialRamSha256||hash(ram)!==run.source.ramSha256)throw Error(`Native source hash mismatch: ${run.level}`);
  const entrance=decodeEntrance(initial,JSON.parse(fs.readFileSync(path.join(a.entrances,run.level,'entrance.json'),'utf8')));
  if(run.entrance.enemyDataOffset!==entrance.enemyDataOffset)throw Error(`Native source cursor offset mismatch: ${run.level}`);
  run.entrance.enemyDataPage=entrance.enemyDataPage;run.entrance.enemyDataSelected=entrance.enemyDataSelected;
 }
 fs.writeFileSync(a.out,JSON.stringify(fixture)+'\n');console.log(fixture.runs.length,'authenticated entrance cursor states refreshed');process.exit(0);
}
for(const level of fs.readdirSync(a.traces).filter(n=>fs.existsSync(path.join(a.traces,n,'ram.bin')))){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram')),pads=fs.readFileSync(path.join(dir,'pads.bin')),receipt=JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'))),row=f=>f<0?initial:ram.subarray(f*2048,(f+1)*2048),camera=r=>r[0x71a]*256+r[0x71c],frames=new Set();
 for(let f=0;f<pads.length;f++){const r=row(f),p=row(f-1);if(r[14]===8&&p[14]===8&&r[0x770]===1&&r[0x772]===3&&camera(p)-camera(r)>=256)for(let n=f;n<Math.min(f+12,pads.length);n++)frames.add(n);}
 if(!frames.size)continue;const first=divergence(dir,path.join(a.entrances,level,'entrance.json'),level).first;for(const frame of [...frames])if(first!==null&&frame>=first){frames.delete(frame);excluded.push({level,frame,first,reason:'after earlier state divergence'});}if(!frames.size)continue;const cases=[...frames].map(frame=>({frame,task:row(frame)[0x71f],scroll:row(frame)[0x73d]}));runs.push({level,source:{ramSha256:createHash('sha256').update(ram).digest('hex'),initialRamSha256:createHash('sha256').update(initial).digest('hex')},entrance:decodeEntrance(initial,receipt),pads:[...pads.subarray(0,Math.max(...frames)+1)],cases});
}
fs.writeFileSync(a.out,JSON.stringify({runs,excluded})+'\n');console.log(runs.length,'native loopback runs');
