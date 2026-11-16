/** Print the validation lists: matching, not matching (first failure first by latest level) and not yet validated. --json for machine use. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {collectValidation} from './issues.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),data=path.resolve(process.argv.find(x=>x.startsWith('--monitor='))?.slice(10)??path.join(dir,'.local'));
const rows=collectValidation(data,JSON.parse(fs.readFileSync(path.join(data,'combined-inputs.json'))).runs),LEVELS=[];for(let w=8;w>=1;w--)for(let l=4;l>=1;l--)LEVELS.push(`${w}-${l}`);
const order=(x,y)=>LEVELS.indexOf(x.reaches)-LEVELS.indexOf(y.reaches);
const lists={matching:rows.filter(r=>r.status?.result==='match').sort(order).map(r=>r.id),
 notMatching:rows.filter(r=>r.status&&r.status.result!=='match').sort(order).map(r=>({id:r.id,reaches:r.reaches,...(r.status.first??{error:r.status.error?.slice(-200)}),stateFrames:r.status.stateFrames,pictureFrames:r.status.pictureFrames,failingLevels:r.status.failingLevels,commit:r.status.commit?.slice(0,7)})),
 notYet:rows.filter(r=>!r.status).sort(order).map(r=>r.id)};
if(process.argv.includes('--json'))console.log(JSON.stringify(lists,null,1));
else{console.log(`matching ${lists.matching.length} · not matching ${lists.notMatching.length} · not yet ${lists.notYet.length}`);for(const r of lists.notMatching)console.log(`FAIL ${r.id.replace('mood:','').slice(0,16)} reaches ${r.reaches} first ${r.level??'error'}@${r.frame??''} state ${r.stateFrames??'-'} picture ${r.pictureFrames??'-'} levels ${(r.failingLevels??[]).join(',')} @${r.commit}`);}
