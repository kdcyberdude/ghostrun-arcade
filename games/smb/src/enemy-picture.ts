import type {Enemy} from './types.js';

/** RunNormalEnemies calls EnemyGfxHandler before terrain/enemy/player contact and movement.
 * Keep that picture through the rest of the step, including wing removal, shell conversion and squash.
 * Cannon Bullets and Bowser have separate native graphics handlers and retain their own ordering. */
export function captureEnemyPicture(enemy:Enemy){
 if(enemy.kind==='bullet'&&!enemy.frenzy||enemy.kind==='bowser')return;
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

/** TimerControl holds movement, but EnemyGfxHandler still redraws each slot.
 * After the injury row, use the retained post-move RAM rather than that row's pre-contact picture. */
export function enemyRenderPicture(enemy:Enemy,frame:number,timersStopped:boolean):Enemy{
 if(!timersStopped||!enemy.graphics||enemy.graphicsFrame===frame)return enemyPicture(enemy);
 const graphicsFacing=enemy.kind==='bullet'?(enemy.direction??-1):enemy.kind==='paratroopa'&&enemy.nativeId===16?((enemy.horizontalFlight?.primary??0)&2?1:-1):Math.sign(enemy.vx);
 return {...enemy,graphics:undefined,graphicsX:enemy.x,graphicsY:enemy.y,graphicsFacing};
}


/** CheckForHammerBro: state bit3 raises the throwing arm; an unarmed airborne state keeps the base cell. */
export function nativeHammerBroCell(state:number,frameCounter:number,timersStopped=false){
 const base=state&8?30:28;
 return base+(!timersStopped&&!(state&0xa0)&&(state===0||Boolean(state&8))&&!(frameCounter&8)?1:0);
}

/** EnemyGfxHandler's two-cell cycle freezes on the first cell while timers stop. */
export const nativeEnemyCyclePhase=(frameCounter:number,timersStopped=false)=>!timersStopped&&!(frameCounter&8)?1:0;
/** CheckForBloober leaves shells still until EnemyIntervalTimer falls below five. */
export const nativeShellPhase=(timer:number,frameCounter:number,timersStopped=false)=>timer<5?nativeEnemyCyclePhase(frameCounter,timersStopped):0;
/** Blooper contraction replaces the empty top row; the extended cell also receives native's three-row Y adjustment. */
export const nativeBlooperPicture=(timer:number,dead=false,timersStopped=false)=>({cell:timer===1||timer>=5||dead||timersStopped?10:11,yOffset:timer!==1&&timer<5?3:0});
/** Lakitu hides his head in the cloud during the final sixteen frenzy-timer rows. */
export const nativeLakituCell=(frenzyTimer:number,dead=false)=>!dead&&frenzyTimer<16?25:24;
/** Graphics read TimerControl at each enemy slot; on later frozen rows no handler updates the stamp. */
export const enemyPictureTimersStopped=(e:Enemy,frame:number,stopped:boolean)=>e.graphicsFrame===frame?Boolean(e.graphicsTimersStopped):Boolean(stopped);

/** ID51 CheckForBulletBillCV decrements savedY and uses palette3/priority from EnemyFrameTimer; both bullet handlers bypass vertical-flip postprocessing. */
export const nativeBulletPicture=(cannon:boolean,timer:number,direction:number)=>({yOffset:cannon?-1:0,behindBackground:cannon&&timer>0,flipX:direction<0,flipY:false});
