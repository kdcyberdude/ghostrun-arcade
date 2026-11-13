import argparse,base64,ctypes,gzip,hashlib,json,os,sys
from pathlib import Path
p=argparse.ArgumentParser(description='Controlled native vine RAM capture; original engine, RAM injection only. Requires ghostrun_probe_write/read_ram/frame C API.')
p.add_argument('--scratch',type=Path,required=True);p.add_argument('--lab',type=Path,required=True);p.add_argument('--recordings',type=Path,required=True);p.add_argument('--library',type=Path,required=True)
p.add_argument('--gfx',action='store_true',help='isolate ordered EnemyGfxHandler scratch writes')
p.add_argument('--procedures',action='store_true',help='isolate actual Setup_Vine/InitEnemyObject CPU procedures with controlled registers')
a=p.parse_args();S=a.scratch;LAB=a.lab;REC=a.recordings
os.environ['RL_ROM_DIR']=str(S/'roms');os.environ['RL_BOOT_DIR']=str(LAB/'.cache/rl/boot')
sys.path[:0]=[str(LAB/'rl'),str(LAB/'scripts/recording')]
import numpy as np,torch,rlenv
from record_v2 import load_entrances
torch.set_num_threads(1);rlenv.build_cpu=lambda:a.library
archiveCache=S/'archive-cache';archiveCache.mkdir(parents=True,exist_ok=True)
arc,slots,arc_sha=load_entrances(next((REC/'v2/.entrances').glob('entrances-*.npy')),archiveCache)
name='5-2';lv=17;log=json.loads((REC/'v2'/name/f'smb_v2_{name}.actions.json').read_text())
env=rlenv.RlEnv({'smb':1},device='cpu',seed=log['selection']['seed'],sticky=False,idle_max=0,dropout=False,level_cap=slots)
l=env.lib;P=ctypes.c_void_p;l.ghostrun_read_ram.argtypes=[P,P];l.ghostrun_frame.argtypes=[P,ctypes.c_ubyte]
env.start();sd=env.state_dict();sd['env'][-len(arc):]=arc;env.load_state_dict(sd);w=np.zeros(slots);w[lv]=1;env.set_level_plan(0,1.,w);env.start();env.actions.zero_();warm=bytearray()
for _ in range(300):
 env.step();warm+=bytes(env.pads[0].tolist())
 if int(env.level_now[0])==lv:break
