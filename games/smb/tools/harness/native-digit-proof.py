#!/usr/bin/env python3
"""Controlled original-ROM procedure proof; no PPU/NMI, no ROM writes, no native replay corrections."""
import argparse,ctypes as C,hashlib,json,pathlib,re
p=argparse.ArgumentParser();p.add_argument('--rom',type=pathlib.Path,required=True);p.add_argument('--library',type=pathlib.Path,required=True);p.add_argument('--assembly',type=pathlib.Path,required=True);p.add_argument('--cpu-header',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,default=pathlib.Path('tests/fixtures/native-digit-scratch.json'));a=p.parse_args()
rom=a.rom.read_bytes();assert rom[:4]==b'NES\x1a' and rom[4]==2;prg=rom[16:32784];H=lambda b:hashlib.sha256(b).hexdigest();find=lambda sig:unique(bytes.fromhex(sig))
def unique(b):
 positions=[i+0x8000 for i in range(len(prg)-len(b)+1) if prg[i:i+len(b)]==b];assert len(positions)==1,(b.hex(),positions);return positions[0]
pc={'digits':find('ad7007c900'),'initialize':find('a207a9008506'),'coin':find('a9018d3901'),'score':find('ae5307bcfabb205f8f'),'floaty':find('bd1001f0'),'pole':find('a2058608b516'),'timer':find('adf8070df9070dfa07f0f1'),'firework':find('a900950fa90885fea9058d3801'),'initEnemy':find('a900951e20')}
lib=C.CDLL(str(a.library.resolve()));lib.native_digit_procedure.argtypes=[C.c_void_p,C.c_void_p,C.c_uint,C.c_uint,C.c_uint,C.c_void_p,C.c_void_p,C.c_void_p]
cases=[];exhaustive=hashlib.sha256();count=0

def call(r,kind,x=0,y=0):
 initial=bytes(r);out=(C.c_ubyte*2048)();trace=(C.c_uint*256)();result=(C.c_uint*5)();status=lib.native_digit_procedure(C.create_string_buffer(prg),C.create_string_buffer(initial),pc[kind],x,y,out,trace,result);assert status==0,(kind,status);return bytearray(out),{'instructions':result[0],'writes137':[[v>>8,v&255] for v in trace[:result[1]]],'minimumStackPointer':result[2]}
def seed(score='009990',timer='100',coins='99',player=0):
 r=bytearray(2048);r[0x770]=1;r[0x753]=player;r[0x75e]=int(coins);r[0x7dd:0x7e3]=bytes(map(int,score));r[0x7e3:0x7e9]=bytes(map(int,score));r[0x7ec:0x7ee]=bytes(map(int,coins));r[0x7f2:0x7f4]=bytes(map(int,coins));r[0x7f8:0x7fb]=bytes(map(int,timer));return r
# All possible scratch byte values, all six digit columns, both title locking and normal math.
for mode in [0,1]:
 for column in range(6):
  for value in range(256):
   r=seed('999999');r[0x770]=mode;r[0x134+column]=value;after,meta=call(r,'digits',y=0x0b);assert after[0x133:0x13a]==bytes(7);exhaustive.update(bytes([mode,column,value])+after[0x133:0x13a]);count+=1

def record(label,kind,r,x=0,y=0):
 after,meta=call(r,kind,x,y);assert after[0x133:0x13a]==bytes(7),(label,after[0x133:0x13a]);n=bytearray(after);n[0x16]=47;n[0x398]=1;n[0xef]=0x5a;vine,vineMeta=call(n,'initEnemy',x=0,y=0)
 assert vine[0xcf]==0 and vine[0xf]==1 and vine[0x16]==47
 cases.append({'label':label,'procedure':kind,'initialRamSha256':H(r),'scoreBefore':list(r[0x7dd:0x7e9]),'scoreAfter':list(after[0x7dd:0x7e9]),'timeBefore':list(r[0x7f8:0x7fb]),'timeAfter':list(after[0x7f8:0x7fb]),'scratchBefore':list(r[0x133:0x13a]),'scratchAfter':list(after[0x133:0x13a]),**meta,'eligibleVineInit':{'y':vine[0xcf],'state':vine[0x1e],'id':vine[0x16],'flag':vine[0xf],'scratch':vine[0x137],'minimumStackPointer':vineMeta['minimumStackPointer']}});return after
for player in [0,1]:
 for award in range(1,12):
  r=seed(player=player);r[0x110]=award;r[0x12c]=0x2b;record(f'floaty-{award}-player{player}','floaty',r)
 for award in range(5):
  r=seed(player=player);r[0x1b]=48;r[14]=4;r[0x1d]=3;r[0xd4]=0xaa;r[0x10f]=award;record(f'pole-{award}-player{player}','pole',r)
 for coins in ['00','09','99']:record(f'coin-{coins}-player{player}','coin',seed(coins=coins,player=player))
 for timer in ['001','010','100','999']:record(f'timer-{timer}-player{player}','timer',seed(timer=timer,player=player))
 record(f'firework-player{player}','firework',seed('999990',player=player))
for high in [0x4b,0x6f]:
 r=bytearray([0xa5]*2048);after,meta=call(r,'initialize',y=high);assert after[0x133:0x13a]==bytes(7);cases.append({'label':f'InitializeMemory-{high:02x}','procedure':'initialize','scratchBefore':list(r[0x133:0x13a]),'scratchAfter':list(after[0x133:0x13a]),**meta})
a.out.write_text(json.dumps({'schema':'native-digit-scratch-proof-v1','method':'Actual PRG0 ROM instructions on NeSLE Ricoh2A03 CPU, synthetic JSR return; controlled RAM/register inputs; no PPU/NMI or ROM writes. Representative source award paths followed by actual InitEnemyObject→Setup_Vine, no changes to0137 between calls.','romSha256':H(rom),'assemblySha256':H(a.assembly.read_bytes()),'cpuWrapperSha256':H(pathlib.Path(__file__).with_name('native-digit-procedure.cpp').read_bytes()),'cpuHeaderSha256':H(a.cpu_header.read_bytes()),'sourceWriters':[{'line':i+1,'instruction':line.split(';')[0].strip()} for i,line in enumerate(a.assembly.read_text().splitlines()) if re.search(r'\b(sta|inc|dec)\s+DigitModifier',line)],'procedurePCs':pc,'exhaustive':{'cases':count,'sha256':exhaustive.hexdigest(),'matrix':'OperMode0/1 × all6 modifier columns × everybyte0..255; all7 scratch bytes zero on every return'},'cases':cases},separators=(',',':'))+'\n');print(json.dumps({'exhaustive':count,'representatives':len(cases),'transientNonzero137':sum(any(v for _,v in c['writes137']) for c in cases)}))
