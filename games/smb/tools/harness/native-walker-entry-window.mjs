/** Retain native projected-room enemy parser passes across area initialization. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:Object.fromEntries(['traces','level','from','to','out'].map(key=>[key,{type:'string'}]))});
for(const key of ['traces','level','from','to','out'])if(a[key]===undefined)throw Error(`--${key} required`);
const data=fs.readFileSync(path.join(a.traces,a.level,'ram.bin'));
const state=r=>({column:r[0x725]*16+r[0x726],cursor:[r[0x739],r[0x73a],r[0x73b]],counter:r[9],hard:Boolean(r[0x6cc]),primaryHard:Boolean(r[0x76a]),actors:[0,1,2,3,4].filter(slot=>r[15+slot]).map(slot=>({slot,id:r[22+slot],state:r[30+slot],x:r[110+slot]*256+r[135+slot]+r[1025+slot]/256,y:r[182+slot]*256+r[207+slot]-256+24,speed:(r[160+slot]<<24)>>24,force:r[1076+slot],fraction:r[1047+slot]}))});
const rows=[];for(let frame=Number(a.from);frame<=Number(a.to);frame++)rows.push({frame,...state(data.subarray(frame*2048,(frame+1)*2048))});
fs.writeFileSync(a.out,JSON.stringify({level:a.level,rows})+'\n');
