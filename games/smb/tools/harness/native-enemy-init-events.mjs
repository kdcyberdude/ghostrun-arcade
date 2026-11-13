/** Extract observed ProcessEnemyData initializer/cursor boundaries from native Lakitu fixtures. */
import fs from 'node:fs';import zlib from 'node:zlib';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{fixture:{type:'string'},profiles:{type:'string'},out:{type:'string'}}});if(!a.fixture||!a.profiles||!a.out)throw Error('--fixture, --profiles, --out required');
const data=JSON.parse(fs.readFileSync(a.fixture,'utf8')),profiles=JSON.parse(fs.readFileSync(a.profiles,'utf8')),rows=[];
const unpack=s=>zlib.gunzipSync(Buffer.from(s,'base64')),cursor=r=>[r[0x739],r[0x73a],r[0x73b]];
for(const e of data.events){
 const p=unpack(e.beforeRam),r=unpack(e.afterRam);
 rows.push({level:e.level,row:e.row,pointer:e.pointer,before:cursor(p),after:cursor(r),flags:Array.from(p.subarray(15,21)),camera:r[0x71a]*256+r[0x71c],hard:Boolean(r[0x6cc]),primaryHard:Boolean(r[0x76a]),task:p[0x71f]&7,queue:p[0x6cd],frenzy:p[0x6cb],vine:p[0x398],accepted:true});
}
for(const e of data.pending)rows.push({level:e.level,row:e.row,pointer:e.record.pointer,before:[e.beforeOffset,e.pageBefore,e.selectedBefore],after:[e.afterOffset,e.pageAfter,e.selectedAfter],flags:e.flagsBefore,camera:e.camera,hard:Boolean(e.hard),primaryHard:Boolean(e.primaryHard),task:e.parserBefore,queue:e.queueBefore,frenzy:e.buffer,vine:e.vine,accepted:false});
fs.writeFileSync(a.out,JSON.stringify({source:'Unreset native accepted and rejected Lakitu init rows; actual PPU RAM before/after, shared ProcessEnemyData cursor',streams:profiles.streams,rows})+'\n');console.log(rows.length,'accepted/rejected native init boundaries');
