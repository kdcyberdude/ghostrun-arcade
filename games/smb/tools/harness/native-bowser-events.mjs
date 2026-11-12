/** Native BowserControl transitions, excluding creation and frozen/dead rows.
 * node tools/harness/native-bowser-events.mjs --traces DIR --output tests/fixtures/native-bowser-events.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},output:{type:'string'}}});if(!a.traces||!a.output)throw Error('--traces and --output required');
const signed=n=>(n<<24)>>24;
function state(r,s){const y=r[0xcf+s];return {x:r[0x6e+s]*256+r[0x87+s],y,origin:r[0x366],direction:r[0x46+s],speed:signed(r[0x365]),range:r[0x6dc],controls:r[0x363],feet:r[0x364],timer:r[0x78a+s],fireTimer:r[0x790],fireCounter:r[0x367],move:{y,speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s],timer:0}};}
const events=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let f=1;f<b.length/2048;f++){
  const r=b.subarray(f*2048,(f+1)*2048),p=b.subarray((f-1)*2048,f*2048);if(r[14]!==8||p[14]!==8||r[0x770]!==1||p[0x770]!==1||r[0x772]!==3||p[0x772]!==3||r[0x747]||p[0x747])continue;
  for(let s=0;s<5;s++)if(r[15+s]===1&&r[22+s]===45&&p[15+s]===1&&p[22+s]===45&&r[0x1e+s]===0){
   events.push({level,frame:f,slot:s,before:state(p,s),after:state(r,s),input:{frame:r[9],byte:r[0x7a7+s],playerX:r[0x6d]*256+r[0x86],world:r[0x75f]+1,hard:Boolean(r[0x6cc])}});
  }
 }
}
fs.writeFileSync(a.output,'{"method":"BowserControl native RAM transitions; extraction and addresses in tools/harness/native-bowser-events.mjs.","events":[\n'+events.map(e=>JSON.stringify(e)).join(',\n')+'\n]}\n');console.log(events.length+' transitions');
