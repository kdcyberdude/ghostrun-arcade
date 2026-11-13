import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {compileNativeSource,nativeSourceClosure} from '../tools/harness/native-source-program.js';
import program from '../data/native-source-program.json';
import proof from './fixtures/native-source-program-decode.json';
const rom=(bytes:number[])=>{const image=new Uint8Array(16+32768+8192);image.set(bytes,16);return image;};

test('static source closure follows all inline dispatch targets and excludes proven data fallthrough',()=>{
 const source=`.org $8000
Start: lda #$03
 bne After
 .db $42
After: jsr JumpEngine
 .dw Tail, Other
Tail: rts
Other: lda #$00
 beq Tail
JumpEngine: jmp ($06)
NonMaskableInterrupt: rti`;
 const p=compileNativeSource(source,rom([0xa9,3,0xd0,1,0x42,0x20,0x11,0x80,0x0c,0x80,0x0d,0x80,0x60,0xa9,0,0xf0,0xfb,0x6c,6,0,0x40]));
 assert.deepEqual(nativeSourceClosure(p,['Start']).map(n=>n[0]),[0x8000,0x8002,0x8005,0x800c,0x800d,0x800f,0x8011]);
 assert.deepEqual(p.data,[[0x8004,0x42],[0x8008,0x0c],[0x8009,0x80],[0x800a,0x0d],[0x800b,0x80]]);
 assert.equal(p.verifiedBytes,21);
});

test('source BIT overlays consume the following immediate instruction as operand bytes',()=>{
 const source='.org $8000\nStart: lda #3\n.db $2c\nOther: lda #7\nrts';
 const p=compileNativeSource(source,rom([0xa9,3,0x2c,0xa9,7,0x60]));
 assert.deepEqual(nativeSourceClosure(p,['Start']),[[0x8000,'LDA','imm',3,2,2,0],[0x8002,'BIT','abs',0x7a9,3,4,0],[0x8005,'RTS','imp',0,1,6,0]]);
 assert.throws(()=>compileNativeSource(source,rom([0xa9,3,0x2c,0xa9,8,0x60])),/Source\/ROM mismatch/);
});

test('complete static source program preserves independently decoded native instruction costs',()=>{
 const sha=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha(fs.readFileSync(new URL('../data/native-source-program.json',import.meta.url))),proof.programSha256);
 assert.equal(sha(JSON.stringify(program.instructions)),proof.nativeInstructionTuplesSha256);
 assert.equal(program.instructions.length,10693);assert.equal(program.verifiedBytes,32768);assert.equal(program.data.length,9987);
 const pcs=new Set(program.instructions.map(n=>n[0]));assert.equal(pcs.size,program.instructions.length);
 assert.ok(pcs.has(program.reset));assert.ok(pcs.has(program.nmi));
 assert.equal(program.provenance.romSha256,'f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de');
});