ram=np.empty(2048,np.uint8);l.ghostrun_read_ram(env.h,P(ram.ctypes.data));assert hashlib.sha256(ram).hexdigest()==json.loads((REC/'threejs-2d'/name/'entrance.json').read_text())['initialRamSha256']
l.ghostrun_probe_write.argtypes=[P,ctypes.c_uint,ctypes.c_ubyte]
saved=env.state_dict();initialEntranceSha=hashlib.sha256(ram).hexdigest()
if a.gfx:
 l.ghostrun_vine_procedure.argtypes=[P,ctypes.c_ubyte,ctypes.c_ubyte,ctypes.c_ubyte]
 rows=[]
 # Ordered ordinary handler sequences include native's preserving early return.
 sequences=[[6,13,5,51,53],[13,6,13],[50,13,51],[45,13,6]]
 for sequence in sequences:
  for speed in [255,1]:
   for timer in [0,7]:
    for bowser,master in [(b,m) for b in [0,1,2] for m in [0,1]]:
     env.load_state_dict(saved)
     for index,id in enumerate(sequence):
      slot=index%5
      seed={0x08:slot,0x0f+slot:1,0x16+slot:id,0x1e+slot:0,0xcf+slot:96,0xb6+slot:1,0x58+slot:speed,0x78a+slot:timer,0x36a:bowser,0x70e:index%5,0x6e5+slot:slot*24,0x3ae:100,0x747:master}
      # Bowser ID is only dispatched to EnemyGfxHandler with a front/rear flag.
      if id==45 and bowser==0:continue
      for address,value in seed.items():assert l.ghostrun_probe_write(env.h,address,value)==0
      l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
      result=l.ghostrun_vine_procedure(env.h,slot,0,4);assert result==0,(result,id)
      l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
      rows.append(dict(sequence=sequence,index=index,slot=slot,before=before,after=after))
 for id in [27,31]:
  for high in [0,8,24,255]:
   for master in [0,1]:
    for x in [100,-100]:
     env.load_state_dict(saved);slot=0
     seed={0x08:slot,0x0f:1,0x16:id,0x6e:(x//256)&255,0x87:x&255,0xb6:1,0xcf:96,0xa0:high,0x58:250,0x388:40,0x34:0,0x747:master,0xef:99,0x71a:0,0x71c:0,0x71b:0,0x71d:255}
     for address,value in seed.items():assert l.ghostrun_probe_write(env.h,address,value)==0
     l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
     result=l.ghostrun_vine_procedure(env.h,slot,0,5);assert result==0,(result,id,x)
     l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
     rows.append(dict(handler='firebar',sequence=[id],index=0,slot=slot,before=before,after=after))
 payload=json.dumps(rows,separators=(',',':')).encode()
 print(json.dumps(dict(source='Ordered actual NES EnemyGfxHandler calls and isolated ProcFirebar CPU procedures from a hash-authenticated5-2 entrance; controlled input registers/RAM, noPPU/NMI advance. Repeated calls share authored scratchEF, not reset between handlers. Synthetic sequences, not natural playthroughs.',initialRamSha256=initialEntranceSha,librarySha256=hashlib.sha256(a.library.read_bytes()).hexdigest(),samples=len(rows),sha256=hashlib.sha256(payload).hexdigest(),gzipBase64=base64.b64encode(gzip.compress(payload,mtime=0)).decode()),separators=(',',':')))
 sys.exit()
if a.procedures:
 l.ghostrun_vine_procedure.argtypes=[P,ctypes.c_ubyte,ctypes.c_ubyte,ctypes.c_ubyte]
 rows=[]
 for init in [False,True]:
  for slot in ([5] if not init else [0,2,4]):
   for blockIndex in ([0,1] if not init else [96]):
    for high in [0,1,2]:
     for state in [0,1,6,128,192,255]:
      env.load_state_dict(saved)
      seed={0xf+slot:0,0x16+slot:47,0x1e+slot:state,0xb6+slot:high,0x398:int(init),0x399:0,0x39a:5,0x39d:144,0x76+blockIndex:3,0x8f+blockIndex:160,0xd7+blockIndex:136}
      for address,value in seed.items():assert l.ghostrun_probe_write(env.h,address,value)==0
      l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
      result=l.ghostrun_vine_procedure(env.h,slot,blockIndex,init);assert result==0,(result,slot,blockIndex,init)
      l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
      rows.append(dict(procedure='InitEnemyObject' if init else 'Setup_Vine',slot=slot,blockIndex=blockIndex,before=before,after=after))
 for procedure,name in [(2,'EraseEnemyObject'),(3,'PwrUpJmp')]:
  for high in [0,1,2]:
   for state in [0,1,6,128,192,255]:
    env.load_state_dict(saved)
    for address,value in {0x14:1,0x1b:46,0x23:state,0xbb:high}.items():assert l.ghostrun_probe_write(env.h,address,value)==0
    l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
    result=l.ghostrun_vine_procedure(env.h,5,0,procedure);assert result==0,(result,name)
    l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
    rows.append(dict(procedure=name,slot=5,blockIndex=0,before=before,after=after))
 payload=json.dumps(rows,separators=(',',':')).encode()
 print(json.dumps(dict(source='Actual unmodified NES Setup_Vine, InitEnemyObject, EraseEnemyObject and PwrUpJmp CPU instructions, hash-authenticated5-2 entrance; controlled RAM and register inputs, synthetic JSR/RTS boundary, no NMI or PPU advancement. Secondary InitEnemyObject itself computes Y through JumpEngine. Not a natural playthrough.',initialRamSha256=initialEntranceSha,librarySha256=hashlib.sha256(a.library.read_bytes()).hexdigest(),samples=len(rows),sha256=hashlib.sha256(payload).hexdigest(),gzipBase64=base64.b64encode(gzip.compress(payload,mtime=0)).decode()),separators=(',',':')))
 sys.exit()
cases=[('grow',128,144,0,1,24),('first-limit',128,97,47,1,8),('second-limit',128,50,94,2,8),('left-erase',0,136,8,1,2),('right-erase',248,136,8,1,2),('short-offscreen',0,144,0,1,20)]
out=[]
initial_sha=hashlib.sha256(ram).hexdigest()
for name,x,y,height,count,frames in cases:
 env.load_state_dict(saved)
 for k in range(5):
  l.ghostrun_probe_write(env.h,15+k,0);l.ghostrun_probe_write(env.h,22+k,35)
 for address,value in {0x14:1,0x1b:47,0x23:0,0x73:x//256,0x8c:x%256,0xbb:1,0xd4:y,0x398:count,0x399:height,0x39a:5,0x39b:5,0x39d:144}.items():
  assert l.ghostrun_probe_write(env.h,address,value)==0
 def state():
  l.ghostrun_read_ram(env.h,P(ram.ctypes.data))
  return dict(ram=base64.b64encode(ram).decode(),flag=int(ram[0x14]),id=int(ram[0x1b]),x=int(ram[0x73])*256+int(ram[0x8c]),y=int(ram[0xd4]),vineHeight=int(ram[0x399]),vineCount=int(ram[0x398]),vineStartY=int(ram[0x39d]))
 before=state()
 for f in range(frames):
  assert l.ghostrun_frame(env.h,0)==0
  after=state();out.append(dict(case=name,row=f,frame=int(ram[9]),camera=int(ram[0x71a])*256+int(ram[0x71c]),before=before,after=after));before=after
print(json.dumps(dict(initialRamSha256=initial_sha,librarySha256=hashlib.sha256(a.library.read_bytes()).hexdigest(),source='Controlled native RAM branch from 5-2 retained entrance, neutral pads; injected slot5 VineObject and valid VineFlagOffset/height/coordinates; native engine source remains unmodified.',rows=out),indent=1))
