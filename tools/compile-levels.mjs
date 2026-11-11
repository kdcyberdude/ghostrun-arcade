import fs from'node:fs';import{PNG}from'pngjs';
import{createHash}from'node:crypto';
import{applyObservedOpeningPodoboo}from'./podoboo-three-four-inventory-adapter.mjs';
const observations=JSON.parse(fs.readFileSync('data/observed-levels.json')),entities=JSON.parse(fs.readFileSync('data/entity-campaign.json')),first=JSON.parse(fs.readFileSync('data/gameplay-1-1.json'));
const pipeRoomPreview=JSON.parse(fs.readFileSync('data/pipe-room-preview.json'));
const pipeEntryCalibrations=JSON.parse(fs.readFileSync('data/pipe-entry-calibrations.json')).calibrations;
const pipeExitTimeline=JSON.parse(fs.readFileSync('data/pipe-exit-timeline.json'));
const playerGroundCalibrations=JSON.parse(fs.readFileSync('data/player-ground-calibrations.json')).areas;
const springGraphics=JSON.parse(fs.readFileSync('data/spring-native-graphics.json'));
const entityAreaCorrection=JSON.parse(fs.readFileSync('data/entity-area-8-4-corrections.json'));
const nativeTileRemovals=JSON.parse(fs.readFileSync('data/native-tile-removals.json')).removals;
const nativePlatformSpecs=JSON.parse(fs.readFileSync('data/native-platform-specs.json'));
// Native platform objects (data/native-platform-specs.json): a whole replacement list (wrapping lifts) or specs the trace shows no object for.
const nativePlatforms=(level,area,list)=>{const key=`${level}/${area}`,drop=nativePlatformSpecs.remove[key]??[];return nativePlatformSpecs.replace[key]??list.filter(p=>!drop.some(([x,y])=>p.x===x&&p.y===y));};
const waterFirebarGeometry=JSON.parse(fs.readFileSync('data/firebar-water-geometry-candidate.json'));
const firebarProduction=JSON.parse(fs.readFileSync('data/firebar-production.json'));
const acceptedFirebar=JSON.parse(fs.readFileSync('data/firebar-5-4-production.json'));
const missingFirebarFile=acceptedFirebar.proposal,missingFirebar=JSON.parse(fs.readFileSync(missingFirebarFile));
if(createHash('sha256').update(fs.readFileSync(missingFirebarFile)).digest('hex')!==acceptedFirebar.proposalSha256)throw Error('Missing5-4 firebar proposal changed');
for(const[file,expected]of Object.entries(missingFirebar.sourceHashes)){
 if(file===acceptedFirebar.validation.file){
  const {date,...verification}=JSON.parse(fs.readFileSync(file));
  if(createHash('sha256').update(JSON.stringify(verification)).digest('hex')!==acceptedFirebar.validation.sha256ExcludingOnlyTopLevelDate)throw Error('Missing5-4 firebar verification content changed');
 }else if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error(`Missing5-4 firebar evidence changed: ${file}`);
}
const missingFirebarArea=entities.levels.find(l=>l.id===missingFirebar.level).areas.find(a=>a.id===missingFirebar.area);
if(JSON.stringify(missingFirebarArea.inferredFirebars)!==JSON.stringify(missingFirebar.expectedOriginalFirebars))throw Error('Missing5-4 firebar source inventory changed');
missingFirebarArea.inferredFirebars.splice(1,0,structuredClone(missingFirebar.addFirebar));
const extraFirebars=JSON.parse(fs.readFileSync('data/firebar-five-four-extra-production.json'));
const extraFirebarArea=entities.levels.find(l=>l.id===extraFirebars.level).areas.find(a=>a.id===extraFirebars.area);
if(JSON.stringify(extraFirebarArea.inferredFirebars)!==JSON.stringify(extraFirebars.expectedExistingFirebars))throw Error('Extra5-4 prior firebar inventory changed');
for(const accepted of extraFirebars.objects){
 if(createHash('sha256').update(fs.readFileSync(accepted.proposal)).digest('hex')!==accepted.proposalSha256)throw Error('Extra5-4 firebar proposal changed');
 const proposal=JSON.parse(fs.readFileSync(accepted.proposal));
 for(const[file,expected]of Object.entries(proposal.sourceHashes))if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error(`Extra5-4 firebar evidence changed: ${file}`);
 const bar=proposal.proposedFirebar;
 if(extraFirebarArea.inferredFirebars.some(prior=>prior.x===bar.x&&prior.y===bar.y))throw Error('Duplicate extra5-4 firebar');
 extraFirebarArea.inferredFirebars.push(structuredClone(bar));
}
const pivotCorrection=firebarProduction.pivotCorrections;
const pivotSource=entities.levels.find(l=>l.id===pivotCorrection.level).areas.find(a=>a.id===pivotCorrection.area);
if(JSON.stringify(pivotSource.inferredFirebars)!==JSON.stringify(pivotCorrection.expectedOriginalSpecs))throw Error('1-4 firebar pivot correction source changed');
for(const replacement of pivotCorrection.replacements)pivotSource.inferredFirebars[replacement.index]={...replacement.spec};
const threeFourMotorFile='evidence/firebar-three-four-proposal.json',threeFourMotor=JSON.parse(fs.readFileSync(threeFourMotorFile));
if(createHash('sha256').update(fs.readFileSync(threeFourMotorFile)).digest('hex')!=='79dcaae2c13f44f46f44a9abf43c14372698b292d889d71e5c0b1bfd4c61f8cb')throw Error('Qualified3-4 motor proposal changed');
for(const[file,expected]of Object.entries(threeFourMotor.sourceHashes))if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error('3-4 motor source changed: '+file);
firebarProduction.objects.push({level:threeFourMotor.scope.level,area:threeFourMotor.scope.area,...threeFourMotor.scope.existingSpec,...threeFourMotor.scope.proposedMotor,expectedSpec:threeFourMotor.scope.existingSpec,qualification:threeFourMotor.motion.qualified+' '+threeFourMotor.activation.uncertainty});
const matchedFirebarMotors=new Set();
function withFirebarMotors(level,area,bars){
 return bars.map(bar=>{
  const object=firebarProduction.objects.find(o=>o.level===level&&o.area===area&&o.x===bar.x&&o.y===bar.y);
  if(!object)return bar;
  if(JSON.stringify(bar)!==JSON.stringify(object.expectedSpec))throw Error(`Qualified firebar source changed: ${level}/${area}/${bar.x}`);
  matchedFirebarMotors.add(object);
  return {...bar,motor:{direction:object.direction,initialUnits:object.initialUnits,evidence:object.qualification}};
 });
}
for(const[file,expected]of Object.entries(entityAreaCorrection.sourceGuards))if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error(`Entity area correction source changed: ${file}`);
for(const expected of entityAreaCorrection.expectedSourceAreas){
 const source=entities.levels.find(l=>l.id===entityAreaCorrection.level).areas.find(a=>a.id===expected.id);
 for(const key of ['inferredSpawns','inferredPlatforms','inferredFirebars'])if(JSON.stringify(source[key])!==JSON.stringify(expected[key]))throw Error(`Entity area correction array changed: ${expected.id}/${key}`);
}
if(JSON.stringify(entityAreaCorrection.expectedSourceAreas.find(a=>a.id===waterFirebarGeometry.sourceArea).inferredFirebars)!==JSON.stringify(waterFirebarGeometry.expectedOriginalSpecs))throw Error('Water firebar source inventory changed');
const correctedWaterFirebars=waterFirebarGeometry.objects.map((object,index)=>{
 const original=waterFirebarGeometry.originalToObserved.find(binding=>binding.observedUniqueIndex===index).original;
 return {x:object.x,y:object.y,length:object.length,speed:Math.abs(original.speed)*object.direction};
});
const upperRows=JSON.parse(fs.readFileSync('data/observed-upper-rows.json')).levels;
const lowerRows=JSON.parse(fs.readFileSync('data/observed-lower-supplement.json')).levels;
const chainBaseFile='data/lower-row-chain-base-assembly.json',chainBase=JSON.parse(fs.readFileSync(chainBaseFile));
if(createHash('sha256').update(fs.readFileSync(chainBaseFile)).digest('hex')!=='be906aeab59541a6635593766f9b97a97d6b389f161e17a7b06d5ca211022465')throw Error('Qualified semantic firebar base changed');
const corridorFile='data/lower-row-chain-corridor-closure.json',corridor=JSON.parse(fs.readFileSync(corridorFile));
if(createHash('sha256').update(fs.readFileSync(corridorFile)).digest('hex')!=='a6d9f5e3460941b399132a1c9d6c9c89eb0106cb088e718fbb2ef31eec57ae6f')throw Error('Qualified whole corridor changed');
const fragmentCorrections=['data/lower-row-superseded-fragments.json','data/lower-row-edge-fragment-corrections.json','data/lower-row-5163-fragment-corrections.json','data/lower-row-5163-followup-fragment-corrections.json','data/lower-row-chain-fragment-corrections.json','data/lower-row-corridor-fragment-corrections.json'].map(file=>JSON.parse(fs.readFileSync(file)));
const visualFragments=JSON.parse(fs.readFileSync('data/lower-row-old-six-production.json'));
for(const[file,expected]of Object.entries(visualFragments.proofFiles))if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error(`Visual fragment proof changed: ${file}`);
for(const correction of [...fragmentCorrections,visualFragments])for(const prior of [correction.priorCorrection,correction.priorAdditiveCorrection].filter(Boolean))if(createHash('sha256').update(fs.readFileSync(prior.path)).digest('hex')!==prior.sha256)throw Error('Prior fragment correction changed');
for(const correction of [...fragmentCorrections,visualFragments])for(const[file,expected]of Object.entries(correction.sourceHashes)){
 if(createHash('sha256').update(fs.readFileSync('data/'+file)).digest('hex')!==expected)throw Error(`Fragment correction input changed: ${file}`);
}
const fragmentSources={'data/observed-levels.json':observations.levels,'data/observed-upper-rows.json':upperRows,'data/observed-lower-supplement.json':lowerRows};
const fragmentGroups=new Map();
for(const correction of fragmentCorrections.flatMap(set=>[...set.supersededFreeTiles,...set.supersededPatternOverrides,...set.supersededDecorations])){
 if(!correction.allFootprintPixelsIndependentlyWitnessed)throw Error('Incomplete fragment footprint evidence');
 const key=JSON.stringify([correction.sourceFile,correction.level,correction.area,correction.sourceField]);
 if(!fragmentGroups.has(key))fragmentGroups.set(key,[]);fragmentGroups.get(key).push(correction);
}
// Visual suppression keeps the original collision-bearing freeTiles intact.
const visualKeys=new Set();
for(const correction of visualFragments.supersededFreeTiles){
 const key=JSON.stringify([correction.sourceFile,correction.level,correction.area,correction.sourceField]),identity=key+'/'+correction.sourceIndex;
 const segment=fragmentSources[correction.sourceFile].find(l=>l.id===correction.level).segments.find(s=>s.id===correction.area);
 if(!visualFragments.visualOnly||correction.sourceField!=='freeTiles'||!correction.allFootprintPixelsIndependentlyWitnessed||JSON.stringify(segment.freeTiles[correction.sourceIndex])!==JSON.stringify(correction.match))throw Error('Visual fragment identity/proof changed: '+identity);
 if(visualKeys.has(identity)||fragmentGroups.get(key)?.some(c=>c.sourceIndex===correction.sourceIndex))throw Error('Duplicate visual fragment suppression: '+identity);
 visualKeys.add(identity);
}
for(const addition of visualFragments.additions)for(const piece of addition.decorations)if(!piece.allFootprintPixelsIndependentlyWitnessed||piece.aboveFreeTiles!==true)throw Error('Incomplete visual fragment addition');
// Remove only exact named whole fragments, including independently proved edges.
// Unresolved crossing pieces and visually consistent overlaps remain untouched.
for(const[key,corrections]of fragmentGroups){
 const[file,level,area,field]=JSON.parse(key),segment=fragmentSources[file].find(l=>l.id===level).segments.find(s=>s.id===area);
 const removed=new Set();
 for(const correction of corrections){
  if(JSON.stringify(segment[field][correction.sourceIndex])!==JSON.stringify(correction.match))throw Error(`Superseded fragment changed: ${key}/${correction.sourceIndex}`);
  if(removed.has(correction.sourceIndex))throw Error(`Duplicate fragment correction: ${key}/${correction.sourceIndex}`);
 removed.add(correction.sourceIndex);
 }
 for(const support of fragmentCorrections.flatMap(set=>set.protectedRetainedFragments??[])){
  if(JSON.stringify([support.sourceFile,support.level,support.area,support.sourceField])!==key)continue;
  if(removed.has(support.sourceIndex)||JSON.stringify(segment[field][support.sourceIndex])!==JSON.stringify(support.match))throw Error(`Required supporting fragment changed: ${key}/${support.sourceIndex}`);
 }
 segment[field]=segment[field].filter((_,index)=>!removed.has(index));
}
const castles=JSON.parse(fs.readFileSync('data/castle-observations.json')).levels;
const castleCompletion=JSON.parse(fs.readFileSync('data/castle-completion-rules.json')).geometry;
const mazeObservations=JSON.parse(fs.readFileSync('data/maze-observations.json')).levels;
const transitions=JSON.parse(fs.readFileSync('data/transition-measurements.json')).runtimeCandidates;
const checkpoints=JSON.parse(fs.readFileSync('data/checkpoint-rules.json')).checkpoints;
const bonusEntry=JSON.parse(fs.readFileSync('data/bonus-entry-audit.json')).runtimeCandidates;
const twoOneCoinEntry=JSON.parse(fs.readFileSync('data/coin-entry-2-1-rules.json'));
const undergroundActors=JSON.parse(fs.readFileSync('data/gameplay-1-2.json'));
const blockContents=JSON.parse(fs.readFileSync('data/block-contents.json')).blocks;
const multiCoinRules=JSON.parse(fs.readFileSync('data/multi-coin-rules.json'));
if(createHash('sha256').update(fs.readFileSync('data/coin-clock-candidate.json')).digest('hex')!=='00ecd6fe57b458ed485e7ea7080ce45794496208a328e5178b081849e6e4a856')throw Error('Multi-coin clock candidate changed');
for(const block of multiCoinRules.blocks){
 if(blockContents.some(b=>b.level===block.level&&b.area===block.area&&b.col===block.col&&b.row===block.row))throw Error('Multi-coin block content conflict');
 blockContents.push({...block});
}
const threeOneBlockFile='data/three-one-block-measurements.json',threeOneBlocks=JSON.parse(fs.readFileSync(threeOneBlockFile));
if(createHash('sha256').update(fs.readFileSync(threeOneBlockFile)).digest('hex')!=='055bdeac9aad2d36b657dbc9fefa48afddec82100fe21b52b2daa0b2c9d7a0fb')throw Error('Qualified3-1 block proof changed');
for(const[pathKey,hashKey]of [['calibration','calibrationSha256'],['heldoutPlan','heldoutPlanSha256'],['confirmationPlan','confirmationPlanSha256'],['initialAnalysis','initialAnalysisSha256'],['traceFile','traceSha256']])if(createHash('sha256').update(fs.readFileSync(threeOneBlocks.source[pathKey])).digest('hex')!==threeOneBlocks.source[hashKey])throw Error('3-1 block source changed: '+pathKey);
for(const block of threeOneBlocks.proposedContents.filter(block=>block.proposedCorrection)){
 if(!threeOneBlocks.passed||blockContents.some(prior=>prior.level===block.level&&prior.area===block.area&&prior.col===block.col&&prior.row===block.row))throw Error('3-1 block content conflict');
 blockContents.push({level:block.level,area:block.area,col:block.col,row:block.row,...block.proposedCorrection,evidence:block.qualification+' data/three-one-block-measurements.json'});
}
const threeTwoQuestionFile='data/three-two-question-measurements.json',threeTwoQuestionPacketFile='evidence/three-two-question-packet.json';
if(createHash('sha256').update(fs.readFileSync(threeTwoQuestionFile)).digest('hex')!=='61ab74e36ad87ac586824cb04016a050d9e5127a6cecbfbfa6ce5942c0fddf5d'||createHash('sha256').update(fs.readFileSync(threeTwoQuestionPacketFile)).digest('hex')!=='162aa21eb9ddc63deb8d391cfdd385d01ea27350492f4b41df539b0e9f4c6bd0')throw Error('Qualified3-2 question proof changed');
const threeTwoQuestion=JSON.parse(fs.readFileSync(threeTwoQuestionFile)),threeTwoQuestionPacket=JSON.parse(fs.readFileSync(threeTwoQuestionPacketFile));
for(const {file,sha256}of[...threeTwoQuestionPacket.files,...threeTwoQuestionPacket.existingPrerequisites])if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==sha256)throw Error('3-2 question source changed: '+file);
for(const block of threeTwoQuestion.confirmedBlockContents){
 const segment=observations.levels.find(l=>l.id===block.level).segments.find(a=>a.id===block.area),tile=threeTwoQuestion.geometryProposal.addTile;
 if(!threeTwoQuestion.passed||tile[0]!==block.col||tile[1]!==block.row||segment.tiles.some(t=>t[0]===block.col&&t[1]===block.row)||blockContents.some(prior=>prior.level===block.level&&prior.area===block.area&&prior.col===block.col&&prior.row===block.row))throw Error('3-2 question geometry/content conflict');
 segment.tiles.push([...tile]);
 blockContents.push({level:block.level,area:block.area,col:block.col,row:block.row,kind:block.kind,evidence:block.observed+' '+block.qualification+' '+threeTwoQuestionFile});
}
const threeTwoStarFile='data/three-two-star-measurements.json',threeTwoStarPacketFile='evidence/three-two-star-packet.json';
if(createHash('sha256').update(fs.readFileSync(threeTwoStarFile)).digest('hex')!=='e038ca0a8f77ac960044362d7885d97bbfd0ab7ccddbfc3d81bced4fa09b1fe0'||createHash('sha256').update(fs.readFileSync(threeTwoStarPacketFile)).digest('hex')!=='1e1562ef9662eec0eb2862b2031fe06c67b47153238a249862d992e49a002a50')throw Error('Qualified3-2 Star proof changed');
const threeTwoStar=JSON.parse(fs.readFileSync(threeTwoStarFile)),threeTwoStarPacket=JSON.parse(fs.readFileSync(threeTwoStarPacketFile));
for(const {file,sha256}of[...threeTwoStarPacket.files,...threeTwoStarPacket.existingPrerequisites])if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==sha256)throw Error('3-2 Star source changed: '+file);
for(const block of threeTwoStar.confirmedBlockContents){
 const segment=observations.levels.find(l=>l.id===block.level).segments.find(a=>a.id===block.area),{addTile:tile,removeFreeTile:old}=threeTwoStar.geometryProposal;
 const superseded=t=>t.x===old.x&&t.y===old.y&&t.metatileId===old.id&&t.atlas===`metatiles-palette-${String(old.palette).padStart(3,'0')}.png`;
 if(!threeTwoStar.passed||tile[0]!==block.col||tile[1]!==block.row||segment.tiles.some(t=>t[0]===block.col&&t[1]===block.row)||segment.freeTiles.filter(superseded).length!==1||blockContents.some(prior=>prior.level===block.level&&prior.area===block.area&&prior.col===block.col&&prior.row===block.row))throw Error('3-2 Star geometry/content conflict');
 segment.freeTiles=segment.freeTiles.filter(t=>!superseded(t));segment.tiles.push([...tile]);
 blockContents.push({level:block.level,area:block.area,col:block.col,row:block.row,kind:block.kind,evidence:block.observed+' '+threeTwoStar.geometryProposal.wholeFragmentRemovalQualification+' '+threeTwoStarFile});
}
const hiddenBlocks=JSON.parse(fs.readFileSync('data/hidden-blocks.json')).blocks;
for(const file of ['data/five-two-block-geometry.json','data/five-two-vine-remaining-geometry.json','data/five-two-vine-question-geometry.json']){
 const geometry=JSON.parse(fs.readFileSync(file));
 const segment=observations.levels.find(l=>l.id===geometry.level).segments.find(s=>s.id===geometry.area);
 // Complete observed cells replace only their superseded raster aliases.
 segment.freeTiles=segment.freeTiles.filter(t=>!geometry.supersededFreeTiles.some(old=>old.x===t.x&&old.y===t.y&&old.metatileId===t.metatileId&&old.atlas===t.atlas));
 const lower=lowerRows.find(l=>l.id===geometry.level)?.segments.find(s=>s.id===geometry.area);
 for(const tile of geometry.tiles){
  const prior=[...segment.tiles,...lower?.tiles??[],...(lower?.scanTornTiles??[]).map(t=>[t.col,t.row,t.metatileId])].find(t=>t[0]===tile[0]&&t[1]===tile[1]);
  if(prior&&prior[2]!==tile[2])throw Error(`5-2 block geometry conflicts at ${tile[0]},${tile[1]}`);
  if(!prior)segment.tiles.push([...tile]);
 }
}
const optionalRooms=JSON.parse(fs.readFileSync('data/optional-rooms.json')).rooms;
const areaReturnProfiles=JSON.parse(fs.readFileSync('data/area-return-rules.json')).profiles;
const vineRooms=JSON.parse(fs.readFileSync('data/vine-optional-rooms.json')).rooms;
const warpRuntime=JSON.parse(fs.readFileSync('data/vine-warp-runtime.json'));
const warpDestinations=JSON.parse(fs.readFileSync('data/warp-destination-measurements.json'));
const roofWarps=[
 {runtime:JSON.parse(fs.readFileSync('data/warp-1-2-runtime.json')),observed:JSON.parse(fs.readFileSync('data/warp-1-2-observations.json'))},
 {runtime:JSON.parse(fs.readFileSync('data/warp-4-2-runtime.json')),observed:JSON.parse(fs.readFileSync('data/vine-optional-farend-running.json')).supplementalMap},
];
for(const {runtime}of roofWarps){
 const level=observations.levels.find(l=>l.id===runtime.level),main=level.segments.find(s=>s.id===runtime.area);
 for(const pipe of runtime.pipes)(level.connections??=[]).push({
  from:main.id,to:'main',kind:'warp-pipe-down',requiresWarpActivation:true,
  entrance:{x:pipe.leftX,y:pipe.topY,width:32},
  target:{level:pipe.targetLevel,area:'main',x:40,feetY:208,cameraX:0},
 });
}
const optionalSkies=['3-1','5-2','6-2'].map(id=>{const runtime=JSON.parse(fs.readFileSync(`data/sky-vine-${id}-runtime.json`));return {runtime,observed:JSON.parse(fs.readFileSync(runtime.source))};});
for(const {observed:sky,runtime}of optionalSkies){
 observations.levels.find(l=>l.id===sky.level).segments.push({...sky.destination,sourceFirstTick:sky.destination.cameraRegistration[0].tick,sourceLastTick:sky.destination.cameraRegistration.at(-1).tick});
 const main=observations.levels.find(l=>l.id===sky.level).segments.find(s=>s.id===runtime.mainArea),r=runtime.supersededFragments;
 if(r)main.freeTiles=main.freeTiles.filter(t=>!(t.y===r.y&&t.x>=r.fromX&&t.x<r.toX));
 for(const tile of runtime.mainTiles){main.tiles=main.tiles.filter(t=>t[0]!==tile[0]||t[1]!==tile[1]);main.tiles.push([...tile]);}
}
for(const room of optionalRooms){
 const level=observations.levels.find(l=>l.id===room.level);
 if(level.segments.some(s=>s.id===room.id))throw Error(`Duplicate room ${room.level}/${room.id}`);
 const ticks=room.connections.flatMap(c=>c.sourceTicks??[]);
 level.segments.push({...room,sourceFirstTick:Math.min(...ticks),sourceLastTick:Math.max(...ticks)});
 (level.connections??=[]).push(...room.connections);
}
for(const room of vineRooms){
 const level=observations.levels.find(l=>l.id===room.level);
 if(level.segments.some(s=>s.id===room.id))throw Error(`Duplicate vine room ${room.level}/${room.id}`);
 if(room.level===warpRuntime.level&&room.id===warpRuntime.room){
  for(const connection of warpDestinations.connections)if(!room.connections.some(existing=>existing.kind===connection.kind&&existing.entrance.x===connection.entrance.x&&existing.target.level===connection.target.level))room.connections.push(connection);
  room.untestedWarpPipes=[];
  room.uncertainties=room.uncertainties.filter(note=>!note.startsWith('Warp labels8 and7')&&!note.startsWith('No return to4-2 main'));
  room.uncertainties.push(warpDestinations.negativeAlignment.status,'Only the observed one-way6-1/7-1/8-1 destinations are connected; no return to4-2 main is claimed.');
 }
 const ticks=room.connections.flatMap(c=>c.sourceTicks??[]);
 level.segments.push({...room,sourceFirstTick:Math.min(...ticks),sourceLastTick:Math.max(...ticks)});
 (level.connections??=[]).push(...room.connections);
 if(room.level===warpRuntime.level&&room.id===warpRuntime.room){
  const main=level.segments.find(s=>s.id===warpRuntime.mainArea);
  for(const tile of warpRuntime.mainEntrance.tiles){main.tiles=main.tiles.filter(t=>t[0]!==tile[0]||t[1]!==tile[1]);main.tiles.push([...tile]);}
 }
}
const bonus=JSON.parse(fs.readFileSync('data/subarea-1-2-coin-room.json'));
const underground=observations.levels.find(l=>l.id===bonus.level);
underground.segments.push({...bonus,sourceFirstTick:bonus.evidence[0].tick,sourceLastTick:bonus.evidence.at(-1).tick,sourceTrace:bonus.connections[0].sourceTrace,cameraRegistration:[],uncertainties:bonus.unresolved});
underground.connections.push(...bonus.connections);
const sky=JSON.parse(fs.readFileSync('data/subarea-2-1-sky-room.json'));
const twoOneCloudCameraEnd=JSON.parse(fs.readFileSync('data/two-one-cloud-measurements.json')).summary.rightEdge.observedCameraCap;
observations.levels.find(l=>l.id===sky.level).segments.push({...sky,sourceFirstTick:sky.cameraRegistration[0].tick,sourceLastTick:sky.cameraRegistration.at(-1).tick});
// Exact player-cell matching corrected an earlier center/origin mix-up. The
// pre-visible vertical spawn remains an inference pending entry-fall calibration.
for(const level of observations.levels.filter(l=>['1-1','1-2'].includes(l.id))){
 const room=level.segments.find(s=>s.id==='bonus-coins');room.spawn=[...bonusEntry.proposed.spawn];
 for(const connection of level.connections??[])if(connection.to===room.id)Object.assign(connection.target,{x:bonusEntry.proposed.spawn[0],feetY:bonusEntry.proposed.spawn[1]});
}
for(const room of optionalRooms.filter(r=>r.role==='optional-coin-room')){
 const level=observations.levels.find(l=>l.id===room.level),segment=level.segments.find(s=>s.id===room.id);
 segment.spawn=[...bonusEntry.proposed.spawn];
 for(const connection of level.connections??[])if(connection.to===room.id)Object.assign(connection.target,{x:bonusEntry.proposed.spawn[0],feetY:bonusEntry.proposed.spawn[1]});
}
for(const[supportProofFile,expected,adapterFile]of[
 ['data/lower-next-three-one-support.json','2abbe094c21273cd3cb1191ee8d2212f238d0219280e9737392294e187eedafa','data/lower-next-three-one-cells.json'],
 ['data/lower-next-six-one-support.json','fb0f327594d8c85a337af138f46a0b981e7a1adc8243f932bbf1a9537310aec9','data/lower-next-six-one-cells.json'],
 ['data/lower-next-six-two-support.json','32786102125709e9eb8cf06ed33365df3c12da08a4e2f2bf99e10214d1b5ea72','data/lower-next-six-two-cells.json'],
 ['data/lower-next-six-two-continuation-v3-support.json','e3b25e5cfce3e610f07cf82875f208fd065a8106c5b4917b4a483c0846abc475','data/lower-next-six-two-continuation-cells.json']
]){
 if(createHash('sha256').update(fs.readFileSync(supportProofFile)).digest('hex')!==expected)throw Error('Qualified support proof changed: '+supportProofFile);
 const supportProof=JSON.parse(fs.readFileSync(supportProofFile));
 for(const[file,expectedHash]of Object.entries(supportProof.sourceHashes))if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expectedHash)throw Error('Support source changed: '+file);
 const supportCells=JSON.parse(fs.readFileSync(adapterFile));
 if(supportCells.proofSha256!==expected)throw Error('Support adapter proof changed: '+adapterFile);
 for(const level of supportCells.levels)for(const segment of level.segments)for(const recovered of segment.recoveries){
  const proof=supportProof.wholeCells.find(c=>c.level===level.id&&c.area===segment.id&&c.col===recovered.col&&c.row===recovered.row);
  if(!proof?.proof.complete||proof.proof.provenPixels!==256||proof.proof.contradictionCount!==0||recovered.proofSource!==supportProofFile||recovered.metatileId!==proof.metatileId||recovered.classification!==proof.classification||JSON.stringify(recovered.visualAliases)!==JSON.stringify(proof.visualAliases)||JSON.stringify(recovered.heldoutWitnesses)!==JSON.stringify(proof.proof.pixelWitnesses.heldout.flat().map(indices=>indices[0])))throw Error('Support adapter changed: '+adapterFile);
 }
}
const exactLowerRows=['data/lower-row-exact-followup.json','data/lower-row-exact-second.json','data/lower-row-fresh-reference-delta.json','data/lower-row-fresh-second-delta.json','data/lower-row-edge-cells.json','data/lower-row-5163-delta.json','data/lower-row-5163-followup-delta.json','data/lower-row-chain-cells.json','data/lower-row-corridor-cells.json','data/lower-next-three-one-cells.json','data/lower-next-six-one-cells.json','data/lower-next-six-two-cells.json','data/lower-next-six-two-continuation-cells.json'].flatMap(file=>JSON.parse(fs.readFileSync(file)).levels);
const groundCorrections=JSON.parse(fs.readFileSync('data/ground-terrain-corrections.json')).corrections;
const groundActorData=JSON.parse(fs.readFileSync('data/ground-actor-corrections.json'));
// Native-measured spawn x/camera for placed walking enemies (tools/derive-enemy-spawns.py); applied after the hand-made corrections.
const nativeEnemySpawns=fs.existsSync('data/native-enemy-spawns.json')?JSON.parse(fs.readFileSync('data/native-enemy-spawns.json')):{corrections:[],additions:[]};
// Area D: walker direction/placement corrections measured from native enemy slots; same match/replace/spec format, applied after the spawn corrections.
const walkerCorrections=fs.existsSync('data/walker-corrections.json')?JSON.parse(fs.readFileSync('data/walker-corrections.json')):{corrections:[],additions:[],terrain:[]};
nativeEnemySpawns.corrections.push(...walkerCorrections.corrections);nativeEnemySpawns.additions.push(...walkerCorrections.additions);
// Native-measured spawn height and vertical state of Paratroopas and Beetles (tools/derive-paratroopa-beetle-spawns.mjs); applied after the spawn x/camera corrections.
const nativeParatroopaBeetleSpawns=fs.existsSync('data/native-paratroopa-beetle-spawns.json')?JSON.parse(fs.readFileSync('data/native-paratroopa-beetle-spawns.json')):{corrections:[],additions:[]};
const cannonCorrections=JSON.parse(fs.readFileSync('data/cannon-corrections.json')).corrections;
const waterOptionalEntries=['data/water-entry-rules.json','data/water-entry-5-2-rules.json'].map(file=>JSON.parse(fs.readFileSync(file)));
const palette=file=>Number(file.match(/(\d+)\.png$/)?.[1]??0);
const font=PNG.sync.read(fs.readFileSync('assets/graphics/background-tiles-22-30-21-0f.png'));
const campaign=fs.readFileSync('evidence/local/reference-campaign/trace.jsonl','utf8').trim().split('\n').map(JSON.parse);
const white=(im,x,y)=>{const i=(y*im.width+x)*4;return im.data[i]>220&&im.data[i+1]>220&&im.data[i+2]>220;};
function digit(im,x,y){let best={id:0,error:100};for(let id=0;id<10;id++){let error=0;for(let j=0;j<8;j++)for(let i=0;i<8;i++)if(white(im,x+i,y+j)!==white(font,id*8+i,j))error++;if(error<best.error)best={id,error};}return best.error<5?String(best.id):'?';}
const levels=[];
for(const level of observations.levels){
 // Supplied starts include some transitional frames. Read the first active room
 // in the recorded campaign, rather than mistaking the preceding castle timer
 // or a mid-screen player for a fresh spawn.
 const activeSegment=level.segments.find(s=>!(level.connections??[]).some(c=>c.from===s.id&&c.automaticWalk))??level.segments[0];
 const starts=campaign.filter(r=>r.response?.tick>=activeSegment.sourceFirstTick&&r.response.tick<=activeSegment.sourceFirstTick+20);
 const times=starts.map(r=>{const im=PNG.sync.read(fs.readFileSync(r.response.image.capture_path));return [208,216,224].map(x=>digit(im,x,24)).join('');}).filter(t=>/^\d{3}$/.test(t)).map(Number);
 if(!times.length)throw Error(`No readable start timer for ${level.id}`);
 const time=Math.round(Math.max(...times)/100)*100;
 const areas=level.segments.map((segment,index)=>{
  const upper=upperRows.find(l=>l.id===level.id)?.segments.find(s=>s.id===segment.id);
  const lower=lowerRows.find(l=>l.id===level.id)?.segments.find(s=>s.id===segment.id);
  const exactLower=exactLowerRows.filter(l=>l.id===level.id).flatMap(l=>l.segments.filter(s=>s.id===segment.id)).flatMap(s=>s.recoveries);
  const resolvedLowerKeys=new Set([...exactLower.map(r=>`${r.col},${r.row}`),...groundCorrections.filter(c=>c.level===level.id&&c.area===segment.id).map(c=>`${c.tile[0]},${c.tile[1]}`)]);
  const unresolvedLowerCount=lower?.unresolvedCells.filter(([col,row])=>!resolvedLowerKeys.has(`${col},${row}`)).length??0;
  const entity=entities.levels.find(l=>l.id===level.id)?.areas.find(a=>a.id===segment.id);
  const correctedEntity=level.id===entityAreaCorrection.level?entityAreaCorrection.proposals.find(a=>a.area===segment.id):undefined;
  const optionalRoom=[...optionalRooms,...vineRooms].find(room=>room.level===level.id&&room.id===segment.id);
  const warpEntry=level.id===warpRuntime.level&&segment.id===warpRuntime.room;
  const warpMain=level.id===warpRuntime.level&&segment.id===warpRuntime.mainArea;
  const optionalSky=optionalSkies.find(s=>s.observed.level===level.id),skyRuntime=optionalSky?.runtime;
  const optionalSkyMain=segment.id===skyRuntime?.mainArea;
  const optionalSkyEntry=segment.id===skyRuntime?.room;
  const roofWarpMain=roofWarps.find(r=>r.runtime.level===level.id&&r.runtime.area===segment.id),roofWarpRuntime=roofWarpMain?.runtime,roofWarp=roofWarpMain?.observed;
  const p=palette(segment.atlas);let theme=p>=3&&p<=5?'underground':p>=6&&p<=11?'castle':p>=12&&p<=14?'water':p>=15&&p<=20?'night':p>=24?'snow':'ground';
  if(segment.role==='underwater')theme='water';
  let tiles=[...segment.tiles,...upper?.tiles??[]].map(t=>[...t]),width=segment.width*16,maze;
  if(roofWarpMain)width=Math.max(width,roofWarpRuntime.minimumObservedWidth);
  // Pattern-identical ID71 is decorative castle masonry outdoors and a solid
  // ID82 brick in underground geometry. RGB matching alone cannot choose it.
  // Ordinary 1-2 play establishes collision for these underground cells.
  if(theme==='underground')for(const tile of tiles)if(tile[2]===71)tile[2]=82;
  if(roofWarpMain){
   // Continuous geometry beyond the normal exit. Include existing upper rows
   // before merging so shared exact cells are retained once, never overwritten.
   const known=new Map(tiles.map(t=>[`${t[0]},${t[1]}`,t]));
   for(const observed of roofWarp.tiles){
    const tile=[observed[0],observed[1],observed[2]===71?82:observed[2]],key=`${tile[0]},${tile[1]}`,prior=known.get(key);
    if(prior&&prior[2]!==tile[2])throw Error(`Roof warp conflicts with known cell ${key}`);
    if(!prior){tiles.push(tile);known.set(key,tile);}
   }
   for(const [col,row]of roofWarp.observedBlankCells)if(known.has(`${col},${row}`))throw Error(`Roof warp blank conflicts with known cell ${col},${row}`);
  }
  if(segment.normalizedLayoutCandidate){const c=segment.normalizedLayoutCandidate;tiles=[...c.tiles,...(upper?.tiles??[]).filter(t=>t[0]<c.width)].map(t=>[...t]);width=c.width*16;maze={loopAt:c.loopAtX,loopTo:c.loopToX,evidence:c.status,unresolved:c.uncertainties};}
  // Supplemental raster candidates identify one whole metatile after exact
  // scanline registration. Their collision semantics remain inferred; partial
  //8px artwork below is visual-only and cannot create collision geometry.
  for(const tile of [...lower?.tiles??[],...(lower?.scanTornTiles??[]).map(t=>[t.col,t.row,t.metatileId])]){
   if(tile[0]*16>=width)continue;
   if(tiles.some(t=>t[0]===tile[0]&&t[1]===tile[1]))throw Error(`Supplement overlaps known tile ${level.id}/${segment.id}/${tile[0]},${tile[1]}`);
   tiles.push([tile[0],tile[1],theme==='underground'&&tile[2]===71?82:tile[2]]);
  }
  for(const recovered of exactLower){
   const prior=tiles.find(t=>t[0]===recovered.col&&t[1]===recovered.row);
   if(prior&&!recovered.visualAliases.includes(prior[2]))throw Error(`Exact lower-row conflict ${level.id}/${segment.id}/${recovered.col},${recovered.row}`);
   if(!prior&&recovered.classification!=='known-blank')tiles.push([recovered.col,recovered.row,recovered.metatileId]);
  }
  const semanticBase=level.id===chainBase.level&&segment.id===chainBase.area?chainBase.baseAssembly:undefined;
  const corridorBases=corridor.semanticBaseDependencies.filter(b=>b.level===level.id&&b.area===segment.id);
  for(const base of [...semanticBase?[semanticBase]:[],...corridorBases]){
   // Supplied assembly matches182visible pixels;74hidden pixels remain inferred.
   // Keep this separate from the complete256pixel lower-row recovery inventory.
   const prior=tiles.find(t=>t[0]===base.col&&t[1]===base.row);
   if(prior&&prior[2]!==base.metatileId)throw Error('Semantic firebar base conflicts with observed terrain');
   if(!prior)tiles.push([base.col,base.row,base.metatileId]);
  }
  // Moving enemy toes obscured these ground cells in the original static
  // extraction. Each correction has full zero-error supplied-art coverage.
  for(const correction of groundCorrections.filter(c=>c.level===level.id&&c.area===segment.id)){
   const tile=correction.tile,prior=tiles.find(t=>t[0]===tile[0]&&t[1]===tile[1]);
   if(prior&&prior[2]!==tile[2])throw Error(`Ground correction conflicts with known tile ${level.id}/${segment.id}/${tile[0]},${tile[1]}`);
   if(!prior)tiles.push([...tile]);
  }
  // Area D: tiles that native walkers stand on although the screenshot extraction omitted them (a walker's sprite hid the tile when it was captured).
  for(const correction of walkerCorrections.terrain.filter(c=>c.level===level.id&&c.area===segment.id)){
   const tile=correction.tile,prior=tiles.find(t=>t[0]===tile[0]&&t[1]===tile[1]);
   if(prior&&prior[2]!==tile[2])throw Error(`Walker terrain correction conflicts with known tile ${level.id}/${segment.id}/${tile[0]},${tile[1]}`);
   if(!prior)tiles.push([...tile]);
  }
  for(const hidden of hiddenBlocks.filter(block=>block.level===level.id&&block.area===segment.id)){
   const tile=hidden.tile,prior=tiles.find(t=>t[0]===tile[0]&&t[1]===tile[1]);
   if(prior&&prior[2]!==tile[2])throw Error(`Hidden block conflicts with observed geometry ${level.id}/${segment.id}/${tile[0]},${tile[1]}`);
   if(!prior)tiles.push([...tile]);
  }
  for(const block of level.blockContents??[])if(block.segment===segment.id&&block.content==='size-powerup'){
   const t=tiles.find(t=>t[0]===block.col&&t[1]===block.row);if(t)t[2]=193;
  }
  const waterEntry=theme==='water'&&['2-2','7-2'].includes(level.id);
  const waterOptionalEntry=waterOptionalEntries.find(entry=>entry.level===level.id&&entry.area===segment.id);
  const optionalWaterEntry=Boolean(waterOptionalEntry);
  const undergroundEntry=theme==='underground'&&(level.connections??[]).some(c=>c.to===segment.id&&c.automaticWalk);
  const coinEntry=segment.id==='bonus-coins'||segment.role==='optional-coin-room';
  const waterSpawn=[40,32.875];
  const pipes=(level.connections??[]).filter(c=>c.from===segment.id&&['pipe-down','pipe-right','pipe-up','warp-pipe-down'].includes(c.kind)).map(c=>{
   const targetLevel=c.target.level!==level.id?c.target.level:undefined,to=c.target.area??c.to,destination=(targetLevel?observations.levels.find(l=>l.id===targetLevel):level).segments.find(s=>s.id===to);
   const down=c.kind==='pipe-down'||c.kind==='warp-pipe-down';
   const waterTarget=waterOptionalEntries.find(entry=>entry.level===level.id&&entry.area===to);
   const returnProfile=areaReturnProfiles.find(r=>r.level===level.id&&r.from===segment.id&&r.to===to);
   const entryCalibration=pipeEntryCalibrations.find(r=>r.level===level.id&&r.from===segment.id&&r.to===to);
   const exitTimeline=pipeExitTimeline.pipes.find(r=>r.level===level.id&&r.from===segment.id&&r.to===to);
   const calibratedCoinEntry=level.id===twoOneCoinEntry.level&&segment.id===twoOneCoinEntry.from&&to===twoOneCoinEntry.to;
   return {x:c.entrance.x+(down?c.entrance.width/2:0),y:c.entrance.y+(c.kind==='pipe-right'?(c.entrance.height??32):0),
    direction:down?'down':c.kind==='pipe-up'?'up':'right',to,targetLevel,entryHorizontalTolerance:entryCalibration?.entryHorizontalTolerance,requiresWarpActivation:c.requiresWarpActivation,ordinaryEnemyFrontier:returnProfile?.ordinaryEnemyFrontier,returnCloudOffsetX:returnProfile?.returnCloudOffsetX,
    spawn:waterTarget?waterTarget.spawn:c.automaticWalk&&[3,4,5].includes(palette(destination.atlas))?transitions.undergroundEntry.spawn:['2-2','7-2'].includes(level.id)&&destination?.role==='underwater'?waterSpawn:[c.target.x,c.target.feetY],
    camera:c.target.cameraX,smallPlayerRoomPreviewFrames:level.id===pipeRoomPreview.level&&segment.id===pipeRoomPreview.from&&to===pipeRoomPreview.to?pipeRoomPreview.smallPlayerFrames:undefined,smallPlayerRoomEntry:level.id===pipeRoomPreview.level&&segment.id===pipeRoomPreview.from&&to===pipeRoomPreview.to?pipeRoomPreview.smallPlayerEntry:undefined,transitionFrames:exitTimeline?pipeExitTimeline.entryFrames[down?'down':'right']+pipeExitTimeline.loadFrames:calibratedCoinEntry?twoOneCoinEntry.transitionFrames:waterTarget?waterTarget.transitionFrames:targetLevel?warpRuntime.warp.transitionFrames:c.automaticWalk?transitions.pipeFrames:(to==='bonus-coins'||destination?.role==='optional-coin-room')?bonusEntry.proposed.transitionFrames:undefined,riseFrames:exitTimeline?pipeExitTimeline.rise.frames:undefined,entryTriggerX:exitTimeline?.entryTriggerX};
  });
  const incoming=index===0?undefined:(level.connections??[]).find(c=>c.to===segment.id);
  const spawn=optionalSkyEntry?skyRuntime.entrySpawn:optionalWaterEntry?waterOptionalEntry.spawn:warpEntry?warpRuntime.entry.spawn:coinEntry?bonusEntry.proposed.spawn:undergroundEntry?transitions.undergroundEntry.spawn:waterEntry?waterSpawn:incoming?[incoming.target.x,incoming.target.feetY]:segment.spawn??[40,theme==='castle'?112:208];
  let enemies=correctedEntity?structuredClone(correctedEntity.enemies):optionalRoom?.enemies??(level.id==='1-1'&&segment.id==='main'?first.enemies:(entity?.inferredSpawns??[]).map(e=>({...e,palette:e.evidence.match(/enemy-table-([0-9a-f-]+)\.png/)?.[1]})));
  for(const addition of groundActorData.additions.filter(c=>c.level===level.id&&c.area===segment.id)){
   if(enemies.some(e=>e.kind===addition.spec.kind&&e.x===addition.spec.x))throw Error(`Duplicate added actor ${level.id}/${segment.id}/${addition.spec.x}`);
   enemies.push({...addition.spec});
  }
  for(const removal of groundActorData.removals.filter(c=>c.level===level.id&&c.area===segment.id)){
   const matches=enemies.filter(e=>Object.entries(removal.match).every(([key,value])=>e[key]===value));
   if(matches.length!==1)throw Error(`Expected one derivative sighting ${level.id}/${segment.id}/${JSON.stringify(removal.match)}`);
   enemies=enemies.filter(e=>e!==matches[0]);
  }
  for(const correction of groundActorData.corrections.filter(c=>c.level===level.id&&c.area===segment.id)){
   const actor=enemies.find(e=>Object.entries(correction.match).every(([key,value])=>e[key]===value));
   if(!actor)throw Error(`Missing corrected actor ${level.id}/${segment.id}/${JSON.stringify(correction.match)}`);
   Object.assign(actor,correction.replace,{evidence:`${actor.evidence}; ${correction.classification}; ${correction.provenance.report}`});
  }
  if(roofWarpMain)enemies.push(...roofWarpRuntime.removePiranhasAtX.map(x=>({kind:'piranha',x,y:184,direction:-1,palette:'0f-1c-36-17',evidence:roofWarpRuntime.evidence+'; initial phase inferred from common Piranha rules.'})));
  if(level.id===undergroundActors.level&&segment.id===undergroundActors.area)for(const override of undergroundActors.overrides){
   const enemy=enemies.find(e=>e.kind===override.kind&&e.x===override.matchX);
   if(!enemy)throw Error(`Missing overridden actor ${override.kind}/${override.matchX}`);
   const {matchX,palette,...fields}=override;Object.assign(enemy,fields,{palette:palette.match(/enemy-table-([0-9a-f-]+)\.png/)[1]});
  }
  if(level.id===undergroundActors.level&&segment.id===undergroundActors.area)for(const addition of undergroundActors.additions??[]){
   enemies.push({...addition,palette:addition.palette.match(/enemy-table-([0-9a-f-]+)\.png/)[1]});
  }
  // Applied last so matches use the final inferred positions.
  for(const addition of nativeEnemySpawns.additions.filter(c=>c.level===level.id&&c.area===segment.id))enemies.push({...addition.spec});
  for(const correction of nativeEnemySpawns.corrections.filter(c=>c.level===level.id&&c.area===segment.id)){
   const actor=enemies.find(e=>Object.entries(correction.match).every(([key,value])=>e[key]===value));
   if(!actor)throw Error(`Missing native-spawn corrected actor ${level.id}/${segment.id}/${JSON.stringify(correction.match)}`);
   Object.assign(actor,correction.replace,{evidence:`${actor.evidence}; ${correction.classification}`});
  }
  for(const enemy of enemies.filter(e=>e.kind==='piranha')){
   const top=tiles.find(t=>t[2]===16&&Math.abs(t[0]*16+8-enemy.x)<3);
   const freeTops=[...segment.freeTiles??[],...upper?.freeTiles??[]].filter(t=>t.metatileId===16&&t.x<width&&Math.abs(t.x+8-enemy.x)<3);
   if(!top&&freeTops.length>1)throw Error(`Ambiguous free pipe top ${level.id}/${segment.id}/${enemy.x}`);
   const topY=top?top[1]*16:freeTops[0]?.y;
   if(topY!==undefined){enemy.y=topY+24;enemy.evidence+='; hidden origin inferred24px below observed pipe top, rather than using a fully emerged sighting as the hidden position.';}
  }
  // A generator's sightings describe a population over time, not a set of simultaneously starting actors.
  const generatedFish=['2-3','7-3'].includes(level.id),generatedBills=['5-3','6-3'].includes(level.id);
  const generators=structuredClone(correctedEntity?.generators??[]);
  if(generatedFish&&enemies.some(e=>e.kind==='cheep')){const xs=enemies.filter(e=>e.kind==='cheep').map(e=>e.x);generators.push({kind:'flyingFish',from:Math.max(0,Math.min(...xs)-256),to:Math.max(...xs),interval:80});enemies=enemies.filter(e=>e.kind!=='cheep');}
  if(generatedBills&&enemies.some(e=>e.kind==='bullet')){const xs=enemies.filter(e=>e.kind==='bullet').map(e=>e.x);generators.push({kind:'bullet',from:Math.max(0,Math.min(...xs)-256),to:Math.max(...xs),interval:150});enemies=enemies.filter(e=>e.kind!=='bullet');}
  enemies=enemies.filter(e=>e.kind!=='spiny'||!enemies.some(e=>e.kind==='lakitu'));
  const castle=castles.find(c=>c.id===level.id&&c.segment===segment.id);
  const rescue=castle&&castleCompletion.find(c=>c.id===level.id);
  if(rescue){
   // Direct RGB matches of descriptor98 recover the visible floor/ceiling.
   // The floor's actor-occluded first pixel row remains explicitly qualified
   // in the source evidence; no gap or unobserved column is interpolated.
   width=Math.max(width,rescue.minimumObservedWidth);
   for(const {col,row,id}of [...rescue.observedFloorTiles,...rescue.observedCeilingTiles]){
    const prior=tiles.find(t=>t[0]===col&&t[1]===row);
    if(prior&&prior[2]!==id)throw Error(`Castle rescue tile conflict ${level.id}/${segment.id} ${col},${row}`);
    if(!prior)tiles.push([col,row,id]);
   }
  }
  if(castle?.bowser.inferredInitial){
   const boss=castle.bowser.inferredInitial;
   enemies=enemies.filter(e=>e.kind!=='bowser');
   enemies.push({kind:'bowser',x:boss.x,y:boss.y,direction:boss.direction,palette:'0f-1a-30-27',evidence:boss.uncertainty});
  }
  enemies=enemies.filter(e=>e.x>=0&&e.x<width);
  const mazeObservation=mazeObservations.find(m=>m.id===level.id&&m.area===segment.id);
  const mazes=[mazeObservation?.firstMaze?.runtimeCandidate,mazeObservation?.secondMaze?.runtimeCandidate].filter(Boolean);
  const cannons=tiles.filter(t=>t[2]===100).map(([col,row])=>({x:col*16,y:row*16,evidence:'Cannon-top artwork observed; firing interval and activation range remain inferred.'}));
  for(const correction of cannonCorrections.filter(c=>c.level===level.id&&c.area===segment.id)){
   const matches=cannons.filter(c=>c.x===correction.match.x&&c.y===correction.match.y);
   if(matches.length!==1)throw Error(`Expected one corrected cannon ${level.id}/${segment.id}/${JSON.stringify(correction.match)}`);
   Object.assign(matches[0],{phase:correction.phase,interval:correction.interval,evidence:correction.evidence});
  }
  if(castle?.axe){
   const {x,y}=castle.axe;
   tiles=tiles.filter(t=>t[0]!==x/16||t[1]!==y/16);
   tiles.push([x/16,y/16,197]);
  }
  for(const piece of castle?.bridge.exactVisualPieces??[])if(piece.x%16===0){
   tiles=tiles.filter(t=>t[0]!==piece.x/16||t[1]!==piece.y/16);
   tiles.push([piece.x/16,piece.y/16,137]);
  }
  const flag=!level.id.endsWith('-4')&&(tiles.find(t=>t[2]===36)||tiles.find(t=>t[2]===37));
  const door=flag?tiles.filter(t=>t[2]===74&&t[1]===11&&t[0]>flag[0]).sort((a,b)=>a[0]-b[0])[0]:undefined;
  const patternOverrides=[...(segment.tile8Overrides??[]),...(upper?.patternOverrides??[]),...(lower?.patternOverrides??[])].filter(t=>t[0]*8<width);
  // A castle window can be a genuinely black blank pattern even in a blue-sky
  // area. Blank metatile aliases lose that palette choice. Restore only complete
  // black 8px cells, checking the next image at its registered camera position
  // wherever that world cell is still visible.
  if(index===0&&segment.background==='#6888fc'){
   const captures=campaign.filter(r=>r.response?.tick>=segment.sourceFirstTick&&r.response.tick<=segment.sourceFirstTick+8&&r.response.image).slice(0,2).map(r=>({im:PNG.sync.read(fs.readFileSync(r.response.image.capture_path)),camera:segment.cameraRegistration.find(c=>c[1]===r.response.tick)?.[3]??0}));
   if(captures.length===2)for(let y=48;y<208;y+=8)for(let x=0;x<256;x+=8){
    if(captures.every(({im,camera})=>{const sx=x-camera;if(sx<0||sx+8>256)return true;for(let j=0;j<8;j++)for(let i=0;i<8;i++){const p=((y+j)*256+sx+i)*4;if(im.data[p]||im.data[p+1]||im.data[p+2])return false;}return true;})){
     patternOverrides.push([x/8,y/8,36,'background-tiles-0f-30-21-0f.png']);
    }
   }
  }
  patternOverrides.push(...springGraphics.instances.filter(o=>o.level===level.id&&o.area===segment.id).flatMap(o=>o.visualPatterns??[]).filter(t=>t[0]*8<width));
  const hiddenPieces=visualFragments.supersededFreeTiles.filter(c=>c.level===level.id&&c.area===segment.id);
  const visualPieces=visualFragments.additions.filter(c=>c.level===level.id&&c.area===segment.id).flatMap(c=>c.decorations);
  const piece=t=>({x:t.x,y:t.y,id:theme==='underground'&&t.metatileId===71?82:t.metatileId,palette:palette(t.atlas)});
  const mainVine=level.id===sky.level&&segment.id===sky.vineConnection.from;
  const skyEntry=level.id===sky.level&&segment.id===sky.id;
  const vines=[...mainVine?[{id:'coin-vine',x:sky.vineConnection.vine.x,baseY:sky.vineConnection.vine.baseY,topY:sky.vineConnection.vine.topY,
   autoClimbFeetY:sky.vineConnection.vine.automaticClimbTriggerFeetY,transitionFeetY:sky.vineConnection.vine.transitionFeetY,
   to:sky.id,spawn:[sky.vineConnection.target.x,sky.vineConnection.target.feetY],camera:sky.vineConnection.target.cameraX,evidence:sky.vineConnection.status}]:[],
   ...skyEntry?[{id:'sky-entry',x:sky.entryVine.x,baseY:sky.entryVine.baseY,topY:sky.entryVine.topY,initialHeight:sky.entryVine.initialHeight,evidence:sky.entryVine.status}]:[],
   ...warpMain?[{...warpRuntime.mainEntrance.vine,to:warpRuntime.room,spawn:warpRuntime.entry.spawn,camera:0,evidence:warpRuntime.mainEntrance.vineStatus}]:[],
   ...warpEntry?[{...warpRuntime.entry.vine,evidence:warpRuntime.entry.status}]:[],
   ...optionalSkyMain?[{...skyRuntime.mainVine,to:skyRuntime.room,spawn:skyRuntime.entrySpawn,camera:0,evidence:skyRuntime.status}]:[],
   ...optionalSkyEntry?[{...skyRuntime.entryVine,evidence:skyRuntime.status}]:[]];
  for(const r of nativeTileRemovals.filter(r=>r.level===level.id&&r.area===segment.id))tiles=tiles.filter(t=>t[0]!==r.tile[0]||t[1]!==r.tile[1]);
  return {id:segment.id,width,smallPlayerDownStop:playerGroundCalibrations.some(r=>r.level===level.id&&r.area===segment.id)||undefined,cameraEnd:skyEntry?twoOneCloudCameraEnd:optionalSkyEntry?skyRuntime.cameraEnd:undefined,palette:p,theme,background:segment.background,tiles,enemies,pipes,spawn,camera:incoming?.target.cameraX,
   warpZone:roofWarpMain?{cameraEnd:roofWarpRuntime.cameraEnd,activateAtCamera:roofWarpRuntime.activateAtCamera,removePiranhasAtX:roofWarpRuntime.removePiranhasAtX,overlays:roofWarpRuntime.overlays,evidence:roofWarpRuntime.evidence,inferred:roofWarpRuntime.inferred}:undefined,
   spawnVelocity:optionalWaterEntry?waterOptionalEntry.spawnVelocity:coinEntry?[0,bonusEntry.proposed.initialVy]:undergroundEntry?[0,transitions.undergroundEntry.initialVy]:waterEntry?[0,0.0625]:undefined,waterEntryFall:waterEntry||optionalWaterEntry||undefined,
   entryFall:optionalWaterEntry?{initialStandFrames:waterOptionalEntry.initialStandFrames,visibleDelay:waterOptionalEntry.visibleDelay,enemyDelay:0,controlFeetY:waterOptionalEntry.controlFeetY??80,gravity:0,maxFall:4.125,inputDelay:0,timerDelay:0,evidence:waterOptionalEntry.source+'; '+waterOptionalEntry.classification}:coinEntry?{visibleDelay:0,enemyDelay:0,gravityBeforeControl:true,controlFeetY:bonusEntry.horizontalCandidate.releaseFeetY,gravity:bonusEntry.proposed.gravity,maxFall:bonusEntry.proposed.fallCap,inputDelay:0,timerDelay:0,evidence:'Three fresh controlled1-1bonus entry experiments; data/bonus-entry-audit.json. Common falling-entry rule for other coin rooms is inferred from matching appearance, not measured independently in every room.'}:undergroundEntry?{visibleDelay:transitions.undergroundEntry.playerAppearanceDelayFrames,enemyDelay:transitions.undergroundEntry.enemyActivationDelayFrames,controlFeetY:transitions.undergroundEntry.releaseFeet,gravity:transitions.undergroundEntry.gravity,maxFall:transitions.undergroundEntry.maxFall,inputDelay:transitions.undergroundEntry.inputDelayFrames,timerDelay:transitions.undergroundEntry.timerDelayAfterReleaseFrames,native:transitions.undergroundEntry.native,evidence:'Native-trace entry fall (rows 2500..2551 of the recorded route) with image-fitted appearance/enemy delays; see data/transition-measurements.json.'}:undefined,
   platforms:nativePlatforms(level.id,segment.id,optionalSkyEntry?[skyRuntime.platform]:skyEntry?[{x:256,y:161,width:48,axis:'x',range:0,speed:1}]:(correctedEntity?.platforms??optionalRoom?.platforms??entity?.inferredPlatforms??[]).filter(p=>p.x<width)),firebars:withFirebarMotors(level.id,segment.id,(correctedEntity?(correctedEntity.firebarSource?correctedWaterFirebars:correctedEntity.firebars):entity?.inferredFirebars??[]).filter(b=>b.x<width)),
   springs:(entity?.specialObservations??[]).filter(s=>s.kind==='spring').map(s=>{const observed=springGraphics.instances.find(o=>o.level===level.id&&o.area===segment.id&&o.x===s.x&&o.y===s.y);return {x:s.x,y:s.y,...observed?{palette:observed.palette}:{}};}),
   freeTiles:[...segment.freeTiles??[],...upper?.freeTiles??[]].filter(t=>t.x<width).map(piece),hiddenFreeTiles:hiddenPieces.length?hiddenPieces.map(c=>piece(c.match)):undefined,decorations:[...(segment.decorations??[]).filter(t=>t.x<width).map(piece),...visualPieces.map(t=>({...piece(t),aboveFreeTiles:true})),...springGraphics.instances.filter(o=>o.level===level.id&&o.area===segment.id).flatMap(o=>o.visualBase?[o.visualBase]:[])],patternOverrides,overlays:segment.overlays?.map(({text,x,y})=>({text,x,y})),generators,cannons,
   solidRects:(upper?.solidRoofUnions??[]).filter(r=>r.x<width).map(r=>({x:r.x,y:r.y,width:Math.min(r.width,width-r.x),height:r.height,id:r.solidDescriptorId,evidence:r.evidence})),
   autoWalk:(level.connections??[]).some(c=>c.from===segment.id&&c.automaticWalk),maze,mazes,
   vines,blockContents:[...mainVine?[{col:sky.vineConnection.block.col,row:sky.vineConnection.block.row,kind:'vine',vineId:'coin-vine'}]:[],...warpMain?[{col:65,row:5,kind:'vine',vineId:warpRuntime.mainEntrance.vine.id}]:[],...optionalSkyMain?[{col:optionalSky.observed.connection.entrance.blockColumn,row:optionalSky.observed.connection.entrance.blockRow,kind:'vine',vineId:skyRuntime.mainVine.id}]:[],...blockContents.filter(b=>b.level===level.id&&b.area===segment.id).map(({level,area,...block})=>block)],
   entryVine:optionalSkyEntry?{...skyRuntime.entry,vineId:skyRuntime.entryVine.id,evidence:skyRuntime.status}:warpEntry?{vineId:warpRuntime.entry.vine.id,untilFeetY:warpRuntime.entry.untilFeetY,waitUntilGrowthComplete:warpRuntime.entry.waitUntilGrowthComplete,exitRightX:warpRuntime.entry.exitRightX,exitGroundFeetY:warpRuntime.entry.exitGroundFeetY,evidence:warpRuntime.entry.status}:skyEntry?{vineId:'sky-entry',untilFeetY:sky.entryVine.automaticClimbUntilFeetY,waitUntilGrowthComplete:sky.entryVine.waitUntilGrowthComplete,exitRightX:sky.entryVine.exitRightX,exitGroundFeetY:sky.entryVine.exitGroundFeetY,evidence:sky.entryVine.status}:undefined,
   fallExit:optionalSkyEntry?{...skyRuntime.return,evidence:skyRuntime.status}:skyEntry?{...sky.fallExit,evidence:sky.fallExit.status}:undefined,
   exit:castle?.axe?{x:castle.axe.centerX,y:castle.axe.y,kind:'axe',retainerX:castle.rescuedActor?.x,stopX:castle.rescuedActor?.playerStopX}:flag?{x:flag[0]*16+8,kind:'flag',doorX:door?door[0]*16:undefined}:undefined,
   checkpoint:checkpoints.find(c=>c.level===level.id&&c.area===segment.id),
   evidence:`Image observations: ${segment.sourceTrace??'reference-campaign'} ticks${segment.sourceFirstTick}..${segment.sourceLastTick}; initial actors/motion remain inferred.`,
   unresolved:[...(segment.uncertainties??[]),...hiddenPieces.length?['Complete supplied-art visual replacements suppress old raster aliases only when rendering; original freeTile collisions remain preserved and unqualified.']:[],...(lower?[`Lower-row supplement: ${lower.scanTornTiles.length} reconstructed unique metatiles use inferred collision semantics; ${exactLower.length} further cells have independent complete pixel witnesses; ${unresolvedLowerCount} cells remain unresolved.`,...lower.uncertainties]:[]),...semanticBase?[`Semantic196firebarbase at688/208:182directly witnessed pixels,74occluded pixels inferred from supplied assembly; not counted as a whole256pixel recovery. Collision solidity follows the supplied196class and remains inferred.`,missingFirebar.rawImageStatus,missingFirebar.phaseRationale.avoidOverclaim]:[],...corridorBases.map(b=>`Semantic196firebarbase at${b.worldRect[0]}/${b.worldRect[1]}:182observed/74inferred pixels; not a complete256pixel recovery. Fullbase solidity remains inferred; associated firebar motor is qualified separately.`),...(correctedEntity?[]:entity?.unresolved??[]),...[correctedEntity?.classification,correctedEntity?.platformUncertainty,correctedEntity?.coordinateUncertainty,...correctedEntity?.loopUncertainty??[]].filter(Boolean),...correctedEntity?.firebarSource?waterFirebarGeometry.limits:[],...(maze?.unresolved??[]),...mazes.flatMap(m=>m.unresolved??[]),...warpEntry?[warpRuntime.entry.status,warpRuntime.warp.status]:[],...warpMain?[warpRuntime.mainEntrance.evidence,warpRuntime.mainEntrance.vineStatus]:[],...(optionalSkyMain||optionalSkyEntry)?[skyRuntime.status,skyRuntime.platformStatus]:[] ]};
 });
 levels.push({id:level.id,time:time||400,main:areas[0].id,respawnArea:activeSegment.id!==areas[0].id?activeSegment.id:undefined,areas,evidence:`Supplied level-start image + controller-image survey. All fields editable in data/levels.json; regenerate via tools/compile-levels.mjs only when desired.`});
}
if(matchedFirebarMotors.size!==firebarProduction.objects.length)throw Error('Qualified firebar object missing from compiled levels');
applyObservedOpeningPodoboo(levels);
const tallPlant=JSON.parse(fs.readFileSync('data/four-two-tall-piranha-correction.json'));
if(createHash('sha256').update(fs.readFileSync(tallPlant.evidence)).digest('hex')!=='5fa71f8ee3e2d14b869a73edce2dce34394e9fddef904a8b63e6e6b8f9e97019')throw Error('4-2 tall-pipe plant registration changed');
const tallPlantArea=levels.find(l=>l.id===tallPlant.level)?.areas.find(a=>a.id===tallPlant.area);
const tallPlantActor=tallPlantArea?.enemies.find(e=>e.kind==='piranha'&&e.x===tallPlant.old[0]&&e.y===tallPlant.corrected[1]);
if(!tallPlantActor||!tallPlantArea.freeTiles.some(p=>p.id===16&&p.x===tallPlant.pipeLeft&&p.y===tallPlant.pipeTop)||tallPlant.corrected[0]!==tallPlant.pipeLeft+tallPlant.spriteLeftOffsetFromPipe)throw Error('4-2 tall-pipe plant or free pipe top changed');
tallPlantActor.x=tallPlant.corrected[0];tallPlantActor.evidence+='; sprite-left aligns with the independently registered pipe top in three reserved reference images.';
const capEdge=JSON.parse(fs.readFileSync('data/three-three-cap-edge-correction.json'));
if(createHash('sha256').update(fs.readFileSync('evidence/three-three-cap-edge-verification.json')).digest('hex')!=='71d04e1a603c9cff3321bbbf9ec12b4b071bb8831e9e1df56668b4a708e4df0e')throw Error('3-3 cap support proof changed');
const capArea=levels.find(l=>l.id===capEdge.level)?.areas.find(a=>a.id===capEdge.area);
if(!capArea||JSON.stringify(capEdge.tile)!=='[110,7,24]'||!capArea.tiles.some(t=>JSON.stringify(t)==='[109,7,23]')||capArea.tiles.some(([col,row])=>col===110&&row===7))throw Error('3-3 cap end conflicts with the observed middle/empty end');
capArea.tiles.push([...capEdge.tile]);
capArea.unresolved.push(capEdge.qualification);
// Reference frames show the missing upper half of the opening 4-3 mushroom cap.
const fourThreeCap=JSON.parse(fs.readFileSync('evidence/four-three-opening-cap-observation.json'));
const fourThreeArea=levels.find(l=>l.id===fourThreeCap.level)?.areas.find(a=>a.id===fourThreeCap.area);
if(!fourThreeArea||fourThreeCap.proposedTiles.some(([col,row])=>fourThreeArea.tiles.some(t=>t[0]===col&&t[1]===row))||![46,47,48,49,50,51,52,53,54,55,56,57,58,59].every(col=>fourThreeArea.patternOverrides.some(p=>p[0]===col&&p[1]===19)))throw Error('4-3 opening cap geometry changed');
fourThreeArea.tiles.push(...fourThreeCap.proposedTiles.map(t=>[...t]));
fourThreeArea.unresolved.push(fourThreeCap.limitations);
// Two native-image-supported gaps in the 5-3 canopy.
const fiveThreeEvidence='evidence/later-world-five-three-candidate.json';
if(createHash('sha256').update(fs.readFileSync(fiveThreeEvidence)).digest('hex')!=='8eff0ab1be2f684994ceace9f96759cf01bae62b84b4e559b7b9b342283de86b')throw Error('5-3 cap evidence changed');
const fiveThreeCap=JSON.parse(fs.readFileSync(fiveThreeEvidence));
const fiveThreeArea=levels.find(l=>l.id==='5-3')?.areas.find(a=>a.id==='main');
if(!fiveThreeArea||JSON.stringify(fiveThreeCap.candidate.tiles)!=='[[99,11,23],[101,11,24]]'||!fiveThreeArea.tiles.some(t=>JSON.stringify(t)==='[98,11,22]')||!fiveThreeArea.tiles.some(t=>JSON.stringify(t)==='[100,11,23]')||fiveThreeCap.candidate.tiles.some(([col,row])=>fiveThreeArea.tiles.some(t=>t[0]===col&&t[1]===row)))throw Error('5-3 cap geometry changed');
fiveThreeArea.tiles.push(...fiveThreeCap.candidate.tiles.map(t=>[...t]));
fiveThreeArea.unresolved.push(...fiveThreeCap.limits.slice(0,2));
// Restore the reference-visible second half of the 4-4 lava ledge.
const fourFourEvidence='evidence/four-four-lava-ledge-observation.json';
if(createHash('sha256').update(fs.readFileSync(fourFourEvidence)).digest('hex')!=='8abe1e6ba158d714b00086ca7c6539627c06e76d140730b756591c676c4699a7')throw Error('4-4 ledge evidence changed');
const fourFourLedge=JSON.parse(fs.readFileSync(fourFourEvidence));
const fourFourArea=levels.find(l=>l.id===fourFourLedge.level)?.areas.find(a=>a.id===fourFourLedge.area);
if(!fourFourArea||JSON.stringify(fourFourLedge.tile)!=='[87,10,98]'||!fourFourArea.tiles.some(t=>JSON.stringify(t)==='[86,10,98]')||fourFourArea.tiles.some(([c,r])=>c===87&&r===10))throw Error('4-4 ledge geometry changed');
fourFourArea.tiles.push([...fourFourLedge.tile]);
fourFourArea.unresolved.push(fourFourLedge.rgbQualification,fourFourLedge.collisionQualification);
// Native images show masonry in this gap and a low solid underside nearby.
const fourFourShelfEvidence='evidence/world-four-four-shelf-proposal.json';
if(createHash('sha256').update(fs.readFileSync(fourFourShelfEvidence)).digest('hex')!=='c28093b254b66961cde24dc74457128754eefdb3557fb9fe64a8ac8f51dd783e')throw Error('4-4 shelf evidence changed');
const fourFourShelf=JSON.parse(fs.readFileSync(fourFourShelfEvidence));
if(JSON.stringify(fourFourShelf.proposal.tiles)!=='[[121,10,98],[122,10,98],[123,10,98]]'||![120,124].every(col=>fourFourArea.tiles.some(([c,r,id])=>c===col&&r===10&&id===98))||fourFourShelf.proposal.tiles.some(([col,row])=>fourFourArea.tiles.some(([c,r])=>c===col&&r===row)))throw Error('4-4 shelf geometry changed');
fourFourArea.tiles.push(...fourFourShelf.proposal.tiles.map(t=>[...t]));
fourFourArea.unresolved.push(fourFourShelf.proposal.qualification,...fourFourShelf.limits.slice(1,3));
// One upper sighting was duplicated; two native images show an additional lower Bro.
const sevenOneEvidence='evidence/seven-one-hammer-layout-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sevenOneEvidence)).digest('hex')!=='bc2611f3808ab3d69fa20ed736618add17d3e1f3e1f876ca287a62f0eb222e79')throw Error('7-1 Hammer Bro evidence changed');
const sevenOne=JSON.parse(fs.readFileSync(sevenOneEvidence));
const sevenOneArea=levels.find(l=>l.id==='7-1')?.areas.find(a=>a.id==='main');
const sevenOneIndex=sevenOneArea?.enemies.findIndex(e=>JSON.stringify(e)===JSON.stringify(sevenOne.proposal.old))??-1;
if(!sevenOneArea||sevenOneIndex<0||!sevenOneArea.enemies.some(e=>e.kind==='hammerBro'&&e.x===1376&&e.y===80)||JSON.stringify([sevenOne.proposal.replacement.x,sevenOne.proposal.replacement.y])!=='[1344,144]')throw Error('7-1 Hammer Bro layout changed');
sevenOneArea.enemies[sevenOneIndex]={...sevenOne.proposal.replacement};
sevenOneArea.unresolved.push(sevenOne.proposal.limits);
// A later native encounter shows a second Bro above the ground actor.
const sevenOneLaterEvidence='evidence/seven-one-later-hammer-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sevenOneLaterEvidence)).digest('hex')!=='f8cfcba670e027217d5f419a37d1ec04cb8a06b55f542914207117f4922aafd9')throw Error('7-1 later Hammer Bro evidence changed');
const sevenOneLater=JSON.parse(fs.readFileSync(sevenOneLaterEvidence));
const sevenOneLaterActors=sevenOneArea.enemies.filter(e=>e.kind==='hammerBro'&&e.x>=2100&&e.x<=2250);
if(JSON.stringify(sevenOneLaterActors)!==JSON.stringify(sevenOneLater.current)||JSON.stringify([sevenOneLater.proposal.add.x,sevenOneLater.proposal.add.y])!=='[2208,144]')throw Error('7-1 later Hammer Bro layout changed');
sevenOneArea.enemies.push({...sevenOneLater.proposal.add});
sevenOneArea.unresolved.push(sevenOneLater.proposal.limits);
// Native images show simultaneous upper- and lower-ledge Bros in 8-3.
const eightThreeEvidence='evidence/eight-three-upper-bro-proposal.json';
if(createHash('sha256').update(fs.readFileSync(eightThreeEvidence)).digest('hex')!=='b2908c8d09473ea5cc48abb0bd9e6c595f0897032522d747979476878056518e')throw Error('8-3 Hammer Bro evidence changed');
const eightThree=JSON.parse(fs.readFileSync(eightThreeEvidence));
const eightThreeArea=levels.find(l=>l.id==='8-3')?.areas.find(a=>a.id==='main');
const eightThreeFirst=eightThreeArea?.enemies.filter(e=>e.kind==='hammerBro'&&e.x<1200);
if(!eightThreeArea||JSON.stringify(eightThreeFirst)!==JSON.stringify([eightThree.proposal.retain])||JSON.stringify([eightThree.proposal.addition.x,eightThree.proposal.addition.y])!=='[1056,80]')throw Error('8-3 Hammer Bro layout changed');
eightThreeArea.enemies.splice(eightThreeArea.enemies.indexOf(eightThreeFirst[0])+1,0,{...eightThree.proposal.addition});
eightThreeArea.unresolved.push(eightThree.proposal.limits);
// Match the plant to the independently registered elevated pipe and brick row.
const fiveOneEvidence='evidence/five-one-elevated-piranha-proposal.json';
if(createHash('sha256').update(fs.readFileSync(fiveOneEvidence)).digest('hex')!=='303be90ba3015ba49691cb025dcefdc6dc53bdd814a7a60a7556da8da91c3793')throw Error('5-1 Piranha evidence changed');
const fiveOne=JSON.parse(fs.readFileSync(fiveOneEvidence));
const fiveOneArea=levels.find(l=>l.id==='5-1')?.areas.find(a=>a.id==='main');
const fiveOneIndex=fiveOneArea?.enemies.findIndex(e=>JSON.stringify(e)===JSON.stringify(fiveOne.proposal.old))??-1;
if(!fiveOneArea||fiveOneIndex<0||fiveOne.proposal.replacement.x!==2502)throw Error('5-1 Piranha layout changed');
fiveOneArea.enemies[fiveOneIndex]={...fiveOne.proposal.replacement};
fiveOneArea.unresolved.push(fiveOne.proposal.limits);
// A fresh controlled reference approach shows support at the left canopy end.
const threeThreeLeftEvidence='evidence/world-three-left-support-proposal.json';
if(createHash('sha256').update(fs.readFileSync(threeThreeLeftEvidence)).digest('hex')!=='50777143d00d5ab80562b9e316937a17fd1e9d26b9ccaf4e7399329b0619949b')throw Error('3-3 left canopy evidence changed');
const threeThreeLeft=JSON.parse(fs.readFileSync(threeThreeLeftEvidence));
const threeThreeArea=levels.find(l=>l.id==='3-3')?.areas.find(a=>a.id==='main');
if(!threeThreeArea||JSON.stringify(threeThreeLeft.proposal.tile)!=='[108,7,22]'||threeThreeArea.tiles.some(([x,y])=>x===108&&y===7))throw Error('3-3 left canopy geometry changed');
threeThreeArea.tiles.push([...threeThreeLeft.proposal.tile]);
threeThreeArea.unresolved.push('3-3 left canopy support is observed; tile identity and collider extent inferred. Best source art comparison differs by 3/256 pixels and fails the fixed 99% RGB threshold; native collision event timing is unqualified.');
// Two controlled reference hits show the upper question block yields a mushroom.
const threeThreeQuestionEvidence='evidence/world-three-question-proposal.json';
if(createHash('sha256').update(fs.readFileSync(threeThreeQuestionEvidence)).digest('hex')!=='03fe94a5bc29aea715ea625e967a4fd7b57b793773ba85c9804cc5e213e90133')throw Error('3-3 question block evidence changed');
const threeThreeQuestion=JSON.parse(fs.readFileSync(threeThreeQuestionEvidence));
const questionFreeIndex=threeThreeArea.freeTiles?.findIndex(t=>JSON.stringify(t)===JSON.stringify(threeThreeQuestion.proposal.removeFreeTile))??-1;
if(questionFreeIndex<0||JSON.stringify(threeThreeQuestion.proposal.insertGridTile)!=='[49,3,192]'||threeThreeArea.tiles.some(([x,y])=>x===49&&y===3)||threeThreeArea.blockContents?.some(b=>b.col===49&&b.row===3))throw Error('3-3 question block layout changed');
threeThreeArea.freeTiles.splice(questionFreeIndex,1);
threeThreeArea.tiles.push([...threeThreeQuestion.proposal.insertGridTile]);
threeThreeArea.blockContents??=[];
threeThreeArea.blockContents.push({...threeThreeQuestion.proposal.blockContent});
threeThreeArea.unresolved.push(threeThreeQuestion.proposal.status);
// Two tall pipes visibly contain plants in the reference campaign.
const fourOneEvidence='evidence/four-one-tall-plants-plan.json';
if(createHash('sha256').update(fs.readFileSync(fourOneEvidence)).digest('hex')!=='a00c3fe338afbfb72e2899cea7fbf185235b72d14d73812c6ded56433ea198b4')throw Error('4-1 tall Piranha evidence changed');
const fourOne=JSON.parse(fs.readFileSync(fourOneEvidence));
const fourOneArea=levels.find(l=>l.id==='4-1')?.areas.find(a=>a.id==='main');
if(!fourOneArea||JSON.stringify(fourOne.proposedActors.map(e=>[e.x,e.y]))!=='[[1864,168],[2120,168]]'||fourOneArea.enemies.some(e=>e.kind==='piranha'&&fourOne.proposedActors.some(p=>p.x===e.x)))throw Error('4-1 tall Piranha layout changed');
for(const actor of fourOne.proposedActors)fourOneArea.enemies.push({...actor,evidence:'Visible plant above the tall pipe in native campaign images; initial position and phase inferred.'});
fourOneArea.unresolved.push(fourOne.qualification);
// The 6-4 chain is visible before the axe and vanishes after contact.
const sixFourEvidence='evidence/six-four-chain-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sixFourEvidence)).digest('hex')!=='7e67660502dd8353bf7f01b41e500734596f2d1fb524b0b3a6df5ba59bd09e29')throw Error('6-4 chain evidence changed');
const sixFour=JSON.parse(fs.readFileSync(sixFourEvidence));
const sixFourArea=levels.find(l=>l.id==='6-4')?.areas.find(a=>a.id==='main');
if(!sixFourArea||JSON.stringify(sixFour.proposal.tile)!=='[139,9,12]'||sixFourArea.tiles.some(([x,y])=>x===139&&y===9))throw Error('6-4 chain geometry changed');
sixFourArea.tiles.push([...sixFour.proposal.tile]);
sixFourArea.unresolved.push(sixFour.proposal.caveat);
// Firebar centers obscure part of each 2-4 pivot base in the native frames.
const twoFourEvidence='evidence/two-four-firebar-bases-proposal.json';
if(createHash('sha256').update(fs.readFileSync(twoFourEvidence)).digest('hex')!=='36d67d67ab3e18fbf3bfde37784f08b3dbc91e1eb1e7c16cb9a93f8f7a838cdb')throw Error('2-4 firebar base evidence changed');
const twoFour=JSON.parse(fs.readFileSync(twoFourEvidence));
const twoFourArea=levels.find(l=>l.id==='2-4')?.areas.find(a=>a.id==='main');
if(!twoFourArea||JSON.stringify(twoFour.cases.map(c=>c.tile))!=='[[49,9,196],[73,9,196],[92,10,196]]'||twoFour.cases.some(c=>twoFourArea.tiles.some(([x,y])=>x===c.tile[0]&&y===c.tile[1])))throw Error('2-4 firebar base geometry changed');
for(const c of twoFour.cases)twoFourArea.tiles.push([...c.tile]);
twoFourArea.unresolved.push(twoFour.qualification);
// The later wingless sighting follows a visible stomp of the winged actor.
const eightTwoEvidence='evidence/eight-two-koopa-track-proposal.json';
if(createHash('sha256').update(fs.readFileSync(eightTwoEvidence)).digest('hex')!=='d62e6e4081b88d596071449149821d831f0d00d60efad7e34d2f4a891754a113')throw Error('8-2 Koopa track evidence changed');
const eightTwo=JSON.parse(fs.readFileSync(eightTwoEvidence));
const eightTwoArea=levels.find(l=>l.id==='8-2')?.areas.find(a=>a.id==='main');
const eightTwoIndex=eightTwoArea?.enemies.findIndex(e=>JSON.stringify(e)===JSON.stringify(eightTwo.proposal.remove))??-1;
if(!eightTwoArea||eightTwoIndex<0||!eightTwoArea.enemies.some(e=>JSON.stringify(e)===JSON.stringify(eightTwo.proposal.retain)))throw Error('8-2 Koopa track changed');
eightTwoArea.enemies.splice(eightTwoIndex,1);
eightTwoArea.unresolved.push(eightTwo.inferred);
// Two controlled reference hits yield a mushroom at this castle question block.
const threeFourEvidence='evidence/world-three-four-question-proposal.json';
if(createHash('sha256').update(fs.readFileSync(threeFourEvidence)).digest('hex')!=='07e2de0a226962cdea6545b618eaa49eb06bea926f6074a13a3646413c8c1336')throw Error('3-4 question block evidence changed');
const threeFour=JSON.parse(fs.readFileSync(threeFourEvidence));
const threeFourArea=levels.find(l=>l.id==='3-4')?.areas.find(a=>a.id==='main');
if(!threeFourArea||!threeFourArea.tiles.some(([x,y,id])=>x===43&&y===9&&id===192)||threeFourArea.blockContents?.some(b=>b.col===43&&b.row===9)||threeFour.proposal.kind!=='powerup')throw Error('3-4 question block layout changed');
threeFourArea.blockContents??=[];
threeFourArea.blockContents.push({col:43,row:9,kind:'powerup'});
threeFourArea.unresolved.push(threeFour.proposal.qualifications);
// A stopped-camera reference shows the aligned 6-1 stairs and their bottom wall.
const sixOneEvidence='evidence/six-one-stair-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sixOneEvidence)).digest('hex')!=='e4dd2a4c3692b7e25a87dbf5699e171d173d223107ffc0d92692e174b453b682')throw Error('6-1 stair evidence changed');
const sixOne=JSON.parse(fs.readFileSync(sixOneEvidence));
const sixOneArea=levels.find(l=>l.id==='6-1')?.areas.find(a=>a.id==='main');
if(!sixOneArea||sixOne.proposal.removeFragments.length!==9||JSON.stringify(sixOne.proposal.addTiles)!=='[[69,12,97],[70,11,97],[71,10,97]]')throw Error('6-1 stair proposal changed');
for(const fragment of sixOne.proposal.removeFragments){const i=sixOneArea.freeTiles?.findIndex(t=>JSON.stringify(t)===JSON.stringify(fragment))??-1;if(i<0)throw Error('6-1 stair fragment changed');sixOneArea.freeTiles.splice(i,1);}
for(const tile of sixOne.proposal.addTiles){if(sixOneArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('6-1 stair tile changed');sixOneArea.tiles.push([...tile]);}
sixOneArea.unresolved.push('Fresh reference images establish the stair appearance and stopped position; exact native contact timing and collision bounds remain unqualified.');
// Replace duplicated 5-1 pipe fragments with the six observed aligned cells.
const fiveOnePipeEvidence='evidence/five-one-pipe-contact-comparison.json';
if(createHash('sha256').update(fs.readFileSync(fiveOnePipeEvidence)).digest('hex')!=='ef7f82e3068d05a0f1a080155b70087af5c67475164c4090f92172924173416a')throw Error('5-1 pipe evidence changed');
const fiveOnePipeGrid=[[156,7,16],[156,8,20],[156,9,97],[157,7,17],[157,8,21],[157,9,97]];
for(const tile of fiveOnePipeGrid){const i=fiveOneArea.tiles.findIndex(t=>JSON.stringify(t)===JSON.stringify(tile));if(i<0)throw Error('5-1 pipe grid changed');fiveOneArea.tiles.splice(i,1);}
for(const [y,id] of [[112,17],[128,21],[144,97]]){const piece=fiveOneArea.freeTiles?.find(t=>t.x===2509&&t.y===y&&t.id===id);if(!piece)throw Error('5-1 pipe fragment changed');piece.x=2510;}
// Native collision map (RAM 0x5d0 columns 156-157, rows y 112-144), 26 side contacts at x 2484 (x+13 = 2497) and the plant object at x 2504 = pipe left + 8 put the pipe on the grid at 2496: the screenshot cells were 2 px left.
for(const piece of fiveOneArea.freeTiles.filter(t=>[2494,2510].includes(t.x)&&[112,128,144].includes(t.y)))piece.x+=2;
fiveOneArea.enemies.find(e=>e.kind==='piranha'&&e.x===2502).x=2504;
fiveOneArea.unresolved.push('The pipe composition is observed; native support-loss timing, velocity and hitbox remain unqualified. Conditional candidate fixtures pass 3/32 subpixel assumptions at the fixed 2px bound, versus 0/32 for the overlapping baseline.');
// The 8-1 wingless sighting follows a visible stomp of the winged Koopa.
const eightOneEvidence='evidence/eight-one-winged-duplicate-proposal.json';
if(createHash('sha256').update(fs.readFileSync(eightOneEvidence)).digest('hex')!=='013d46366a980fd74e7d249b001ac7f0c1608317675cfed2bb4535294f18a179')throw Error('8-1 Koopa evidence changed');
const eightOne=JSON.parse(fs.readFileSync(eightOneEvidence));
const eightOneArea=levels.find(l=>l.id==='8-1')?.areas.find(a=>a.id==='main');
const eightOneIndex=eightOneArea?.enemies.findIndex(e=>JSON.stringify(e)===JSON.stringify(eightOne.proposal.remove))??-1;
if(!eightOneArea||eightOneIndex<0||!eightOneArea.enemies.some(e=>JSON.stringify(e)===JSON.stringify(eightOne.proposal.keep)))throw Error('8-1 Koopa track changed');
eightOneArea.enemies.splice(eightOneIndex,1);
eightOneArea.unresolved.push(eightOne.proposal.limits);
// Two coins over the later 8-1 gap are visible in the source and collected.
const eightOneGapEvidence='evidence/eight-one-gap-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(eightOneGapEvidence)).digest('hex')!=='8f73be59406cc4d1a5c835f3fe01b217e0bcf9b915bdb2ef9cab7614732fd179')throw Error('8-1 gap coin proposal changed');
const eightOneGap=JSON.parse(fs.readFileSync(eightOneGapEvidence));
if(createHash('sha256').update(fs.readFileSync(eightOneGap.sourceAudit)).digest('hex')!==eightOneGap.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(eightOneGap.candidatePlan)).digest('hex')!==eightOneGap.candidatePlanSha256)throw Error('8-1 gap coin source evidence changed');
if(eightOneGap.level!=='8-1'||eightOneGap.area!=='main'||JSON.stringify(eightOneGap.addTiles)!=='[[223,8,194],[224,8,194]]')throw Error('8-1 gap coin cells changed');
for(const tile of eightOneGap.addTiles){if(eightOneArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('8-1 gap coin cell occupied');eightOneArea.tiles.push([...tile]);}
eightOneArea.unresolved.push(eightOneGap.qualification);
// Two ordinary native head hits award one coin from the elevated 3-1 Q.
const threeOneOffsetEvidence='evidence/world-three-one-fragment-proposal.json';
if(createHash('sha256').update(fs.readFileSync(threeOneOffsetEvidence)).digest('hex')!=='3b030ac5a9f799dff5bd352c4c495fb6d5c0f277937f037d37d1ff30b81b58e5')throw Error('3-1 offset Q evidence changed');
const threeOneOffset=JSON.parse(fs.readFileSync(threeOneOffsetEvidence));
const threeOneArea=levels.find(l=>l.id==='3-1')?.areas.find(a=>a.id==='main');
const threeOnePieces=threeOneArea?.freeTiles?.filter(p=>JSON.stringify(p)===JSON.stringify(threeOneOffset.candidate.fragment))??[];
if(!threeOneArea||threeOnePieces.length!==1||threeOneOffset.candidate.kind!=='coin')throw Error('3-1 offset Q identity changed');
threeOnePieces[0].interactive=true;
threeOneArea.unresolved.push('3-1 elevated Q coin is observed twice; x1805 and collision bounds are inferred, and native alignment varies across captures. Repeated hit, checkpoint reset and exact native bump timing remain unqualified.');
// Four coins are visible on the 1-2 ledge and collected in source play.
const oneTwoCoinEvidence='evidence/one-two-four-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(oneTwoCoinEvidence)).digest('hex')!=='bd6f3ff82c86fe9edda386b3365163daafe99833e8e140a353003bac448e8d51')throw Error('1-2 coin evidence changed');
const oneTwoCoins=JSON.parse(fs.readFileSync(oneTwoCoinEvidence));
if(createHash('sha256').update(fs.readFileSync(oneTwoCoins.sourceAudit)).digest('hex')!==oneTwoCoins.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(oneTwoCoins.candidatePlan)).digest('hex')!==oneTwoCoins.candidatePlanSha256)throw Error('1-2 coin source evidence changed');
const oneTwoCoinArea=levels.find(l=>l.id===oneTwoCoins.level)?.areas.find(a=>a.id===oneTwoCoins.area);
if(!oneTwoCoinArea||JSON.stringify(oneTwoCoins.addTiles)!=='[[58,8,194],[59,8,194],[60,8,194],[61,8,194]]')throw Error('1-2 coin proposal changed');
for(const tile of oneTwoCoins.addTiles){if(oneTwoCoinArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('1-2 coin cell occupied');oneTwoCoinArea.tiles.push([...tile]);}
oneTwoCoinArea.unresolved.push(oneTwoCoins.qualification);
// The preceding C-shaped structure has two further observed upper coins.
const oneTwoUpperEvidence='evidence/one-two-upper-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(oneTwoUpperEvidence)).digest('hex')!=='8f89e8a4a9aad1240a9a57b45cb4fa9708c85af529186b6d3bf462eb92c16d54')throw Error('1-2 upper coin evidence changed');
const oneTwoUpper=JSON.parse(fs.readFileSync(oneTwoUpperEvidence));
if(createHash('sha256').update(fs.readFileSync(oneTwoUpper.sourceAudit)).digest('hex')!==oneTwoUpper.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(oneTwoUpper.candidatePlan)).digest('hex')!==oneTwoUpper.candidatePlanSha256)throw Error('1-2 upper coin source evidence changed');
if(oneTwoUpper.level!=='1-2'||oneTwoUpper.area!=='area-2'||JSON.stringify(oneTwoUpper.addTiles)!=='[[43,5,194],[44,5,194]]')throw Error('1-2 upper coin proposal changed');
for(const tile of oneTwoUpper.addTiles){if(oneTwoCoinArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('1-2 upper coin cell occupied');oneTwoCoinArea.tiles.push([...tile]);}
oneTwoCoinArea.unresolved.push(oneTwoUpper.qualification);
// Ten coins are observed and collected on the 4-2 underground ledge.
const fourTwoLedgeCoinEvidence='evidence/four-two-ledge-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(fourTwoLedgeCoinEvidence)).digest('hex')!=='d2f6d413197caa739c47814f856c6e8a4c436bea3f332fb0f434fad2ce42d467')throw Error('4-2 ledge coin proposal changed');
const fourTwoLedgeCoins=JSON.parse(fs.readFileSync(fourTwoLedgeCoinEvidence));
if(createHash('sha256').update(fs.readFileSync(fourTwoLedgeCoins.sourceAudit)).digest('hex')!==fourTwoLedgeCoins.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(fourTwoLedgeCoins.candidatePlan)).digest('hex')!==fourTwoLedgeCoins.candidatePlanSha256)throw Error('4-2 ledge coin source evidence changed');
const fourTwoLedgeArea=levels.find(l=>l.id==='4-2')?.areas.find(a=>a.id==='area-3');
if(!fourTwoLedgeArea||fourTwoLedgeCoins.level!=='4-2'||fourTwoLedgeCoins.area!=='area-3'||JSON.stringify(fourTwoLedgeCoins.addTiles)!==JSON.stringify(Array.from({length:10},(_,i)=>[163+i,8,194])))throw Error('4-2 ledge coin cells changed');
for(const tile of fourTwoLedgeCoins.addTiles){if(fourTwoLedgeArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('4-2 ledge coin cell occupied');fourTwoLedgeArea.tiles.push([...tile]);}
fourTwoLedgeArea.unresolved.push(fourTwoLedgeCoins.qualification);
// Two coins above the 1-3 tree gap are observed and collected in source play.
const oneThreeGapEvidence='evidence/one-three-gap-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(oneThreeGapEvidence)).digest('hex')!=='401de407d472e8c62a08e697d1d386f0aaaa7dd3a0351cd81f4c55dfa38014a8')throw Error('1-3 gap coin proposal changed');
const oneThreeGap=JSON.parse(fs.readFileSync(oneThreeGapEvidence));
if(createHash('sha256').update(fs.readFileSync(oneThreeGap.sourceAudit)).digest('hex')!==oneThreeGap.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(oneThreeGap.candidatePlan)).digest('hex')!==oneThreeGap.candidatePlanSha256)throw Error('1-3 gap coin source evidence changed');
const oneThreeGapArea=levels.find(l=>l.id==='1-3')?.areas.find(a=>a.id==='main');
if(!oneThreeGapArea||oneThreeGap.level!=='1-3'||oneThreeGap.area!=='main'||JSON.stringify(oneThreeGap.addTiles)!=='[[120,5,194],[121,5,194]]')throw Error('1-3 gap coin cells changed');
for(const tile of oneThreeGap.addTiles){if(oneThreeGapArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('1-3 gap coin cell occupied');oneThreeGapArea.tiles.push([...tile]);}
oneThreeGapArea.unresolved.push(oneThreeGap.qualification);
// Three more coins complete the source-observed 7-3 bridge row.
const sevenThreeBridgeEvidence='evidence/seven-three-bridge-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sevenThreeBridgeEvidence)).digest('hex')!=='d3d87e154739024308748dfe0950f752dd521222178a70a48195e9238f1bd286')throw Error('7-3 bridge coin proposal changed');
const sevenThreeBridge=JSON.parse(fs.readFileSync(sevenThreeBridgeEvidence));
if(createHash('sha256').update(fs.readFileSync(sevenThreeBridge.sourceAudit)).digest('hex')!==sevenThreeBridge.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(sevenThreeBridge.candidatePlan)).digest('hex')!==sevenThreeBridge.candidatePlanSha256)throw Error('7-3 bridge coin source evidence changed');
const sevenThreeBridgeArea=levels.find(l=>l.id==='7-3')?.areas.find(a=>a.id==='main');
if(!sevenThreeBridgeArea||sevenThreeBridge.level!=='7-3'||sevenThreeBridge.area!=='main'||JSON.stringify(sevenThreeBridge.existingTile)!=='[36,5,194]'||JSON.stringify(sevenThreeBridge.addTiles)!=='[[37,5,194],[38,5,194],[39,5,194]]'||!sevenThreeBridgeArea.tiles.some(t=>JSON.stringify(t)===JSON.stringify(sevenThreeBridge.existingTile)))throw Error('7-3 bridge coin cells changed');
for(const tile of sevenThreeBridge.addTiles){if(sevenThreeBridgeArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('7-3 bridge coin cell occupied');sevenThreeBridgeArea.tiles.push([...tile]);}
sevenThreeBridgeArea.unresolved.push(sevenThreeBridge.qualification);
// Two coins over the 5-3 tree gap are visible in consecutive source frames.
const fiveThreeGapEvidence='evidence/five-three-gap-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(fiveThreeGapEvidence)).digest('hex')!=='8618d92bf09ffcadd7226e3d86b321928e11afd013d0aacbc03af61b7253933d')throw Error('5-3 gap coin proposal changed');
const fiveThreeGap=JSON.parse(fs.readFileSync(fiveThreeGapEvidence));
if(createHash('sha256').update(fs.readFileSync(fiveThreeGap.sourceAudit)).digest('hex')!==fiveThreeGap.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(fiveThreeGap.candidatePlan)).digest('hex')!==fiveThreeGap.candidatePlanSha256)throw Error('5-3 gap coin source evidence changed');
const fiveThreeGapArea=levels.find(l=>l.id==='5-3')?.areas.find(a=>a.id==='main');
if(!fiveThreeGapArea||fiveThreeGap.level!=='5-3'||fiveThreeGap.area!=='main'||JSON.stringify(fiveThreeGap.addTiles)!=='[[85,5,194],[86,5,194]]')throw Error('5-3 gap coin cells changed');
for(const tile of fiveThreeGap.addTiles){if(fiveThreeGapArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('5-3 gap coin cell occupied');fiveThreeGapArea.tiles.push([...tile]);}
fiveThreeGapArea.unresolved.push(fiveThreeGap.qualification);
// A second coin completes the left source-observed 5-3 upper pair.
const fiveThreeUpperEvidence='evidence/five-three-upper-coin-proposal.json';
if(createHash('sha256').update(fs.readFileSync(fiveThreeUpperEvidence)).digest('hex')!=='b47c5e5f371c6f1633ece99bce1d957ee9e2ab3643a11f829cfe91c992759f1e')throw Error('5-3 upper coin proposal changed');
const fiveThreeUpper=JSON.parse(fs.readFileSync(fiveThreeUpperEvidence));
if(createHash('sha256').update(fs.readFileSync(fiveThreeUpper.sourceAudit)).digest('hex')!==fiveThreeUpper.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(fiveThreeUpper.candidatePlan)).digest('hex')!==fiveThreeUpper.candidatePlanSha256)throw Error('5-3 upper coin source evidence changed');
if(fiveThreeUpper.level!=='5-3'||fiveThreeUpper.area!=='main'||JSON.stringify(fiveThreeUpper.addTiles)!=='[[94,4,194]]'||JSON.stringify(fiveThreeUpper.existingTiles)!=='[[93,4,194],[97,4,194],[98,4,194]]'||fiveThreeUpper.existingTiles.some(t=>!fiveThreeGapArea.tiles.some(old=>JSON.stringify(old)===JSON.stringify(t)))||fiveThreeGapArea.tiles.some(([x,y])=>x===94&&y===4))throw Error('5-3 upper coin cells changed');
fiveThreeGapArea.tiles.push([...fiveThreeUpper.addTiles[0]]);
fiveThreeGapArea.unresolved.push(fiveThreeUpper.qualification);
// Two missing coins complete the source-observed 6-1 gap row.
const sixOneGapEvidence='evidence/six-one-gap-coins-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sixOneGapEvidence)).digest('hex')!=='bf64ea2d454150fe393e5dce6a4905bc85da9deb4342637fe4b0b900b7b17cab')throw Error('6-1 gap coin proposal changed');
const sixOneGap=JSON.parse(fs.readFileSync(sixOneGapEvidence));
if(createHash('sha256').update(fs.readFileSync(sixOneGap.sourceAudit)).digest('hex')!==sixOneGap.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(sixOneGap.candidatePlan)).digest('hex')!==sixOneGap.candidatePlanSha256)throw Error('6-1 gap coin source evidence changed');
const sixOneGapArea=levels.find(l=>l.id==='6-1')?.areas.find(a=>a.id==='main');
if(!sixOneGapArea||sixOneGap.level!=='6-1'||sixOneGap.area!=='main'||JSON.stringify(sixOneGap.existingTile)!=='[107,8,194]'||JSON.stringify(sixOneGap.addTiles)!=='[[105,8,194],[106,8,194]]'||!sixOneGapArea.tiles.some(t=>JSON.stringify(t)===JSON.stringify(sixOneGap.existingTile)))throw Error('6-1 gap coin cells changed');
for(const tile of sixOneGap.addTiles){if(sixOneGapArea.tiles.some(([x,y])=>x===tile[0]&&y===tile[1]))throw Error('6-1 gap coin cell occupied');sixOneGapArea.tiles.push([...tile]);}
sixOneGapArea.unresolved.push(sixOneGap.qualification);
// 2-2 water room pillar top at columns 172-173: the extracted 2-2 map lacks rows 3-4 there, the 7-2 copy of the same room has them, and native Mario stands on that top (y 16) for 153 of 153 free-play rows at x 2759..2781 in 2-2 (93 of 93 in 7-2). evidence/water3-findings-20261111.md
{const to=levels.find(l=>l.id==='2-2')?.areas.find(a=>a.id==='area-2'),from=levels.find(l=>l.id==='7-2')?.areas.find(a=>a.id==='area-4');
 if(to&&from)for(const c of [172,173])for(const r of [3,4]){const t=from.tiles.find(([x,y])=>x===c&&y===r);if(t&&!to.tiles.some(([x,y])=>x===c&&y===r))to.tiles.push([...t]);}}
