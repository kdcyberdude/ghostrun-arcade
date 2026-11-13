# Requires ghostrun-lab native-ram-trace and native-special-slot-observer.cpp.
import ctypes,hashlib,json,os,sys
from pathlib import Path
import argparse
ap=argparse.ArgumentParser(description='Controlled native Hammer Bro contact branch fixtures.')
for key in ['lab','roms','boot','recordings','observer']:ap.add_argument('--'+key,required=True,type=Path)
args=ap.parse_args();LAB=args.lab;REC=args.recordings
os.environ['RL_ROM_DIR']=str(args.roms);os.environ['RL_BOOT_DIR']=str(args.boot)
sys.path[:0]=[str(LAB/'rl'),str(LAB/'scripts/recording')]
import numpy as np,torch,rlenv
from record_v2 import load_entrances
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
cases=[]
for box in [11]:
 for size in [0,1]:
  for dx in [-8,-7,-6,0,6,7,8]:
   for dy in [-30,-29,-28,-27,-14,-13,-12,-11,-10,0]:
    for speed in [-1,0,1]:cases.append((box,size,dx,dy,speed,0,0,0,1))
for latch,star,injury,counter in [(1,0,0,1),(1,250,0,1),(0,0,8,1),(0,0,0,2)]:cases.append((11,0,0,-20,0,latch,star,injury,counter))
cases.append((11,0,0,-20,0,0,250,0,1))
cases.append((11,0,0,-12,0,0,0,8,1))
cases=[(*case,0) for case in cases]
cases.append((11,0,0,-12,0,0,0,8,1,2))
out=[];defeats=[]
for box,size,dx,dy,speed,latch,star,injury,counter,stomp in cases:
 env.load_state_dict(saved)
 writes={0x6cb:0,0x78f:128,0x6cd:0,0x71f:0,0x398:0,9:counter,0x6d:0,0x86:160+dx,0xce:96+dy,0xb5:1,0x1d:1,0x9f:speed&255,0x433:0,0x416:0,0x57:0,0x705:0,0x400:0,0x45:0,0x754:1 if size==0 else 0,0x756:size,0x714:0,0x79e:injury,0x79f:star,0x747:0,0x791:stomp}
 for k in range(5):writes.update({15+k:1,22+k:35,0x1e+k:0})
 slot=2
 writes.update({22+slot:5,0x3c+slot:100,0x3a2+slot:100,0x78a+slot:32,0x796+slot:128,0x6e+slot:0,0x87+slot:160,0xb6+slot:1,0xcf+slot:96,0x49a+slot:box,0x491+slot:latch,0xa0+slot:0,0x58+slot:0,0x434+slot:0,0x417+slot:73,0x401+slot:0})
 for address,value in writes.items():assert l.ghostrun_probe_write(env.h,address,value)==0
 assert l.ghostrun_frame(env.h,0)==0;l.ghostrun_read_ram(env.h,P(ram.ctypes.data))
 state=int(ram[0x1e+slot]);action='star' if state&32 and star else 'stomp' if state&32 else 'hurt' if ram[14]!=8 else 'none'
 out.append(dict(box=box,size=size,dx=dx,dy=dy,initialSpeed=speed,initialLatch=latch,initialStar=star,initialInjury=injury,stompTimer=int(ram[0x791]),frame=int(ram[9]),star=int(ram[0x79f]),injury=int(ram[0x79e]),playerY=int(ram[0xce]),enemyY=96,playerBox=[int(v) for v in ram[0x4ac:0x4b0]],enemyBox=[int(v) for v in ram[0x4b0+slot*4:0x4b4+slot*4]],after=dict(action=action,latch=int(ram[0x491+slot])&1,playerSpeed=int(ram[0x9f]),state=state,enemyY=int(ram[0xcf+slot]),enemySpeed=int(ram[0xa0+slot]),x=int(ram[0x6e+slot])*256+int(ram[0x87+slot]),xFraction=int(ram[0x401+slot]),xSpeed=int(ram[0x58+slot]),force=int(ram[0x434+slot]),fraction=int(ram[0x417+slot]),scoreKind=int(ram[0x110+slot]))))
 if size==0 and dx==0 and not latch and ((action=='star' and dy==-20) or (action=='stomp' and dy==-14 and speed==1)):
  trajectory=[]
  for f in range(110):
   if f:assert l.ghostrun_frame(env.h,0)==0;l.ghostrun_read_ram(env.h,P(ram.ctypes.data))
   trajectory.append(dict(frame=f,flag=int(ram[15+slot]),x=int(ram[0x6e+slot])*256+int(ram[0x87+slot]),xFraction=int(ram[0x401+slot]),xSpeed=int(ram[0x58+slot]),y=(int(ram[0xb6+slot])-1)*256+int(ram[0xcf+slot]),speed=int(ram[0xa0+slot]),force=int(ram[0x434+slot]),fraction=int(ram[0x417+slot])))
   if not ram[15+slot]:break
  defeats.append(dict(action=action,rows=trajectory))
print(json.dumps(dict(romSha256=hashlib.sha256(next(args.roms.glob('Super Mario Bros*')).read_bytes()).hexdigest(),source='Controlled native Hammer Bro contact branches from retained5-2 entrance; ID5 slot2 at160,96 with source InitHammerBro bbox11, jump/throw timers100 and frame timer32, native player size/position/velocity, varied latch/star/injury/frame parity. Native EnemyToBGCollisionDet runs before collision. Source star/stomp trajectories include horizontal bytes. All other ordinary actors NoRunCode35. No ROM writes.',rows=out,defeats=defeats),separators=(',',':')))
