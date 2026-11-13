/** Bounded two-episode World1-1 diagnostic survey; every row is rechecked.
 * One entrance seed per episode; pictures/joint/POWER-ON remain unchecked. */
import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {strictCompare,type StrictFrameObservation} from './native-strict.js';import {decodeEntrance} from './native-entrance.mjs';import fixture from '../../tests/fixtures/native-player-bg-world11.json';
export function surveyPlayerBg(){return fixture.cases.map(c=>{
 const unpack=(key:'initial'|'ram'|'pads')=>{const b=gunzipSync(Buffer.from(c[key],'base64'));if(createHash('sha256').update(b).digest('hex')!==c[`${key}Sha256`])throw Error('fixture hash mismatch');return b;};
 const ram=unpack('ram'),pads=unpack('pads'),counts={match:0,mismatch:0,unchecked:0},perField:Record<string,number>={},gaps:Record<string,number>={},rows:StrictFrameObservation[]=[];
 const strict=strictCompare(decodeEntrance(unpack('initial'),c.receipt),pads,ram,'1-1',row=>{counts[row.status]++;rows.push(row);for(const k of row.fields)perField[k]=(perField[k]??0)+1;for(const k of row.gaps)gaps[k]=(gaps[k]??0)+1;});
 if(rows.length<pads.length)counts.unchecked+=pads.length-rows.length;
 return {sha256:c.sha256,sourceFrameOffset:c.sourceFrameOffset,endFrame:c.endFrame,frames:pads.length,role:fixture.role,counts,perField,gaps,firsts:strict.fields,coverage:strict.coverage};
});}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(surveyPlayerBg(),null,2));
