#!/usr/bin/env python3
"""Short controlled POWER-ON prefixes with distinct menu input phases; unchanged native CPU/PPU."""
import argparse,pathlib,hashlib,json,subprocess,gzip,base64
p=argparse.ArgumentParser();p.add_argument('--observer',type=pathlib.Path,required=True);p.add_argument('--ram-observer',type=pathlib.Path,required=True);p.add_argument('--rom',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--reference',type=pathlib.Path,required=True);p.add_argument('--fixture',type=pathlib.Path,default=pathlib.Path('tests/fixtures/native-startup-controls.json'));a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True);H=lambda b:hashlib.sha256(b).hexdigest();pack=lambda b:base64.b64encode(gzip.compress(b)).decode();romHash=H(a.rom.read_bytes());observerHash=H(a.observer.read_bytes());reference=(a.reference/'ram.bin').read_bytes();referencePads=(a.reference/'pads.bin').read_bytes();cases=[]
patterns=[('start40',[(40,8)]),('start80',[(80,8)]),('select40-start80',[(40,4),(80,8)]),('a-start50',[(50,9)]),('b-start40-start80',[(40,10),(80,8)]),('held-start0',[(f,8) for f in range(101)]),('held-start0-release-start120',[(f,8) for f in range(101)]+[(120,8)])]
for name,events in patterns:
 d=a.out/name;d.mkdir(exist_ok=True);pads=bytearray(320)
 for frame,value in events:pads[frame]=value
 padFile=d/'pads.bin';padFile.write_bytes(pads);subprocess.run([str(a.observer.resolve()),str(a.rom.resolve()),str(padFile.resolve()),str(d.resolve())],check=True,capture_output=True)
 pixelRam=(d/'ram.bin').read_bytes();subprocess.run([str(a.ram_observer.resolve()),str(a.rom.resolve()),str(padFile.resolve()),str(d.resolve())],check=True,capture_output=True);assert (d/'ram.bin').read_bytes()==pixelRam
 initial=(d/'initial.ram').read_bytes();ram=(d/'ram.bin').read_bytes();pixels=(d/'pixels.bin').read_bytes();emph=(d/'emph.bin').read_bytes();assert initial==bytes([255])*2048 and len(ram)==len(pads)*2048 and len(pixels)==len(pads)*240*224
 common=next((f for f in range(len(pads)) if pads[f]!=referencePads[f]),len(pads));assert ram[:common*2048]==reference[:common*2048],name
 first=next((f for f in range(len(pads)) if ram[f*2048+0x770]==1 and ram[f*2048+0x772]==3 and ram[f*2048+14]==8),None);end=first+3 if first is not None else 120
 rows=[]
 for frame in range(end):
  r=ram[frame*2048:(frame+1)*2048];commands=[];offset=0
  while offset<r[0x300] and offset<255:
   address=r[0x301+offset]*256+r[0x302+offset];control=r[0x303+offset];length=control&63;values=list(r[0x304+offset:0x304+offset+(1 if control&64 else length)])
   if address&0x3fff in range(0x3f00,0x3f20):commands.append(dict(address=address,bytes=values))
   offset+=3+(1 if control&64 else length)
  rows.append(dict(frame=frame,mode=r[0x770],task=r[0x772],engine=r[14],screen=r[0x73c],disable=r[0x774],columns=r[0x71e],demo=r[0x7a2],selectTimer=r[0x780],screenTimer=r[0x7a0],counter=r[9],interval=r[0x77f],random=list(r[0x7a7:0x7ae]),players=r[0x77a],time=list(r[0x7f8:0x7fb]),palette=commands))
 receipt=dict(schema='native-startup-prefix-v1',method='Cold CPU RAMFF, PPUdot0, firsttarget241:1, nohiddenframes/noRAMwrites; suppliedcontrollerphaseprefix',romSha256=romHash,observerSha256=observerHash,ramObserverSha256=H(a.ram_observer.read_bytes()),initialRamSha256=H(initial),padsSha256=H(pads),ramSha256=H(ram),pixelsSha256=H(pixels),emphasisSha256=H(emph),commonReferenceFrames=common,referenceRamSha256=H(reference),firstPlayerRdy=first)
 (d/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');cases.append(dict(name=name,receipt=receipt,segmentPadsSha256=H(bytes(pads[:end])),segmentRamSha256=H(ram[:end*2048]),initial=pack(initial),pads=pack(bytes(pads[:end])),ram=pack(ram[:end*2048]),rows=rows,pictureDirectory=str(d.resolve())))
a.fixture.write_text(json.dumps(dict(source='Controlled short POWER-ON controller prefixes, actual native CPU/PPU, noRAMwrites; no sampled RAM supplied to runtime.',cases=cases),separators=(',',':'))+'\n');print(json.dumps(dict(cases=len(cases),rows=sum(len(c['rows']) for c in cases))))
