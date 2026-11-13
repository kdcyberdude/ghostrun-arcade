/** Next PPU picture after startup's queued palette writes and NMI screen-enable decision.
 * Sprite palette $3f10 aliases the universal background entry at $3f00. */
export interface NativeStartupPictureState {
 mode:number;task:number;engine:number;screen:number;disable:number;initializing:boolean;
 queuedPalette:{address:number;bytes:readonly number[]}[];
}
export class NativeStartupPicture {
 backdrop=0;rendering=false;title=false;player=false;
 reset(){this.backdrop=0;this.rendering=this.title=this.player=false;}
 step(n:NativeStartupPictureState){
  for(const packet of n.queuedPalette)for(const [i,color]of packet.bytes.entries()){
   const address=packet.address+i;
   if(address>=0x3f00&&address<0x4000&&((address-0x3f00)&15)===0)this.backdrop=color&63;
  }
  this.rendering=!n.initializing&&n.disable===0;
  this.title=n.mode===0||this.title&&n.mode===1&&n.task===0&&n.disable===0;this.player=n.mode===0&&n.engine!==0;
 }
}

/** Start changes the logical mode before InitializeArea blanks the retained title nametable. */
export function nativeStartupTitleShown(picture:{title:boolean},phase:string,screen?:{task:number;disable:number}){
 return phase==='title'||picture.title&&screen?.task===0&&screen.disable===0;
}
