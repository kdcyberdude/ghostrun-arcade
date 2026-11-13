/** Native lag frames in a recorded RAM stream: during normal play (GameMode 1, task 3 on this and the
 * previous frame) the frame counter $09 did not advance, so the NES skipped its whole frame update,
 * controller read included. Replays skip the remake's update on these inputs as well and count the
 * frames as unchecked; the remake itself never lags. Measured corpus: 6 such frames in 5,178,452. */
export function nativeLagFrames(ram){
 if(ram.length%2048)throw Error('Incomplete RAM frame');
 const out=[];
 for(let f=1;f<ram.length/2048;f++){
  const x=f*2048,p=x-2048;
  if(ram[x+0x770]===1&&ram[x+0x772]===3&&ram[p+0x770]===1&&ram[p+0x772]===3&&ram[x+9]===ram[p+9])out.push(f);
 }
 return out;
}
