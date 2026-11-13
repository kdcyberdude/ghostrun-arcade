import data from '../data/native-area-controls.json';
/** ScrollLockObject ($0723): called by AreaParserCore at task index7/3; IncrementColumnPos is index4/0. */
export class NativeAreaControls {
 column=24;locked=false;origin=0;
 readonly castleGraphics:{column:number;row:number;id:number;erase:number}[]=[];
 private commands:{column:number;command:number}[]=[];
 constructor(level:string,area:string,screenLeft=0){
  const binding=(data.bindings as Record<string,{stream:string;origin:number}>)[`${level}/${area}`];
  if(binding){this.origin=binding.origin;const objects=(data.streams as Record<string,{objects:{column:number;command:number}[]}>)[binding.stream].objects;this.commands=objects.filter(o=>o.command>=5&&o.command<=7).map(o=>({...o,column:o.column-binding.origin}));
   // C_ObjectRow/C_ObjectMetatile and BridgeCollapseData: axe, chain, then thirteen bridge columns right-to-left.
   for(const object of objects)if(object.command>=2&&object.command<=4){const index=object.command-2;for(let col=0;col<(index===2?13:1);col++)this.castleGraphics.push({column:object.column-binding.origin+col,row:[6,7,8][index]+2,id:[0xc5,0x0c,0x89][index],erase:index===2?14-col:index});}
  }
  // InitializeArea starts CurrentPageLoc at the source entrance/halfway
  // page; the screen preload then parses24 columns. Convert the scene
  // origin once, before taking the native ScreenLeft_PageLoc byte.
  const startPage=Math.floor((screenLeft+this.origin*16)/256);
  this.column=startPage*16+24-this.origin;
 }
 seedNative(column:number,locked:boolean){this.column=column-this.origin;this.locked=locked;}
 advance(task:number|undefined){
  if(task===7||task===3)for(const command of this.commands)if(command.column===this.column)this.locked=!this.locked;
  if(task===4||task===0)this.column++;
 }
}
