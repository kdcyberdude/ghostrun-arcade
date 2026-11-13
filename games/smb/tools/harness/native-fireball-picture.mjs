/** DrawFireball/DrawFirebar OAM evidence across all native FrameCounter phases.
 * node tools/harness/native-fireball-picture.mjs --traces DIR [--out FILE]
 * Includes death/TimerControl rows: firebars still draw while their motion is frozen.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-fireball-picture.json'}}});
if(!a.traces)throw Error('--traces is required');
const out={source:'DrawFireball/DrawFirebar; native $09 and visible $0200 OAM with firebar owner in mode1 engines4/5/7/8/9/10/11, including frozen death',checked:0,bad:0,cases:[]},seen=new Set();
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;
 const data=fs.readFileSync(file);
 for(let frame=0;frame<data.length/2048;frame++){
  const ram=data.subarray(frame*2048,(frame+1)*2048);
  if(ram[0x770]!==1||![4,5,7,8,9,10,11].includes(ram[14]))continue;
  if(![0,1,2,3,4].some(slot=>ram[15+slot]&&ram[22+slot]>=0x1b&&ram[22+slot]<=0x20))continue;
  for(let offset=0x200;offset<0x300;offset+=4){
   const counter=ram[9],tile=ram[offset+1],attributes=ram[offset+2];
   if(ram[offset]>=240||![100,101].includes(tile)||![2,194].includes(attributes))continue;
   out.checked++;
   if(tile!==(100^((counter>>2)&1))||attributes!==(2|((counter&8)?192:0)))throw Error(`${level} row${frame} OAM${offset.toString(16)}: DrawFirebar phase mismatch`);
   if(!seen.has(counter)){seen.add(counter);out.cases.push({level,frame,counter,tile,attributes});}
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify(out,null,2)+'\n');console.log(`${out.checked} native sprites; ${out.cases.length} counter phases`);
