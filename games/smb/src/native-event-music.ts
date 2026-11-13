import data from '../data/native-end-level-music.json';

/** The square-2 stream owns EndOfMusicData/EventMusicBuffer, independently of
 * audible SFX and the other three channels. These are native RAM byte values. */
export type NativeEndLevelMusic={eventMusicBuffer:number;counter:number;length:number;offset:number};
export const emptyNativeEndLevelMusic=():NativeEndLevelMusic=>({eventMusicBuffer:0,counter:0,length:0,offset:0});
export function seedNativeEndLevelMusic(r:Uint8Array):NativeEndLevelMusic{
 return {eventMusicBuffer:r[0x7b1],counter:r[0x7b4],length:r[0x7b3],offset:r[0xf7]};
}
/** Call once at SoundEngine's NMI turn, before gameplay queues new music.
 * Title/pause skip MusicHandler. A queue restarts the header in this same turn.
 * This helper owns event $20 only; other event lifetimes remain unimplemented. */
export function tickNativeEndLevelMusic(s:NativeEndLevelMusic,input:{eventQueue?:number;areaQueue?:number;operMode?:number;pauseMode?:number;pauseQueue?:number}={}){
 if(input.operMode===0||input.pauseMode||input.pauseQueue===1)return;
 if(input.eventQueue){
  s.eventMusicBuffer=input.eventQueue;
  if(input.eventQueue!==32)return;
  s.offset=0;s.counter=1;
 }else if(input.areaQueue){s.eventMusicBuffer=0;return;}
 if(s.eventMusicBuffer!==32)return;
 s.counter=(s.counter-1)&255;if(s.counter)return;
 let note=data.notes[s.offset++];s.offset&=255;
 if(note===0){s.eventMusicBuffer=0;return;}
 if(note&128){s.length=data.lengths[note&7];note=data.notes[s.offset++];s.offset&=255;}
 s.counter=s.length;
}
