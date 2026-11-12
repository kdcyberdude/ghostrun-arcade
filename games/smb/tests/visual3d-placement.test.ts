import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFrame,category2d,cells3d} from '../tools/visual3d/placement-match.js';
const frame={theme:'ground',camera:0,tiles2d:[],tiles3d:[],objects2d:[],objects3d:[]};
test('placement audit reports missing terrain and objects',()=>{
 const r=compareFrame({...frame,tiles2d:[{col:4,row:8,id:84}],objects2d:[{id:'player',kind:'player',x:70,y:150,w:16,h:16}]});
 assert.deepEqual(r.issues.map(i=>i.type),['tile-missing-3d','object-missing-3d']);
});
test('last drawn free tile replaces the covered grid category',()=>{
 const r=compareFrame({...frame,tiles2d:[{col:4,row:8,id:84},{col:4,row:8,id:104}],tiles3d:[{name:'block_brick',x:4.5,y:6.25}]});
 assert.deepEqual(r.issues,[]);assert.equal(category2d(104,'ground'),'brick');
});
test('underground doorway overlay removes its covered wall',()=>{
 const r=compareFrame({...frame,theme:'underground',tiles2d:[{col:4,row:8,id:84},{col:4,row:8,id:70}]});
 assert.deepEqual(r.issues,[]);
});
test('edge object matches before visibility filtering',()=>{
 const r=compareFrame({...frame,objects2d:[{id:'fire#0',kind:'fire',x:8,y:100,w:8,h:8}],objects3d:[{id:'fire@0',kind:'fire',x:7,y:100,w:8,h:8}]});
 assert.deepEqual(r.issues,[]);
});
test('placement audit catches offset and wrong-state enemy family',()=>{
 const p={id:'enemy#0',kind:'goomba',x:70,y:150,w:16,h:16};
 assert.equal(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'goomba@0',x:80}]}).issues[0]?.type,'object-offset');
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,kind:'koopa'}]}).issues.map(i=>i.type),['object-missing-3d','object-extra-3d']);
});
test('pipe instances cover the two native cells',()=>{
 assert.deepEqual(cells3d('pipe_body',5,6.5).cells,[[4,8],[5,8]]);
 assert.deepEqual(cells3d('pipe_top',4.5,6).cells,[[4,8],[4,9]]);
});
test('duplicate terrain instances expose coplanar surfaces',()=>{
 const tile={name:'block_brick',x:4.5,y:6.5};
 const r=compareFrame({...frame,tiles2d:[{col:4,row:8,id:81}],tiles3d:[tile,tile]});
 assert.deepEqual(r.issues.map(i=>i.type),['tile-overlap-3d']);
});
test('enemy shell/walking state mismatch is reported even when position and family match',()=>{
 const p={id:'enemy#0',kind:'koopa',x:70,y:150,w:16,h:16,state:'shell'};
 assert.equal(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'koopa@0',state:'normal'}]}).issues[0]?.type,'object-state');
});
