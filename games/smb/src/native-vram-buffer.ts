/** VRAM_Buffer1 at $0300: one offset byte, literal command headers/payloads,
 * and a shared zero terminator. Duplicate commands remain in source order. */
export interface NativeVramPacket {address:number;control:number;payload:readonly number[]}
export class NativeVramBuffer1 {
 private selector=0;
 constructor(readonly data=new Uint8Array(256)){}
 get offset(){return this.data[0];}
 get addressControl(){return this.selector;}
 append({address,control,payload}:NativeVramPacket){
  const offset=this.offset;this.data.set([address>>8,address&255,control,...payload,0],offset+1);this.data[0]=offset+3+payload.length;
 }
 clear(){this.data[0]=this.data[1]=0;}
 seed(bytes:Uint8Array,selector=0){this.data.set(bytes.subarray(0,this.data.length));this.selector=selector;}
 /** NMI clears the selected buffer only; control6 preserves buffer1. */
 /** Bytes the next NMI writes from buffer1 (0 while control6 keeps it). */
 get pendingFlush(){return this.selector!==6?this.offset:0;}
 beginFrame(){if(this.selector!==6)this.clear();this.selector=0;}
 select(buffer2:boolean){this.selector=buffer2?6:0;}
 /** A ROM buffer for the next NMI (VRAM_AddrTable: 8 BowserPaletteData, 12 + n the victory messages); buffer1 is cleared unwritten. */
 rom(control:number){this.selector=control;}
}
/** ColorRotation: AND7 / CPX#$31 before appending its seven-byte command. */
export const nativeColorRotationAllowed=(counter:number,offset:number)=>(counter&7)===0&&offset<0x31;
