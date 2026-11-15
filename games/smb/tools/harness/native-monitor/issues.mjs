/** Remaining issues per level: a failing (recording, level) pair is one issue. Each pair takes its newest measurement, preferring one made on the
 * current game code (src/ and data/ equal to HEAD); a failing pair measured only on older code is "to recheck" (a fix may already be merged). */
import fs from 'node:fs';import path from 'node:path';
export const LEVELS=[];for(let w=8;w>=1;w--)for(let l=4;l>=1;l--)LEVELS.push(`${w}-${l}`);
const parsed=new Map();
/** Per-pair results of one audit report (run-audit live/complete report or a single combined-monitor-audit output), cached by file size and mtime. */
export function pairsOf(file){
 const stat=fs.statSync(file),key=`${stat.size}/${stat.mtimeMs}`,hit=parsed.get(file);if(hit?.key===key)return hit.value;
 const r=JSON.parse(fs.readFileSync(file)),when=Date.parse(r.progress?.updated??r.progress?.finished??'')||stat.mtimeMs,pairs=[];
 for(const run of r.runs??[]){
  const by=new Map();
  for(const s of run.spans??[]){
   if(!s.level||s.state==='unchecked'&&s.picture==='unchecked')continue;const p=by.get(s.level)??{id:run.id,level:s.level,checked:0,state:0,picture:0,first:null};by.set(s.level,p);
   const n=s.to-s.from;p.checked+=n;if(s.state==='mismatch')p.state+=n;if(s.picture==='mismatch')p.picture+=n;if((s.state==='mismatch'||s.picture==='mismatch')&&(p.first===null||s.from<p.first))p.first=s.from;
  }
  pairs.push(...by.values());
 }
 const value={runtime:r.runtimeCommit,when,pairs};parsed.set(file,{key,value});return value;
}
/** Newest measurement per pair; current = measured on game code equal to HEAD's. */
export function collectIssues(files,isCurrent){
 const best=new Map();
 for(const file of files){let rep;try{rep=pairsOf(file);}catch{continue;}const current=isCurrent(rep.runtime);
  for(const p of rep.pairs){const k=p.id+'|'+p.level,old=best.get(k);if(!old||current>old.current||current===old.current&&rep.when>old.when)best.set(k,{...p,current,runtime:rep.runtime,when:rep.when,file});}}
 return best;
}
const fmt=n=>n.toLocaleString('en-US');
/** Simple text view: headline counts, then one row per level from 8-4 back to 1-1. */
export function renderIssues(best,{totals,head,width=100,color=true,activity=''}){
 const c=(code,s)=>color?`\x1b[${code}m${s}\x1b[0m`:s,red=s=>c('31',s),green=s=>c('32',s),yellow=s=>c('33',s),dim=s=>c('2',s),bold=s=>c('1',s);
 const rows=LEVELS.map(level=>{const ps=[...best.values()].filter(p=>p.level===level),bad=ps.filter(p=>p.state||p.picture);
  return {level,seen:ps.length,total:totals?.[level]?.recordings,open:bad.filter(p=>p.current),recheck:bad.filter(p=>!p.current),stale:ps.filter(p=>!p.current).length};});
 const open=rows.reduce((n,r)=>n+r.open.length,0),recheck=rows.reduce((n,r)=>n+r.recheck.length,0),unchecked=rows.filter(r=>!r.seen).length;
 const cleanNow=rows.filter(r=>r.seen&&r.seen===r.total&&!r.open.length&&!r.recheck.length&&!r.stale).length;
 const out=[bold('SMB · REMAINING ISSUES')+dim(`   game code at HEAD ${head.slice(0,7)} · an issue = one recording failing one level`),
  `${open?red(`OPEN ${open}`):green('OPEN 0')}  failing on the current code`,
  `${recheck?yellow(`RECHECK ${recheck}`):'RECHECK 0'}  failed on older code; fixes since may have solved them`,
  `${green(`CLEAN ${cleanNow}/32`)} levels fully clean on the current code · ${unchecked} levels not measured yet`,activity,'',
  bold('level  issues                      recordings checked   frames failing (state / picture)   first failing recordings')];
 for(const r of rows){
  const bad=[...r.open,...r.recheck],frames=bad.reduce((n,p)=>[n[0]+p.state,n[1]+p.picture],[0,0]);
  const label=!r.seen?dim('not measured'):r.open.length?red(`${r.open.length} open`)+(r.recheck.length?' + '+yellow(`${r.recheck.length} recheck`):''):r.recheck.length?yellow(`${r.recheck.length} recheck`):r.stale?green('clean')+dim(' (older code)'):green('clean');
  const names=bad.sort((a,b)=>b.state+b.picture-a.state-a.picture).slice(0,3).map(p=>`${p.id.replace(/^mood:/,'').slice(0,8)}@${p.first}`).join(' ');
  const pad=(s,n)=>s+' '.repeat(Math.max(0,n-s.replace(/\x1b\[[0-9;]*m/g,'').length));
  out.push(`${pad(r.level,7)}${pad(label,28)}${pad(r.seen?`${r.seen}/${r.total??'?'}`:'-',21)}${pad(bad.length?`${fmt(frames[0])} / ${fmt(frames[1])}`:'-',35)}${dim(names)}`.slice(0,width+60));
 }
 out.push('',dim('Rechecks: node tools/harness/native-monitor/recheck.mjs (failing pairs only, last level first, cached) · [0] full overview [q] quit'));
 return out.join('\n')+'\n';
}
