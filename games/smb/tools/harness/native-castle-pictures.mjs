/** Extract native victory sprite ownership, retainer birth/OAM and dense PPU timing evidence.
 * node tools/harness/native-castle-pictures.mjs --traces DIR --pixels DIR --rom game.nes --output tests/fixtures/native-castle-pictures.json */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},pixels:{type:'string'},rom:{type:'string'},output:{type:'string'}}});if(!a.traces||!a.pixels||!a.rom||!a.output)throw Error('--traces, --pixels, --rom and --output required');
const rom=fs.readFileSync(a.rom),chr=rom.subarray(16+rom[4]*16384),runs=[];
const cells=JSON.parse(fs.readFileSync(new URL('../../assets/graphics/tables.json',import.meta.url),'utf8')).enemy_cells;
const bowserTiles=new Set([35,36,37,38].flatMap(i=>cells[i].tiles).filter(tile=>tile!==252));
const npcTiles=new Set([...cells[26].tiles,...cells[27].tiles].filter(tile=>tile!==252));
const sprites=r=>Array.from({length:63},(_,i)=>{const p=0x204+i*4;return {y:r[p],tile:r[p+1],attributes:r[p+2],x:r[p+3]};}).filter(s=>s.y<240);
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const ram=fs.readFileSync(file),count=ram.length/2048,row=f=>ram.subarray(f*2048,(f+1)*2048),first=Array.from({length:count},(_,f)=>f).find(f=>row(f)[0x770]===2);if(first===undefined)continue;
 const meta=JSON.parse(fs.readFileSync(path.join(a.pixels,level,'pixels.json'),'utf8'));if(meta.step!==1||meta.width!==240||meta.height!==224)throw Error('Dense cropped native pixels required');
 const fd=fs.openSync(path.join(a.pixels,level,'pixels.bin'),'r'),picture=Buffer.alloc(240*224),timing=[0,1,2].map(lag=>({lag,frames:0,checked:0,different:0})),rows=[];
 try{for(let f=first;f<count&&row(f)[0x770]===2;f++){
  const r=row(f),oam=sprites(r),npc=oam.filter(s=>npcTiles.has(s.tile)),camera=r[0x71a]*256+r[0x71c];
  const slot=r[0x368],boss=r[15+slot]===1&&r[22+slot]===45?{x:r[0x6e+slot]*256+r[0x87+slot],y:r[0xcf+slot],direction:r[0x46+slot],state:r[0x1e+slot],controls:r[0x363],sprites:oam.filter(s=>bowserTiles.has(s.tile))}:undefined;
  rows.push({frame:f,boss,rotation:r[0x6d4],bridge:r[0x369],task:r[0x772],camera,parser:[r[0x71f],r[0x73d]],slot0:[r[15],r[22],r[0x6e]*256+r[0x87],r[0xcf]],npc,spriteCount:oam.length});
  if(!npc.length||f+2>=meta.frames||camera===row(f-1)[0x71a]*256+row(f-1)[0x71c])continue;
  for(const t of timing){fs.readSync(fd,picture,0,picture.length,(f+t.lag)*picture.length);let checked=0;
   for(const s of npc)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const px=s.x+x,py=s.y+1+y;if(px<8||px>=248||py<8||py>=232)continue;
    const cy=s.attributes&0x80?7-y:y,bit=s.attributes&0x40?x:7-x,v=((chr[s.tile*16+cy]>>bit)&1)|(((chr[s.tile*16+cy+8]>>bit)&1)<<1);if(!v)continue;
    if((s.attributes&3)!==2)throw Error('Unexpected native retainer palette');const color=[15,0x16,0x30,0x27][v];checked++;if(picture[(py-8)*240+px-8]!==color)t.different++;
   }
   t.checked+=checked;if(checked)t.frames++;
  }
 }}finally{fs.closeSync(fd);}
 runs.push({level,first,ram:row(first).toString('base64'),rows,timing});
}
const totals=timing=>runs.reduce((n,r)=>n+r.timing[timing].different,0);if(!runs.length||totals(1)!==0||totals(0)===0||totals(2)===0)throw Error('Native PPU/OAM lag is not uniquely one row: '+JSON.stringify(runs.map(r=>({level:r.level,timing:r.timing}))));
fs.writeFileSync(a.output,JSON.stringify({source:'Native mode2: VictoryMode/MoveSpritesOffscreen/EnemiesAndLoopsCore/InitRetainerObj. Frames are zero-based RAM capture indices. PPU frame f+1 matches RAM OAM row f; nontransparent retainer CHR pixels checked while scrolling.',romSha256:createHash('sha256').update(rom).digest('hex'),runs})+'\n');console.log(JSON.stringify(runs.map(r=>({level:r.level,rows:r.rows.length,birth:r.rows.find(r=>r.slot0[0]===1&&r.slot0[1]===53)?.frame,timing:r.timing}))));
