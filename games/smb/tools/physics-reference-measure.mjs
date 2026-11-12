/** Screenshot-only reference experiments. Never reads ROM or executable contents. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

const root = path.resolve(new URL('..', import.meta.url).pathname);
export function readPng(filename) {
  const b=fs.readFileSync(filename); let at=8,w,h,type,parts=[];
  while(at<b.length){const n=b.readUInt32BE(at),t=b.toString('ascii',at+4,at+8),d=b.subarray(at+8,at+8+n);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);if(d[8]!==8)throw Error('Only 8-bit PNG supported');type=d[9];}if(t==='IDAT')parts.push(d);at+=n+12;}
  const channels=type===6?4:type===2?3:0;if(!channels)throw Error(`Unsupported PNG color type ${type}`);
  const raw=zlib.inflateSync(Buffer.concat(parts)),out=new Uint8Array(w*h*4),stride=w*channels,rows=new Uint8Array(h*stride);
  const paeth=(a,b,c)=>{let p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?rows[i-channels]:0,b=y?rows[i-stride]:0,c=y&&x>=channels?rows[i-stride-channels]:0;rows[i]=(raw[y*(stride+1)+1+x]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}for(let x=0;x<w;x++){const p=(y*w+x)*4,q=y*stride+x*channels;out[p]=rows[q];out[p+1]=rows[q+1];out[p+2]=rows[q+2];out[p+3]=channels===4?rows[q+3]:255;}}
  return {width:w,height:h,data:out};
}

const metadata=JSON.parse(fs.readFileSync(path.join(root,'assets/graphics/tables.json'),'utf8'));
const templates=[];
for(const direction of ['right','left']){const s=readPng(path.join(root,`assets/graphics/player-mario-${direction}.png`));for(let cell=0;cell<26;cell++){const px=(cell%13)*16,py=Math.floor(cell/13)*32,pixels=[];let minX=16,minY=32,maxX=0,maxY=0;for(let y=0;y<32;y++)for(let x=0;x<16;x++){const i=((py+y)*s.width+px+x)*4;if(s.data[i+3]){pixels.push([x,y,s.data[i],s.data[i+1],s.data[i+2]]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}if(pixels.length)templates.push({cell,direction,pixels,bounds:{minX,minY,maxX,maxY},annotation:metadata.player_cells[cell]?.source_annotation?.trim()});}}

export function findPlayer(filename) {
  const im=readPng(filename);let best=null;
  for(const t of templates){const anchor=t.pixels.find(p=>p[2]>180&&p[3]<150&&p[4]<80)??t.pixels[0];for(let ay=48;ay<224;ay++)for(let ax=0;ax<256;ax++){const i=(ay*256+ax)*4;if(im.data[i]!==anchor[2]||im.data[i+1]!==anchor[3]||im.data[i+2]!==anchor[4])continue;const x=ax-anchor[0],y=ay-anchor[1];if(x<0||x+16>256||y<32||y+32>240)continue;let matched=0;for(const p of t.pixels){const q=((y+p[1])*256+x+p[0])*4;if(im.data[q]===p[2]&&im.data[q+1]===p[3]&&im.data[q+2]===p[4])matched++;}const confidence=matched/t.pixels.length;if(confidence>0.98&&(!best||confidence>best.confidence||confidence===best.confidence&&t.pixels.length>best.matchedPixels))best={originX:x,originY:y,visibleLeft:x+t.bounds.minX,visibleTop:y+t.bounds.minY,visibleRight:x+t.bounds.maxX,visibleBottom:y+t.bounds.maxY,cell:t.cell,direction:t.direction,annotation:t.annotation,confidence,matchedPixels:matched};}}
  return best;
}

/** Integer background registration, excluding HUD, player and animated ground enemies. */
export function cameraDelta(previousFilename,currentFilename,previousPlayer,currentPlayer){
  const a=readPng(previousFilename),b=readPng(currentFilename);let best={delta:0,score:Infinity,comparedPixels:0};
  const sky=[a.data[0],a.data[1],a.data[2]];
  for(let delta=0;delta<=32;delta++){let mismatch=0,count=0;for(let y=48;y<192;y++)for(let x=0;x<256-delta;x++){
    if(previousPlayer&&Math.abs(x+delta-(previousPlayer.originX+8))<12&&y>=previousPlayer.originY&&y<previousPlayer.originY+32||currentPlayer&&Math.abs(x-(currentPlayer.originX+8))<12&&y>=currentPlayer.originY&&y<currentPlayer.originY+32)continue;
    const p=(y*256+x+delta)*4,q=(y*256+x)*4;if(a.data[p]===sky[0]&&a.data[p+1]===sky[1]&&a.data[p+2]===sky[2])continue;
    count++;if(a.data[p]!==b.data[q]||a.data[p+1]!==b.data[q+1]||a.data[p+2]!==b.data[q+2])mismatch++;
  }const score=count?mismatch/count:Infinity;if(score<best.score)best={delta,score,comparedPixels:count};}
  return best;
}

