/** Per-frame picture difference between the remake's 2D canvas and the native NES, replayed from the same level entrance.
 * Native pictures come from ghostrun-lab scripts/recording/native_ram_trace.py --pixels N (branch native-ram-trace): beside each
 * level's ram.bin, pixels.bin (240x224 NES palette indices, NES x 8..248 y 8..232, every Nth frame), emph.bin and pixels.json.
 *   npx tsx tools/harness/native-pixels.ts --traces DIR --entrances media/recordings/threejs-2d --out DIR [--levels 1-1,4-3]
 *     [--frames 0-600] [--png all|none|120,300] [--lag L] [--json out.json] [--port 53949]
 * Frames compared: every stored native frame before the level's first state divergence (native-divergence.ts) and before the
 * native run leaves the level. The remake replays the same pad bytes in headless Chromium (swiftshader, as record-game-audio.mjs),
 * its 256x240 canvas is cropped to the same window and compared, per pixel, as NES palette colours (fceux_palette.RGB[index], rgb below).
 * The native picture of frame f shows the state of RAM row f-1 (scroll and OAM are latched at that NMI), so by default (--lag 1)
 * it is compared with the remake drawn after frame f-1; --lag 0 pairs equal frame numbers. Per level it prints compared frames and mean
 * % differing pixels: all, HUD rows 0..23, playfield, playfield inside native sprite boxes ($0200 OAM), and playfield after shifting
 * the remake by the scroll offset (native ScreenLeft $71A/$71C minus remake camera, overlap columns). In busy frames the native
 * status-bar split is late and the rows under the HUD (seen up to ~70 rows) still use row f-2's scroll. --png writes OUT/<L>/<frame>.png:
 * native | remake | diff (differing pixels red over a dimmed native). Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {decodeEntrance} from './native-entrance.mjs';
import {observedLevels} from '../../src/levels.js';
import {nativeAreaLoads} from './native-area-identity.js';
import {divergence,nativeRow} from './native-divergence.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const W=240,H=224,X0=8,Y0=8,HUD=24,nesButtons=['a','b','select','start','up','down','left','right'];
/* FCEUX default NTSC palette, base 64 entries (ghostrun-lab rl/fceux_palette.py); SMB never sets emphasis, checked per frame. */
const rgb=[0x757575,0x24188e,0x0000aa,0x45009e,0x8e0075,0xaa0010,0xa60000,0x7d0800,0x412c00,0x004500,0x005100,0x003c14,0x183c5d,0x000000,0x000000,0x000000,
 0xbebebe,0x0071ef,0x2038ef,0x8200f3,0xbe00be,0xe70059,0xdb2800,0xcb4d0c,0x8a7100,0x009600,0x00aa00,0x009238,0x00828a,0x000000,0x000000,0x000000,
 0xffffff,0x3cbeff,0x5d96ff,0xcf8aff,0xf779ff,0xff75b6,0xff7561,0xff9a38,0xf3be3c,0x82d310,0x4ddf49,0x59fb9a,0x00ebdb,0x797979,0x000000,0x000000,
 0xffffff,0xaae7ff,0xc7d7ff,0xd7cbff,0xffc7ff,0xffc7db,0xffbeb2,0xffdbaa,0xffe7a2,0xe3ffa2,0xaaf3be,0xb2ffcf,0x9efff3,0xc7c7c7,0x000000,0x000000];
/* The remake's textures use the common 2C02 palette (checked against every assets/graphics/{background,sprite}-tiles-<indices>.png):
 * each remake colour is mapped to its index and compared through rgb, so equal palette indices match. Other colours never match
 * and are tallied per level as offPalette. */
const remakeRgb=[0x7c7c7c,0x0000fc,0x0000bc,0x4428bc,0x940084,0xa80020,0xa81000,0x881400,0x503000,0x007800,0x006800,0x005800,0x004058,0x000000,0x000000,0x000000,
 0xbcbcbc,0x0078f8,0x0058f8,0x6844fc,0xd800cc,0xe40058,0xf83800,0xe45c10,0xac7c00,0x00b800,0x00a800,0x00a844,0x008888,0x000000,0x000000,0x000000,
 0xf8f8f8,0x3cbcfc,0x6888fc,0x9878f8,0xf878f8,0xf85898,0xf87858,0xfca044,0xf8b800,0xb8f818,0x58d854,0x58f898,0x00e8d8,0x787878,0x000000,0x000000,
 0xfcfcfc,0xa4e4fc,0xb8b8f8,0xd8b8f8,0xf8b8f8,0xf8a4c0,0xf0d0b0,0xfce0a8,0xf8d878,0xd8f878,0xb8f8b8,0xb8f8d8,0x00fcfc,0xf8d8f8,0x000000,0x000000];
const toNative=new Map<number,number>();remakeRgb.forEach((c,i)=>{if(!toNative.has(c))toNative.set(c,rgb[i]);});

