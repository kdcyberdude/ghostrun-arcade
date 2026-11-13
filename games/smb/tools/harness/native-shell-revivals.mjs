// Extract native shell revival transitions from a trace tree or a tree of independent capture entries.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});
if(!a.traces||!a.out)throw Error('--traces and --out required');
const base=a.traces,events=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=dir+'/'+item.name;if(item.isDirectory())walk(file);else if(item.name==='ram.bin')scan(file);}}
function scan(file){const b=fs.readFileSync(file);for(let f=1;f<b.length/2048;f++){const p=b.subarray((f-1)*2048,f*2048),r=b.subarray(f*2048,(f+1)*2048);if(p[14]!==8||r[14]!==8||((r[9]-p[9])&255)!==1)continue;for(let s=0;s<5;s++){if(p[15+s]!==1||r[15+s]!==1||p[22+s]!==r[22+s]||r[22+s]>=5||![3,4].includes(p[30+s])||r[30+s]!==0)continue;const signed=v=>v<128?v:v-256,x=q=>q[110+s]*256+q[135+s]+q[1025+s]/256;events.push({file:path.relative(base,file),frame:f,slot:s,counter:r[9],hard:r[1898],timer:r[1942+s],x0:x(p),x1:x(r),vx:signed(r[88+s])/16,expectedVx:(r[9]&1?-1:1)*(r[1898]?0.75:0.5),y0:p[207+s],y1:r[207+s],fraction0:p[1047+s],fraction1:r[1047+s]});}}}
walk(base);const failures=events.filter(e=>e.x0!==e.x1||e.vx!==e.expectedVx||e.timer!==0||e.y0!==e.y1||e.fraction0!==e.fraction1);fs.writeFileSync(a.out,JSON.stringify({events,failures})+'\n');console.log(events.length,'revivals',failures.length,'unexpected',JSON.stringify(failures.slice(0,5)));
