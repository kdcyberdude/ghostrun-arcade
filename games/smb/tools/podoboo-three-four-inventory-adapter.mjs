/** Limited observed inventory only. Never installs the rejected Podoboo motor. */
import fs from'node:fs';import{createHash}from'node:crypto';
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function applyObservedOpeningPodoboo(levels){
 const accepted=JSON.parse(fs.readFileSync('data/podoboo-three-four-inventory-production.json'));
 if(accepted.level!=='3-4'||accepted.area!=='main'||accepted.proposalSha256!=='f4b93e7603a6cbaa96c93696533926c18bea027f79a41617813d4dbca02e2393'||sha(accepted.proposal)!==accepted.proposalSha256)throw Error('Observed3-4 Podoboo inventory proposal changed');
 if(accepted.rejectedMotorReportSha256!=='ae8b852302f80181efe960a41b6149a1c828018b37360e013f1749394f1504da'||sha(accepted.rejectedMotorReport)!==accepted.rejectedMotorReportSha256)throw Error('Rejected3-4 Podoboo motor receipt changed');
 const proposal=JSON.parse(fs.readFileSync(accepted.proposal));
 for(const[file,expected]of Object.entries(proposal.sourceHashes))if(sha(file)!==expected)throw Error('Observed3-4 Podoboo source changed: '+file);
 if(JSON.stringify(accepted.limitedCandidate)!==JSON.stringify(proposal.limitedCandidate))throw Error('Observed3-4 Podoboo limited fields changed');
 const area=levels.find(l=>l.id===accepted.level)?.areas.find(a=>a.id===accepted.area);
 if(!area||JSON.stringify(area.enemies)!==JSON.stringify(proposal.currentCanonicalEnemiesGuard))throw Error('Observed3-4 Podoboo prior inventory changed');
 area.enemies.push({...proposal.limitedCandidate,palette:proposal.observedActor.palette,evidence:accepted.qualification+'; '+accepted.proposal});
 (area.unresolved??=[]).push(accepted.qualification);
 return levels;
}
