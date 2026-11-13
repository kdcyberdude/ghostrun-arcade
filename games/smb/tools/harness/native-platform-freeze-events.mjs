/** Raw GameCore platform bank around a native TimerControl onset.
 * node tools/harness/native-platform-freeze-events.mjs --traces DIR --level 2-4 --from 667 --to 892 --out FILE */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},level:{type:'string'},from:{type:'string'},to:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.level||!a.from||!a.to||!a.out)throw Error('All arguments required');
const b=fs.readFileSync(path.join(a.traces,a.level,'ram.bin')),rows=[];
for(let frame=Number(a.from);frame<=Number(a.to);frame++){
 const r=b.subarray(frame*2048,(frame+1)*2048),platforms=[];
 for(let slot=0;slot<5;slot++){const id=r[0x16+slot];if(r[0xf+slot]&&id>=36&&id<=44)platforms.push({slot,id,x:r[0x6e+slot]*256+r[0x87+slot],y:(r[0xb6+slot]-1)*256+r[0xcf+slot],speed:r[0xa0+slot],force:r[0x434+slot],fraction:r[0x417+slot]});}
 rows.push({frame,counter:r[9],engine:r[14],timer:r[0x747],platforms});
}
fs.writeFileSync(a.out,JSON.stringify({level:a.level,source:'Native PRG0 GameCore RAM; source RunBowserFlame/PlayerEnemyCollision sets TimerControl at slot0 before later MoveLiftPlatforms turns.',rows})+'\n');
