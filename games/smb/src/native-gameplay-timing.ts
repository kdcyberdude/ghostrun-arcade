import {NativeSourceMachine} from './native-source-machine.js';
// Source labels AreaParserTaskHandler and SkipATRender in authenticated SMBDIS.
// The task byte is decremented AFTER the selected procedure returns.
const PARSER_ENTRY=0x92b0,PARSER_RETURN=0x92c7;
/** Source-owned PPU sampling boundary. This tracks procedure continuation, not
 * an observed lag-frame list. The source CPU/RAM starts at reset once. */
export class NativeGameplayTiming {
 readonly machine=new NativeSourceMachine();
 nmi=false;parserPending=false;parserCompleted=false;parserTask:number|undefined;
 private parserStack:number|undefined;
 constructor(){
  this.machine.observerPcs=new Set([PARSER_ENTRY,PARSER_RETURN]);
  this.machine.onInstruction=(event,machine)=>{
   this.nmi||=event.nmiServiced;
   if(event.pc===PARSER_ENTRY){this.parserStack=event.cpuBefore.sp;this.parserPending=true;this.parserTask=((machine.ram[0x71f]||8)-1)&255;}
   if(event.pc===PARSER_RETURN&&this.parserStack!==undefined&&machine.cpu.sp===((this.parserStack+2)&255)){this.parserPending=false;this.parserCompleted=true;this.parserStack=undefined;}
  };
 }
 step(pad:number){this.nmi=false;this.parserCompleted=false;this.machine.step(pad);}
}
