/** ProcessEnemyData cursor ($0739/$073a/$073b). One call is one free native
 * slot's parser attempt; page-control rows recurse within that attempt. Hard
 * mode is tested only after the right-bound window, preserving its barriers. */
export type WaterStreamEvent=({kind:'frenzy'}|{kind:'blocked'}|{kind:'skip';offset:number}|{kind:'spawn';offset:number;id:number;x:number;y:number})&{x?:number;y?:number};
export class NativeWaterStream {
 constructor(readonly bytes:readonly number[],public offset=0,public page=0,public selected=false){}
 next(camera:number,hard:boolean,slot=0):WaterStreamEvent{
  for(;;){
   const offset=this.offset,first=this.bytes[offset];
   if(first===255)return {kind:'frenzy'};
   const second=this.bytes[offset+1],row=first&15;
   if(slot>=5&&row!==14&&(second&63)!==46)return {kind:'blocked'};
   if((second&128)&&!this.selected){this.page=(this.page+1)&255;this.selected=true;}
   if(row===15&&!this.selected){this.page=second&63;this.offset+=2;this.selected=true;continue;}
   const x=this.page*256+(first&240),right=Math.floor(camera)+255,extent=(right+48)&0xfff0;
   if(x>=right&&x>extent)return {kind:'frenzy',x};
   this.offset+=row===14?3:2;this.selected=false;
   if(row===14||x<right)return {kind:'skip',offset,x,...(x>=right?{y:row*16}:{})};
   if((second&64)&&!hard)return {kind:'skip',offset,x,y:row*16};
   const id=second&63;
   return {kind:'spawn',offset,id,x,y:row*16+(id<21?8:0)};
  }
 }
}
