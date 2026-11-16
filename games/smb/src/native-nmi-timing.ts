import rom from '../data/native-nmi-rom.json';

/** Native NMI timing up to the sprite-0 split, and the NMI SoundEngine.
 * nativeSoundEngine is SoundEngine ($F2D0) as a state machine over the sound RAM bytes ($F0-$FF, $07B0-$07CA): it applies one
 * NMI turn (pause tune, Square1/Square2/Noise SFX handlers, MusicHandler with its headers, note lengths, loops and ground-music
 * sequence) and returns the CPU cycles from its JSR to its return. nativeNmiTiming adds the rest of the NMI from the PPU-control
 * write to the first Sprite0Hit poll: UpdateScreen over the selected VRAM buffer (packets, literal/repeat bytes), ReadJoypads,
 * PauseRoutine, UpdateTopScore, the timer pass ($0780-$07A3, IntervalTimerControl $077F, TimerControl $0747), the random-bit
 * rotation, the Sprite0Clr wait and MoveSpritesOffscreen/SpriteShuffler. Cycles count from the NMI with the OAM DMA at 513 plus
 * the odd-cycle alignment and the sprite-0 flag clear at cycle 2270, as tools/harness/native-cycle-cpu.mjs does.
 * Measured by tools/harness/native-nmi-timing.mjs: for every gameplay row of the power-on captures, the model from RAM row f-1
 * and pad f equals the cycle-counting CPU replay of NMI f (en, clr, hit), and nativeSoundEngine leaves the sound RAM bytes the
 * replay leaves (data/native-nmi-timing-validation.json). ROM tables and music data come from data/native-nmi-rom.json. */

const romBytes=new Uint8Array(0x10000),romKnown=new Uint8Array(0x10000);
for(const {address,hex} of rom.ranges)for(let i=0;i<hex.length/2;i++){romBytes[address+i]=parseInt(hex.slice(i*2,i*2+2),16);romKnown[address+i]=1;}
const R=(a:number)=>{a&=0xffff;if(!romKnown[a])throw new Error(`native-nmi-timing: PRG $${a.toString(16)} is not in data/native-nmi-rom.json`);return romBytes[a];};
const px=(base:number,i:number)=>((base&255)+i)>255?1:0; // indexed read crossing a page: one more cycle
type Freq={z:boolean};

