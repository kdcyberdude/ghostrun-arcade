/** Re-audit only the failing (recording, level) pairs on the current game code, last level first, with the picture-verdict cache.
 * Results go to DATA_DIR/recheck/, which smb-progress's issues screen reads. A clean checkout pinned at HEAD runs the audits (--runtime),
 * so commits made meanwhile do not disturb them; rerun to pick up newer fixes.
 * usage: node recheck.mjs --runtime CLEAN_CHECKOUT [--monitor DATA_DIR] [--jobs 6] [--levels 8-4,8-3] [--all] */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';import {execFileSync,spawn} from 'node:child_process';
import {collectIssues,LEVELS} from './issues.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const {values:a}=parseArgs({options:{runtime:{type:'string'},monitor:{type:'string'},jobs:{type:'string',default:'6'},levels:{type:'string'},all:{type:'boolean'},'base-port':{type:'string',default:'56100'}}});
if(!a.runtime)throw Error('--runtime CLEAN_CHECKOUT required (it is moved to HEAD)');
const monitor=path.resolve(a.monitor??path.join(dir,'.local')),runtime=path.resolve(a.runtime),repo=path.resolve(dir,'../../../../..'),git=(cwd,...x)=>execFileSync('git',x,{cwd,encoding:'utf8'}).trim();
const head=git(repo,'rev-parse','HEAD');git(runtime,'checkout','-q','--detach',head);if(git(runtime,'status','--porcelain','--untracked-files=no'))throw Error('Runtime must be clean');
const same=new Map(),sameGame=r=>{if(!r)return false;if(!same.has(r)){let s=r===head;if(!s)try{git(repo,'diff','--quiet',r,head,'--','games/smb/src','games/smb/data');s=true;}catch{}same.set(r,s);}return same.get(r);};
const config=JSON.parse(fs.readFileSync(path.join(monitor,'sources.json'))),out=path.join(monitor,'recheck');fs.mkdirSync(out,{recursive:true});
const files=[...(config.current??[]),...(config.combined?[config.combined]:[]),...fs.readdirSync(out).filter(n=>n.endsWith('.json')).map(n=>path.join(out,n))];
const only=a.levels?new Set(a.levels.split(',')):null;
// Failing pairs not yet measured on this game code (--all: also re-measure failing pairs that are current).
const todo=[...collectIssues(files,sameGame).values()].filter(p=>(p.state||p.picture)&&(a.all||!p.current)&&(!only||only.has(p.level)));
const byRun=new Map();for(const p of todo)(byRun.get(p.id)??byRun.set(p.id,[]).get(p.id)).push(p.level);
const order=l=>LEVELS.indexOf(l),queue=[...byRun].map(([id,levels])=>({id,levels:levels.sort((x,y)=>order(x)-order(y))})).sort((x,y)=>order(x.levels[0])-order(y.levels[0]));
console.log(JSON.stringify({head:head.slice(0,7),pairs:todo.length,recordings:queue.length}));
let next=0,done=0;const jobs=Number(a.jobs);
await Promise.all(Array.from({length:jobs},async(_,slot)=>{for(let job;(job=queue[next++]);){
 const name=job.id.replace(/^mood:/,'').slice(0,12).replace(/[^a-z0-9-]/gi,'_')+'-'+job.levels.join('_'),file=path.join(out,name+'.json'),partial=path.join(out,name+'.partial');
 const code=await new Promise(res=>{const p=spawn(path.join(runtime,'node_modules/.bin/tsx'),['games/smb/tools/harness/combined-monitor-audit.ts','--monitor',monitor,'--out',partial,'--ids',job.id,'--levels',job.levels.join(','),'--port',String(Number(a['base-port'])+slot)],{cwd:runtime,stdio:['ignore','ignore','pipe']});let e='';p.stderr.on('data',b=>e=(e+b).slice(-2000));p.on('exit',c=>{if(c)console.error(job.id,job.levels.join(','),e);res(c);});});
 if(code===0)fs.renameSync(partial,file);
 const r=code===0?JSON.parse(fs.readFileSync(file)).runs[0]:null,bad=r?r.spans.filter(s=>s.state==='mismatch'||s.picture==='mismatch').reduce((n,s)=>n+s.to-s.from,0):null;
 console.log(`${++done}/${queue.length} ${job.id.slice(0,13)} ${job.levels.join(',')} ${code?'ERROR':bad?`still failing ${bad} frames`:'fixed'}`);
}}));
