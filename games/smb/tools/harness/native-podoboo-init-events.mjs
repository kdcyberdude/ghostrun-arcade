/** Retain actual InitPodoboo entry/return bytes from the byte-verified CPU observer. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{observations:{type:'string'},out:{type:'string',default:'tests/fixtures/native-podoboo-init.json'}}});if(!a.observations)throw Error('--observations required');
const events=[];let attempts=0;
for(const file of fs.readdirSync(a.observations).filter(f=>/^[1-8]-4\.jsonl$/.test(f))){
 for(const line of fs.readFileSync(path.join(a.observations,file),'utf8').trim().split('\n')){
  const row=JSON.parse(line);attempts++;for(const init of row.initBytes??[])if(init.id===12)events.push({level:file.slice(0,3),frame:row.frame,slot:init.slot,before:init.before,after:init.after});
 }
}
const addresses=[15,22,30,70,1178,110,135,182,207,160,88,1025,1076,1047,1942,1930,965];
fs.writeFileSync(a.out,JSON.stringify({source:'Unmodified native CPU InitEnemyRoutines entry and actual RTS return; recorded v2 full-emulator entrances, every PPU RAM byte independently verified',addresses,attempts,events})+'\n');console.log(JSON.stringify({attempts,events:events.length}));
