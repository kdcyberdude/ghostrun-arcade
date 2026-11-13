/** Build a retained-entrance native observer without editing the supplied emulator checkout.
 * node tools/harness/build-native-entrance-observer.mjs --lab DIR --nesle DIR --out FILE */
import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{lab:{type:'string'},nesle:{type:'string'},out:{type:'string'}}});if(!a.lab||!a.nesle||!a.out)throw Error('--lab, --nesle, --out required');
const result=spawnSync('c++',['-O2','-std=c++20','-fopenmp','-ffp-contract=off','-shared','-fPIC','-I'+path.join(a.nesle,'cpp/include'),'-I'+path.join(a.lab,'rl/csrc'),fileURLToPath(new URL('./native-entrance-observer.cpp',import.meta.url)),path.join(a.nesle,'cpp/src/rom.cpp'),'-o',a.out],{stdio:'inherit'});if(result.error)throw result.error;process.exitCode=result.status??1;
