/** Exact supplied opaque Mario templates, including partially offscreen cells. */
import fs from 'node:fs';
import {readPng} from './physics-reference-measure.mjs';
const playerTables = JSON.parse(fs.readFileSync('assets/graphics/tables.json')).player_cells;
export const playerTemplates = [];
for (const direction of ['right','left']) {
  const sheet = readPng(`assets/graphics/player-mario-${direction}.png`);
  for (let cell = 0; cell < 26; cell++) {
    const sx = cell % 13 * 16, sy = Math.floor(cell / 13) * 32, pixels = [];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
      const p = ((sy+y)*sheet.width+sx+x)*4;
      if (sheet.data[p+3]) pixels.push([x,y,...sheet.data.slice(p,p+3)]);
    }
    if (pixels.length) playerTemplates.push({cell,direction,pixels,annotation:playerTables[cell].source_annotation.trim()});
  }
}
// Permit transparent parts of the 32px cell above the screen; require every opaque pixel to be visible.
export function findCompleteOpaquePlayer(im) {
  let best = null;
  const candidates = [];
  for (const t of playerTemplates) {
    const anchor = t.pixels.find(p => p[2] > 180 && p[3] < 150 && p[4] < 80) ?? t.pixels[0];
    for (let ay = 0; ay < im.height; ay++) for (let ax = 0; ax < im.width; ax++) {
      const a = (ay*im.width+ax)*4;
      if (im.data[a] !== anchor[2] || im.data[a+1] !== anchor[3] || im.data[a+2] !== anchor[4]) continue;
      const x = ax-anchor[0], y = ay-anchor[1];
      if (t.pixels.some(([dx,dy]) => x+dx < 0 || x+dx >= im.width || y+dy < 0 || y+dy >= im.height)) continue;
      let matched = 0;
      for (const [dx,dy,r,g,b] of t.pixels) {
        const p = ((y+dy)*im.width+x+dx)*4;
        if (im.data[p] === r && im.data[p+1] === g && im.data[p+2] === b) matched++;
      }
      const confidence = matched/t.pixels.length;
      if (confidence <= .98) continue;
      const candidate = {originX:x,originY:y,feetY:y+31,visibleLeft:x+Math.min(...t.pixels.map(p=>p[0])),visibleRight:x+Math.max(...t.pixels.map(p=>p[0])),visibleTop:y+Math.min(...t.pixels.map(p=>p[1])),visibleBottom:y+Math.max(...t.pixels.map(p=>p[1])),cell:t.cell,direction:t.direction,annotation:t.annotation,confidence,matchedPixels:matched,opaquePixels:t.pixels.length,fullyVisibleOpaquePose:true};
      candidates.push(candidate);
      if (best && (confidence < best.confidence || confidence === best.confidence && matched <= best.matchedPixels)) continue;
      best = candidate;
    }
  }
  if (!best) return null;
  const strongest = candidates.filter(c => c.confidence === best.confidence && c.matchedPixels === best.matchedPixels);
  return {...best,poseCandidatesAbove98Percent:candidates.length,exactOpaquePoseCandidates:candidates.filter(c=>c.confidence===1).length,strongestPoseAmbiguityCount:strongest.length,strongestPoseCandidates:strongest.map(c=>({originX:c.originX,originY:c.originY,feetY:c.feetY,cell:c.cell,direction:c.direction}))};
}
