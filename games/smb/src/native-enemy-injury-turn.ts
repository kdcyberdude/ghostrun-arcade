/** ChkETmrs -> TInjE/ChkEnemyFaceRight -> LInj -> EnemyTurnAround.
 * Direct water/Piranha/Podoboo injury and stomp-to-Spiny injury bypass LInj. */
export function nativeEnemyInjuryTurn(n:{speed:number;direction:number},i:{id:number;playerRelative:number;enemyRelative:number;playerSpeed:number;stompTimer:number;injuryTimer:number;water:boolean}){
 if(i.water&&i.id!==18||i.injuryTimer||i.playerSpeed>0||i.stompTimer)return false;
 if(!(i.id<7&&i.id!==5||i.id===14||i.id===18))return false;
 if(((i.playerRelative&255)<(i.enemyRelative&255))!==(n.direction===1))return false;
 n.speed=(-n.speed)&255;n.direction^=3;return true;
}
