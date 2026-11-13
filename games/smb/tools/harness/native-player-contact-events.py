import argparse,base64,ctypes,gzip,hashlib,json,os,sys
from pathlib import Path
p=argparse.ArgumentParser(description='Controlled native PlayerEnemyCollision CPU procedures; immutable ROM, injected RAM/register input, synthetic call boundary.')
p.add_argument('--scratch',type=Path,required=True);p.add_argument('--lab',type=Path,required=True);p.add_argument('--recordings',type=Path,required=True);p.add_argument('--library',type=Path,required=True)
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
l=env.lib;P=ctypes.c_void_p;l.ghostrun_read_ram.argtypes=[P,P]
env.start();sd=env.state_dict();sd['env'][-len(arc):]=arc;env.load_state_dict(sd);w=np.zeros(slots);w[lv]=1;env.set_level_plan(0,1.,w);env.start();env.actions.zero_();warm=bytearray()
for _ in range(300):
 env.step();warm+=bytes(env.pads[0].tolist())
 if int(env.level_now[0])==lv:break
ram=np.empty(2048,np.uint8);l.ghostrun_read_ram(env.h,P(ram.ctypes.data));assert hashlib.sha256(ram).hexdigest()==json.loads((REC/'threejs-2d'/name/'entrance.json').read_text())['initialRamSha256']
l.ghostrun_probe_write.argtypes=[P,ctypes.c_uint,ctypes.c_ubyte]
saved=env.state_dict();initialEntranceSha=hashlib.sha256(ram).hexdigest()
l.ghostrun_player_enemy_collision.argtypes=[P,ctypes.c_ubyte]
rows=[];slot=2
boxes=[[102,105,114,117],[102,113,114,125],[110,100,122,112],[111,100,123,112]]
for state in [0,1,32]:
 for bits in [0,1,128,129]:
  for frame in [100,101]:
   for engine in [7,8]:
    for offscreen,star in [(o,s)for o in [0,1]for s in [0,1]]:
     for box in boxes:
      env.load_state_dict(saved)
      seed={0x08:slot,9:frame,14:engine,0x16+slot:0,0x1e+slot:state,0x491+slot:bits,0x3d8+slot:offscreen,0xb5:1,0xce:80,0x9f:2,0x79e:8,0x79f:star,0x74e:1,0x754:1,0x756:0,0x87+slot:100,0xcf+slot:96}
      seed.update({0x4ac+k:v for k,v in enumerate([100,100,110,112])});seed.update({0x4ac+(slot+1)*4+k:v for k,v in enumerate(box)})
      for address,value in seed.items():assert l.ghostrun_probe_write(env.h,address,value)==0
      l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
      result=l.ghostrun_player_enemy_collision(env.h,slot);assert result==0,(result,state,bits,frame)
      l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
      rows.append(dict(slot=slot,before=before,after=after))
# Native contact at the inclusive top/bottom edge, including the old dy=-1 hole.
for id in [0,14]:
 for speed in [-2,0]:
  for enemyY,areaType in [(y,a)for y in [79,96]for a in [0,1]]:
   env.load_state_dict(saved)
   seed={0x08:slot,9:100,14:8,0x16+slot:id,0x1e+slot:1,0x491+slot:0,0x3d8+slot:0,0xb5:1,0xce:80,0x9f:speed&255,0x79e:0,0x79f:0,0x791:0,0x74e:areaType,0x754:1,0x756:0,0x87+slot:100,0xcf+slot:enemyY}
   seed.update({0x4ac+k:v for k,v in enumerate([100,100,110,112])});seed.update({0x4ac+(slot+1)*4+k:v for k,v in enumerate([102,enemyY+9,114,enemyY+21])})
   for address,value in seed.items():assert l.ghostrun_probe_write(env.h,address,value)==0
   l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
   result=l.ghostrun_player_enemy_collision(env.h,slot);assert result==0
   l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
   rows.append(dict(handler='injury-edge',slot=slot,before=before,after=after))
l.ghostrun_normal_enemy_box.argtypes=[P,ctypes.c_ubyte]
for camera in [0,240]:
 for relative in [-16,-8,-1,0,1,100,255,256,264]:
  for y in [0,96,223]:
   env.load_state_dict(saved);x=camera+relative
   seed={0x08:slot,0x0f+slot:1,0x16+slot:0,0x1e+slot:1,0x49a+slot:3,0x6e+slot:(x//256)&255,0x87+slot:x&255,0xb6+slot:1,0xcf+slot:y,0x71a:camera//256,0x71c:camera&255,0x71b:(camera+255)//256,0x71d:(camera+255)&255}
   for address,value in seed.items():assert l.ghostrun_probe_write(env.h,address,value)==0
   l.ghostrun_read_ram(env.h,P(ram.ctypes.data));before=base64.b64encode(ram).decode()
   result=l.ghostrun_normal_enemy_box(env.h,slot);assert result==0,(result,camera,relative,y)
   l.ghostrun_read_ram(env.h,P(ram.ctypes.data));after=base64.b64encode(ram).decode()
   rows.append(dict(handler='box',slot=slot,x=x,y=y,camera=camera,before=before,after=after))
payload=json.dumps(rows,separators=(',',':')).encode()
print(json.dumps(dict(source='Actual unmodified NES PlayerEnemyCollision CPU procedures from hash-authenticated5-2 entrance. Controlled RAM/register inputs and syntheticJSR/RTS, noNMI/PPU advance. Boxes include edge touch and1px separation; state0/1/32, lower/upper collisionbits, odd/even, engine7/8, offscreen0/1, star0/1. InjuryTimer8 avoids death sideeffects, positive vertical speed exercises real stomp response. Also executes54 actual RunNormalEnemies fragments through GetEnemyBoundBox before BG/contact/movement, covering source control3 at screen/page edges.',initialRamSha256=initialEntranceSha,librarySha256=hashlib.sha256(a.library.read_bytes()).hexdigest(),samples=len(rows),sha256=hashlib.sha256(payload).hexdigest(),gzipBase64=base64.b64encode(gzip.compress(payload,mtime=0)).decode()),separators=(',',':')))
