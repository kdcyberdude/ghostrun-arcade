const n=x=>x.toLocaleString('en-US');
export function ago(iso,now=Date.now()){
 const time=Date.parse(iso);if(!Number.isFinite(time))return 'time unknown';
 const seconds=Math.max(0,Math.floor((Number(now)-time)/1000));
 if(seconds<5)return 'just now';if(seconds<60)return `${seconds}s ago`;
 const minutes=Math.floor(seconds/60);if(minutes<60)return `${minutes}m ${seconds%60}s ago`;
 const hours=Math.floor(minutes/60);if(hours<24)return `${hours}h ${minutes%60}m ago`;
 return `${Math.floor(hours/24)}d ${hours%24}h ago`;
}
function localTime(iso){const time=Date.parse(iso);return Number.isFinite(time)?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(time)+' IST':'time unknown';}
export function renderCombined(s,{width=100,color=false,world=0,now=Date.now()}={}){
 const w=Math.max(52,Math.min(118,width-2)),plain=x=>x.replace(/\x1b\[[0-9;]*m/g,''),paint=(x,c)=>color?`\x1b[${c}m${x}\x1b[0m`:x;
 const fit=(s,len)=>plain(s).length>len?plain(s).slice(0,len-1)+'…':s+' '.repeat(len-plain(s).length);
 const row=x=>'│ '+fit(x,w-4)+' │',rule=title=>'├─ '+title+' '+'─'.repeat(Math.max(0,w-title.length-6))+'┤';
 const d=s.result,newer=(s.current?.results??[]).filter(r=>!r.error),fullCurrent=Boolean(s.current?.fullCurrent),historical=newer.length>0&&d.reported&&!fullCurrent;
 // A level's newest state+picture result from the current build replaces its historical cell, marked '*'.
 const live={};if(!fullCurrent)for(const r of newer)if(r.current&&r.kind==='state+picture')for(const [key,e]of Object.entries(r.levels))if(!live[key]||Date.parse(r.measured)>Date.parse(live[key].measured))live[key]={...e,measured:r.measured};
 const lines=['┌'+'─'.repeat(w-2)+'┐',row(paint(fullCurrent?`SMB 2D · CURRENT FULL AUDIT · build ${d.runtime.slice(0,7)}${d.progress?.status==='running'?' · RUNNING':''}`:historical?`SMB 2D · HISTORICAL FULL AUDIT · build ${d.runtime.slice(0,7)}`:'SMB 2D · ACTUAL EVERY-FRAME CHECK',1)),row(`${s.moodCount} mood + ${s.referenceCount} original recordings · ${n(d.total)} recorded input frames`)];
 if(d.scope)lines.push(row(`SCOPE ${d.scope.levels.join(', ')} · all target-level frames; other frames unchecked`));
 lines.push(row(paint(`MATCHING ${d.reported?n(d.matching):'--'}`,32)+'     '+paint(`NOT MATCHING ${d.reported?n(d.notMatching):'--'}`,31)));
 lines.push(row(`${n(d.unchecked)} unchecked · state AND screen required · each observed frame counted independently`));
 for(const [name,c]of [['STATE',d.state],['PICTURE',d.picture]])lines.push(row(name+': '+n(c.matching)+' match / '+n(c.notMatching)+' mismatch / '+n(c.unchecked)+' unchecked'));
 // State-only receipts are a development check; the view lists only state+picture results (and rejected receipts).
 const listed=(s.current?.results??[]).filter(r=>r.error||r.kind==='state+picture');
 if(listed.length){
  lines.push(rule(`NEWER BUILD RESULTS · main HEAD ${s.current.head.slice(0,7)||'?'}${s.current.dirty?' + uncommitted changes':''}`));
  for(const r of listed){
   if(r.error){lines.push(row(paint(`Rejected ${r.file.split('/').at(-1)}: ${r.error}`,31)));continue;}
   const label=r.current?paint('CURRENT',32):paint(`OLDER BUILD ${r.runtime.slice(0,7)}${r.dirty?' (uncommitted)':''}`,33);
   for(const [key,e]of Object.entries(r.levels).sort()){
    lines.push(row(`${key} ${paint('STATE+PICTURE',36)} · ${label} · ${e.recordings} recordings${r.recordings<r.inventoryRecordings?` (targeted ${r.recordings}/${r.inventoryRecordings})`:''} · ${localTime(r.measured)}`));
    lines.push(row(`  JOINT: ${n(e.joint.matching)} match / ${n(e.joint.notMatching)} mismatch / ${n(e.joint.unchecked)} unchecked`));
    lines.push(row(`  STATE: ${n(e.state.matching)} match / ${n(e.state.notMatching)} mismatch / ${n(e.state.unchecked)} unchecked`));
    lines.push(row(`  PICTURE: ${n(e.picture.matching)} match / ${n(e.picture.notMatching)} mismatch / ${n(e.picture.unchecked)} unchecked`));
   }
  }
 }
 lines.push(rule(d.scope?'SELECTED LEVELS':world?`WORLD ${world}`:'ALL 32 LEVELS'));
 if(d.scope){
  for(const key of d.scope.levels){const e=d.levels[key];lines.push(row(`${key} JOINT: ${n(e.matching)} match / ${n(e.notMatching)} mismatch / ${n(e.unchecked)} unchecked`));for(const [label,c]of [['STATE',e.state],['PICTURE',e.picture]])lines.push(row(`  ${label}: ${n(c.matching)} match / ${n(c.notMatching)} mismatch / ${n(c.unchecked)} unchecked`));}
  lines.push(row(`${n(d.outsideSelectedFrames)} other inventory frames unchecked${d.progress?.status==='running'?' (includes unpublished inputs)':''}`));
 }else if(!world){
  const cell=Math.floor((w-12)/4);lines.push(row('World   '+[1,2,3,4].map(l=>fit('Level '+l,cell)).join('')));
  for(let world=1;world<=8;world++){
   let text=fit('W'+world,8);
   for(let l=1;l<=4;l++){const key=`${world}-${l}`,c=live[key],e=c?c.joint:d.levels[key],label=(c?'*':'')+(e.total?`${n(e.matching)} / ${n(e.notMatching)}`:'-- / --');text+=fit(paint(label,e.notMatching?31:e.unchecked?33:e.total?32:90),cell);}
   lines.push(row(text));
  }
  lines.push(row('Each cell: matching / not matching input frames. -- means no combined evidence.'));
  if(Object.keys(live).length)lines.push(row(`* current build ${s.current.head.slice(0,7)} (state+picture); other cells historical build ${d.runtime.slice(0,7)}. Totals above are historical.`));
  else if(historical)lines.push(row(`All cells historical build ${d.runtime.slice(0,7)}; newer results are listed above.`));
  else if(fullCurrent)lines.push(row(`All cells current build ${d.runtime.slice(0,7)} (state+picture)${d.progress?.status==='running'?'; recordings still running count as unchecked':''}.`));
 }else{
  lines.push(row('Level       Matching       Not matching       Unchecked'));
  for(let l=1;l<=4;l++){const key=`${world}-${l}`,e=d.levels[key];lines.push(row(`${key.padEnd(12)}${(e.total?n(e.matching):'--').padEnd(15)}${(e.total?n(e.notMatching):'--').padEnd(19)}${e.total?n(e.unchecked):'--'}`));for(const [label,c]of [['State',e.state],['Picture',e.picture]])lines.push(row(`  ${label}: ${n(c.matching)} match / ${n(c.notMatching)} mismatch / ${n(c.unchecked)} unchecked`));}
 }
 if(d.unassigned.total)lines.push(row(`Outside levels (boot/menu): ${n(d.unassigned.matching)} matching / ${n(d.unassigned.notMatching)} not · ${n(d.unassigned.unchecked)} unchecked`));
 lines.push(rule('STATUS'));
 const completed=s.lastCompleted??(['complete','scoped-complete'].includes(d.progress?.status)?{finished:d.progress.finished}:null);
 lines.push(row(completed?`Last ${d.scope?'scoped ':''}audit finished: ${localTime(completed.finished)} · ${ago(completed.finished,now)}`:d.scope?'Last scoped audit finished: never recorded':'Last audit finished: never recorded'));
 if(d.progress?.status==='running'){lines.push(row(`Audit running · started ${ago(d.progress.started,now)} · updated ${ago(d.progress.updated,now)}`));lines.push(row(`${d.progress.active?.length??0} active recordings; their unpublished frames remain unchecked.`));}
 else if(d.progress?.status==='scoped-complete')lines.push(row('Selected-level audit finished. Other levels remain unchecked for this build.'));
 else if(d.progress?.status==='complete')lines.push(row('No newer audit reported. Awaiting the next calculation.'));
 else if(d.progress&&['failed','incomplete'].includes(d.progress.status))lines.push(row(`Latest audit ${d.progress.status} · updated ${ago(d.progress.updated,now)}`));
 if(d.progress)lines.push(row(`${d.progress.status==='running'?'CALCULATING':d.scope?'SCOPED '+d.progress.status.replace(/^scoped-/, '').toUpperCase():d.progress.status.toUpperCase()} · ${d.progress.done}/${d.progress.total} recordings · ${n(d.progress.directlyComparedFrames)} direct frame checks`));
 if(d.errors?.length)lines.push(row(`${d.errors.length} audit errors; affected recordings remain unchecked.`));
 lines.push(row(d.reported?`Report build ${d.runtime.slice(0,7)} · blob-only picture rule (>15px fails)`:'Awaiting v2 every-frame audit. Legacy sticky receipts are rejected.'));
 lines.push(row('First divergence is diagnostic only. Later observed matches count as matches.'));
 lines.push(row(d.scope?'[q] quit · refresh 5s; selected levels are fixed by this report':'[0] overview [1–8] world [q] quit · refresh 5s; counts change on new audit'));
 lines.push('└'+'─'.repeat(w-2)+'┘');return lines.join('\n')+'\n';
}
