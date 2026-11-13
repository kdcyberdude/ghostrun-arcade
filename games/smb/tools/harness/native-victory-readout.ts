/** VictoryModeSubroutines RAM ownership. $34 becomes destination after Setup;
 * $35 is a firebar alias until the first actual PlayerVictoryWalk call. */
import {playerCell} from '../../src/player-cell.js';
export type VictoryCheck=[field:string,native:unknown,sim:unknown];
export function victoryChecks(r:Uint8Array,sim:any,walkOwned:boolean,drawOwned:boolean,offset=0):VictoryCheck[]{
 const n=sim.nativeVictory,out:VictoryCheck[]=[['owned',true,Boolean(n&&['castle','ending'].includes(sim.phase))],['task',r[0x772],n?.task],['frameCounter',r[9],sim.random.frame],['random',Array.from(r.subarray(0x7a7,0x7ae)),sim.random.bytes],['interval',r[0x77f],sim.intervalControl]];
 for(const [key,address]of [['primary',0x719],['secondary',0x749],['endTimer',0x7a1],['feet',0x364],['controls',0x363],['bridge',0x369],['scrollFraction',0x768]] as const)out.push([key,r[address],n?.[key]]);
 if(r[0x772]>=2)out.push(['destination',r[0x34]+offset/256,n?.destination]);
 if(walkOwned)out.push(['walk',r[0x35],n?.walk]);
 if(drawOwned)out.push(['cell',r[0x6d5]>>3,playerCell(sim).cell]);
 const slot=r[0x368],nativeBoss=slot<6&&Boolean(r[0xf+slot])&&!(r[0xf+slot]&128)&&r[0x16+slot]===45,boss=sim.victoryBoss;
 out.push(['bossOwned',nativeBoss,Boolean(boss)]);
 if(nativeBoss&&boss){
  out.push(['bossState',r[0x1e+slot],n?.bossState],['boss.x',r[0x6e+slot]*256+r[0x87+slot]+offset,boss.nativeBowser?.x],['boss.y',(r[0xb6+slot]-1)*256+r[0xcf+slot],n?.boss.y],['boss.speed',(r[0xa0+slot]<<24)>>24,n?.boss.speed],['boss.force',r[0x434+slot],n?.boss.force],['boss.fraction',r[0x417+slot],n?.boss.fraction]);
 }
 return out;
}

/** The source world-load object owns these bytes until PlayerRdy releases control.
 * A ready frame has cleared that object, so only its live engine/task contract is compared. */
export function victoryLoadChecks(r:Uint8Array,sim:any):VictoryCheck[]{
 const n=sim.levelLoad,out:VictoryCheck[]=[['frameCounter',r[9],sim.random.frame],['random',Array.from(r.subarray(0x7a7,0x7ae)),sim.random.bytes],['interval',r[0x77f],sim.intervalControl]];
 if(n)for(const [key,address]of [['task',0x772],['engine',14],['screen',0x73c],['disable',0x774]] as const)out.push([`load.${key}`,r[address],n[key]]);
 else out.push(['load.ready',r[0x772]===3&&r[14]===8,sim.phase==='play'&&!sim.entryControlLocked]);
 return out;
}
