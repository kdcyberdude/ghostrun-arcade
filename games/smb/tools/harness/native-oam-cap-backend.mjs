/** Build a diagnostic retained-entrance renderer. Only native8 or diagnostic64
 * is accepted; authenticate every replay RAM row with native-entrance-branch.py.
 * --lab DIR --nesle DIR --out DIR --slots 8|64 */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const {values:a}=parseArgs({options:Object.fromEntries(['lab','nesle','out','slots'].map(k=>[k,{type:'string'}]))});for(const k of ['lab','nesle','out','slots'])if(!a[k])throw Error(`--${k} required`);if(!['8','64'].includes(a.slots))throw Error('--slots must be8 or64');fs.mkdirSync(a.out,{recursive:true});
const sourceInclude=path.join(a.nesle,'cpp/include'),include=path.join(a.out,'include'),header=path.join(include,'nesle/cuda/batch_frame.cuh');fs.cpSync(sourceInclude,include,{recursive:true});const before=fs.readFileSync(header,'utf8');let after=before;
if(a.slots==='64'){
 for(const field of ['lo','hi','attr','x']){const from=`std::uint8_t ${field}[8];`;if(after.split(from).length!==2)throw Error('Unexpected ReplaySprites layout');after=after.replace(from,`std::uint8_t ${field}[64];`);}
 const from='if (f.n >= 8u) break;';if(after.split(from).length!==2)throw Error('Unexpected source cap');after=after.replace(from,'if (f.n >= 64u) break;');
}fs.writeFileSync(header,after);
const source=fileURLToPath(new URL('./native-entrance-observer.cpp',import.meta.url)),binary=path.join(a.out,'observer.so'),args=['-O2','-std=c++20','-fopenmp','-ffp-contract=off','-shared','-fPIC',`-I${path.join(a.lab,'rl/csrc')}`,`-I${include}`,source,path.join(a.nesle,'cpp/src/rom.cpp'),'-o',binary];execFileSync('c++',args,{stdio:'inherit'});const hash=b=>createHash('sha256').update(b).digest('hex');fs.writeFileSync(path.join(a.out,'backend.json'),JSON.stringify({slots:Number(a.slots),sourceSha256:hash(fs.readFileSync(source)),sourceHeaderSha256:hash(before),diagnosticHeaderSha256:hash(after),binarySha256:hash(fs.readFileSync(binary)),compiler:'c++',args},null,2)+'\n');console.log(binary);
