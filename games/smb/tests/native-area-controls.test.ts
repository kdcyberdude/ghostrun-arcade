import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {NativeAreaControls} from '../src/native-area-controls.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-area-control-events.json',import.meta.url),'utf8'));
for(const level of [...new Set<string>(fixture.events.map((e:any)=>e.level))])test(`${level}: every native area-parser column/control transition`,()=>{
 const n=new NativeAreaControls(level,'main');for(const e of fixture.events.filter((e:any)=>e.level===level)){Object.assign(n,e.before);n.advance(e.task);assert.deepEqual({column:n.column,locked:n.locked},e.after,`native frame ${e.frame}`);}
});
test('shared ROM axe alignment maps the8-4 final-room lock without a camera fit',()=>{
 const n=new NativeAreaControls('8-4','area-5');n.seedNative(309,false);n.advance(3);assert.equal(n.locked,true);n.advance(2);assert.equal(n.column,53);n.advance(0);assert.equal(n.column,54);
});
