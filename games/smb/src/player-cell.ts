/** Which cell of the player sheet (13 cells per row, 16x32) the 2D view draws for Mario, and its facing. The cell is the native
 * graphics-table offset / 8 (PlayerGfxOffset $06D5): big walk 0-2, skid 3, jump 4, swim 5-7, climb 8-9, crouch 10, throw 11,
 * small walk 12-14, skid 15, jump 16, swim 17-19, climb 20-21, death 22, small stand 23, big stand 25. */
import {nativeScreenPicture} from './native-screen-picture.js';
import {Simulation,POWERUPS} from './simulation.js';
import {growCell,shrinkCell,throwPoseShown} from './view-rules.js';

/** PlayerGfxHandler exits on odd FrameCounter rows while InjuryTimer is nonzero, including the shrink animation.
 * Native source: https://github.com/Xkeeper0/smb1/blob/master/src/prg.asm (PlayerGfxHandler). */
export function playerVisible(s:Simulation){
 if(s.nativeScreen&&!nativeScreenPicture(s.nativeScreen,s.area.theme==='water').player)return false;
 return s.spritePictureOwner!=='empty'&&s.vineEntryStage!=='grow'&&!s.entryFallHidden&&!s.flagInside&&!s.pipeHidden&&(!s.player.invincible||(s.random.frame&1)===0);
}

/** PlayerGfxHandler's extra swimming-foot tile, separate from PlayerGfxOffset. Small swim frame3 keeps tile$48 instead. */
export function nativeSwimKick(cell:number,frameCounter:number){
 if(frameCounter&4)return;
 if(cell>=5&&cell<=7)return 0x31;
 if(cell===17||cell===18)return 0x46;
}

export function playerCell(s:Simulation){
 // The time-up row: the game timer kills Mario after PlayerGfxHandler drew this row's pose (b7fcc3e4 1-1 row 9839: engine 11, PlayerGfxOffset still the walk).
 const timeUpRow=s.player.dead&&s.timeUpDeath&&s.phase==='dying'&&s.phaseFrame===0;
 const p=s.player,pose=s.phase==='play'||timeUpRow||s.nativeVictory||s.verticalPipeGraphics||s.sidePipeGraphics||s.phase==='flag'?(s.wallDisplayPose??s.locomotionPose):undefined;let cell=p.size?25:23;
 if(p.dead&&!timeUpRow)cell=22;else if(s.playerAnim.fresh&&(s.phase==='play'||s.nativeScreen?.engine===7))cell=p.size?25:23; // the area load row: Player_State 0 shows the standing pose (1-2 row 349, 2-2 row 352)
 else if(s.waterEntryStanding)cell=p.size?25:23;else if(s.entryFallPose)cell=p.size?0:12;else if(p.climbing)cell=(p.size?8:20)+(s.phase==='flag'?s.climbPoseFrame:Math.floor(p.anim/12)%2);
 else if(p.duck)cell=10;else if(s.area.theme==='water'&&!p.grounded)cell=(p.size?5:17)+s.swimPoseFrame;
 else if(pose)cell=pose.kind==='jump'?(p.size?4:16):pose.kind==='skid'?(p.size?3:15):pose.kind==='walk'?(p.size?0:12)+pose.frame:cell;
 else if(!p.grounded)cell=p.size?4:16;
 else if(Math.abs(p.vx)>0.1)cell=p.vx*p.facing<0?(p.size?3:15):(p.size?0:12)+Math.floor(p.anim/5)%3;
 const change=s.powerChange;
 // Pose cadence between7/8-frame observations remains inferred. All three
 // supplied growth sizes are used while the measured gameplay freeze runs.
 if(change?.kind==='grow'){const grow=growCell(POWERUPS.transformFreezeNativeFrames.mushroomGrowthValue-change.remaining,s.random.frame);if(grow==='big')cell=cell>=12&&cell<=17?cell-12:cell===23?25:cell;else if(grow!==undefined)cell=grow;}
 if(change?.kind==='shrink'){const frozen=POWERUPS.transformFreezeNativeFrames.shrinkValue-change.remaining,shrink=shrinkCell(frozen,s.random.frame);if(shrink!==undefined)cell=shrink;else if(frozen>=54)cell=cell===25||cell>=10&&cell<12?23:cell<10?cell+12:cell;}
 const facing=pose&&s.area.theme!=='water'&&!p.climbing?pose.facing:p.facing;
 const throwing=p.size===2&&throwPoseShown(s.fireballThrowAge,p.grounded,Math.abs(p.vx))&&!p.duck&&!p.dead&&!p.climbing;
 if(throwing&&Math.abs(p.vx)<=0.1)cell=11;
 const swimKick=s.area.theme==='water'&&!p.grounded&&!p.dead?nativeSwimKick(cell,s.random.frame):undefined;
 return {cell,facing,throwing,swimKick};
}
