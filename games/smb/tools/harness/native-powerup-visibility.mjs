/** Native emergence drawing evidence: slot5 state $23, OAM selected by Enemy_SprDataOffset+5 $06EA.
 * node tools/harness/native-powerup-visibility.mjs --traces DIR [--out tests/fixtures/native-powerup-visibility.json]
 * Retains every emergence row; normal movement/offscreen bounds after state $80 are outside this rule.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-powerup-visibility.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'Native v2 RAM: slot5 power-up flag $14, ID $1B=46, emergence state $23 and OAM $0200 via sprite offset $06EA; tuples [frame,state,shown]',levels:[]};
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const d=fs.readFileSync(file),rows=[];
 for(let f=0;f<d.length/2048;f++){
  const r=d.subarray(f*2048,(f+1)*2048),state=r[0x23];
  if(r[14]!==8||r[0x770]!==1||!r[0x14]||r[0x1b]!==46||!state||state>=0x80)continue;
  const o=0x200+r[0x6ea],shown=Array.from({length:4},(_,k)=>r[o+k*4]).some(y=>y<240);
  rows.push([f,state,Number(shown)]);
 }
 if(rows.length)out.levels.push({level,rows});
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');
