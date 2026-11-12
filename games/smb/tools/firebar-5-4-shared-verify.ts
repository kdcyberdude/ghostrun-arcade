/** Source-conditional missing-hazard motor proof; never runs or scripts the game. */
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {advanceFirebarMotor,createFirebarMotor,firebarFlameCenters,firebarOrientation} from '../src/firebar-motion.js';
const read=(file:string)=>JSON.parse(fs.readFileSync(file,'utf8')),sha=(file:string)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const candidate=read('data/firebar-5-4-chain-candidate-v2.json');
for(const[file,hash]of Object.entries(candidate.hashes))assert.equal(sha(file),hash,'Frozen input changed: '+file);
const geometry={x:696,y:216,length:6 as const},parameters={direction:1 as const,initialUnits:763};
const sets=[
 // Independent source-point arithmetic confirms these descriptive maxima.
 // They are NOT acceptance limits: every history still fails the unchanged2px.
 {file:'evidence/firebar-5-4-chain-calibration.json',births:[44818,44818],measuredRawMaxima:[8,8]},
 {file:'evidence/firebar-5-4-chain-reserved.json',births:[44818,44818],measuredRawMaxima:[8,8]},
 {file:'evidence/firebar-5-4-fresh-calibration.json',births:[44933,45083],measuredRawMaxima:[8,8]},
 {file:'evidence/firebar-5-4-fresh-reserved.json',births:[45031],measuredRawMaxima:[7]},
];
const reports=[];
for(const set of sets)for(const[index,source]of read(set.file).reports.entries()){
 const activation=set.births[index],motor=createFirebarMotor(parameters);let native=activation-1;
 // A real local motor stays unchanged during an arbitrary safe preactivation wait.
 for(let wait=0;wait<150;wait++)advanceFirebarMotor(motor,geometry,parameters,436);
 assert.deepEqual(motor,{active:false,units:763});
 let points=0,rawError=0,adjacentError=0,coherentOrientations=0,wrongCoherent=0;const mixed=[];
 for(const row of source.rows){
  if(row.nativeFrame<activation){assert.equal(row.points.length,0);continue;}
  while(native<row.nativeFrame){advanceFirebarMotor(motor,geometry,parameters,437);native++;}
  const current=firebarFlameCenters(motor,geometry),following={...motor};advanceFirebarMotor(following,geometry,parameters,437);const next=firebarFlameCenters(following,geometry);
  let raw=0,adjacent=0;const pointResults=[];
  for(const point of row.points){const n=point.radiusIndex,actual=point.visibleCenter;
   const errors=[current[n],next[n]].map(center=>Math.max(Math.abs(center.x-actual[0]),Math.abs(center.y-actual[1])));
   raw=Math.max(raw,errors[0]);adjacent=Math.max(adjacent,Math.min(...errors));points++;
   pointResults.push({n,actual,rawErrorPixels:errors[0],adjacentNativeErrorPixels:Math.min(...errors),exactNativeEpochs:errors.flatMap((error,age)=>error===0?[age]:[]),sourceTopLeft:point.sourceTopLeft,spritePhases:point.spritePhases});
  }
  if(row.phaseCandidates.length===1){coherentOrientations++;wrongCoherent+=firebarOrientation(motor)!==row.phaseCandidates[0];}
  rawError=Math.max(rawError,raw);adjacentError=Math.max(adjacentError,adjacent);
  if(raw)mixed.push({nativeFrame:native,tick:row.tick,rawCenterErrorPixels:raw,bestSinglePoseShapeResidualPixels:row.minSamePhaseShapeErrorPixels,adjacentNativeErrorPixels:adjacent,pointResults,image:row.image,imageSHA256:row.imageSHA256});
 }
 assert.equal(wrongCoherent,0);assert.equal(adjacentError,0);
 assert.equal(rawError,set.measuredRawMaxima[index]);
 const raw2pxPassed=rawError<=2;
 assert.equal(raw2pxPassed,false,'All raw-image cases must remain explicitly failing the unchanged2px limit');
 const descriptiveCounterOffset=(parameters.initialUnits-5*(activation-1)%1024+1024)%1024;
 assert.deepEqual(source.signed5UnitCounterOffsetsAtNative0['1'],[descriptiveCounterOffset]);
 reports.push({source:set.file,partition:source.partition,activationNativeFromIndependentCameraEstimator:activation,descriptiveCounterOffset,coherentOrientations,wrongCoherent,completeSpriteCenters:points,maxUnshiftedRawCenterErrorPixels:rawError,raw2pxPassed,maxAdjacentNativeDiagnosticErrorPixels:adjacentError,adjacentDiagnosticIsNotRawPass:true,mixed});
}
const result={schema:'shared-module5-4-missing-hazard-validation-v1',date:new Date().toISOString(),candidate:'data/firebar-5-4-chain-candidate-v2.json',candidateSHA256:sha('data/firebar-5-4-chain-candidate-v2.json'),moduleSHA256:sha('src/firebar-motion.ts'),parameters,geometry,method:'Unmodified shared production motor advanced once per native frame after independently estimated source camera birth. One explicit local initial phase for all7 source histories. No source image selects camera, birth offset or pose. Absolute counter offsets are diagnostic intercepts and are never proposed as game scripts. Compare raw current-frame positions first; old/new adjacent-frame explanation is separate and never changes raw thresholds.',reports,tolerances:{centerPixels:2,timingNativeFrames:2,fullsceneRGB:0.99},scopeLimits:['Native latest-camera endpoints are independently observed, but first threshold crossing is estimated between7/8-native screenshots.763 is fitted local metadata under the current first-frame-increment convention, not a claim about native ROM initialization.','Raw current-state positions still fail2px on mixed-frame reference snapshots (8px); best pose shape3px and adjacent-native0px are distinct diagnostics.','Fullscene99%, flame animation epoch, collision radius and complete-level traversal remain unproved.']};
fs.writeFileSync('evidence/firebar-5-4-shared-verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({histories:reports.length,coherentOrientations:reports.reduce((n,r)=>n+r.coherentOrientations,0),centers:reports.reduce((n,r)=>n+r.completeSpriteCenters,0),wrongCoherent:reports.reduce((n,r)=>n+r.wrongCoherent,0),maxRawCenterErrorPixels:Math.max(...reports.map(r=>r.maxUnshiftedRawCenterErrorPixels)),adjacentDiagnosticMax:Math.max(...reports.map(r=>r.maxAdjacentNativeDiagnosticErrorPixels)),mixedSnapshots:reports.reduce((n,r)=>n+r.mixed.length,0)},null,2));
