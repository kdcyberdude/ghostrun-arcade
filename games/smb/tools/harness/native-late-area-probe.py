# Requires the ghostrun-lab native-ram-trace environment and native-special-slot-observer.cpp.
# All writes are controlled RAM setup/parser requests; ROM and metatile buffers remain unchanged.
import ctypes,hashlib,json,os,sys
from pathlib import Path
import argparse
ap=argparse.ArgumentParser(description='Controlled native8-3 late ROM parser probe; emits raw metatile and block-buffer columns.')
for key in ['lab','roms','boot','recordings','observer']:ap.add_argument('--'+key,required=True,type=Path)
args=ap.parse_args();LAB=args.lab;REC=args.recordings
os.environ['RL_ROM_DIR']=str(args.roms);os.environ['RL_BOOT_DIR']=str(args.boot)
sys.path[:0]=[str(LAB/'rl'),str(LAB/'scripts/recording')]
import numpy as np,torch,rlenv
from record_v2 import load_entrances,archive_unit
torch.set_num_threads(1);rlenv.build_cpu=lambda:args.observer
arc,slots,arc_sha=load_entrances(REC/'v2/.entrances/entrances-33e0db8e7ead9e34.npy',Path('/tmp'))
name='8-3';lv=30;log=json.loads((REC/'v2'/name/f'smb_v2_{name}.actions.json').read_text())
env=rlenv.RlEnv({'smb':1},device='cpu',seed=log['selection']['seed'],sticky=False,idle_max=0,dropout=False,level_cap=slots)
l=env.lib;P=ctypes.c_void_p;l.ghostrun_read_ram.argtypes=[P,P];l.ghostrun_frame.argtypes=[P,ctypes.c_ubyte];l.ghostrun_timing.argtypes=[P,P]
env.start();sd=env.state_dict();sd['env'][-len(arc):]=arc;env.load_state_dict(sd);w=np.zeros(slots);w[lv]=1;env.set_level_plan(0,1.,w);env.start();env.actions.zero_();warm=bytearray()
for _ in range(300):
 env.step();warm+=bytes(env.pads[0].tolist())
 if int(env.level_now[0])==lv:break
ram=np.empty(2048,np.uint8);timing=np.empty(10,np.uint64);l.ghostrun_read_ram(env.h,P(ram.ctypes.data));assert hashlib.sha256(ram).hexdigest()==json.loads((REC/'threejs-2d'/name/'entrance.json').read_text())['initialRamSha256']
l.ghostrun_probe_write.argtypes=[P,ctypes.c_uint,ctypes.c_ubyte]
# Native InitializeArea with HalfwayPage8 backloads the same ROM stream from page8.
for address,value in {0x75b:8,0x772:0,0x0e:0}.items():
 assert l.ghostrun_probe_write(env.h,address,value)==0
columns={};pictures={};previous=None;frames=0
for f in range(1500):
 assert l.ghostrun_frame(env.h,0)==0
 l.ghostrun_read_ram(env.h,P(ram.ctypes.data));column=int(ram[0x725])*16+int(ram[0x726])
 if previous is not None and previous<=column and column-previous<=24:
  for c in range(previous,column):
   if c not in columns:columns[c]=[int(ram[0x500+((c>>4)&1)*0xd0+row*16+(c&15)]) for row in range(13)]
 if int(ram[0x71f]) in (3,7):pictures[column]=[int(v) for v in ram[0x6a1:0x6ae]]
 previous=column
 if ram[0x772]==3:
  # Request a normal parser column pair; do not alter metatile buffers or ROM data.
  if ram[0x71f]==0:l.ghostrun_probe_write(env.h,0x73d,32)
  # Keep the observer's stationary player from ending the isolated renderer probe.
  for address,value in {0xb5:1,0xce:176,0x9f:0,0x433:0,0x1d:0,0x79f:250}.items():l.ghostrun_probe_write(env.h,address,value)
 if column>=240:frames=f+1;break
assert len(columns)>=72,(len(columns),column)
print(json.dumps(dict(source='Controlled native ROM geometry probe:8-3 retained entrance; InitializeArea with HalfwayPage8; neutral pads; request normal32px area-parser pairs when idle; player vertical bytes and star timer kept stationary. No metatile or ROM writes.',frames=frames,pictures=[dict(column=c,tiles=values) for c,values in sorted(pictures.items())],columns=[dict(column=c,tiles=values) for c,values in sorted(columns.items())],final=dict(pointer=hex(int(ram[0xe7])+int(ram[0xe8])*256),flagX=int(ram[0x73])*256+int(ram[0x8c]),flagY=int(ram[0xd4]),column=column)),indent=1))
