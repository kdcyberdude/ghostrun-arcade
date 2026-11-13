/** CPU-only throughput for the reset-owned clock; no render/Simulation claim.
 * --capture CAPTURE_DIR [--samples 946] [--mode sparse|all|none] */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';import {parseArgs} from 'node:util';import {NativeSourceMachine} from '../../src/native-source-machine.js';
const {values}=parseArgs({options:{capture:{type:'string'},samples:{type:'string',default:'946'},mode:{type:'string',default:'sparse'}}});
if(!values.capture||!['sparse','all','none'].includes(values.mode!))throw Error('--capture DIR [--mode sparse|all|none] required');
const pads=fs.readFileSync(path.join(values.capture,'pads.bin')),samples=Number(values.samples);if(samples>pads.length)throw Error('Insufficient input');
const machine=new NativeSourceMachine();let observedInstructions=0;
if(values.mode!=='none'){machine.onInstruction=()=>{observedInstructions++;};if(values.mode==='sparse')machine.observerPcs=new Set([0x92b0,0x92c7]);}
const start=performance.now();for(let frame=0;frame<samples;frame++)machine.step(pads[frame]);const ms=performance.now()-start;
console.log(JSON.stringify({scope:'CPU/PPU source clock only; not combined game throughput',node:process.version,mode:values.mode,padsSha256:createHash('sha256').update(pads).digest('hex'),samples,ms,fps:1000*samples/ms,observedInstructions,cycles:machine.cycles,pc:machine.pc}));
