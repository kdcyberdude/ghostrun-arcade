"""Measure admitted chain-registered5-4 flames; no camera learning or runtime edits."""
import argparse,collections,datetime,hashlib,json,math,pathlib
import numpy as np
from PIL import Image
root=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--reserved',action='store_true');a=p.parse_args()
def read(path):return json.loads((root/path).read_text())
def sha(path):return hashlib.sha256((root/path).read_bytes()).hexdigest()
plan=read('data/firebar-5-4-fresh-measure-plan.json')
for path,h in plan['sourceHashes'].items():
 if sha(path)!=h:raise RuntimeError('Declared source changed: '+path)
patterns=[]
for phase in range(4):
 path=f'assets/graphics/special/sprite-fireball_or_firebar-{phase}.png';raw=np.array(Image.open(root/path).convert('RGBA'));points=np.argwhere(raw[:,:,3]>0);count=collections.Counter(map(tuple,raw[:,:,:3][raw[:,:,3]>0]));color=min(count,key=count.get);ay,ax=np.argwhere((raw[:,:,3]>0)&np.all(raw[:,:,:3]==color,axis=2))[0];patterns.append((phase,raw[:,:,:3],points,int(ay),int(ax)))
lookup=read('data/firebar-motion-rules.json')['lookup'];reports=[]
for part in plan['reserved'if a.reserved else'calibration']:
 data=read(part['source']);rows=[]
 for source in data['sourceWitnesses'][part['role']]:
  if not part['ticksInclusive'][0]<=source['tick']<=part['ticksInclusive'][1]:continue
  if sha(source['image'])!=source['imageSha256']:raise RuntimeError('Source image changed')
  im=np.array(Image.open(root/source['image']).convert('RGB'));found={}
  for phase,raw,points,ay,ax in patterns:
   pos=np.argwhere(np.all(im[164:240]==raw[ay,ax],axis=2));ys=pos[:,0]+164-ay;xs=pos[:,1]-ax;valid=(xs>=0)&(ys>=164)&(xs+8<=256)&(ys+8<=240);ys=ys[valid];xs=xs[valid]
   for yy,xx in points:
    valid=np.all(im[ys+yy,xs+xx]==raw[yy,xx],axis=1);ys=ys[valid];xs=xs[valid]
   for x,y in zip(xs,ys):
    cameras=source['origins'][int(y):int(y)+8]
    if any(c is None for c in cameras)or len(set(cameras))!=1:continue
    wx=int(x)+cameras[0]+4;wy=int(y)+4;dx=wx-696;dy=wy-217;radius=math.hypot(dx,dy);n=round(radius/8)
    if n>5 or abs(radius-n*8)>=2:continue
    key=(wx,wy);found.setdefault(key,{'visibleCenter':[wx,wy],'relative':[dx,dy],'radiusIndex':n,'spritePhases':[],'sourceTopLeft':[int(x),int(y)],'camera':cameras[0],'opaquePixelsMatched':len(points)})['spritePhases'].append(phase)
  points=sorted(found.values(),key=lambda point:point['radiusIndex'])
  phase_candidates=[phase for phase in range(32)if points and all(list(lookup[phase][point['radiusIndex']])==point['relative']for point in points)]
  minimum_error=min(max(max(abs(lookup[phase][point['radiusIndex']][c]-point['relative'][c])for c in range(2))for point in points)for phase in range(32)) if points else None
  rows.append({'tick':source['tick'],'nativeFrame':source['nativeFrame'],'image':source['image'],'imageSHA256':source['imageSha256'],'phaseCandidates':phase_candidates,'minSamePhaseShapeErrorPixels':minimum_error,'points':points})
 offsets={}
 for direction in[-1,1]:
  possible=set(range(1024))
  for row in rows:
   if len(row['phaseCandidates'])!=1:continue
   possible={counter for counter in possible if ((counter+direction*5*row['nativeFrame'])%1024)//32 in row['phaseCandidates']}
  offsets[str(direction)]=sorted(possible)
 reports.append({'partition':part,'rows':rows,'orientationObservations':sum(len(row['phaseCandidates'])==1 for row in rows),'centerSamples':sum(len(row['points'])for row in rows),'maxSamePhaseShapeErrorPixels':max((row['minSamePhaseShapeErrorPixels']for row in rows if row['minSamePhaseShapeErrorPixels']is not None),default=None),'signed5UnitCounterOffsetsAtNative0':offsets})
result={'schema':'chain-aligned5-4-firebar-measurements-v1','date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'plan':'data/firebar-5-4-fresh-measure-plan.json','planSHA256':sha('data/firebar-5-4-fresh-measure-plan.json'),'role':'reserved'if a.reserved else'calibration','method':'Exact opaque supplied sprite matching; admitted independent per-row sourceWitness origins only. Pivot actual696/217 fixed from independent static/assembly chain. Frozen lookup phase fit does not choose camera. Signed5-unit accumulator tested against actual native frame totals; counter origin is descriptive, not a scripted epoch.','reports':reports}
path='evidence/firebar-5-4-fresh-'+('reserved'if a.reserved else'calibration')+'.json';(root/path).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'path':path,'reports':[{k:v for k,v in report.items()if k!='rows'}for report in reports]},indent=2))
