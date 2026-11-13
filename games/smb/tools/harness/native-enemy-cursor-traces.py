"""Observe the recorded native v2 traces from their authenticated full-emulator entrances.
Build native-enemy-cursor-capi.cpp as a shared library, then pass --library.
Restoration follows native_ram_trace.py; every initial and PPU RAM byte must match.
"""
from pathlib import Path
import argparse
import ctypes
import json
import sys

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--lab',type=Path,required=True)
p.add_argument('--recordings',type=Path,required=True)
p.add_argument('--traces',type=Path,required=True)
p.add_argument('--library',type=Path,required=True)
p.add_argument('--out',type=Path,required=True)
p.add_argument('--levels',default='all')
a=p.parse_args()
sys.path[:0]=[str(a.lab/'rl'),str(a.lab/'scripts/recording')]
import numpy as np
import torch
import rlenv
from record_v2 import archive_unit,load_entrances

torch.set_num_threads(1)
rlenv.build_cpu=lambda:a.library.resolve()
a.out.mkdir(parents=True,exist_ok=True)
arc,slots,arc_sha=load_entrances(next((a.recordings/'v2/.entrances').glob('entrances-*.npy')),a.out)
levels=[f'{w}-{s}' for w in range(1,9) for s in range(1,5)] if a.levels=='all' else a.levels.split(',')
P=ctypes.c_void_p
for level in levels:
 lv=(int(level[0])-1)*4+int(level[2])-1
 log=json.loads((a.recordings/'v2'/level/f'smb_v2_{level}.actions.json').read_text())
 env=rlenv.RlEnv({'smb':1},device='cpu',seed=log['selection']['seed'],sticky=False,idle_max=0,dropout=False,level_cap=slots)
 lib=env.lib
 lib.ghostrun_read_ram.argtypes=[P,P]
 lib.ghostrun_cursor_open.argtypes=[P,ctypes.c_char_p]
 lib.ghostrun_cursor_frame.argtypes=[P,ctypes.c_ubyte]
 lib.ghostrun_cursor_stats.argtypes=[P,P]
 if lv:
  env.start();sd=env.state_dict()
  assert log['start_state']['archive_sha256']==arc_sha
  assert sum(u*slots for u in archive_unit(env))==len(arc)
  sd['env'][-len(arc):]=arc;env.load_state_dict(sd)
  weights=np.zeros(slots);weights[lv]=1;env.set_level_plan(0,1.0,weights)
 env.start();env.actions.zero_()
 if lv:
  for _ in range(300):
   env.step()
   if int(env.level_now[0])==lv:break
  assert int(env.level_now[0])==lv
 directory=a.traces/level;pads=(directory/'pads.bin').read_bytes()
 ram=np.empty(2048,dtype=np.uint8)
 def read():
  assert lib.ghostrun_read_ram(env.h,P(ram.ctypes.data))==0
  return ram.tobytes()
 assert read()==(directory/'initial.ram').read_bytes(),f'{level} initial emulator state mismatch'
 assert lib.ghostrun_cursor_open(env.h,str((a.out/f'{level}.jsonl').resolve()).encode())==0
 with (directory/'ram.bin').open('rb') as expected:
  for frame,pad in enumerate(pads):
   assert lib.ghostrun_cursor_frame(env.h,pad)==0,f'{level} CPU observer fault row{frame}'
   assert read()==expected.read(2048),f'{level} native PPU RAM mismatch row{frame}'
 stats=np.empty(3,dtype=np.uint64);assert lib.ghostrun_cursor_stats(env.h,P(stats.ctypes.data))==0
 assert lib.ghostrun_cursor_close()==0
 print(json.dumps(dict(level=level,verifiedRows=int(stats[0]),attempts=int(stats[1]),initializers=int(stats[2]))),flush=True)
 del env