/** One SoundEngine turn on r (2048-byte RAM, mutated). Returns cycles from the JSR to the return. */
export function nativeSoundEngine(r:Uint8Array):number{
 let c=6;
 // SetFreq ($F38D): a zero high byte is a rest and skips the register writes
 const setFreq=(a:number):Freq=>{c+=8+px(0xff01,a);if(R(0xff01+a)===0){c+=7;return {z:true};}c+=22+px(0xff00,a);return {z:false};};
 const playSqu1=(a:number)=>{c+=22;return setFreq(a);},setFreqSqu1=(a:number)=>{c+=2;return setFreq(a);},dumpSq1=()=>{c+=14;};
 const playSqu2=(a:number)=>{c+=25;return setFreq(a);},setFreqSqu2=(a:number)=>{c+=5;return setFreq(a);},setFreqTri=(a:number)=>{c+=5;return setFreq(a);},dumpSq2=()=>{c+=14;};
 // each handler counts into its own total; helpers count into c, which a handler borrows
 const sub=(fn:()=>void)=>{const save=c;c=0;fn();const k=c;c=save;return k;};

 const square1=()=>{let k=0;const add=(v:number)=>{k+=v;};
  const play=(a:number)=>{const f={z:false};add(sub(()=>{f.z=playSqu1(a).z;}));return f;};
  add(5);const q=r[0xff];let lab=-1;
  if(q){add(5);r[0xf1]=q;
   if(q&0x80){add(2);lab=0xf3cd;}
   else{const t:[number,number,number][]=[[7,2,0xf3d1],[7,2,0xf3ff],[7,1,0xf45b],[7,1,0xf47d],[7,1,0xf4b6],[7,2,0xf3f9],[7,2,0xf3bf]];let v=q;
    for(const [cost,taken,to] of t){add(cost);const bit=v&1;v>>=1;if(bit){add(taken);lab=to;break;}}r[0xff]=v;}
  }else add(1);
  if(lab<0){add(5);const s=r[0xf1];if(s===0){add(7);return k;}add(2);
   if(s&0x80){add(2);lab=0xf3df;}
   else{const t:[number,number,number][]=[[4,2,0xf3df],[4,1,0xf40d],[4,1,0xf469],[4,1,0xf48d],[4,1,0xf4bb],[4,1,0xf40d],[4,1,0xf4a2]];let v=s;
    for(const [cost,taken,to] of t){add(cost);const bit=v&1;v>>=1;if(bit){add(taken);lab=to;break;}}if(lab<0){add(6);return k;}}}
  let jump=0,swim=0;
  for(;;)switch(lab){
   case 0xf3cd: add(5);jump=0x26;lab=0x1f3d3;continue;
   case 0xf3d1: add(2);jump=0x18;lab=0x1f3d3;continue;
   case 0x1f3d3: add(10);play(jump);add(6);r[0x7bb]=0x28;lab=0xf3df;continue;
   case 0xf3df:{add(8);const v=r[0x7bb];if(v===0x25){add(7);lab=0xf3f4;continue;}add(5);if(v!==0x20){add(2);lab=0xf419;continue;}add(2);lab=0xf3f2;continue;}
   case 0xf3f2: add(2);lab=0xf3f4;continue;
   case 0xf3f4: add(6);add(sub(dumpSq1));add(4);lab=0xf419;continue;
   case 0xf3bf: add(8);r[0x7bb]=0x40;add(6);add(sub(()=>{setFreqSqu1(0x62);}));add(5);lab=0xf3f2;continue;
   case 0xf3f9: add(8);swim=0x05;lab=0xf403;continue;
   case 0xf3ff: add(4);swim=0x0a;lab=0xf403;continue;
   case 0xf403: add(14);r[0x7bb]=swim;play(0x0c);lab=0xf40d;continue;
   case 0xf40d: add(8);add(r[0x7bb]!==6?1:6);lab=0xf419;continue;
   case 0xf419: add(3);lab=0xf47b;continue;
   case 0xf47b: add(3);lab=0xf4a2;continue;
   case 0xf45b: add(18);r[0x7bb]=0x0e;play(0x26);lab=0xf469;continue;
   case 0xf469:{add(16+px(0xf3b0,r[0x7bb]));add(r[0x7bb]!==6?1:6);lab=0xf47b;continue;}
   case 0xf47d:{add(10);r[0x7bb]=0x0e;add(8);const f=play(0x28);add(2);if(!f.z){add(1);lab=0xf4a2;continue;}lab=0xf48d;continue;}
   case 0xf48d: add(8);add(r[0x7bb]!==8?3:11);add(4);lab=0xf4a2;continue;
   case 0xf4b6: add(6);r[0x7bb]=0x2f;lab=0xf4bb;continue;
   case 0xf4bb:{add(8);const v=r[0x7bb];
    if(v&1)add(1);else{add(4);if(v&2)add(1);else{add(4);if(!((v>>2)&2))add(1);else{add(12);play(0x44);}}}
    add(3);lab=0xf4a2;continue;}
   case 0xf4a2: add(8);r[0x7bb]=(r[0x7bb]-1)&255;if(r[0x7bb]){add(7);return k;}add(23);r[0xf1]=0;return k;
   default: throw new Error('square1 '+lab.toString(16));
  }
 };

 const square2=()=>{let k=0;const add=(v:number)=>{k+=v;};const play=(a:number)=>add(sub(()=>{playSqu2(a);}));
  let lab=-1;add(7);
  if(r[0xf2]&0x40){add(1);lab=0xf5e7;}
  else{add(5);const q=r[0xfe];
   if(q){add(5);r[0xf2]=q;
    if(q&0x80){add(1);lab=0xf5c8;}
    else{const t:[number,number,number][]=[[7,1,0xf518],[7,1,0xf5fc],[7,2,0xf600],[7,1,0xf53a],[7,1,0xf51e],[7,1,0xf552],[7,1,0xf5e2]];let v=q;
     for(const [cost,taken,to] of t){add(cost);const bit=v&1;v>>=1;if(bit){add(taken);lab=to;break;}}r[0xfe]=v;}
   }else add(1);
   if(lab<0){add(5);const s=r[0xf2];if(s===0){add(7);return k;}add(2);
    if(s&0x80){add(1);lab=0xf5d3;}
    else{const t:[number,number,number][]=[[4,1,0xf5c2],[4,2,0xf60f],[4,2,0xf60f],[4,1,0xf545],[4,1,0xf5c2],[4,1,0xf557],[4,1,0xf5e7]];let v=s;
     for(const [cost,taken,to] of t){add(cost);const bit=v&1;v>>=1;if(bit){add(taken);lab=to;break;}}if(lab<0){add(6);return k;}}}}
  let A=0;
  for(;;)switch(lab){
   case 0xf5c2: add(3);lab=0xf52c;continue;
   case 0xf518: add(7);A=0x35;lab=0xf522;continue;
   case 0xf51e: add(4);A=0x06;lab=0xf522;continue;
   case 0xf522: add(14);r[0x7bd]=A;play(0x42);lab=0xf52c;continue;
   case 0xf52c: add(8);add(r[0x7bd]!==0x30?1:6);add(3);lab=0xf568;continue;
   case 0xf53a: add(13);r[0x7bd]=0x20;A=0x5e;lab=0xf550;continue;
   case 0xf545: add(8);if(r[0x7bd]!==0x18){add(1);lab=0xf568;continue;}add(4);A=0x18;lab=0xf550;continue;
   case 0xf550: add(3);lab=0xf5d1;continue;
   case 0xf5d1: add(3);lab=0xf5de;continue;
   case 0xf5de: add(5);lab=0xf565;continue;
   case 0xf5e0: add(3);lab=0xf565;continue;
   case 0xf565: add(6);play(A);lab=0xf568;continue;
   case 0xf552: add(6);r[0x7bd]=0x36;lab=0xf557;continue;
   case 0xf557:{add(8);const v=r[0x7bd];if(v&1){add(1);lab=0xf568;continue;}const y=v>>1;add(16+px(0xf4d9,y));play(R(0xf4d9+y));lab=0xf568;continue;}
   case 0xf5c8: add(10);r[0x7bd]=0x38;A=0x18;lab=0xf5d1;continue;
   case 0xf5d3: add(8);if(r[0x7bd]!==8){add(1);lab=0xf568;continue;}add(4);A=0x5a;lab=0xf5de;continue;
   case 0xf5e2: add(6);r[0x7bd]=0x30;lab=0xf5e7;continue;
   case 0xf5e7:{add(6);let v=r[0x7bd],jumped=false;
    for(let x=3;x>0;x--){add(4);const bit=v&1;v>>=1;if(bit){add(1);jumped=true;break;}add(4);if(x>1)add(1);}
    if(jumped){add(3);lab=0xf568;continue;}
    add(13+px(0xf4d3,v));A=R(0xf4d3+v);lab=0xf5e0;continue;}
   case 0xf5fc: add(5);A=0x10;lab=0xf602;continue;
   case 0xf600: add(2);A=0x20;lab=0xf602;continue;
   case 0xf602: add(16);r[0x7bd]=A;r[0x7be]=0;lab=0xf60f;continue;
   case 0xf60f:{add(20);r[0x7be]=(r[0x7be]+1)&255;const y=r[0x7be]>>1;
    if(y===r[0x7bd]){add(4);lab=0xf56d;continue;}
    add(16+px(0xf4f8,y));add(sub(()=>{setFreqSqu2(R(0xf4f8+y));}));add(6);return k;}
   case 0xf568: add(8);r[0x7bd]=(r[0x7bd]-1)&255;if(r[0x7bd]){add(7);return k;}lab=0xf56d;continue;
   case 0xf56d: add(23);r[0xf2]=0;return k;
   default: throw new Error('square2 '+lab.toString(16));
  }
 };

 const noise=()=>{let k=0;const add=(v:number)=>{k+=v;};let lab=-1;
  add(5);const q=r[0xfd];
  if(q){add(10);r[0xf3]=q;if(q&1){add(1);lab=0xf63b;r[0xfd]=q>>1;}else{add(7);if(q&2){add(1);lab=0xf680;}r[0xfd]=q>>2;}}
  else add(1);
  if(lab<0){add(5);const s=r[0xf3];if(s===0){add(7);return k;}
   add(4);if(s&1){add(1);lab=0xf640;}else{add(4);if(s&2){add(1);lab=0xf685;}else{add(6);return k;}}}
  for(;;)switch(lab){
   case 0xf63b: add(6);r[0x7bf]=0x20;lab=0xf640;continue;
   case 0xf640:{add(8);const v=r[0x7bf];if(!(v&1)){add(1);lab=0xf658;continue;}add(10+px(0xf62b,v>>1)+px(0xffea,v>>1));lab=0xf64d;continue;}
   case 0xf64d: add(14);lab=0xf658;continue;
   case 0xf658: add(8);r[0x7bf]=(r[0x7bf]-1)&255;if(r[0x7bf]){add(7);return k;}add(17);r[0xf3]=0;return k;
   case 0xf680: add(6);r[0x7bf]=0x40;lab=0xf685;continue;
   case 0xf685:{const y=r[0x7bf]>>1;add(16+px(0xffc9,y));if(R(0xffc9+y)===0)throw new Error('native-nmi-timing: zero flame envelope');add(1);lab=0xf64d;continue;}
   default: throw new Error('noise '+lab.toString(16));
  }
 };

 const music=()=>{let k=0;const add=(v:number)=>{k+=v;};
  const data=(y:number)=>{const p=r[0xf5]|(r[0xf6]<<8);add(px(p,y));return R(p+y);};
  const lengthData=(a:number)=>{add(23);const y=((a&7)+r[0xf0]+r[0x7c4])&255;add(px(0xff66,y));return R(0xff66+y);};
  // AlternateLengthHandler: ror then three rol bring bits 7,6 and 0 of the byte into the length index
  const altLength=(a:number)=>{add(12);let x=a,cc=a&1;for(let i=0;i<3;i++){const nc=(x>>7)&1;x=((x<<1)|cc)&255;cc=nc;}return lengthData(x);};
  const controlRegs=()=>{add(8);if(r[0x7b1]&8){add(15);return 4;}add(8);if(r[0xf4]&0x7d){add(15);return 8;}add(13);return 0x28;};
  const envelope=(y:number)=>{add(8);if(r[0x7b1]&8){add(10+px(0xff96,y));return;}add(8);if(r[0xf4]&0x7d){add(10+px(0xff9a,y));return;}add(11+px(0xffa2,y));};
  const stopSq1=()=>{add(23);r[0xf1]=0;},stopSq2=()=>{add(18);};
  add(5);let lab:number,A=0,Y=0,note=0;
  if(r[0xfc]){add(1);lab=0xf6a4;A=r[0xfc];}
  else{add(5);if(r[0xfb]){add(1);lab=0xf6c8;A=r[0xfb];}
   else{add(9);if((r[0x7b1]|r[0xf4])===0){add(6);return k;}add(4);lab=0xf73a;}}
  for(;;)switch(lab){
   case 0xf6a4: add(8);r[0x7b1]=A;if(A===1){add(6);stopSq1();add(6);stopSq2();}else add(1);
    add(20);r[0x7c5]=r[0xf4];r[0x7c4]=0;r[0xf4]=0;Y=0;
    if(A===0x40){add(9);r[0x7c4]=8;}else add(1);
    lab=0xf6f1;continue;
   case 0xf6c8: add(4);if(A===4){add(6);stopSq1();}else add(1);add(2);Y=0x10;lab=0xf6d1;continue;
   case 0xf6d1: add(4);r[0x7c7]=Y;lab=0xf6d4;continue;
   case 0xf6d4: add(13);r[0x7b1]=0;r[0xf4]=A;
    if(A===1){add(14);r[0x7c7]=(r[0x7c7]+1)&255;Y=r[0x7c7];if(Y!==0x32){add(1);lab=0xf6f5;continue;}add(5);Y=0x11;lab=0xf6d1;continue;}
    add(6);Y=8;r[0xf7]=8;lab=0xf6f1;continue;
   case 0xf6f1:{let a=A;for(;;){add(6);Y++;const bit=a&1;a>>=1;if(bit)break;add(1);}lab=0xf6f5;continue;}
   case 0xf6f5:{add(92+px(0xf90c,Y));const h=R(0xf90c+Y);for(let b=0xf90d;b<=0xf912;b++)add(px(b,h));
    r[0xf0]=R(0xf90d+h);r[0xf5]=R(0xf90e+h);r[0xf6]=R(0xf90f+h);r[0xf9]=R(0xf910+h);r[0xf8]=R(0xf911+h);r[0x7b0]=r[0x7c1]=R(0xf912+h);
    r[0x7b4]=r[0x7b6]=r[0x7b9]=r[0x7ba]=1;r[0xf7]=0;r[0x7ca]=0;lab=0xf73a;continue;}
   // square 2
   case 0xf73a:{add(8);r[0x7b4]=(r[0x7b4]-1)&255;if(r[0x7b4]){add(1);lab=0xf79e;continue;}
    add(15);const y=r[0xf7];r[0xf7]=(y+1)&255;const a=data(y);
    if(a===0){add(1);lab=0xf74b;continue;}
    add(2);if(a<0x80){add(1);note=a;lab=0xf786;continue;}
    add(9);r[0x7b3]=lengthData(a);add(17);const y2=r[0xf7];r[0xf7]=(y2+1)&255;note=data(y2);lab=0xf786;continue;}
   case 0xf74b:{add(8);let a=r[0x7b1]; // end of the square-2 data: restore, reload or silence
    if(a===0x40){add(6);a=r[0x7c5];if(a){add(4);A=a;lab=0xf6d4;continue;}}else add(1);
    add(4);if(a&4){add(4);A=a&4;lab=0xf6a4;continue;}
    add(7);a=r[0xf4]&0x5f;if(a){add(4);A=a;lab=0xf6d4;continue;}
    add(29);r[0xf4]=0;r[0x7b1]=0;return k;}
   case 0xf786: add(5);
    if(r[0xf2])add(1);else{add(6);let f:Freq={z:false};add(sub(()=>{f=setFreqSqu2(note);}));add(2);let v=0;if(f.z)add(1);else{add(6);v=controlRegs();}add(10);r[0x7b5]=v;add(sub(dumpSq2));}
    add(8);r[0x7b4]=r[0x7b3];lab=0xf79e;continue;
   case 0xf79e:{add(5);if(r[0xf2]){add(1);lab=0xf7bc;continue;}add(8);if(r[0x7b1]&0x91){add(1);lab=0xf7bc;continue;}
    add(6);const y=r[0x7b5];if(y===0)add(1);else{add(6);r[0x7b5]=(y-1)&255;}add(6);envelope(y);add(10);lab=0xf7bc;continue;}
   // square 1
   case 0xf7bc:{add(5);if(r[0xf8]===0){add(2);lab=0xf81a;continue;}
    add(8);r[0x7b6]=(r[0x7b6]-1)&255;if(r[0x7b6]){add(1);lab=0xf7f7;continue;}
    let a:number;for(;;){add(15);const y=r[0xf8];r[0xf8]=(y+1)&255;a=data(y);if(a){add(1);break;}add(19);r[0x7ca]=0x94;}
    add(6);r[0x7b6]=altLength(a);add(9);if(r[0xf1]){add(2);lab=0xf81a;continue;}
    add(10);let f:Freq={z:false};add(sub(()=>{f=setFreqSqu1(a&0x3e);}));add(2);let v=0;if(f.z)add(1);else{add(6);v=controlRegs();}
    add(10);r[0x7b7]=v;add(sub(dumpSq1));lab=0xf7f7;continue;}
   case 0xf7f7:{add(5);if(r[0xf1]){add(2);lab=0xf81a;continue;}add(8);
    if(r[0x7b1]&0x91)add(1);else{add(6);const y=r[0x7b7];if(y===0)add(1);else{add(6);r[0x7b7]=(y-1)&255;}add(6);envelope(y);add(4);}
    add(6);add(r[0x7ca]?1:2);add(4);lab=0xf81a;continue;}
   // triangle
   case 0xf81a:{add(11);r[0x7b9]=(r[0x7b9]-1)&255;if(r[0x7b9]){add(1);lab=0xf86d;continue;}
    add(15);let y=r[0xf9];r[0xf9]=(y+1)&255;let a=data(y);
    if(a===0){add(5);lab=0xf86d;continue;}
    add(2);
    if(a>=0x80){add(6);r[0x7b8]=lengthData(a);add(25);y=r[0xf9];r[0xf9]=(y+1)&255;a=data(y);if(a===0){add(5);lab=0xf86d;continue;}}
    else add(1);
    add(6);add(sub(()=>{setFreqTri(a);}));add(16);const x=r[0x7b8];r[0x7b9]=x;
    if(!(r[0x7b1]&0x6e)){add(7);if(!(r[0xf4]&0x0a)){add(1);lab=0xf86d;continue;}}else add(1);
    add(6);if(x>=0x12)add(3);else{add(8);add(r[0x7b1]&8?5:6);}
    add(4);lab=0xf86d;continue;}
   // noise beat
   case 0xf86d:{add(7);if(!(r[0xf4]&0xf3)){add(7);return k;}
    add(8);r[0x7ba]=(r[0x7ba]-1)&255;if(r[0x7ba]){add(7);return k;}
    let a:number;for(;;){add(17);const y=r[0x7b0];r[0x7b0]=(y+1)&255;a=data(y);if(a){add(1);break;}add(11);r[0x7b0]=r[0x7c1];}
    add(6);r[0x7ba]=altLength(a);add(10);const v=a&0x3e;
    if(v===0)add(3);else{add(4);if(v===0x30)add(10);else{add(4);if(v===0x20)add(10);else{add(4);add(v&0x10?9:3);}}}
    add(18);return k;}
   default: throw new Error('music '+lab.toString(16));
  }
 };

 c+=6;
 if(r[0x770]===0){c+=10;return c;} // title: sound off
 c+=19;
 let pause=false;
 if(r[0x7c6]){c+=1;pause=true;}else{c+=7;if(r[0xfa]===1)pause=true;else c+=2;}
 if(pause){ // pause tune on square 1, the other handlers skipped
  c+=6;let tail=false;
  if(r[0x7b2]===0){c+=5;
   if(r[0xfa]===0){c+=2;tail=true;}
   else{c+=40;r[0x7b2]=r[0xfa];r[0x7c6]=r[0xfa];r[0xf1]=r[0xf2]=r[0xf3]=0;r[0x7bb]=0x2a;c+=32;setFreq(0x44);}
  }else{c+=10;const v=r[0x7bb];let a=-1;
   if(v===0x24){c+=3;a=0x64;}else{c+=4;if(v===0x1e){c+=6;a=0x44;}else{c+=4;if(v===0x18){c+=2;a=0x64;}else c+=1;}}
   if(a>=0){c+=32;setFreq(a);}}
  if(!tail){c+=8;r[0x7bb]=(r[0x7bb]-1)&255;
   if(r[0x7bb])c+=1;else{c+=14;if(r[0x7b2]===2){c+=6;r[0x7c6]=0;}else c+=1;c+=9;r[0x7b2]=0;}}
 }else{c+=6+square1()+6+square2()+6+noise()+6+music()+8;r[0xfb]=0;r[0xfc]=0;}
 c+=25;r[0xff]=r[0xfe]=r[0xfd]=r[0xfa]=0;
 const y=r[0x7c0];let dec=false; // DAC counter
 if((r[0xf4]&3)===0){c+=1;dec=true;}else{c+=10;r[0x7c0]=(r[0x7c0]+1)&255;if(y<0x30)c+=1;else dec=true;}
 if(dec){c+=4;if(y===0)c+=1;else{c+=6;r[0x7c0]=(r[0x7c0]-1)&255;}}
 return c+10;
}

