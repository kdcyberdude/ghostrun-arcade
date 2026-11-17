import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFrame,category2d,cells3d,colourFamily} from '../tools/visual3d/placement-match.js';
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

test('native actor identity prevents adjacent Cheeps swapping through padded-foot nearest matching',()=>{
 const a=[{id:'enemy#10',sourceId:'enemy#10',kind:'cheep',x:147,y:33,w:16,h:16},{id:'enemy#11',sourceId:'enemy#11',kind:'cheep',x:143,y:32,w:16,h:16}],b=[{id:'cheep@0',sourceId:'enemy#10',kind:'cheep',x:141.615,y:32.196,w:22.599,h:14.807},{id:'cheep@1',sourceId:'enemy#11',kind:'cheep',x:137.546,y:31.042,w:22.553,h:14.873}];
 assert.deepEqual(compareFrame({...frame,objects2d:a,objects3d:b}).issues,[]);
 assert.equal(compareFrame({...frame,objects2d:a.map(({sourceId,...o})=>o),objects3d:b.map(({sourceId,...o})=>o)}).issues[0]?.type,'object-offset');
 b[0].x-=10;const broken=compareFrame({...frame,objects2d:a,objects3d:b});assert.equal(broken.issues[0]?.type,'object-offset');assert.match(broken.issues[0]?.what??'',/enemy#10/);
});

test('palette identity: night sky and pipe / block colour families are compared per cell',()=>{
 assert.deepEqual([[252,252,252],[188,188,188],[184,248,24],[0,168,0],[228,92,16],[0,136,136]].map(colourFamily),['grey','grey','green','green','orange','blue']);
 const looks2d=[{what:'sky',at:'',night:true},{what:'pipe',at:'4,10',rgb:[252,252,252]},{what:'used',at:'7,9',rgb:[188,188,188]}];
 assert.deepEqual(compareFrame({...frame,looks2d,looks3d:[{what:'sky',at:'',night:true},{what:'pipe',at:'4,10',rgb:[230,232,240]},{what:'used',at:'7,9',rgb:[160,160,165]}]}).issues,[]);
 const r=compareFrame({...frame,looks2d,looks3d:[{what:'sky',at:'',night:false},{what:'pipe',at:'4,10',rgb:[184,248,24]},{what:'used',at:'7,9',rgb:[228,92,16]},{what:'pipe',at:'9,10',rgb:[184,248,24]}]});
 assert.deepEqual(r.issues.map(i=>`${i.type} ${i.what} ${i.at}`),['look-3d sky night->day','look-3d pipe 4,10 grey->green','look-3d used 7,9 grey->orange']);
});

test('palette variant mismatch (grey vs red Cheep Cheep) is reported when both renderers name one',()=>{
 const p={id:'enemy#0',sourceId:'enemy#0',kind:'cheep',x:70,y:150,w:16,h:16,variant:'0f-10-30-27'};
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'cheep@0'}]}).issues,[]);
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'cheep@0',variant:'0f-16-30-27'}]}).issues.map(i=>[i.type,i.at]),[['object-variant','0f-10-30-27->0f-16-30-27']]);
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'cheep@0',variant:undefined}]}).issues,[]);
});

test('an object the NES sprite hardware hid in 2D may be shown or not in 3D, but still claims its 3D twin',()=>{
 const p={id:'fire#0.0',sourceId:'fire#0.0',kind:'fire',x:55,y:149,w:8,h:8,oamHidden:true};
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,oamHidden:undefined,id:'fire@0',x:60}]}).issues,[]);
 assert.deepEqual(compareFrame({...frame,objects2d:[p]}).issues,[]);
 assert.deepEqual(compareFrame({...frame,objects2d:[{...p,oamHidden:undefined}]}).issues.map(i=>i.type),['object-missing-3d']);
});

test('objects cut by the screen edge are compared by the part on screen',()=>{
 const p={id:'enemy#0',sourceId:'enemy#0',kind:'goomba',x:40,y:228,w:16,h:12};
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'goomba@0',y:226,h:30}]}).issues,[]);
 assert.equal(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'goomba@0',y:200,h:30}]}).issues[0]?.type,'object-offset');
});

test('a sliver of an object at the screen bottom is not compared for offset',()=>{
 const p={id:'enemy#0',sourceId:'enemy#0',kind:'koopa',x:16,y:235,w:7,h:8};
 assert.deepEqual(compareFrame({...frame,objects2d:[p],objects3d:[{...p,id:'koopa@0',x:12,y:229,w:27,h:30}]}).issues,[]);
});