async function main(){
  const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),outDir=path.join(root,'evidence/local',`physics-${stamp}`);fs.mkdirSync(outDir,{recursive:true});
  const child=spawn(path.join(root,'run-model.sh'),['/home/kd/Desktop/proj/llm_gameplay/roms/mario.nes'],{cwd:root,stdio:['pipe','pipe','inherit']});
  const lines=createInterface({input:child.stdout}),queue=[];let receiver;lines.on('line',line=>{if(receiver){const r=receiver;receiver=null;r(line);}else queue.push(line);});
  const request=async request=>{const timestamp=new Date().toISOString();child.stdin.write(JSON.stringify(request)+'\n');const line=queue.length?queue.shift():await new Promise(r=>receiver=r);const response=JSON.parse(line);if(!response.ok)throw Error(line);return{timestamp,request,response};};
  const log=[];let frame=0,cameraX=0;
  const record=async (experiment,request)=>{const entry=await request_(request);if(request.op==='reset'){frame=0;cameraX=0;}else frame+=entry.response.frames_advanced??0;entry.experiment=experiment;entry.cumulativeNativeFrames=frame;if(entry.response.image?.path){const target=path.join(outDir,`${experiment}-${String(entry.response.tick).padStart(3,'0')}.png`);fs.copyFileSync(entry.response.image.path,target);entry.localImage=path.relative(root,target);entry.player=findPlayer(target);if(request.op!=='reset'){const previous=log.at(-1);entry.backgroundRegistration=cameraDelta(path.join(root,previous.localImage),target,previous.player,entry.player);cameraX+=entry.backgroundRegistration.delta;}entry.cameraX=cameraX;if(entry.player)entry.player.worldOriginX=entry.player.originX+cameraX;}log.push(entry);fs.appendFileSync(path.join(outDir,'trace.jsonl'),JSON.stringify(entry)+'\n');console.log(JSON.stringify({experiment,tick:entry.response.tick,frames:frame,cameraX,player:entry.player}));return entry;};
  const request_=request;
  const experiment=async(name,segments)=>{await record(name,{op:'reset'});for(const[buttons,ticks]of segments)for(let i=0;i<ticks;i++)await record(name,{op:'step',buttons,ticks:1});};
  try{
    await experiment('walk',[[['right'],10],[[],5]]);
    await experiment('run',[[['right','b'],7],[[],8]]);
    await experiment('reverse',[[['right','b'],5],[['left','b'],9],[[],4]]);
    await experiment('short-jump',[[['a'],1],[[],12]]);
    await experiment('held-jump',[[['a'],12],[[],3]]);
    await experiment('run-jump',[[['right','b'],4],[['right','b','a'],9],[[],3]]);
    await experiment('camera',[[['right','b'],7],[['right','b','a'],12]]);
    await experiment('stable-walk',[[[],4],[['right'],12],[[],8]]);
    await experiment('stable-run',[[[],4],[['right','b'],12],[[],6]]);
    await experiment('stable-short-jump',[[[],4],[['a'],1],[[],10]]);
    await experiment('stable-held-jump',[[[],4],[['a'],10],[[],2]]);
    await experiment('stable-reverse',[[[],4],[['right','b'],6],[['left','b'],8]]);
    fs.mkdirSync(path.join(root,'data'),{recursive:true});fs.writeFileSync(path.join(root,'data/physics-measurements.json'),JSON.stringify({schemaVersion:1,measuredAt:new Date().toISOString(),method:'Exact opaque player sprite template matching against supplied Mario left/right sheets on controller-protocol PNGs. Origin preserves 32px sheet cell. Coordinates in screen pixels, y down. Frames are response frames_advanced sums, not assumed ticks*8.',source:'Independent fresh reset per experiment via authorized run-model.sh input protocol only.',evidenceDirectory:path.relative(root,outDir),experiments:log},null,2)+'\n');
  }finally{child.stdin.end();child.kill();}
}
if(process.argv[1]===new URL(import.meta.url).pathname)await main();
