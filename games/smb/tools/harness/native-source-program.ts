/** Compile source-readable SMBDIS instructions/tables, authenticate against a local
 * ROM, and select a static procedure closure. No ROM/code-byte image is emitted.
 * npx tsx tools/harness/native-source-program.ts --asm ASM --rom ROM --entries GameCoreRoutine,AreaParserTaskHandler --out JSON */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
export type NativeSourceInstruction=[number,string,string,number,number,number,number];
type Encoding={opcode:number;cycles:number;penalty:number};
const encodings=new Map<string,Encoding>();
function group(op:string,entries:[string,number,number,number?][]){for(const [mode,opcode,cycles,penalty=0]of entries)encodings.set(`${op}:${mode}`,{opcode,cycles,penalty});}
for(const [op,base]of [['ORA',0],['AND',32],['EOR',64],['ADC',96],['LDA',160],['CMP',192],['SBC',224]] as const)group(op,[['indx',base+1,6],['zp',base+5,3],['imm',base+9,2],['abs',base+13,4],['indy',base+17,5,1],['zpx',base+21,4],['absy',base+25,4,1],['absx',base+29,4,1]]);
group('STA',[['indx',129,6],['zp',133,3],['abs',141,4],['indy',145,6],['zpx',149,4],['absy',153,5],['absx',157,5]]);
for(const [op,base]of [['ASL',0],['ROL',32],['LSR',64],['ROR',96]] as const)group(op,[['zp',base+6,5],['acc',base+10,2],['abs',base+14,6],['zpx',base+22,6],['absx',base+30,7]]);
for(const [op,base]of [['DEC',192],['INC',224]] as const)group(op,[['zp',base+6,5],['abs',base+14,6],['zpx',base+22,6],['absx',base+30,7]]);
group('LDX',[['imm',162,2],['zp',166,3],['zpy',182,4],['abs',174,4],['absy',190,4,1]]);group('LDY',[['imm',160,2],['zp',164,3],['zpx',180,4],['abs',172,4],['absx',188,4,1]]);
group('STX',[['zp',134,3],['zpy',150,4],['abs',142,4]]);group('STY',[['zp',132,3],['zpx',148,4],['abs',140,4]]);
group('BIT',[['zp',36,3],['abs',44,4]]);group('CPX',[['imm',224,2],['zp',228,3],['abs',236,4]]);group('CPY',[['imm',192,2],['zp',196,3],['abs',204,4]]);
group('JMP',[['abs',76,3],['ind',108,5]]);group('JSR',[['abs',32,6]]);
for(const [op,opcode,cycles]of [['BRK',0,7],['PHP',8,3],['CLC',24,2],['PLP',40,4],['SEC',56,2],['RTI',64,6],['PHA',72,3],['CLI',88,2],['RTS',96,6],['PLA',104,4],['SEI',120,2],['DEY',136,2],['TXA',138,2],['TYA',152,2],['TXS',154,2],['TAY',168,2],['TAX',170,2],['CLV',184,2],['TSX',186,2],['INY',200,2],['DEX',202,2],['CLD',216,2],['INX',232,2],['NOP',234,2],['SED',248,2]] as const)group(op,[['imp',opcode,cycles]]);
for(const [i,op]of ['BPL','BMI','BVC','BVS','BCC','BCS','BNE','BEQ'].entries())group(op,[['rel',16+i*32,2]]);
const branches=new Set(['BPL','BMI','BVC','BVS','BCC','BCS','BNE','BEQ']);
type Statement={line:number;pc:number;op:string;operand:string;mode?:string;size:number};
export function compileNativeSource(asm:string,rom:Uint8Array){
 const symbols=new Map<string,number>(),definitions=new Map<string,string>(),statements:Statement[]=[];let pc=0;
 function value(expr:string):number{
  const t=expr.trim();if(t[0]==='<')return value(t.slice(1))&255;if(t[0]==='>')return value(t.slice(1))>>8&255;
  const terms=t.replace(/\$([\da-f]+)/gi,(_,n)=>String(parseInt(n,16))).replace(/%([01]+)/g,(_,n)=>String(parseInt(n,2))).match(/[A-Za-z_]\w*|\d+|[+-]/g);
  if(!terms||terms.join('')!==t.replace(/\$([\da-f]+)/gi,(_,n)=>String(parseInt(n,16))).replace(/%([01]+)/g,(_,n)=>String(parseInt(n,2))).replace(/\s/g,''))throw Error(`Unsupported source expression ${expr}`);
  let result=0,sign=1;for(const term of terms){if(term==='+')sign=1;else if(term==='-')sign=-1;else{const n=/^\d+$/.test(term)?Number(term):symbols.get(term)??(definitions.has(term)?value(definitions.get(term)!):undefined);if(n===undefined)throw Error(`Unknown symbol ${term}`);result+=sign*n;sign=1;}}return result;
 }
 function mode(op:string,operand:string){
  if(branches.has(op))return 'rel';if(!operand)return ['ASL','LSR','ROL','ROR'].includes(op)?'acc':'imp';if(operand.toLowerCase()==='a')return 'acc';if(operand[0]==='#')return 'imm';
  if(/^\(.+,x\)$/i.test(operand))return 'indx';if(/^\(.+\),y$/i.test(operand))return 'indy';if(operand[0]==='(')return 'ind';
  const suffix=operand.match(/,([xy])$/i)?.[1].toLowerCase()??'',expr=operand.replace(/,[xy]$/i,'');let zp=false;try{zp=value(expr)<=255;}catch{ /* Forward code labels are absolute. RAM constants precede code. */ }
  const short=`zp${suffix}`;return zp&&encodings.has(`${op}:${short}`)?short:`abs${suffix}`;
 }
 for(const [index,original]of asm.split('\n').entries()){
  let text=original.split(';')[0].trim();if(!text)continue;
  const definition=text.match(/^(\w+)\s*=\s*(.+)$/);if(definition){definitions.set(definition[1],definition[2]);try{symbols.set(definition[1],value(definition[2]));}catch{ /* Forward table aliases resolve in pass two. */ }continue;}
  const label=text.match(/^(\w+):/);if(label){symbols.set(label[1],pc);text=text.slice(label[0].length).trim();if(!text)continue;}
  const [token,...rest]=text.split(/\s+/),op=token.toUpperCase(),operand=rest.join('').trim();
  if(op==='.INDEX'||op==='.MEM')continue;if(op==='.ORG'){pc=value(operand);continue;}
  if(op==='.DB'||op==='.DW'){const size=operand.split(',').length*(op==='.DW'?2:1);statements.push({line:index+1,pc,op,operand,size});pc+=size;continue;}
  const m=mode(op,operand),encoding=encodings.get(`${op}:${m}`);if(!encoding)throw Error(`Unsupported source instruction line${index+1}: ${text} (${m})`);
  const size=['imp','acc'].includes(m)?1:['abs','absx','absy','ind'].includes(m)?3:2;statements.push({line:index+1,pc,op,operand,mode:m,size});pc+=size;
 }
 const checked=new Set<number>();
 const instructions:NativeSourceInstruction[]=[],data:[number,number][]=[],lines:[number,number][]=[],words=new Map<number,number>(),embedded:NativeSourceInstruction[]=[];
 const check=(address:number,expected:number,line:number)=>{checked.add(address);const actual=rom[16+address-0x8000];if(actual!==expected)throw Error(`Source/ROM mismatch line${line} at$${address.toString(16)}: source${expected} ROM${actual}`);};
 for(const s of statements){
  if(s.op==='.DB'||s.op==='.DW'){let address=s.pc;for(const expr of s.operand.split(',')){const n=value(expr);if(s.op==='.DW')words.set(address,n);for(let i=0;i<(s.op==='.DW'?2:1);i++){const b=n>>(i*8)&255;check(address,b,s.line);data.push([address++,b]);}}continue;}
  const m=s.mode!,e=encodings.get(`${s.op}:${m}`)!,expr=s.operand.replace(/^#/,'').replace(/^\(/,'').replace(/,x\)$/i,'').replace(/\),y$/i,'').replace(/\)$/,'').replace(/,[xy]$/i,'');
  const n=['imp','acc'].includes(m)?0:value(expr);check(s.pc,e.opcode,s.line);if(s.size>1)check(s.pc+1,m==='rel'?(n-s.pc-2)&255:n&255,s.line);if(s.size===3)check(s.pc+2,n>>8&255,s.line);
  instructions.push([s.pc,s.op,m,n,s.size,e.cycles,e.penalty]);lines.push([s.pc,s.line]);
 }
 for(const s of statements)if(s.op==='.DB'&&s.size===1&&value(s.operand)===0x2c){const n=rom[16+s.pc+1-0x8000]|rom[16+s.pc+2-0x8000]<<8;embedded.push([s.pc,'BIT','abs',n,3,4,0]);lines.push([s.pc,s.line]);}
 return {symbols,instructions,data,lines,words,embedded,verifiedBytes:checked.size};
}
export function nativeSourceClosure(program:ReturnType<typeof compileNativeSource>,entries:string[]){
 const nodes=new Map([...program.instructions,...program.embedded].map(n=>[n[0],n])),selected=new Set<number>(),seen=new Set<string>(),dispatch=program.symbols.get('JumpEngine');
 type Flags={z?:boolean;n?:boolean;c?:boolean;v?:boolean};const pending:{pc:number;flags:Flags}[]=entries.map(name=>{const pc=program.symbols.get(name);if(pc===undefined)throw Error(`Unknown entry ${name}`);return {pc,flags:{}};});
 const add=(pc:number,flags:Flags)=>pending.push({pc,flags});
 while(pending.length){const {pc,flags}=pending.pop()!,key=JSON.stringify([pc,flags]);if(seen.has(key))continue;seen.add(key);const n=nodes.get(pc);if(!n)throw Error(`Control flow reaches non-instruction $${pc.toString(16)}`);selected.add(pc);const [,op,mode,operand,size]=n,next=pc+size;
  if(op==='RTS'||op==='RTI'||op==='BRK')continue;
  if(op==='JMP'){if(mode!=='ind')add(operand,flags);continue;}
  if(op==='JSR'){add(operand,flags);if(operand===dispatch){let address=next;while(program.words.has(address)){add(program.words.get(address)!,{});address+=2;}if(address===next)throw Error(`Missing inline JumpEngine table at$${next.toString(16)}`);continue;}add(next,{});continue;}
  if(branches.has(op)){const bit=op==='BEQ'||op==='BNE'?'z':op==='BMI'||op==='BPL'?'n':op==='BCC'||op==='BCS'?'c':'v',set=['BEQ','BMI','BCS','BVS'].includes(op),known=flags[bit];if(known===undefined||known===set)add(operand,{...flags,[bit]:set});if(known===undefined||known!==set)add(next,{...flags,[bit]:!set});continue;}
  const after={...flags};
  if(['LDA','LDX','LDY','AND','ORA','EOR','ADC','SBC','CMP','CPX','CPY','BIT','INC','DEC','ASL','LSR','ROL','ROR','INX','INY','DEX','DEY','TAX','TAY','TXA','TYA','TSX','PLA','PLP'].includes(op)){delete after.z;delete after.n;}
  if(['ADC','SBC','CMP','CPX','CPY','ASL','LSR','ROL','ROR','PLP'].includes(op))delete after.c;
  if(['ADC','SBC','BIT','PLP'].includes(op))delete after.v;
  if(['LDA','LDX','LDY'].includes(op)&&mode==='imm'){after.z=operand===0;after.n=Boolean(operand&128);}
  if(op==='CLC'||op==='SEC')after.c=op==='SEC';if(op==='CLV')after.v=false;add(next,after);
 }
 return [...program.instructions,...program.embedded].filter(n=>selected.has(n[0])).sort((a,b)=>a[0]-b[0]);
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{asm:{type:'string'},rom:{type:'string'},entries:{type:'string'},out:{type:'string'}}});for(const key of ['asm','rom','entries','out'])if(!a[key as keyof typeof a])throw Error(`--${key} required`);
 const asm=fs.readFileSync(a.asm!,'utf8'),rom=fs.readFileSync(a.rom!),program=compileNativeSource(asm,rom),entries=a.entries!.split(','),instructions=nativeSourceClosure(program,entries),hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
 const out={scope:'Static source control-flow closure; source tables, no rawROM or observed-frame lookups. Indirect JumpEngine dispatch follows every declared inline source word.',provenance:{asmSha256:hash(asm),romSha256:hash(rom),compilerSha256:hash(fs.readFileSync(new URL(import.meta.url)))},entries:Object.fromEntries(entries.map(name=>[name,program.symbols.get(name)])),reset:program.symbols.get('Start'),nmi:program.symbols.get('NonMaskableInterrupt'),verifiedBytes:program.verifiedBytes,instructions,data:program.data,sourceLines:program.lines.filter(([pc])=>instructions.some(n=>n[0]===pc))};
 fs.writeFileSync(a.out!,JSON.stringify(out)+'\n');console.log(JSON.stringify({instructions:instructions.length,sourceInstructions:program.instructions.length,tableBytes:program.data.length}));
}
