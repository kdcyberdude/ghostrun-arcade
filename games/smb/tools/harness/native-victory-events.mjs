/** Extract every native mode2 control transition. AutoControlPlayer movement is an explicit callback input, not claimed as covered here.
 * node tools/harness/native-victory-events.mjs --traces DIR --output tests/fixtures/native-victory-events.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},output:{type:'string'}}});if(!a.traces||!a.output)throw Error('--traces and --output required');
const signed=n=>(n<<24)>>24;
function state(r){const s=r[0x368];return {task:r[0x772],destination:r[0x34],walk:r[0x35],scrollFraction:r[0x768],primary:r[0x719],secondary:r[0x749],endTimer:r[0x7a1],feet:r[0x364],controls:r[0x363],bridge:r[0x369],bossState:r[0x1e+s],boss:{y:r[0xcf+s],speed:signed(r[0xa0+s]),force:r[0x434+s],fraction:r[0x417+s],timer:0}};}
const events=[];
for(const level of fs.readdirSync(a.traces).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let f=1;f<b.length/2048;f++){
  const r=b.subarray(f*2048,(f+1)*2048),p=b.subarray((f-1)*2048,f*2048);if(p[0x770]!==2||r[0x770]!==2||p[0x747]||r[0x747])continue;
  const s=p[0x368];events.push({level,frame:f,before:state(p),after:state(r),input:{world:r[0x75f]+1,camera:p[0x71a]*256+p[0x71c],playerX:p[0x6d]*256+p[0x86],bossPresent:p[0x16+s]===45,intervalTick:r[0x77f]===20},auto:{playerX:r[0x6d]*256+r[0x86],axe:p[0x772]===2&&r[0x772]===0},camera:r[0x71a]*256+r[0x71c]});
 }
}
fs.writeFileSync(a.output,'{"method":"VictoryModeSubroutines source control only; AutoControlPlayer position is an input, not a tested output. See extraction tool.","events":[\n'+events.map(e=>JSON.stringify(e)).join(',\n')+'\n]}\n');console.log(events.length+' transitions');
