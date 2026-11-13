/** Exact source-frame coverage. Independent seeds are not input frames, and overlapping clips count only once. */
export function sourceCoverage(start:number,end:number,spans:{sourceFrameOffset:number;frames:number}[]){
 if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||spans.some(s=>!Number.isInteger(s.sourceFrameOffset)||!Number.isInteger(s.frames)||s.frames<0))throw Error('Invalid equivalence source-frame range');
 const ranges=spans.filter(s=>s.frames>0).map(s=>({start:s.sourceFrameOffset,end:s.sourceFrameOffset+s.frames})).sort((a,b)=>a.start-b.start),merged:{start:number;end:number}[]=[];
 for(const range of ranges){if(range.start<start||range.end>end)throw Error('Equivalence clip exceeds its authenticated source epoch');const last=merged.at(-1);if(last&&range.start<=last.end)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 const gaps:{start:number;end:number}[]=[];let cursor=start;for(const range of merged){if(range.start>cursor)gaps.push({start:cursor,end:range.start});cursor=range.end;}if(cursor<end)gaps.push({start:cursor,end});
 return {comparedFrames:merged.reduce((n,r)=>n+r.end-r.start,0),comparedRanges:merged,uncomparedRanges:gaps};
}
