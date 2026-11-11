import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultBindings,readBindings,rebind} from '../src/controls.js';

test('rebinding replaces aliases without changing the other player or defaults',()=>{
 const maps=defaultBindings();
 assert.equal(rebind(maps,0,'a','KeyC'),null);
 assert.equal(maps[0].KeyC,'a');assert.equal(maps[0].KeyZ,undefined);assert.equal(maps[0].Space,undefined);
 assert.equal(maps[1].KeyU,'a');assert.equal(defaultBindings()[0].Space,'a');
});
test('conflicts and menu shortcuts leave bindings intact',()=>{
 const maps=defaultBindings(),before=JSON.stringify(maps);
 assert.ok(rebind(maps,0,'a','KeyO'));assert.ok(rebind(maps,0,'a','Escape'));
 assert.equal(JSON.stringify(maps),before);
});
test('stored controls restore; malformed or incomplete settings use defaults',()=>{
 const maps=defaultBindings();rebind(maps,1,'a','KeyC');
 assert.deepEqual(readBindings(JSON.stringify(maps)),maps);
 for(const value of [null,'broken','[]','[{"KeyZ":"fly"},{}]','[{},{}]'])assert.deepEqual(readBindings(value),defaultBindings());
});
