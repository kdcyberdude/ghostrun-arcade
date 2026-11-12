/** Restore authenticated compiler inputs from the bundled original evidence.
 * node tools/restore-compiler-evidence.mjs [--to DIRECTORY]
 * Existing files are preserved; compile-levels retains every original input hash guard. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
const game=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function restoreCompilerEvidence(target=process.cwd()){
 const manifest=JSON.parse(fs.readFileSync(path.join(game,'data/compiler-evidence-manifest.json'))),archive=path.join(game,manifest.archive.file);
 const missing=manifest.files.filter(file=>!fs.existsSync(path.join(target,file.path)));
 if(!missing.length)return 0;
 if(sha(fs.readFileSync(archive))!==manifest.archive.sha256)throw Error('Compiler evidence archive checksum changed');
 for(const file of manifest.files)if(!/^(evidence|tools)\//.test(file.path)||file.path.split('/').some(p=>p==='..'||p===''))throw Error('Invalid compiler evidence path');
 fs.mkdirSync(target,{recursive:true});
 execFileSync('tar',['-xzf',archive,'-C',path.resolve(target),'--',...missing.map(file=>file.path)]);
 for(const file of missing){const bytes=fs.readFileSync(path.join(target,file.path));if(bytes.length!==file.bytes||sha(bytes)!==file.sha256)throw Error(`Restored compiler evidence checksum changed: ${file.path}`);}
 return missing.length;
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:{to}}=parseArgs({options:{to:{type:'string',default:process.cwd()}}});
 console.log(`Restored ${restoreCompilerEvidence(to)} authenticated compiler inputs`);
}
