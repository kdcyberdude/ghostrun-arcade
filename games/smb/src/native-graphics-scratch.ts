/** The retained $EF byte, written by EnemyGfxHandler and ProcFirebar.
 * Vine Setup_Vine reached through JumpEngine indexes Block_X_Position+$60,
 * aliasing this byte. Calls occur at the source handler's ordered execution,
 * never while a renderer or strict readout queries an actor. Undefined means
 * a writer has not yet been reconstructed; it must not become a guessed zero. */
export class NativeGraphicsScratch {
 value:number|undefined=0;
 clear(){this.value=0;}
 seed(value:number){this.value=value&255;}
 unknown(){this.value=undefined;}
 enemy(id:number,options:{piranhaSpeed?:number;frameTimer?:number;springControl?:number;bowser?:number}={}){
  if(id===13&&(options.piranhaSpeed??0)>=0&&(options.frameTimer??0)!==0)return;
  let code=id;
  if(id===53)code=21;
  if(id===51)code=8;
  if(id===50){if(options.springControl===undefined){this.unknown();return;}code=[24,25,26,25,24][options.springControl];}
  if(options.bowser)code=options.bowser===1?22:23;
  this.value=code;
 }
 /** Call after the native spin/long-arm correction, which authors $A0. */
 firebar(high:number,offscreen:number){if(!(offscreen&8))this.value=high;}
}
