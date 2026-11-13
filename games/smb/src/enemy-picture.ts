import type {Enemy} from './types.js';

/** RunNormalEnemies calls EnemyGfxHandler before terrain/enemy/player contact and movement.
 * Keep that picture through the rest of the step, including wing removal, shell conversion and squash.
 * Bullets and Bowser have separate native graphics handlers and retain their own ordering. */
export function captureEnemyPicture(enemy:Enemy){
 if(enemy.kind==='bullet'||enemy.kind==='bowser')return;
 const picture={...enemy};delete picture.graphics;
 if(enemy.bloop)picture.bloop={...enemy.bloop};
 if(enemy.lak)picture.lak={...enemy.lak};
 if(enemy.pir)picture.pir={...enemy.pir};
 if(enemy.pod)picture.pod={...enemy.pod};
 if(enemy.fall)picture.fall={...enemy.fall};
 if(enemy.hbro)picture.hbro={...enemy.hbro};
 if(enemy.horizontalFlight)picture.horizontalFlight={...enemy.horizontalFlight};
 if(enemy.redFlight)picture.redFlight={...enemy.redFlight};
 if(enemy.nativeSwim)picture.nativeSwim={...enemy.nativeSwim};
 enemy.graphics=picture;
}

export const enemyPicture=(enemy:Enemy):Enemy=>enemy.graphics??enemy;

/** CheckForHammerBro: state bit3 raises the throwing arm; an unarmed airborne state keeps the base cell. */
export function nativeHammerBroCell(state:number,frameCounter:number,timersStopped=false){
 const base=state&8?30:28;
 return base+(!timersStopped&&!(state&0xa0)&&(state===0||Boolean(state&8))&&!(frameCounter&8)?1:0);
}

/** Graphics read TimerControl at each enemy slot; on later frozen rows no handler updates the stamp. */
export const enemyPictureTimersStopped=(e:Enemy,frame:number,stopped:boolean)=>e.graphicsFrame===frame?Boolean(e.graphicsTimersStopped):Boolean(stopped);
