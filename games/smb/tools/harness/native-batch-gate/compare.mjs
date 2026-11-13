import fs from 'node:fs';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {pathToFileURL} from 'node:url';
export const reportFingerprint=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
export const policy=JSON.parse(fs.readFileSync(new URL('./exceptions.json',import.meta.url)));
const earlier=(now,was)=>now!==null&&(was===null||now<was);
const conditionMatches=(context,c)=>context?.before?.[c.scope]?.[c.field]===(c.beforeFrame??c.frame)&&context?.after?.[c.scope]?.[c.field]===c.frame;
export function compareFields(level,scope,before,after,context,policyRules=policy.rules){
 const changes=[],failures=[];
 for(const [field,was]of Object.entries(before)){
  if(!Object.hasOwn(after,field)){failures.push({level,scope,field,code:'removed-field'});continue;}
  const now=after[field];if(now===was)continue;
  const change={level,scope,field,was,now,classification:earlier(now,was)?'unclassified-regression':'improvement'};
  if(earlier(now,was)){
   const rule=policyRules.find(r=>r.level===level&&r.scope===scope&&r.field===field&&r.was.includes(was)&&(r.baselineFingerprint===undefined||context?.baselineFingerprint===r.baselineFingerprint)&&now>=r.floor&&(r.now===undefined||now===r.now)&&(r.run===undefined||context?.run===r.run)&&(!r.upstream||(conditionMatches(context,r.upstream)&&(r.upstream.beforeFrame??r.upstream.frame)<now&&r.upstream.frame<now))&&(!r.alsoUnchanged||r.alsoUnchanged.every(c=>context?.before?.[c.scope]?.[c.field]===c.frame&&context?.after?.[c.scope]?.[c.field]===c.frame))&&(!r.alsoRequired||r.alsoRequired.every(c=>conditionMatches(context,c))));
   if(rule)Object.assign(change,{classification:rule.type,reason:rule.reason,...(rule.upstream?{upstream:rule.upstream}:{}),...(rule.alsoUnchanged?{alsoUnchanged:rule.alsoUnchanged}:{}),...(rule.alsoRequired?{alsoRequired:rule.alsoRequired}:{}),...(rule.evidence?{evidence:rule.evidence}:{})});else failures.push(change);
  }
  changes.push(change);
 }
 for(const [field,now]of Object.entries(after))if(!Object.hasOwn(before,field))changes.push({level,scope,field,now,classification:'new-field-coverage'});
 return {changes,failures};
}
export function compareReports(before,after){
 const fingerprint=reportFingerprint(before),expected=Array.from({length:32},(_,i)=>`${(i/4|0)+1}-${i%4+1}`),failures=[],changes=[],coverage=[];
 for(const [name,rows]of [['baseline',before],['candidate',after]])if(rows.length!==32||new Set(rows.map(r=>r.level)).size!==32||expected.some(l=>!rows.some(r=>r.level===l)))failures.push({code:'invalid-level-set',source:name});
 for(const b of before){const n=after.find(r=>r.level===b.level);if(!n)continue;
  const context={baselineFingerprint:fingerprint,before:{legacy:b.fields,strict:b.strict?.fields??{}},after:{legacy:n.fields,strict:n.strict?.fields??{}}};
  for(const scope of ['legacy','strict']){
   if(scope==='strict'&&(!b.strict||!n.strict)){failures.push({level:b.level,code:'missing-strict-report'});continue;}
   const r=compareFields(b.level,scope,context.before[scope],context.after[scope],context);changes.push(...r.changes);failures.push(...r.failures);
  }
  const old=b.strict?.coverage,now=n.strict?.coverage;if(!old||!now)continue;
  if(old.inputFrames!==now.inputFrames||old.ramFrames!==now.ramFrames)failures.push({level:b.level,code:'changed-native-input-length',before:[old.inputFrames,old.ramFrames],after:[now.inputFrames,now.ramFrames]});
  for(const field of ['frames','alignedFrames','nativeMappedFrames','comparedEntityRows'])if(Number.isFinite(old[field])&&Number.isFinite(now[field])&&now[field]<old[field])failures.push({level:b.level,code:'coverage-loss',field,was:old[field],now:now[field]});
  if(old.complete&&!now.complete)failures.push({level:b.level,code:'lost-complete-coverage'});
  coverage.push({level:b.level,status:n.strict.status,first:n.strict.first,diagnostics:n.strict.diagnostics,coverage:now});
 }
 return {schema:'smb-batch-comparison-v1',baselineFingerprint:fingerprint,status:failures.length?'FAIL':'NON_REGRESSION_PASS',goalComplete:after.every(r=>Object.values(r.fields).every(v=>v===null)&&r.strict?.status==='pass'&&r.strict?.coverage.complete===true),coveragePolicy:policy.coverage,changes,failures,coverage};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {values:a}=parseArgs({options:Object.fromEntries(['baseline','candidate','out','water','cannon-coverage'].map(k=>[k,{type:'string'}]))});for(const k of ['baseline','candidate','out'])if(!a[k])throw Error(`--${k} required`);
 const report=compareReports(JSON.parse(fs.readFileSync(a.baseline)),JSON.parse(fs.readFileSync(a.candidate)));
 if(a.water){const w=JSON.parse(fs.readFileSync(a.water));report.water=w;for(const row of w.excerpts){const r=compareFields(row.level,'legacy',row.baselineFirsts,row.candidateFirsts,{run:row.run,before:{legacy:row.baselineFirsts},after:{legacy:row.candidateFirsts}},policy.rules.filter(r=>r.type==='coverage'||r.type==='causal'&&r.run===row.run));report.changes.push(...r.changes.map(c=>({...c,run:row.run})));report.failures.push(...r.failures.map(c=>({...c,run:row.run})));if(row.payloadBefore!==row.payloadAfter||row.baselinePayload!==row.payloadBefore)report.failures.push({code:'water-payload-changed',file:row.file,baseline:row.baselinePayload,before:row.payloadBefore,after:row.payloadAfter});}}
 if(a['cannon-coverage']){const c=JSON.parse(fs.readFileSync(a['cannon-coverage']));report.cannonCoverage=c.totals;for(const field of ['activeRows','birthRows','legacyAdapterRows'])if(c.totals[field]!==policy.coverage[field])report.failures.push({code:'changed-cannon-input-coverage',field,expected:policy.coverage[field],actual:c.totals[field]});}
 report.status=report.failures.length?'FAIL':'NON_REGRESSION_PASS';fs.writeFileSync(a.out,JSON.stringify(report,null,2)+'\n');console.log(report.status,`${report.changes.length} changed fields, ${report.failures.length} unclassified failures`);for(const x of report.changes)console.log(JSON.stringify(x));if(report.failures.length)process.exitCode=1;
}
