/** Render actual AudioEngine commands without letting its onended callbacks lag behind the offline clock. */
export async function renderAudioCommands(AudioEngine,commands,frames,fps,tracks){
 const sampleRate=48000,channels=2,length=Math.round(frames/fps*sampleRate),quantum=128/sampleRate;
 const context=new OfflineAudioContext(channels,length,sampleRate),resume=OfflineAudioContext.prototype.resume.bind(context),original=window.AudioContext;
 Object.defineProperty(context,'resume',{value:()=>Promise.resolve()});window.AudioContext=function(){return context;};
 let engine;try{engine=new AudioEngine();await engine.unlock();}finally{window.AudioContext=original;}
 await Promise.all(Object.keys(tracks).map(id=>engine.buffer(id)));
 const starts=[],voice=engine.voice;engine.voice=function(id,buffer,offset){starts.push({id,time:context.currentTime,duration:buffer.duration,offset});return voice.call(this,id,buffer,offset);};
 const grouped=new Map();for(const command of commands){if(command.frame>=frames)continue;const list=grouped.get(command.frame)??[];list.push(command);grouped.set(command.frame,list);}
 const groups=[...grouped].sort((a,b)=>a[0]-b[0]),timings=[],callbackBoundaries=[];let index=0;
 async function apply([frame,list]){for(const command of list){engine[command.name](...command.args);timings.push({...command,targetSeconds:frame/fps,actualSeconds:context.currentTime});}await Promise.resolve();await Promise.resolve();}
 if(groups[0]?.[0]===0)await apply(groups[index++]);
 function next(){
  const commandTime=index<groups.length?groups[index][0]/fps:Infinity;
  const active=engine.interruption?.voice;
  const end=active?active.started+active.source.buffer.duration-active.offset:Infinity;
  // Suspend after the block containing the ending. Its real onended task can then resume music at this boundary.
  const endBoundary=Math.ceil((end-1e-10)/quantum)*quantum;
  const time=Math.min(commandTime,endBoundary);
  if(time>=length/sampleRate)return undefined;
  if(time<context.currentTime+1e-8)throw Error('Audio callback did not finish at its scheduled boundary');
  return {time,command:commandTime<=endBoundary,active,end};
 }
 let item=next(),pending=item?context.suspend(item.time):undefined;
 const rendered=context.startRendering();
 while(item){
  await pending;
  // Offline rendering runs on another thread. Yield tasks, not just promises, so onended is delivered before proceeding.
  await new Promise(resolve=>setTimeout(resolve,0));
  if(!item.command)callbackBoundaries.push({expectedEnd:item.end,boundary:context.currentTime,callbackDelivered:engine.interruption?.voice!==item.active});
  if(!item.command&&engine.interruption?.voice===item.active)throw Error('Interruption callback was not delivered before offline rendering resumed');
  if(item.command)await apply(groups[index++]);
  item=next();pending=item?context.suspend(item.time):undefined;await resume();
 }
 const buffer=await rendered,pcm=new Float32Array(buffer.length*channels);let peak=0,energy=0;
 for(let i=0;i<buffer.length;i++)for(let channel=0;channel<channels;channel++){const value=buffer.getChannelData(channel)[i];pcm[i*channels+channel]=value;peak=Math.max(peak,Math.abs(value));energy+=value*value;}
 return {pcm,sampleRate,channels,samples:buffer.length,peak,rms:Math.sqrt(energy/pcm.length),timings,starts,callbackBoundaries,errors:engine.errors};
}
