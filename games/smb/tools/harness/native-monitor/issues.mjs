/** smb-progress's default screen: which recordings match the remake on every level frame (state AND picture) and which do not, from the
 * validation queue (validate.mjs) in DATA_DIR/validate. A failing recording whose game code changed since its run is queued to run again. */
import fs from 'node:fs';import path from 'node:path';
const LEVELS=[];for(let w=1;w<=8;w++)for(let l=1;l<=4;l++)LEVELS.push(`${w}-${l}`);
const cache=new Map(),read=f=>{const st=fs.statSync(f),k=`${st.size}/${st.mtimeMs}`,hit=cache.get(f);if(hit?.k===k)return hit.v;const v=JSON.parse(fs.readFileSync(f));cache.set(f,{k,v});return v;};
export function collectValidation(dataDir,inventory){
 const out=path.join(dataDir,'validate'),levels=fs.existsSync(path.join(out,'levels.json'))?read(path.join(out,'levels.json')):{};
 const running=new Set(fs.existsSync(path.join(out,'running'))?fs.readdirSync(path.join(out,'running')):[]);
 return inventory.map(r=>{const name=r.id.replace(/[^a-z0-9-]/gi,'_'),f=path.join(out,name+'.json');let s=null;try{s=read(f);}catch{}return {id:r.id,frames:r.frames,reaches:levels[r.id]?.at(-1)??null,status:s,running:running.has(name)};});
}
export function renderValidation(rows,{headKey,head,width=100,color=true}){
 const c=(code,s)=>color?`\x1b[${code}m${s}\x1b[0m`:s,red=s=>c('31',s),green=s=>c('32',s),yellow=s=>c('33',s),dim=s=>c('2',s),bold=s=>c('1',s);
 const match=rows.filter(r=>r.status?.result==='match'),fail=rows.filter(r=>r.status&&r.status.result!=='match'),stale=fail.filter(r=>r.status.gameKey!==headKey);
 const todo=rows.filter(r=>!r.status&&r.reaches),running=rows.filter(r=>r.running),skip=rows.filter(r=>!r.status&&!r.reaches);
 const rank=r=>-LEVELS.indexOf(r.reaches??'1-1'),pad=(s,n)=>s+' '.repeat(Math.max(0,n-s.replace(/\x1b\[[0-9;]*m/g,'').length));
 const out=[bold('SMB · RECORDING VALIDATION')+dim(`   every level frame, state AND picture · HEAD ${head.slice(0,7)}`),
  `${green(`MATCHING ${match.length}`)}   ${fail.length?red(`NOT MATCHING ${fail.length}`):'NOT MATCHING 0'}${stale.length?yellow(` (${stale.length} re-run queued: code changed since)`):''}   ${dim(`NOT YET VALIDATED ${todo.length}`)}   RUNNING ${running.length}   of ${rows.length-skip.length} recordings`,
  dim(`Queue: never-validated first, then failing ones after a fix; each group from the latest level back. A match is final.`),'',
  bold('by furthest level   matching / not matching / not yet')];
 for(let w=8;w>=1;w--){const g=rows.filter(r=>r.reaches?.startsWith(w+'-'));if(!g.length)continue;const m=g.filter(r=>r.status?.result==='match').length,f=g.filter(r=>r.status&&r.status.result!=='match').length;
  out.push(`  world ${w}   ${green(String(m).padStart(4))} / ${(f?red:String)(String(f).padStart(3))} / ${dim(String(g.length-m-f).padStart(3))}   ${'█'.repeat(Math.round(m/g.length*30))}${dim('░'.repeat(30-Math.round(m/g.length*30)))}`);}
 out.push('',bold(pad('not matching (latest level first)',36)+pad('reaches',9)+pad('first failure',22)+pad('state / picture frames',24)+'status'));
 for(const r of fail.sort((x,y)=>rank(x)-rank(y)).slice(0,30)){const s=r.status;
  out.push(pad(r.id.replace(/^mood:/,'').slice(0,16),36)+pad(r.reaches??'-',9)+pad(s.result==='error'?'audit error':`${s.first.level} @ ${s.first.frame}`,22)+pad(s.result==='error'?'-':`${s.stateFrames} / ${s.pictureFrames}`,24)+(r.running?yellow('re-running'):s.gameKey!==headKey?yellow('fix landed, re-run queued'):red('needs a fix')));}
 if(fail.length>30)out.push(dim(`… ${fail.length-30} more`));
 out.push('',dim('Lists: node tools/harness/native-monitor/validation-lists.mjs · [0] old overview [q] quit'));
 return out.join('\n')+'\n';
}
