import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {sha} from './combined-replay.mjs';
export function auditSourceHashes(root){const files=[...fs.readdirSync(path.join(root,'tools/harness')).filter(f=>/^native-.*\.(ts|mjs|js)$/.test(f)).map(f=>path.join(root,'tools/harness',f)),...fs.readdirSync(path.join(root,'tools/harness/native-monitor')).map(f=>path.join(root,'tools/harness/native-monitor',f)),path.join(root,'tools/harness/combined-monitor-audit.ts')].sort();return Object.fromEntries(files.map(f=>[path.relative(root,f),sha(fs.readFileSync(f))]));}
export const sourceManifestHash=hashes=>sha(JSON.stringify(hashes));
export function verifyAuditSource(runtime,pin,hashes){
 const options={cwd:runtime,encoding:'utf8'};if(execFileSync('git',['rev-parse','HEAD'],options).trim()!==pin)throw Error('Runtime pin changed');
 execFileSync('git',['diff','--exit-code',pin,'--','games/smb/src','games/smb/data','games/smb/assets'],{...options,stdio:'pipe'});
 if(JSON.stringify(auditSourceHashes(path.join(runtime,'games/smb')))!==JSON.stringify(hashes))throw Error('Audit source manifest changed');
}
