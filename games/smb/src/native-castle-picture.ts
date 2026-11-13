import data from '../data/native-retainers.json';
export interface CastleRetainer {readonly x:number;readonly y:number;readonly slot:number;readonly graphicsVisible:boolean}
/** VictoryMode runs only slot0 after its updated task leaves BridgeCollapse.
 * Loading an inactive slot initializes RetainerObject but does not run EnemyGfxHandler until the next pass. */
export class NativeCastlePictures {
 owner:'engine'|'empty'|'victory'='engine';managed=false;
 private actor?:CastleRetainer;private x?:number;
 constructor(level:string,area:string){this.x=data.areas.find(a=>a.level===level&&a.area===area)?.x;}
 get retainer(){return this.actor;}
 initializeNative(slot:number,x:number,y:number){this.actor={slot,x,y,graphicsVisible:false};}
 drawNative(slot:number){if(this.actor?.slot===slot)this.actor={...this.actor,graphicsVisible:true};}
 eraseNative(){this.actor=undefined;}
 begin(){this.owner='empty';this.actor=this.managed&&this.actor?{...this.actor,graphicsVisible:false}:undefined;}
 step(task:number,camera:number,parserBlocked:boolean,slotAvailable:boolean){
  this.owner='victory';
  if(task===0){if(this.actor)this.actor={...this.actor,graphicsVisible:false};return;}
  if(this.actor){this.actor={...this.actor,graphicsVisible:this.actor.slot===0};return;}
  if(this.managed)return;
  if(this.x!==undefined&&slotAvailable&&!parserBlocked&&this.x<Math.floor(camera)+304)this.actor={x:this.x,y:0xb8,slot:0,graphicsVisible:false};
 }
}
