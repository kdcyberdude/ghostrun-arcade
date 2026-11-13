/** One-time ScreenRoutines snapshot. Native mode1/task1..2 and task3/engine0
 * are load controls, not a conveniently selected later gameplay pose. */
export function decodeNativeLoad(ram){
 const task=ram[0x772],engine=ram[14];if(ram[0x770]!==1||!(task===1||task===2||task===3&&engine===0))return;
 return {task,engine,screen:ram[0x73c],disable:ram[0x774],timer:ram[0x7a0],columns:ram[0x71e],timeUp:Boolean(ram[0x759]),skipIntermediate:Boolean(ram[0x752])||ram[0x74e]!==3&&Boolean(ram[0x769])};
}
export function initializeNativeLoad(sim,state){
 if(!state)return;
 sim.levelLoad={...state};sim.deathLoad=undefined;sim.lifeIntro=undefined;sim.pipeLoad=undefined;sim.phase='intro';sim.phaseFrame=0;
 // RenderingAreaGraphics consumes one two-column set before decrementing ColumnSets.
 sim.springLoadColumns=state.screen<=8?(state.columns+1)&255:0;
 return {initialized:['native ScreenRoutines task, engine, screen, disable flag, interval timer and column sets','native time-up and intermediate-screen flags'],notReconstructed:['native PPU picture at the seed row','later gameplay entrance variants without their source initializer']};
}