const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},out:{type:'string'},levels:{type:'string'},frames:{type:'string'},png:{type:'string',default:'none'},lag:{type:'string',default:'1'},'all-frames':{type:'boolean'},json:{type:'string'},port:{type:'string',default:'53949'}}});
if(!a.traces||!a.entrances||!a.out)throw Error('--traces, --entrances and --out are required');
const levels=a.levels?.split(',')??Array.from({length:32},(_,n)=>`${Math.floor(n/4)+1}-${n%4+1}`);
const [lo,hi]=a.frames?a.frames.split('-').map(Number):[0,Infinity];
const lag=Number(a.lag);
const pngFrames=a.png==='all'?'all':new Set(a.png==='none'?[]:a.png!.split(',').map(Number));

function writePng(file:string,native:Uint8Array,remake:Uint8Array,differs:Uint8Array){
 const g=4,png=new PNG({width:W*3+g*2,height:H});png.data.fill(255);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*3,same=!differs[y*W+x];
  for(const [p,c] of [[0,[native[i],native[i+1],native[i+2]]],[1,[remake[i],remake[i+1],remake[i+2]]],[2,same?[native[i]>>2,native[i+1]>>2,native[i+2]>>2]:[255,0,0]]] as [number,number[]][]){
   const o=(y*png.width+p*(W+g)+x)*4;png.data[o]=c[0];png.data[o+1]=c[1];png.data[o+2]=c[2];png.data[o+3]=255;}}
 fs.writeFileSync(file,PNG.sync.write(png));
}

