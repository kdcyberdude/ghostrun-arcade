import test from 'node:test';
import assert from 'node:assert/strict';
import fixtures from '../data/firebar-motion-regressions.json';
import {createFirebarMotor,advanceFirebarMotor,firebarOrientation,firebarFlameCenters} from '../src/firebar-motion.js';
import type {FirebarGeometry,FirebarMotorParameters} from '../src/firebar-motion.js';

const first:FirebarGeometry={x:488,y:168,length:6};
const counterclockwise:FirebarMotorParameters={direction:-1,initialUnits:768};

test('source creep keeps first bar inactive at camera228, then advances on entry229',()=>{
 const motor=createFirebarMotor(counterclockwise);
 for(let frame=0;frame<150;frame++)advanceFirebarMotor(motor,first,counterclockwise,228);
 assert.deepEqual(motor,{active:false,units:768});
 advanceFirebarMotor(motor,first,counterclockwise,229);
 assert.equal(motor.active,true);
 assert.equal(firebarOrientation(motor),23);
 assert.deepEqual(firebarFlameCenters(motor,first).at(-1),{x:481,y:130});
});

test('death and pause stop the motor while repeated rendering/collision queries are pure',()=>{
 const motor=createFirebarMotor(counterclockwise);
 advanceFirebarMotor(motor,first,counterclockwise,229);
 const before={...motor},centers=firebarFlameCenters(motor,first);
 for(let frame=0;frame<90;frame++){
  advanceFirebarMotor(motor,first,counterclockwise,350,false);
  assert.deepEqual(firebarFlameCenters(motor,first),centers);
 }
 assert.deepEqual(motor,before);
});

test('independent object clocks activate at their own viewport boundary',()=>{
 const second:FirebarGeometry={x:792,y:152,length:6};
 const parameters:FirebarMotorParameters={direction:-1,initialUnits:864};
 const a=createFirebarMotor(counterclockwise),b=createFirebarMotor(parameters);
 for(let frame=0;frame<75;frame++){
  advanceFirebarMotor(a,first,counterclockwise,300);
  advanceFirebarMotor(b,second,parameters,300);
 }
 assert.equal(a.active,true);assert.deepEqual(b,{active:false,units:864});
 advanceFirebarMotor(b,second,parameters,533);
 assert.equal(firebarOrientation(b),26);
});

for(const fixture of fixtures.cases){
 test(`source ${fixture.object.level} bar${fixture.object.x} native${fixture.referenceNativeFrame} (${fixture.qualification})`,()=>{
  const object=fixture.object as FirebarGeometry&FirebarMotorParameters;
  const motor=createFirebarMotor(object);
  for(let frame=0;frame<fixture.activeNativeFrames;frame++)advanceFirebarMotor(motor,object,object,object.x-259);
  assert.equal(firebarOrientation(motor),fixture.orientation);
  const centers=firebarFlameCenters(motor,object);
  for(const point of fixture.centers)assert.deepEqual(centers[point.n],{x:point.x,y:point.y});
 });
}
