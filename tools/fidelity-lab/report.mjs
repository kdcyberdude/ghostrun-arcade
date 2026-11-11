import fs from 'node:fs/promises';
import path from 'node:path';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
import {pixelMetrics,timingMetrics} from './core.mjs';
import {hash} from './browser.mjs';

export async function compareImages(referencePath,remakePath,pairPath,regions,tolerances){
 const [reference,remake]=await Promise.all([referencePath,remakePath].map(async p=>PNG.sync.read(await fs.readFile(p))));
 for(const image of [reference,remake]){assert.equal(image.width,256);assert.equal(image.height,240);}
 const pair=new PNG({width:768,height:240});
 for(let y=0;y<240;y++)for(let x=0;x<256;x++){
  const input=(y*256+x)*4,offset=(y*768+x)*4;
  reference.data.copy(pair.data,offset,input,input+4);remake.data.copy(pair.data,offset+256*4,input,input+4);
  for(let c=0;c<3;c++)pair.data[offset+512*4+c]=Math.abs(reference.data[input+c]-remake.data[input+c]);
  pair.data[offset+512*4+3]=255;
 }
 await fs.writeFile(pairPath,PNG.sync.write(pair));
 return regions.map(region=>pixelMetrics(reference,remake,region,tolerances));
}

export async function capturePair(output,record,remake,group,index,frame,plan){
 const stem=group+'-'+String(index).padStart(5,'0'),remakePath=stem+'-remake.png',pairPath=stem+'-pair.png';
 await fs.writeFile(path.join(output,remakePath),remake.bytes);
 const regions=await compareImages(path.join(output,record.reference),path.join(output,remakePath),path.join(output,pairPath),plan.regions,plan.tolerances);
 return {case:group,index,frame,controllerIndex:remake.controllerIndex,reference:record.reference,completed:record.completed,completedFrameAgeCycles:record.completedFrameAgeCycles,referencePngSha256:record.referencePngSha256,completedPngSha256:record.completedPngSha256,referenceReceipt:record.source,remake:remakePath,remakePngSha256:hash(remake.bytes),pair:pairPath,timing:timingMetrics(record.source,remake,frame),regions,restoredFrom:record.source.restored_from};
}

export async function writeReport(output,report){
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 const data=JSON.stringify(report).replaceAll('<','\\u003c');
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reference fidelity experiment</title>
<style>body{font:16px system-ui;margin:24px;background:#15191e;color:#e7edf4}button,select,input{font:inherit;margin:6px;padding:6px}img{image-rendering:pixelated;width:100%;display:block}.panes{display:flex;gap:24px;max-width:1584px}.pane{flex:1;min-width:0}.pane strong{display:block;text-align:center;margin:8px}.screen{overflow:hidden;border:2px solid #b0b7be}.difference img{width:300%;max-width:none;transform:translateX(-66.666667%)}@media(max-width:700px){.panes{flex-direction:column}.pane{width:100%}}pre{white-space:pre-wrap}a{color:#8ac7ff}.good{color:#8ee29a}.bad{color:#ffaaa0}input[type=range]{width:70%}</style>
<h1>Reference fidelity experiment</h1><p>Actual controller replay. Reference / Three.js / absolute RGB difference. No image alignment or substitution.</p>
<p id="summary"></p><p id="scope"></p><select id="case"></select><button id="previous">Previous</button><button id="next">Next</button><button id="first">First failed checkpoint</button><br><input type="range" id="frame" min="0" value="0"><span id="position"></span>
<div class="panes"><div class="pane"><strong>Reference live framebuffer</strong><div class="screen"><img id="referenceImage" alt="Reference game screen"></div></div><div class="pane"><strong>Three.js production renderer</strong><div class="screen"><img id="remakeImage" alt="Recreation game screen"></div></div><div class="pane"><strong>Absolute RGB difference</strong><div class="screen difference"><img id="pair" alt="Absolute RGB difference"></div></div></div><p><a id="live">Original reference PNG</a> · <a id="remake">Recreation PNG</a> · <a id="completed">Separately latched completed reference PNG</a></p><pre id="metrics"></pre>
<script>const report=${data};const groups=[...new Set(report.samples.map(s=>s.case))];let rows=[];
const el=id=>document.getElementById(id);const select=el('case'),slider=el('frame');
for(const name of groups){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}
el('summary').textContent='Operational checks: '+(report.operationalPass?'PASS':'FAIL')+'; comparison (isolated single-frame visual failures tolerated): '+(report.comparisonPassed?'PASS':'FAIL')+'; strict comparison: '+(report.strictComparisonPassed?'PASS':'FAIL')+'; tolerated: '+(report.toleratedSingleFrames?.length??0)+'; '+report.samples.length+' checkpoints';
el('summary').className=report.operationalPass&&report.comparisonPassed?'good':'bad';el('scope').textContent=report.scope+' Tolerances: '+JSON.stringify(report.plan.tolerances);
function show(){const i=Number(slider.value),s=rows[i];if(!s)return;el('referenceImage').src=s.reference;el('remakeImage').src=s.remake;el('pair').src=s.pair;el('position').textContent=(i+1)+' / '+rows.length+'; native slice '+s.frame;
for(const [id,key] of [['live','reference'],['remake','remake'],['completed','completed']]){el(id).href=s[key];el(id).hidden=!s[key];}
el('metrics').textContent=JSON.stringify({timing:s.timing,regions:s.regions,toleratedSingleFrame:report.toleratedSingleFrames?.some(t=>t.case===s.case&&t.index===s.index)??false,referenceRestoredFrom:s.restoredFrom},null,2);}
function group(){rows=report.samples.filter(s=>s.case===select.value);slider.max=Math.max(0,rows.length-1);slider.value=0;show();}
select.onchange=group;slider.oninput=show;el('previous').onclick=()=>{slider.value=Math.max(0,Number(slider.value)-1);show();};el('next').onclick=()=>{slider.value=Math.min(Number(slider.max),Number(slider.value)+1);show();};
el('first').onclick=()=>{const s=report.firstFailedCheckpoint;if(!s)return;select.value=s.case;group();slider.value=rows.findIndex(r=>r.case===s.case&&r.index===s.index);show();};group();</script></html>`;
 await fs.writeFile(path.join(output,'report.html'),html);
}