export type NativeNmiTiming={en:number;clr:number;hit:number};
const SPRITE0_CLEAR=2270;
/** NMI f from RAM row f-1 and pad f (recording bit order, bit 0 = A): cycles of the PPU-mask write (en), the first Sprite0Clr
 * poll (clr) and the first Sprite0Hit poll (hit); clr and hit are -1 when Sprite0HitDetectFlag ($0722) is clear. */
export function nativeNmiTiming(row:Uint8Array,pad:number):NativeNmiTiming{
 const r=new Uint8Array(row);const M=(a:number)=>a<0x2000?r[a&0x7ff]:R(a);
 let t=7+28+(r[0x774]?1:6)+46;t+=513+(t&1); // up to the OAM DMA
 const ctl=r[0x773];t+=24+px(0x805a,ctl)+px(0x806d,ctl);
 let p=M(0x805a+ctl)|(M(0x806d+ctl)<<8);
 t+=13; // UpdateScreen: address, flags (bit 7 vertical, bit 6 repeat, low 6 bits count), bytes; a zero ends the buffer
 for(;;){t+=px(p,0);if(M(p)===0)break;
  t+=36+px(p,1)+px(p,2);const flags=M((p+2)&0xffff);t+=flags&0x80?1:2;t+=28;let y=2;
  const repeat=(flags&0x40)!==0;if(repeat){t+=4;y++;}else t+=1;
  t+=6;const n=(flags&0x3f)||256;
  for(let i=0;i<n;i++){if(repeat)t+=3;else{t+=4;y++;}t+=13+px(p,y);if(i<n-1)t+=1;}
  t+=51;p=(p+y+1)&0xffff;}
 t+=14+10;let yy=0;if(ctl===6){t+=2;yy=1;}else t+=1;
 t+=24+px(0x8080,yy);const en=t;
 t+=4+nativeSoundEngine(r);
 let saved=0;for(let b=0;b<8;b++)if(pad&(1<<b))saved|=0x80>>b;
 t+=26; // ReadJoypads: a held Select/Start already in JoypadBitMask is masked out
 const port=(x:number,bits:number)=>{t+=2+27*8+7;t+=16+px(0x074a,x);if((bits&0x30&r[0x74a+x])===0){t+=16;r[0x74a+x]=bits;r[0x6fc+x]=bits;}else{t+=17;r[0x6fc+x]=bits&0xcf;}};
 port(0,saved);t+=2;port(1,0);
 t+=14;{const om=r[0x770];let run=false; // PauseRoutine
  if(om===2){t+=1;run=true;}else{t+=4;if(om!==1)t+=7;else{t+=8;if(r[0x772]!==3)t+=7;else run=true;}}
  if(run){t+=6;if(r[0x777]){t+=12;r[0x777]--;}
   else{t+=9;if(!(r[0x6fc]&0x10)){t+=17;r[0x776]&=0x7f;}
    else{t+=8;if(r[0x776]&0x80)t+=7;else{t+=34;r[0x777]=0x2b;r[0xfa]=(r[0x776]+1)&255;r[0x776]=((r[0x776]^1)|0x80)&255;}}}}}
 t+=6; // UpdateTopScore: each player's 6 digits against the top score, copied when not lower
 const topScore=(x:number)=>{t+=4;let carry=1,xi=x,yi=5;for(;;){t+=14+px(0x7dd,xi)+px(0x7d7,yi);carry=r[0x7dd+xi]-r[0x7d7+yi]-(1-carry)>=0?1:0;xi--;yi--;if(yi>=0)t+=1;else break;}
  t+=2;if(!carry){t+=7;return;}
  t+=4;xi++;yi++;for(;;){t+=17+px(0x7dd,xi);r[0x7d7+yi]=r[0x7dd+xi];xi++;yi++;if(yi<6)t+=1;else break;}t+=6;};
 t+=8;topScore(5);t+=2;topScore(0x0b);
 t+=8; // timers: 21 frame timers, all 36 when IntervalTimerControl wraps; each nonzero one costs 6 more
 if(r[0x776]&1)t+=2;
 else{t+=6;let dec=true;if(r[0x747]){t+=8;r[0x747]--;if(r[0x747]){t+=1;dec=false;}}else t+=2;
  if(dec){t+=10;r[0x77f]=(r[0x77f]-1)&255;let x=0x14;if(r[0x77f]&0x80){t+=8;r[0x77f]=0x14;x=0x23;}else t+=1;
   for(;x>=0;x--){t+=6;if(r[0x780+x]){t+=7;r[0x780+x]--;}else t+=1;t+=4;if(x>0)t+=1;}}
  t+=5;}
 t+=26+(((r[0x7a7]^r[0x7a8])&2)===0?1:2)+13*7+6; // random-bit rotation
 t+=6;if(!r[0x722])return {en,clr:-1,hit:-1};
 const clr=t;let poll=clr;while(poll<SPRITE0_CLEAR)poll+=9;t=poll+8+8; // Sprite0Clr waits for the flag to clear
 if(r[0x776]&1)t+=1;
 else{t+=25+15*62+62+6; // MoveSpritesOffscreen: OAM entries 1-63
  t+=17; // SpriteShuffler: offsets >= $28 move by the current amount, wrapping past $FF into $28 and up
  for(let x=0x0e;x>=0;x--){const v=r[0x6e4+x];t+=9+px(0x6e4,x);
   if(v<0x28)t+=1;else{const amt=r[0x6e0];t+=12+px(0x6e1,amt);let s=v+r[0x6e1+amt];if(s<256)t+=1;else{t+=5;s=(s&255)+0x28;}t+=5;r[0x6e4+x]=s&255;}
   t+=4;if(x>0)t+=1;}
  t+=10+(r[0x6e0]+1===3?2:1)+8+37*3+2*2+6;}
 return {en,clr,hit:t};
}