// The registered source row has one third coin; discard its offset raster alias.
const sixOneThirdEvidence='evidence/six-one-third-coin-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sixOneThirdEvidence)).digest('hex')!=='6eac1614f448e230322e7f69e93dd6ab8814821d54666d9aaa1c123caac31a1e')throw Error('6-1 third coin proposal changed');
const sixOneThird=JSON.parse(fs.readFileSync(sixOneThirdEvidence));
if(createHash('sha256').update(fs.readFileSync(sixOneThird.sourceAudit)).digest('hex')!==sixOneThird.sourceAuditSha256||createHash('sha256').update(fs.readFileSync(sixOneThird.candidatePlan)).digest('hex')!==sixOneThird.candidatePlanSha256)throw Error('6-1 third coin source evidence changed');
const sixOneThirdIndex=sixOneGapArea.freeTiles.findIndex(t=>JSON.stringify(t)===JSON.stringify(sixOneThird.removeFreeTile));
if(sixOneThird.level!=='6-1'||sixOneThird.area!=='main'||JSON.stringify(sixOneThird.preserveTile)!=='[107,8,194]'||JSON.stringify(sixOneThird.removeFreeTile)!=='{"x":1709,"y":128,"id":194,"palette":16}'||!sixOneGapArea.tiles.some(t=>JSON.stringify(t)===JSON.stringify(sixOneThird.preserveTile))||sixOneThirdIndex<0||sixOneGapArea.freeTiles.filter(t=>JSON.stringify(t)===JSON.stringify(sixOneThird.removeFreeTile)).length!==1)throw Error('6-1 third coin identity changed');
sixOneGapArea.freeTiles.splice(sixOneThirdIndex,1);
sixOneGapArea.unresolved.push('The overlapping x=1709 free coin described above was subsequently resolved as a visual alias and removed. '+sixOneThird.qualification);
// Three submerged 7-2 coins are visible and collected in the source images.
const sevenTwoEvidence='evidence/seven-two-coin-inventory-proposal.json';
if(createHash('sha256').update(fs.readFileSync(sevenTwoEvidence)).digest('hex')!=='16f82c339137c61bd335dae4dbe9c5dec51852346704630f477c4e3e5584e139')throw Error('7-2 coin evidence changed');
const sevenTwo=JSON.parse(fs.readFileSync(sevenTwoEvidence));
const sevenTwoArea=levels.find(l=>l.id===sevenTwo.level)?.areas.find(a=>a.id===sevenTwo.area);
if(!sevenTwoArea||JSON.stringify(sevenTwo.replace)!=='[[101,11,195],[102,11,195],[103,11,195]]')throw Error('7-2 coin proposal changed');
for(let i=0;i<sevenTwo.match.length;i++){const index=sevenTwoArea.tiles.findIndex(t=>JSON.stringify(t)===JSON.stringify(sevenTwo.match[i]));if(index<0)throw Error('7-2 coin cell changed');sevenTwoArea.tiles[index]=[...sevenTwo.replace[i]];}
sevenTwoArea.unresolved.push(sevenTwo.qualification);
// Native Mario stands on, then jumps from, this low orange 4-3 canopy.
const fourThreeCapEvidence='evidence/four-three-canopy-84-plan.json';
if(createHash('sha256').update(fs.readFileSync(fourThreeCapEvidence)).digest('hex')!=='bfd8e07b6cde5afd3390a6e4e07042ae43c53704fc228dfbe344e4e1d0cee46a')throw Error('4-3 low canopy evidence changed');
const fourThreeLowCap=JSON.parse(fs.readFileSync(fourThreeCapEvidence));
if(!fourThreeArea||JSON.stringify(fourThreeLowCap.proposedTiles)!=='[[84,9,25],[85,9,26],[86,9,27]]'||fourThreeLowCap.proposedTiles.some(t=>fourThreeArea.tiles.some(([x,y])=>x===t[0]&&y===t[1])))throw Error('4-3 low canopy geometry changed');
for(const tile of fourThreeLowCap.proposedTiles)fourThreeArea.tiles.push([...tile]);
fourThreeArea.unresolved.push(fourThreeLowCap.qualification+' Full-tile source RGB fails the fixed 99% threshold.');
// Align the 5-2 launcher artwork without assuming unobserved collision edges.
const fiveTwoLauncher=JSON.parse(fs.readFileSync('data/five-two-launcher-visual.json'));
const fiveTwoLauncherArea=levels.find(l=>l.id===fiveTwoLauncher.level)?.areas.find(a=>a.id===fiveTwoLauncher.area);
if(!fiveTwoLauncherArea||fiveTwoLauncher.level!=='5-2'||fiveTwoLauncher.area!=='area-2'||fiveTwoLauncher.hiddenFreeTiles.some(old=>fiveTwoLauncherArea.freeTiles.filter(t=>JSON.stringify(t)===JSON.stringify(old)).length!==1)||!fiveTwoLauncherArea.tiles.some(t=>JSON.stringify(t)==='[15,9,97]')||!fiveTwoLauncherArea.tiles.some(t=>JSON.stringify(t)==='[18,9,97]'))throw Error('5-2 launcher visual identities changed');
fiveTwoLauncherArea.hiddenFreeTiles=[...fiveTwoLauncherArea.hiddenFreeTiles??[],...fiveTwoLauncher.hiddenFreeTiles];
fiveTwoLauncherArea.decorations.push(...fiveTwoLauncher.decorations);
fiveTwoLauncherArea.unresolved.push(fiveTwoLauncher.qualification);
// Add only independently observed opaque castle pixels; leave collision data intact.
const eightOneFragmentPath='evidence/eight-one-starting-castle-fragment-proposal.json';
if(createHash('sha256').update(fs.readFileSync(eightOneFragmentPath)).digest('hex')!=='86d9808b2fd71621abbd41f4d55884c7a85acc25e0d726295d9c4a9d10388090')throw Error('8-1 castle visual proposal changed');
const eightOneFragment=JSON.parse(fs.readFileSync(eightOneFragmentPath));
if(createHash('sha256').update(fs.readFileSync(eightOneFragment.plan)).digest('hex')!==eightOneFragment.planSha256)throw Error('8-1 castle visual plan changed');
const eightOneAreas=levels.filter(l=>l.id===eightOneFragment.level).flatMap(l=>l.areas.filter(a=>a.id===eightOneFragment.area));
if(eightOneFragment.level!=='8-1'||eightOneFragment.area!=='main'||eightOneAreas.length!==1)throw Error('8-1 castle visual target changed');
const eightOnePatterns=eightOneAreas[0].patternOverrides;
if(!Array.isArray(eightOnePatterns)||eightOneFragment.patternOverrides.some(([x,y])=>eightOnePatterns.some(p=>p[0]===x&&p[1]===y)))throw Error('8-1 castle visual coordinates already occupied');
eightOnePatterns.push(...eightOneFragment.patternOverrides);
// The observed long-firebar artwork sits one pixel below its existing centers.
const fiveFourVisual=JSON.parse(fs.readFileSync('data/five-four-longbar-visual.json'));
const fiveFourArea=levels.find(l=>l.id===fiveFourVisual.level)?.areas.find(a=>a.id===fiveFourVisual.area);
const fiveFourBars=fiveFourArea?.firebars.filter(bar=>Object.entries(fiveFourVisual.match).every(([key,value])=>bar[key]===value))??[];
if(fiveFourVisual.level!=='5-4'||fiveFourVisual.area!=='main'||fiveFourVisual.visualOffsetY!==1||fiveFourBars.length!==1||fiveFourBars[0].visualOffsetY!==undefined)throw Error('5-4 long firebar visual identity changed');
fiveFourBars[0].visualOffsetY=fiveFourVisual.visualOffsetY;
fiveFourArea.unresolved.push(fiveFourVisual.qualification);
// World 8-4 corrections from the native trace: repeat distance 1024 in area-3, native exit pipe and ledge in the unrolled main area.
{
 const fix=JSON.parse(fs.readFileSync('data/eight-four-native-alignment.json')),level=levels.find(l=>l.id==='8-4');
 const main=level.areas.find(a=>a.id==='main'),loop=level.areas.find(a=>a.id==='area-3'),m=fix.main;
 const put=(area,col,row,id)=>{const t=area.tiles.find(t=>t[0]===col&&t[1]===row);if(t)t[2]=id;else area.tiles.push([col,row,id]);};
 const drop=(area,col,row)=>{area.tiles=area.tiles.filter(t=>!(t[0]===col&&t[1]===row));};
 for(const c of [m.clearColumns,m.clearColumns2])for(let col=c.from;col<=c.to;col++){for(const row of c.rows)drop(main,col,row);for(const row of c.floorRows)put(main,col,row,m.floorId);}
 for(let col=m.ledge.fromColumn;col<=m.ledge.toColumn;col++)put(main,col,m.ledge.row,m.ledge.id);
 for(let col=m.ceiling.fromColumn;col<=m.ceiling.toColumn;col++)put(main,col,m.ceiling.row,m.ceiling.id);
 for(let col=m.floorExtension.fromColumn;col<=m.floorExtension.toColumn;col++)for(const row of m.floorExtension.rows)put(main,col,row,m.floorExtension.id);
 for(let row=m.pipe.topRow;row<=m.pipe.bottomRow;row++){put(main,m.pipe.leftColumn,row,row===m.pipe.topRow?m.pipe.topLeft:m.pipe.bodyLeft);put(main,m.pipe.leftColumn+1,row,row===m.pipe.topRow?m.pipe.topRight:m.pipe.bodyRight);}
 main.width=m.width;
 const mainPipe=main.pipes.find(p=>p.to==='area-2');if(mainPipe.x!==1136||mainPipe.y!==m.pipe.specY)throw Error('8-4 main pipe identity changed');
 mainPipe.x=m.pipe.specX;
 // Past the exit pipe the native stream continues to column 95 and then repeats columns 32-95 (1024 px) for as long as Mario runs on.
 const cont=m.continuation;
 for(const s of cont.solidColumns)for(let col=s.from;col<=s.to;col++)for(const row of s.rows)put(main,col,row,cont.id);
 for(let col=cont.ceiling.fromColumn;col<=cont.ceiling.toColumn;col++)put(main,col,cont.ceiling.row,cont.id);
 for(let row=cont.pipe.topRow;row<=cont.pipe.bottomRow;row++){put(main,cont.pipe.leftColumn,row,row===cont.pipe.topRow?cont.pipe.topLeft:cont.pipe.bodyLeft);put(main,cont.pipe.leftColumn+1,row,row===cont.pipe.topRow?cont.pipe.topRight:cont.pipe.bodyRight);}
 if(main.maze||main.mazes?.length)throw Error('8-4 main maze identity changed');
 main.maze={loopAt:cont.loopAt,loopTo:cont.loopTo,evidence:'native collision map and enemy objects past the exit pipe (data/eight-four-native-alignment.json main.continuation and main.nativeMap)'};
 for(const gone of m.removeEnemies){const before=main.enemies.length;main.enemies=main.enemies.filter(e=>!(e.kind===gone.kind&&e.x===gone.x));if(main.enemies.length!==before-1)throw Error('8-4 main enemy identity changed');}
 const a3=fix['area-3'];
 for(let k=1;k<=a3.padColumns;k++)for(const [col,row,id] of loop.tiles.filter(t=>t[0]===a3.padFromColumn))loop.tiles.push([a3.padFromColumn+k,row,id]);
 if(loop.maze.loopAt!==992||loop.width!==992)throw Error('8-4 area-3 loop identity changed');
 loop.width=a3.width;loop.maze.loopAt=a3.loopAt;
 loop.maze.evidence='native-measured repeat distance: the wrong-corridor wrap subtracts exactly 1024 px from Mario and the camera (data/eight-four-native-alignment.json)';
 loop.maze.unresolved=['Corridor tile content between the observed pipes is still inferred from camera-registered screenshots; only the 1024 px repeat distance is native-measured.'];
 const water=level.areas.find(a=>a.id==='area-4'),a4=fix['area-4'];
 if(water.width!==1216||water.pipes.length!==1||water.pipes[0].x!==1136||water.firebars.some(b=>b.x>=a4.shiftFromColumn*16)||(water.freeTiles??[]).some(t=>t.x>=a4.removeColumns.from*16)||(water.decorations??[]).some(t=>t.x>=a4.removeColumns.from*16)||(water.patternOverrides??[]).some(t=>t[0]*8>=a4.removeColumns.from*16)||water.enemies.some(e=>e.x>=a4.removeColumns.from*16))throw Error('8-4 area-4 identity changed');
 water.tiles=water.tiles.filter(t=>t[0]<a4.removeColumns.from||t[0]>a4.removeColumns.to).map(t=>t[0]>=a4.shiftFromColumn?[t[0]+a4.shiftColumns,t[1],t[2]]:t);
 water.width=a4.width;water.pipes[0].x=a4.pipeX;
}
// Castle ends of 4-4 and 6-4: the compiled map is short by whole columns before the raised block that precedes the bridge (native wall/axe/cutscene
// positions, data/castle-exit-native-alignment.json). Enemies, firebars and platforms are deliberately left where they are (enemy fidelity is separate work).
{
 const fix=JSON.parse(fs.readFileSync('data/castle-exit-native-alignment.json'));
 for(const entry of fix.levels){
  const area=levels.find(l=>l.id===entry.level).areas.find(a=>a.id===entry.area),n=entry.insertColumns,px=n*16,from=entry.insertAtColumn*16;
  if(area.exit?.x!==entry.expectExitX||area.exit.kind!=='axe')throw Error(`${entry.level} castle exit identity changed`);
  for(const list of ['springs','decorations','generators','cannons'])
   if((area[list]??[]).some(o=>o.x>=from))throw Error(`${entry.level} ${list} beyond the insertion column: shift rule needs extending`);
  const filler=area.tiles.filter(t=>t[0]===entry.insertAtColumn-1);
  area.tiles=area.tiles.map(t=>t[0]>=entry.insertAtColumn?[t[0]+n,t[1],t[2]]:t);
  for(let k=0;k<n;k++)for(const [,row,id] of filler)area.tiles.push([entry.insertAtColumn+k,row,id]);
  for(const piece of [...area.solidRects??[],...area.freeTiles??[]])if(piece.x>=from)piece.x+=px;
  for(const override of area.patternOverrides??[])if(override[0]*8>=from)override[0]+=n*2; // 8x8 wall-art overrides, x in 8 px units
  area.exit.x+=px;area.exit.retainerX+=px;area.exit.stopX+=px;area.width+=px;
 }
}
// Native pivot quad coordinates independently confirm the late6-4 firebar inventory.
for(const entry of JSON.parse(fs.readFileSync('data/native-firebar-geometry.json')).areas){
 const area=levels.find(l=>l.id===entry.level).areas.find(a=>a.id===entry.area);
 for(const correction of entry.corrections){
  const bar=area.firebars.find(b=>b.x===correction.fromX&&b.y===correction.y);
  if(!bar)throw Error(`Missing native firebar geometry source ${entry.level}/${correction.fromX}`);
  bar.x=correction.x;
 }
 area.firebars.push(...entry.additions.map(bar=>({...bar})));
 area.firebars.sort((a,b)=>a.x-b.x);
}
// Native-measured Paratroopa/Beetle spawns are applied last, after the guards that locate protected actors by their exact earlier data.
for(const addition of nativeParatroopaBeetleSpawns.additions??[]){
 const area=levels.find(l=>l.id===addition.level)?.areas.find(a=>a.id===addition.area);
 if(!area)throw Error(`Missing native paratroopa/beetle spawn area ${addition.level}/${addition.area}`);
 area.enemies.push({...addition.spec});
}
for(const correction of nativeParatroopaBeetleSpawns.corrections){
 const area=levels.find(l=>l.id===correction.level)?.areas.find(a=>a.id===correction.area);
 const actor=area?.enemies.find(e=>Object.entries(correction.match).every(([key,value])=>e[key]===value));
 if(!actor)throw Error(`Missing native paratroopa/beetle spawn actor ${correction.level}/${correction.area}/${JSON.stringify(correction.match)}`);
 Object.assign(actor,correction.replace,{evidence:`${actor.evidence}; ${correction.classification}`});
}
// Native leaping Cheep Cheep frenzies (data/native-flying-fish.json): the camera that starts one and how many fish it may have, attached to the area's existing flyingFish generator.
for(const frenzy of JSON.parse(fs.readFileSync('data/native-flying-fish.json')).areas){
 const generator=levels.find(l=>l.id===frenzy.level)?.areas.find(a=>a.id===frenzy.area)?.generators?.find(g=>g.kind==='flyingFish');
 if(!generator)throw Error(`Missing flyingFish generator for the native frenzy ${frenzy.level}/${frenzy.area}`);
 generator.fromCamera=frenzy.fromCamera;generator.maxFish=frenzy.maxFish;
}
// The launches of the recorded route, replayed only by the route comparison (Simulation.recordedRoute).
for(const schedule of JSON.parse(fs.readFileSync('data/native-flying-fish.json')).schedules){
 const generator=levels.find(l=>l.id===schedule.level)?.areas.find(a=>a.id===schedule.area)?.generators?.find(g=>g.kind==='flyingFish');
 if(!generator)throw Error(`Missing flyingFish generator for the native schedule ${schedule.level}/${schedule.area}`);
 generator.schedule=schedule.events;generator.period=schedule.period;
}
// Native swimming Cheep Cheep / Blooper populations of measured water areas (tools/derive-water-actors.mjs) replace the screenshot placements.
for(const entry of JSON.parse(fs.readFileSync('data/native-water-actors.json')).areas){
 const area=levels.find(l=>l.id===entry.level)?.areas.find(a=>a.id===entry.area);
 if(!area)throw Error(`Missing native water area ${entry.level}/${entry.area}`);
 area.enemies=[...area.enemies.filter(e=>!entry.replaceKinds.includes(e.kind)),...entry.enemies.map(e=>({...e}))];
}
// Native Lakitu appearance x and the Mario x where it starts to flee (data/native-lakitu.json, docs/NATIVE_ROLES.md, Lakitu section).
for(const entry of JSON.parse(fs.readFileSync('data/native-lakitu.json')).levels){
 const lakitu=levels.find(l=>l.id===entry.level)?.areas.find(a=>a.id===entry.area)?.enemies.find(e=>e.kind==='lakitu');
 if(!lakitu)throw Error(`Missing Lakitu ${entry.level}/${entry.area}`);
 lakitu.x=entry.x;lakitu.fleeX=entry.fleeX;
}
// Native Bullet Bill: the cannons that follow the native random-register rule, and the 5-3/6-3 generator heights and camera range (tools/derive-bullet-schedule.mjs).
{
 const bullets=JSON.parse(fs.readFileSync('data/native-bullets.json'));
 for(const entry of bullets.cannons){
  const cannon=levels.find(l=>l.id===entry.level)?.areas.find(a=>a.id===entry.area)?.cannons?.find(c=>c.x===entry.x&&c.y===entry.y);
  if(!cannon)throw Error(`Missing cannon ${entry.level}/${entry.area}/${entry.x},${entry.y}`);
  cannon.native=true;cannon.fire=entry.fire;cannon.loop=entry.loop;
 }
 // The static Bullet Bill sightings of the screenshot inventory are shots of these cannons: the native trace has no such objects (no id 8 outside 5-3/6-3).
 for(const [level,area] of [...new Set(bullets.cannons.map(c=>`${c.level}/${c.area}`))].map(k=>k.split('/'))){
  const target=levels.find(l=>l.id===level).areas.find(a=>a.id===area);target.enemies=target.enemies.filter(e=>e.kind!=='bullet');
 }
 for(const entry of bullets.generators){
  const generator=levels.find(l=>l.id===entry.level)?.areas.find(a=>a.id===entry.area)?.generators?.find(g=>g.kind==='bullet');
  if(!generator)throw Error(`Missing bullet generator ${entry.level}/${entry.area}`);
  Object.assign(generator,{heights:entry.heights,fromCamera:entry.fromCamera,toCamera:entry.toCamera});
 }
}
// Native geometry corrections (data/native-geometry-corrections.json): structures of the screenshot-extracted maps that native rows place
// elsewhere (camera registration drift). A shift moves the grid tiles (rows limited by rows:[first,last]), free tiles and, with piranhas:true,
// piranha specs whose x lies in [from,to) by dx (whole tiles). An edit then adjusts the result in final coordinates.
const geometryCorrections=JSON.parse(fs.readFileSync('data/native-geometry-corrections.json'));
const geometryArea=c=>{const area=levels.find(l=>l.id===c.level)?.areas.find(a=>a.id===c.area);if(!area)throw Error(`native geometry correction ${c.name}: missing ${c.level}/${c.area}`);return area;};
for(const c of geometryCorrections.shifts){
 const area=geometryArea(c),inRange=x=>x>=c.from&&x<c.to,rowOk=y=>!c.rows||y>=c.rows[0]*16&&y<(c.rows[1]+1)*16,dx=c.dx;
 if(dx%16)throw Error('native geometry correction: dx must be a whole tile');
 const moving=area.tiles.filter(t=>inRange(t[0]*16)&&rowOk(t[1]*16));
 if(!moving.length)throw Error(`native geometry correction ${c.name} moves nothing`);
 const movingKeys=new Set(moving.map(t=>t[0]+','+t[1])),shifted=moving.map(t=>[t[0]+dx/16,t[1],t[2]]),targets=new Set(shifted.map(t=>t[0]+','+t[1]));
 const kept=area.tiles.filter(t=>!movingKeys.has(t[0]+','+t[1]));
 area.tiles=[...kept.filter(t=>!targets.has(t[0]+','+t[1])),...shifted]; // the cells a shifted run lands on at its edge are overwritten
 for(const t of area.freeTiles)if(inRange(t.x)&&rowOk(t.y))t.x+=dx;
 if(c.piranhas)for(const e of area.enemies)if(e.kind==='piranha'&&inRange(e.x))e.x+=dx;
}
for(const c of geometryCorrections.edits){
 const area=geometryArea(c),missing=what=>{throw Error(`native geometry correction ${c.name}: ${what} not found`);};
 for(const [col,row] of c.removeTiles??[])if(!area.tiles.some(t=>t[0]===col&&t[1]===row))missing(`tile ${col},${row}`);else area.tiles=area.tiles.filter(t=>t[0]!==col||t[1]!==row);
 for(const t of c.addTiles??[]){area.tiles=area.tiles.filter(q=>q[0]!==t[0]||q[1]!==t[1]);area.tiles.push([...t]);}
 for(const f of c.removeFreeTiles??[]){if(!area.freeTiles.some(t=>t.x===f.x&&t.y===f.y&&t.id===f.id))missing(`free tile ${f.x},${f.y}`);area.freeTiles=area.freeTiles.filter(t=>t.x!==f.x||t.y!==f.y||t.id!==f.id);}
 for(const m of c.moveEnemies??[]){const e=area.enemies.find(e=>e.kind===m.kind&&e.x===m.x);if(!e)missing(`${m.kind} at ${m.x}`);e.x=m.toX;if(m.toY!==undefined)e.y=m.toY;if(m.spawnCamera!==undefined)e.spawnCamera=m.spawnCamera;}
 for(const r of c.removeEnemies??[]){const before=area.enemies.length;area.enemies=area.enemies.filter(e=>!(e.kind===r.kind&&e.x===r.x));if(area.enemies.length!==before-1)missing(`${r.kind} at ${r.x}`);}
 for(const e of c.addEnemies??[])area.enemies.push({...e});
 for(const r of c.addSolidRects??[])(area.solidRects??=[]).push({...r});
 for(const b of c.addBlockContents??[])(area.blockContents??=[]).push({...b});
 for(const m of c.moveBlockContents??[]){const b=area.blockContents.find(b=>b.col===m.col&&b.row===m.row);if(!b)missing(`block ${m.col},${m.row}`);b.col=m.toCol;}
 for(const m of c.moveVines??[]){const v=area.vines.find(v=>v.id===m.id&&v.x===m.x);if(!v)missing(`vine ${m.id}`);v.x=m.toX;}
 for(const m of c.movePipes??[]){const p=area.pipes.find(p=>p.x===m.x&&p.y===m.y);if(!p)missing(`pipe ${m.x},${m.y}`);p.x=m.toX;}
}
// 8-4 main lap-1 cells read from the native collision map, applied last (pit 66-74 crossed on the id 40 lift, floor 59-63, wall 79-80, no pipe at 39-40).
{const nm=JSON.parse(fs.readFileSync('data/eight-four-native-alignment.json')).main.nativeMap,main=levels.find(l=>l.id==='8-4').areas.find(a=>a.id==='main');
 for(const c of nm.clear)for(let col=c.from;col<=c.to;col++)for(const row of c.rows)main.tiles=main.tiles.filter(t=>t[0]!==col||t[1]!==row);
 for(const s of nm.solid)for(let col=s.from;col<=s.to;col++)for(const row of s.rows){main.tiles=main.tiles.filter(t=>t[0]!==col||t[1]!==row);main.tiles.push([col,row,nm.id]);}}
// 4-2 coin room return: native Mario's first playable row after the room is x 2104 (the pipe centre 2112 minus 8, like 1-1 2616 under pipe 2624, 3-1 1080, 6-2 568);
// the image registration put him 16 px right (bounded native probe, tools/harness/native-walk-probe.mjs, 4-2 area-3 pipe 1360).
{const room=levels.find(l=>l.id==='4-2').areas.find(a=>a.id==='bonus-coins'),pipe=room.pipes.find(p=>p.to==='area-3');
 if(pipe.spawn[0]!==2120||pipe.camera!==2064)throw Error('4-2 coin room return changed');pipe.spawn[0]=2104;pipe.camera=2048;}
// Browser builds must never read a partially written multi-megabyte map.
const output=`data/.levels-${process.pid}.json`;
fs.writeFileSync(output,JSON.stringify(levels,null,2)+'\n');
fs.renameSync(output,'data/levels.json');
console.log(JSON.stringify(levels.map(l=>({id:l.id,time:l.time,areas:l.areas.length,spawn:l.areas[0].spawn,enemies:l.areas.reduce((n,a)=>n+a.enemies.length,0),exit:l.areas.at(-1).exit?.kind})),null,2));
