/** Native timers the model keeps only as bytes for the NMI: $0780-$0794 count down on every frame-timer pass of the NMI, $0795-$07A3
 * only on the passes where IntervalTimerControl wraps. A write made on a row reads as made after that row's NMI pass, which the model
 * may run later in the row, so such a pass does not count against it. */
export class NativeTimerBank {
 private passes=[0,0];
 private entries=new Map<number,{value:number;mark:number;frame:number}>();
 private static kind(index:number){return index<0x15?0:1;}
 set(index:number,value:number,frame:number){this.entries.set(index,{value,mark:this.passes[NativeTimerBank.kind(index)],frame});}
 get(index:number){const e=this.entries.get(index);return e?Math.max(0,e.value-(this.passes[NativeTimerBank.kind(index)]-e.mark)):0;}
 /** One NMI timer pass (0 frame timers, 1 interval timers) on row frame. */
 pass(kind:0|1,frame:number){this.passes[kind]++;for(const [index,e] of this.entries)if(NativeTimerBank.kind(index)===kind&&e.frame===frame)e.mark++;}
 /** InitializeMemory clears page 7 below $07B0. */
 clear(){this.entries.clear();}
}
