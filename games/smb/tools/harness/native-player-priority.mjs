/** Native stored/drawn priority bits at stable source controller rows. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-player-priority.json'}}});if(!a.traces)throw Error('--traces required');
const out={source:'Native Player_SprAttrib03c4 bit5 and dynamic player OAM attribute bit5. Stable engine8 rows execute PlayerCtrlRoutine; engine2/3/5/7 retain priority.',checked:0,rows:[]},seen=new Set();
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let f=1;f<data.length/2048;f++){
  const r=data.subarray(f*2048,(f+1)*2048),p=data.subarray((f-1)*2048,f*2048),engine=r[14];
  if(r[0x770]!==1||r[0x772]!==3||engine!==p[14]||!(p[0x3c4]&32)||p[0x747]||r[0x747]||((r[9]-p[9])&255)!==1||![2,3,5,7,8].includes(engine))continue;
  const after=Boolean(r[0x3c4]&32),draw=Boolean(r[0x202+r[0x6e4]]&32),key=JSON.stringify([engine,r[0xce],after,draw]);out.checked++;if(seen.has(key))continue;seen.add(key);out.rows.push([level,f,engine,r[0xce],after,draw]);
 }
}
fs.writeFileSync(a.out,JSON.stringify(out)+'\n');console.log(out.checked,'native priority rows;',out.rows.length,'distinct cases');
