import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

function game(){
 const tiles:Tile[]=Array.from({length:40},(_,x)=>[x,13,84]);
 const room=(id:string,theme:Area['theme']):Area=>({id,width:640,palette:0,theme,tiles,enemies:[],spawn:[40,208],evidence:'Synthetic music-state fixture'});
 const level:Level={id:'fixture',time:400,main:'main',areas:[room('main','ground'),room('under','underground')],evidence:'Synthetic music-state fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.time=100;sim.events=[];return sim;
}

test('Star collection and expiry retain the current hurry tempo',()=>{
 const sim=game();sim.items.push({kind:'star',x:40,y:192,vx:0,vy:0,age:32,life:1000});sim.step([],1);
 assert.ok(sim.events.includes('music_star_hurry'));sim.events=[];
 sim.player.star=1;sim.step([],1);assert.ok(sim.events.includes('music_ground_hurry'));
});

test('area transitions preserve time and select the destination hurry track',()=>{
 const sim=game();sim.timerFrames=11;
 (sim as any).enterArea('under',[40,208],0);
 assert.equal(sim.time,100);assert.equal(sim.timerFrames,11);
 assert.deepEqual(sim.events.filter(event=>event.startsWith('music_')),['music_underground_hurry']);
});
