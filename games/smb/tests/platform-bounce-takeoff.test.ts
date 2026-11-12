import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('a normal jump after stomping and landing on a moving platform has full height',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.tiles=[];area.freeTiles=[];area.enemies=[];area.generators=[];area.firebars=[];
 area.platforms=area.platforms!.filter(p=>p.x===1466);
 const game=new Simulation([level]);game.reset(true);game.loadArea('main',[1474,133],1362);
 const platform=game.area.platforms![0],position=game.platformPosition(platform);
 const enemy=(game as any).makeEnemy({kind:'goomba',x:position.x+8,y:position.y-1});
 enemy.active=true;enemy.vx=0;game.enemies=[enemy];
 Object.assign(game.player,{x:position.x+8,y:position.y-12,vx:0,vy:4,grounded:false});
 game.broClock=1;game.step([],1);assert.ok(enemy.dead,'the player must actually stomp the enemy');
 for(let i=0;i<90&&!game.player.grounded;i++)game.step([],1);
 assert.equal(game.player.grounded,true,'the player must land on the moving platform');
 const landedY=game.player.y;let highest=landedY;
 for(let i=0;i<30;i++){game.step(['a'],1);highest=Math.min(highest,game.player.y);}
 assert.ok(landedY-highest>=40,`ordinary held jump rose only ${landedY-highest}px`);
});
