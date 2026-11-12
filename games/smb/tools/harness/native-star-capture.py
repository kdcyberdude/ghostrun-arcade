"""Capture native Star timer RAM with the shared NeSLE host C API.
Run: UV_CACHE_DIR=/tmp/uv-cache uv run native-star-capture.py --rom ROM --host LIB --out JSON
The native power-up collision initializes the Star; only the small NMI boundary matrix is RAM-seeded.
"""
import argparse, ctypes as c, hashlib, json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--rom',type=Path,required=True);p.add_argument('--host',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
l=c.CDLL(str(a.host));l.nh_create.argtypes=[c.c_void_p,c.c_size_t];l.nh_create.restype=c.c_void_p
l.nh_ram.argtypes=[c.c_void_p];l.nh_ram.restype=c.POINTER(c.c_ubyte)
l.nh_step.argtypes=[c.c_void_p,c.c_ubyte,c.c_int];l.nh_step.restype=c.c_uint
l.nh_state_size.argtypes=[c.c_void_p];l.nh_state_size.restype=c.c_size_t
l.nh_save.argtypes=[c.c_void_p,c.c_void_p];l.nh_load.argtypes=[c.c_void_p,c.c_void_p];l.nh_destroy.argtypes=[c.c_void_p]
rom=a.rom.read_bytes();h=l.nh_create(c.create_string_buffer(rom),len(rom));assert h
r=l.nh_ram(h)
def step():assert not l.nh_step(h,0,1)
def state():return [r[x] for x in [0x747,0x77f,0x79f,9,0x776,0xfb]]
for f in range(500):assert not l.nh_step(h,8 if 80<=f<100 else 0,1)
assert (r[0x770],r[0x772],r[14])==(1,3,8)
# Slot five: power-up id46, state128, type2 (Star), at Mario's native coordinates.
for at,v in {0x14:1,0x1b:46,0x23:128,0x39:2,0x73:r[0x6d],0x8c:r[0x86],0xbb:r[0xb5],0xd4:r[0xce],0x5d:0,0xa5:0}.items():r[at]=v
pickup_before=state();step();pickup_after=state();assert r[0x79f]==0x23 and r[0x14]==0
snap=c.create_string_buffer(l.nh_state_size(h));l.nh_save(h,snap)
lifecycle=[state()]
for _ in range(760):step();lifecycle.append(state())
rows=[]
for paused in [0,1]:
 for control in [0,1,2,255]:
  for interval in range(21):
   for star in [0,1,4,7,8,35]:
    l.nh_load(h,snap)
    for at,v in {0x776:paused,0x747:control,0x77f:interval,0x79f:star,0xfb:0}.items():r[at]=v
    before=state();step();rows.append([before,state()])
l.nh_destroy(h)
a.out.write_text(json.dumps(dict(schema='native-star-clock-v1',romSha256=hashlib.sha256(rom).hexdigest(),columns=['timerControl0747','interval077f','star079f','counter09','pause0776','musicQueue00fb'],method='NeSLE CPU host, 500 boot frames (Start held80..99); native slot5 Star collision, unmodified760-frame neutral continuation; independent snapshot restores for NMI boundary matrix',pickup=[pickup_before,pickup_after],lifecycle=lifecycle,transitions=rows),separators=(',',':'))+'\n')
print(len(rows),'boundary transitions;',len(lifecycle),'lifecycle rows')
