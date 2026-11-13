export function compareFrame(native,remake,width,height,p,workspace){
 if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0)throw Error('Invalid frame size');
 const pixels=width*height;if(native.length!==pixels*4||remake.length!==pixels*4)throw Error('Frame length');
 const mismatch=workspace?.mismatch??new Uint8Array(pixels);mismatch.fill(0);let different=0,exactDifferent=0;
 for(let i=0;i<pixels;i++){
  const k=i*4;if(native[k+3]!==255||remake[k+3]!==255)throw Error('Composite alpha first');
  const d=Math.max(Math.abs(native[k]-remake[k]),Math.abs(native[k+1]-remake[k+1]),Math.abs(native[k+2]-remake[k+2]));
  if(d>0)exactDifferent++;if(d>p.colorTolerance){mismatch[i]=1;different++;}
 }
 if(different===0||different===pixels){const largestBlob=different===0?0:pixels;return {status:largestBlob<=p.maximumBlobPixels?'pass':'fail',pixels,matchingPixels:pixels-different,exactMatchingPixels:pixels-exactDifferent,matchingFraction:(pixels-different)/pixels,largestBlob,largeBlobs:largestBlob>p.maximumBlobPixels?1:0};}
 const queue=workspace?.queue??new Int32Array(pixels);let largestBlob=0,largeBlobs=0;
 for(let start=0;start<pixels;start++)if(mismatch[start]){
  let head=0,tail=1;queue[0]=start;mismatch[start]=0;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;
    const j=ny*width+nx;if(mismatch[j]){mismatch[j]=0;queue[tail++]=j;}
   }
  }
  largestBlob=Math.max(largestBlob,tail);if(tail>p.maximumBlobPixels)largeBlobs++;
 }
 const fraction=(pixels-different)/pixels;
 return {status:largestBlob<=p.maximumBlobPixels?'pass':'fail',pixels,matchingPixels:pixels-different,exactMatchingPixels:pixels-exactDifferent,matchingFraction:fraction,largestBlob,largeBlobs};
}
