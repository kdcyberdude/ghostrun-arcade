import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {nativePlatformArtworkYs} from '../src/platform-motion.js';
import fixture from './fixtures/native-small-platform-pictures.json';

test('native small lifts draw both pre-movement surfaces with HUD suppression and vertical wrapping',()=>{
 const levels=observedLevels(),area=levels.find(l=>l.id==='2-4')!.areas.find(a=>a.id==='main')!,platform=area.platforms!.find(p=>p.x===1372)!;
 assert.ok(fixture.checked>1000);
 for(const level of fixture.levels)for(const [frame,firstY,first,second] of level.rows){
  const ys=nativePlatformArtworkYs(platform,{levelId:'2-4',areaId:'main'},firstY).filter(y=>y<240).sort((a,b)=>a-b);
  const native=[first,second].filter(y=>y<239).map(y=>y+1).sort((a,b)=>a-b);
  assert.deepEqual(ys,native,`${level.level} native frame ${frame}`);
 }
 const largeArea=levels.find(l=>l.id==='1-2')!.areas.find(a=>a.id==='area-2')!,large=largeArea.platforms!.find(p=>p.x===2236)!;
 assert.deepEqual(nativePlatformArtworkYs(large,{levelId:'1-2',areaId:'area-2'},16),[16],'large lifts keep one surface and their existing visibility');
});