const server=await createServer({root,server:{host:'127.0.0.1',port:Number(a.port),strictPort:true,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report:any[]=[];
try{
 for(const level of levels){
  const dir=path.join(a.traces,level),receiptPath=path.join(a.entrances,level,'entrance.json'),meta=JSON.parse(fs.readFileSync(path.join(dir,'pixels.json'),'utf8'));
  const initial=new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram'))),ramRow=(f:number)=>f<0?initial:new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048);
  const pixelFd=fs.openSync(path.join(dir,'pixels.bin'),'r'),emphFd=fs.openSync(path.join(dir,'emph.bin'),'r'),pixels=Buffer.alloc(W*H),emph=Buffer.alloc(H),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin'));
  let end=pads.length;for(let f=0;f<pads.length;f++){const n=nativeRow(new Uint8Array(ram.buffer,ram.byteOffset+f*2048,2048));if(!a['all-frames']&&(n.mode!==1||n.level!==level)){end=f;break;}}
  const first=divergence(dir,receiptPath,level).first;if(first!==null&&!a['all-frames'])end=Math.min(end,first);
  const frames:number[]=[];for(let k=0;k<meta.frames;k++){const f=k*meta.step;if(f<end&&f>=lo&&f<=hi&&(a['all-frames']||f>=lag))frames.push(f);}
  const entrance=decodeEntrance(initial,JSON.parse(fs.readFileSync(receiptPath,'utf8'))),model=observedLevels().find(l=>l.id===level)!,areaLoads=nativeAreaLoads(model,ram,entrance.area??model.main).loads;
  const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${a.port}/`);await page.waitForFunction(()=>(window as any).mario?.ready,null,{timeout:90000});
  await page.evaluate(async entrance=>{
   const w=window as any,canvas=document.querySelector<HTMLCanvasElement>('#game')!;canvas.toDataURL=()=>'data:image/png;base64,';
   w.mario.reset({playing:true});const {initializeEntrance}=await import('/tools/harness/native-entrance.mjs');
   initializeEntrance(w.marioDebug.simulation,entrance);w.mario.step([],0);w.marioDebug.simulation.inputs=[];
   const crop=document.createElement('canvas');crop.width=240;crop.height=224;w.pixelCrop=crop.getContext('2d',{willReadFrequently:true});
  },entrance);
  fs.mkdirSync(path.join(a.out,level),{recursive:true});
  const rows:{frame:number,all:number,hud:number,field:number,sprite:number,shift:number,aligned:number,nativeScroll:number,camera:number,area:string,alignmentKnown:boolean,overlapPixels:number}[]=[],offPalette=new Map<number,number>();let next=0;
  for(const f of frames){
   const k=f/meta.step;if(fs.readSync(pixelFd,pixels,0,W*H,k*W*H)!==W*H||fs.readSync(emphFd,emph,0,H,k*H)!==H)throw Error('Incomplete native pixel frame');
   const b64:string=await page.evaluate(({pads,names,x0,y0})=>{
    const w=window as any;for(const p of pads)w.mario.step(names.filter((_:string,b:number)=>p&(1<<b)),1);
    w.pixelCrop.drawImage(document.querySelector('#game'),-x0,-y0);const d=w.pixelCrop.getImageData(0,0,240,224).data;
    const sim=w.marioDebug.simulation;w.pixelCamera=[sim.camera,sim.area.id];let s='';for(let n=0;n<d.length;n+=32768)s+=String.fromCharCode(...d.subarray(n,n+32768));return btoa(s);
   },{pads:[...pads.subarray(next,f-lag+1)],names:nesButtons,x0:X0,y0:Y0});next=f-lag+1;
   const rgba=Buffer.from(b64,'base64'),native=new Uint8Array(W*H*3),remake=new Uint8Array(W*H*3),seen=new Int32Array(W*H),differs=new Uint8Array(W*H);
   for(let y=0;y<H;y++){if(emph[y])throw Error(`${level} frame ${f}: emphasis bits set, extend rgb`);
    for(let x=0;x<W;x++){const i=y*W+x,c=rgb[pixels[i]],r=rgba[i*4]<<16|rgba[i*4+1]<<8|rgba[i*4+2],m=toNative.get(r);
     native.set([c>>16,c>>8&255,c&255],i*3);remake.set(rgba.subarray(i*4,i*4+3),i*3);seen[i]=m??-1;
     if(m===undefined)offPalette.set(r,(offPalette.get(r)??0)+1);if(m!==c)differs[i]=1;}}
   /* The native picture of frame f shows row f-1 state: scroll and the $0200 OAM buffer copied at that NMI (8x8 sprites, y+1). */
   const shown=ramRow(f-1),[camera,area]=await page.evaluate(()=>(window as any).pixelCamera),visit=areaLoads.filter(v=>v.frame<=f-1).at(-1),origin=f===0?(entrance.areaOffset??0):visit?.offset,alignmentKnown=origin!==undefined,nativeScroll=shown[0x71a]*256+shown[0x71c]+(origin??0),shift=nativeScroll-camera;
   const sprite=new Uint8Array(W*H);for(let s=0;s<64;s++){const sy=shown[0x200+s*4]+1,sx=shown[0x203+s*4];if(sy>=240)continue;
    for(let y=sy;y<sy+8;y++)for(let x=sx;x<sx+8;x++)if(y>=Y0&&y<Y0+H&&x>=X0&&x<X0+W)sprite[(y-Y0)*W+x-X0]=1;}
   let all=0,hud=0,inSprite=0,aligned=0,overlapPixels=0;
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;
    if(differs[i]){all++;if(y<HUD)hud++;else if(sprite[i])inSprite++;}
    const sx=x+shift;if(y>=HUD&&sx>=0&&sx<W){overlapPixels++;if(seen[y*W+sx]!==rgb[pixels[i]])aligned++;}}
   rows.push({frame:f,all,hud,field:all-hud,sprite:inSprite,shift,aligned,nativeScroll,camera,area,alignmentKnown,overlapPixels});
   if(pngFrames==='all'||pngFrames.has(f))writePng(path.join(a.out,level,`${String(f).padStart(5,'0')}.png`),native,remake,differs);
  }
  await page.close();fs.closeSync(pixelFd);fs.closeSync(emphFd);
  const mean=(k:'all'|'hud'|'field'|'sprite'|'aligned',n:number)=>rows.length?rows.reduce((s,r)=>s+r[k],0)/rows.length/n*100:0;
  const r={level,first,end,status:rows.some(r=>r.aligned)?'diverged':!rows.length||!a['all-frames']||Boolean(a.frames)||meta.step!==1||rows.length!==pads.length||rows.some(r=>!r.alignmentKnown||r.overlapPixels===0)?'incomplete':'pass',source:JSON.parse(fs.readFileSync(receiptPath,'utf8')),coverage:{completeInputSequence:Boolean(a['all-frames'])&&!a.frames&&meta.step===1&&rows.length===pads.length&&rows.every(r=>r.alignmentKnown&&r.overlapPixels>0),inputFrames:pads.length,availableNativeFrames:meta.frames,allFrames:Boolean(a['all-frames']),comparedFrames:rows.length,alignedFrames:rows.filter(r=>r.alignmentKnown&&r.overlapPixels>0).length,unresolvedAlignmentFrames:rows.filter(r=>!r.alignmentKnown).length,noOverlapFrames:rows.filter(r=>r.overlapPixels===0).length},compared:rows.length,pctAll:mean('all',W*H),pctHud:mean('hud',W*HUD),pctField:mean('field',W*(H-HUD)),pctSprite:mean('sprite',W*(H-HUD)),pctAligned:mean('aligned',W*(H-HUD)),offPalette:Object.fromEntries([...offPalette].map(([c,n])=>[c.toString(16).padStart(6,'0'),n])),errors,rows};report.push(r);
  const alignedPixels=rows.reduce((sum,row)=>sum+row.aligned,0),nonzeroFrames=rows.filter(row=>row.aligned!==0).length;
  console.log(`${level.padEnd(4)} ${r.status} end ${String(end).padStart(5)} frames ${String(rows.length).padStart(3)}  diff ${r.pctAll.toFixed(2).padStart(6)}%  hud ${r.pctHud.toFixed(2).padStart(6)}%  field ${r.pctField.toFixed(2).padStart(6)}% (in native sprites ${r.pctSprite.toFixed(2).padStart(6)}%, scroll-aligned ${r.pctAligned.toFixed(2).padStart(6)}%)  aligned pixels ${alignedPixels}; nonzero frames ${nonzeroFrames}/${rows.length}${offPalette.size?`  off-palette px ${[...offPalette.values()].reduce((s,n)=>s+n,0)}`:''}${errors.length?'  page errors: '+errors.join('; '):''}`);
 }
}finally{await browser.close();await server.close();}
if(a.json)fs.writeFileSync(a.json,JSON.stringify(report)+'\n');
