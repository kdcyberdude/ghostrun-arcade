import {observedLevels} from '../../src/levels.js';
const L:any=observedLevels();const want=process.argv[2];
for(const lv of (Array.isArray(L)?L:Object.values(L)) as any[]){if(want&&lv.id!==want)continue;for(const a of (lv.areas??[]))for(const b of a.firebars??[])console.log(lv.id,a.id,JSON.stringify(b));}
