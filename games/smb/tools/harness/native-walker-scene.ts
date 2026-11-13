/** Add an authenticated ROM enemy-stream projection for a compiled room.
 * npx tsx tools/harness/native-walker-scene.ts --source FILE --level 8-4 --area area-2 [--apply] */
import fs from 'node:fs';
import {parseArgs} from 'node:util';
import {nativeEnemyBytes,nativeEnemyStream} from '../native-enemy-stream.mjs';
import {nativeAreaBindings} from '../../src/native-area-catalog.js';
import type {Level} from '../../src/types.js';
import {applyNativeWalkerGroups,nativeWalkerScene} from '../native-walker-groups.mjs';
const {values:a}=parseArgs({options:{source:{type:'string'},level:{type:'string'},area:{type:'string'},out:{type:'string',default:'data/native-walker-groups.json'},apply:{type:'boolean',default:false}}});
if(!a.source||!a.level||!a.area)throw Error('--source, --level and --area required');
const levels=JSON.parse(fs.readFileSync('data/levels.json','utf8')) as Level[],layouts=JSON.parse(fs.readFileSync(a.out,'utf8'));
const level=levels.find(l=>l.id===a.level),area=level?.areas.find(room=>room.id===a.area);if(!level||!area)throw Error('Unknown compiled scene');
const binding=nativeAreaBindings(level).bindings.find(binding=>binding.area===area.id);if(!binding)throw Error('No authenticated native area binding');
const raw=layouts.find(layout=>layout.pointer===binding.code&&layout.sceneOffset===undefined);if(!raw)throw Error(`No decoded physical enemy stream for code${binding.code}`);
const bytes=nativeEnemyBytes(fs.readFileSync(a.source,'utf8'),raw.label);
const unsupported=nativeEnemyStream(bytes,true).filter(e=>e.x+binding.offset>=0&&e.x+binding.offset<area.width&&![0,1,2,3,4,6,14,15,16,55,56,57,58,59,60,61,62].includes(e.id));if(unsupported.length)throw Error(`Scene contains unsupported placed families: ${JSON.stringify(unsupported)}`);
const scene=nativeWalkerScene({...raw,bytes},{level:level.id,area:area.id,offset:binding.offset,width:area.width,source:binding.source});
const output=layouts.filter(layout=>layout.level!==level.id||layout.area!==area.id);output.push(scene);fs.writeFileSync(a.out,JSON.stringify(output,null,1)+'\n');
if(a.apply){applyNativeWalkerGroups(levels,output);fs.writeFileSync('data/levels.json',JSON.stringify(levels,null,2)+'\n');}
console.log(JSON.stringify(scene));
