/** Validation queue: audits whole recordings (every level frame, state AND picture) one per process and keeps a pass/fail list in DATA_DIR/validate/.
 * Order: recordings never validated first, then failing recordings whose game code (src/, data/) changed since their last run; a recording that
 * matched once is never run again. Within each group the recording that reaches the latest level goes first. Each commit's audits run in their
 * own clean worktree (WORKTREES/<sha>), so commits made meanwhile never disturb a running audit. Runs until stopped.
 * usage: node validate.mjs --worktrees DIR [--monitor DATA_DIR] [--jobs 16] [--ids id,id] (--ids, or ids written to DATA_DIR/validate/requests/<file>: validate those next) */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';import {execFileSync,spawn} from 'node:child_process';
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,'../../../../..');
const {values:a}=parseArgs({options:{worktrees:{type:'string'},monitor:{type:'string'},jobs:{type:'string',default:'16'},ids:{type:'string'},'base-port':{type:'string',default:'57100'}}});
if(!a.worktrees)throw Error('--worktrees DIR required');
const monitor=path.resolve(a.monitor??path.join(dir,'.local')),out=path.join(monitor,'validate'),raw=path.join(out,'raw'),trees=path.resolve(a.worktrees);fs.mkdirSync(raw,{recursive:true});fs.mkdirSync(trees,{recursive:true});
const git=(...x)=>execFileSync('git',x,{cwd:repo,encoding:'utf8'}).trim(),read=p=>JSON.parse(fs.readFileSync(p));
export const gameKey=commit=>git('rev-parse',`${commit}:games/smb/src`)+git('rev-parse',`${commit}:games/smb/data`);
const statusFile=id=>path.join(out,id.replace(/[^a-z0-9-]/gi,'_')+'.json');
const LEVELS=[];for(let w=1;w<=8;w++)for(let l=1;l<=4;l++)LEVELS.push(`${w}-${l}`);
/** Furthest level each recording reaches (native RAM $075F/$075C in play modes, every 30th frame), cached by recording id. */
function furthest(inv){
 const file=path.join(out,'levels.json'),cache=fs.existsSync(file)?read(file):{},notes=path.dirname(read(path.join(monitor,'sources.json')).snapshots.at(-1).mood),buf=Buffer.alloc(2048);let added=0;
 for(const r of inv){if(cache[r.id])continue;
  const ram=r.id.startsWith('original:')?path.join(notes,'recovered-native/original32/traces',r.id.slice(9),'ram.bin'):path.join(notes,'recovered-native/moods/captures',r.padsSha256,'ram.bin');
  const fd=fs.openSync(ram,'r'),seen=new Set();for(let f=0;f<r.frames;f+=30){fs.readSync(fd,buf,0,2048,f*2048);const w=buf[0x75f]+1,l=buf[0x75c]+1;if([1,2,3].includes(buf[0x770])&&w<=8&&l<=4)seen.add(`${w}-${l}`);}fs.closeSync(fd);
  cache[r.id]=LEVELS.filter(l=>seen.has(l));added++;}
 if(added)fs.writeFileSync(file,JSON.stringify(cache)+'\n');return cache;
}
/** Clean worktree at a commit (created once, node_modules linked), removed when no audit uses it and it is not HEAD. */
const users=new Map();
function treeFor(commit){
 const p=path.join(trees,commit.slice(0,12));
 if(!fs.existsSync(p)){git('worktree','add','-q','--detach',p,commit);fs.symlinkSync(path.join(repo,'node_modules'),path.join(p,'node_modules'));}
 users.set(p,(users.get(p)??0)+1);return p;
}
function release(p,head){users.set(p,users.get(p)-1);if(!users.get(p)&&!p.endsWith(head.slice(0,12))){try{git('worktree','remove','--force',p);}catch{}users.delete(p);}}
/** One recording's verdict from a combined-monitor-audit output. */
function verdict(report,id,commit,key,levels){
 const run=report.runs[0],bad=(run.spans??[]).filter(s=>s.state==='mismatch'||s.picture==='mismatch'),n=k=>bad.filter(s=>s[k]==='mismatch').reduce((t,s)=>t+s.to-s.from,0);
 const first=bad[0];return {id,commit,gameKey:key,levels,result:bad.length?'mismatch':'match',checked:run.directlyComparedFrames,stateFrames:n('state'),pictureFrames:n('picture'),
  first:first?{frame:first.from,level:first.level,state:first.state,picture:first.picture}:null,failingLevels:[...new Set(bad.map(s=>s.level))],finished:new Date().toISOString()};
}
const running=new Set(),forced=new Set((a.ids??'').split(',').filter(Boolean));let port=0;
async function audit(r,levels,head){
 const key=gameKey(head),tree=treeFor(head),name=r.id.replace(/[^a-z0-9-]/gi,'_'),partial=path.join(raw,name+'.partial'),slot=port++%Number(a.jobs);
 fs.writeFileSync(path.join(out,'running',name),JSON.stringify({id:r.id,commit:head,started:new Date().toISOString()}));
 const code=await new Promise(res=>{const p=spawn(path.join(tree,'node_modules/.bin/tsx'),['games/smb/tools/harness/combined-monitor-audit.ts','--monitor',monitor,'--out',partial,'--ids',r.id,'--levels',levels.join(','),'--port',String(Number(a['base-port'])+slot)],{cwd:tree,stdio:['ignore','ignore','pipe']});let e='';p.stderr.on('data',b=>e=(e+b).slice(-4000));p.on('exit',c=>res(c?e:0));});
 fs.rmSync(path.join(out,'running',name),{force:true});release(tree,git('rev-parse','HEAD'));
 const status=code===0?(fs.renameSync(partial,path.join(raw,name+'.json')),verdict(read(path.join(raw,name+'.json')),r.id,head,key,levels)):{id:r.id,commit:head,gameKey:key,levels,result:'error',error:String(code).slice(-1500),finished:new Date().toISOString()};
 fs.writeFileSync(statusFile(r.id)+'.partial',JSON.stringify(status,null,1)+'\n');fs.renameSync(statusFile(r.id)+'.partial',statusFile(r.id));
 console.log(`${status.result.padEnd(8)} ${r.id.slice(0,20)} ${status.first?`${status.first.level}@${status.first.frame} state ${status.stateFrames} picture ${status.pictureFrames}`:''}`);
}
fs.rmSync(path.join(out,'running'),{recursive:true,force:true});fs.mkdirSync(path.join(out,'running'));
for(;;){
 // A file DATA_DIR/validate/requests/<anything> holding recording ids (one per line) validates them next, even if they matched before.
 const req=path.join(out,'requests');fs.mkdirSync(req,{recursive:true});for(const n of fs.readdirSync(req)){for(const id of fs.readFileSync(path.join(req,n),'utf8').split(/\s+/).filter(Boolean))forced.add(id);fs.rmSync(path.join(req,n));}
 const inv=read(path.join(monitor,'combined-inputs.json')).runs,levels=furthest(inv),head=git('rev-parse','HEAD'),key=gameKey(head),rank=r=>-LEVELS.indexOf(levels[r.id].at(-1)??'1-1');
 const status=id=>fs.existsSync(statusFile(id))?read(statusFile(id)):null;
 const todo=inv.filter(r=>levels[r.id].length&&!running.has(r.id)).map(r=>({r,s:status(r.id)}))
  .filter(({r,s})=>forced.has(r.id)||!s||s.result!=='match'&&s.gameKey!==key)
  .sort((x,y)=>(forced.has(y.r.id)-forced.has(x.r.id))||(!!x.s-!!y.s)||rank(x.r)-rank(y.r));
 while(running.size<Number(a.jobs)&&todo.length){const {r}=todo.shift();forced.delete(r.id);running.add(r.id);audit(r,levels[r.id],head).catch(e=>console.error(r.id,e)).finally(()=>running.delete(r.id));}
 await new Promise(res=>setTimeout(res,15000));
}
