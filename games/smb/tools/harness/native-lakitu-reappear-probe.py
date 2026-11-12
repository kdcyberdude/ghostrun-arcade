# Requires ghostrun-lab native-ram-trace and native-special-slot-observer.cpp.
import ctypes,hashlib,json,os,sys
from pathlib import Path
import argparse
ap=argparse.ArgumentParser(description='Controlled native Lakitu reappearance branch fixtures.')
for key in ['lab','roms','boot','recordings','observer']:ap.add_argument('--'+key,required=True,type=Path)
args=ap.parse_args();LAB=args.lab;REC=args.recordings
os.environ['RL_ROM_DIR']=str(args.roms);os.environ['RL_BOOT_DIR']=str(args.boot)
sys.path[:0]=[str(LAB/'rl'),str(LAB/'scripts/recording')]
import numpy as np,torch,rlenv
from record_v2 import load_entrances,archive_unit
torch.set_num_threads(1);rlenv.build_cpu=lambda:args.observer
arc,slots,arc_sha=load_entrances(REC/'v2/.entrances/entrances-33e0db8e7ead9e34.npy',Path('/tmp'))
name='5-2';lv=17;log=json.loads((REC/'v2'/name/f'smb_v2_{name}.actions.json').read_text())
env=rlenv.RlEnv({'smb':1},device='cpu',seed=log['selection']['seed'],sticky=False,idle_max=0,dropout=False,level_cap=slots)
l=env.lib;P=ctypes.c_void_p;l.ghostrun_read_ram.argtypes=[P,P];l.ghostrun_frame.argtypes=[P,ctypes.c_ubyte];l.ghostrun_timing.argtypes=[P,P]
env.start();sd=env.state_dict();sd['env'][-len(arc):]=arc;env.load_state_dict(sd);w=np.zeros(slots);w[lv]=1;env.set_level_plan(0,1.,w);env.start();env.actions.zero_();warm=bytearray()
for _ in range(300):
 env.step();warm+=bytes(env.pads[0].tolist())
 if int(env.level_now[0])==lv:break
ram=np.empty(2048,np.uint8);timing=np.empty(10,np.uint64);l.ghostrun_read_ram(env.h,P(ram.ctypes.data));assert hashlib.sha256(ram).hexdigest()==json.loads((REC/'threejs-2d'/name/'entrance.json').read_text())['initialRamSha256']
l.ghostrun_probe_write.argtypes=[P,ctypes.c_uint,ctypes.c_ubyte]
saved=env.state_dict()
cases=[('first-attempt',0,1,[0],False),('sixth-attempt',5,1,[0,4],False),('seventh-two-free',6,1,[0,4],False),('seventh-one-free',6,1,[3],False),('seventh-all-free',6,1,[0,1,2,3,4],False),('busy',6,1,[],False),('timer-running',6,20,[0,4],False),('existing-lakitu-id',6,1,[0,4],True)]
out=[]
for name,count,timer,free,existing in cases:
 env.load_state_dict(saved)
 writes={0x6cb:18,0x78f:timer,0x6d1:count,0x6cd:0,0x71f:0,0x398:0}
 for k in range(5):
  writes.update({15+k:0 if k in free else 1,22+k:0 if k in free else 35,0x1e+k:0,0x6e+k:0,0x87+k:160,0xb6+k:1,0xcf+k:48})
 if existing:writes.update({0x18:17,0x20:32})
 for address,value in writes.items():assert l.ghostrun_probe_write(env.h,address,value)==0
 def state():
  l.ghostrun_read_ram(env.h,P(ram.ctypes.data))
  return dict(timer=int(ram[0x78f]),reappear=int(ram[0x6d1]),buffer=int(ram[0x6cb]),ids=[int(v) for v in ram[0x16:0x1b]],flags=[int(v) for v in ram[15:20]],objects=[dict(slot=k,x=int(ram[0x6e+k])*256+int(ram[0x87+k]),fraction=int(ram[0x401+k]),y=int(ram[0xcf+k]),speed=int(ram[0x58+k]),direction=int(ram[0xa0+k]),bbox=int(ram[0x49a+k])) for k in range(5)])
 before=state();assert l.ghostrun_frame(env.h,0)==0;after=state()
 out.append(dict(case=name,frame=int(ram[9]),camera=int(ram[0x71a])*256+int(ram[0x71c]),mario=int(ram[0x6d])*256+int(ram[0x86]),marioSpeed=int(ram[0x57]),scroll=int(ram[0x775]),before=before,after=after))
print(json.dumps(dict(source='Controlled native RAM branches from retained5-2 entrance: buffer18, varied frenzy/reappearance counters, ordinary slots filled with NoRunCode35 except listed free flags; no ROM writes; one neutral frame.',rows=out),indent=1))
