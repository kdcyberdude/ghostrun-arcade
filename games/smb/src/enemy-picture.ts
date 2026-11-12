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
