import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeSourceBytes} from '../tools/native-source-bytes.mjs';

test('Castle6 terrain operands retain FF and late pipe records through the labelled block boundary',()=>{
 // Actual Castle6 area-data tail: FF is the pipe operand at record70, not the enemy-data terminator.
 const source=`L_CastleArea6:\n .byte $45, $ff, $be, $0a, $dd, $48, $fe, $06, $3d, $cb\n .byte $46, $7e, $ad, $4a, $fe, $82, $39, $f3, $a9, $7b\n .byte $4e, $8a, $9e, $07, $fe, $0a, $0d, $c4, $cd, $43\n .byte $ce, $09, $de, $0b, $dd, $42, $fe, $02, $5d, $c7, $fd\nL_GroundArea1:\n .byte $94, $11\n`;
 const bytes=nativeSourceBytes(source,'L_CastleArea6');
 assert.equal(bytes.length,41);assert.deepEqual(bytes.slice(10,20),[0x46,0x7e,0xad,0x4a,0xfe,0x82,0x39,0xf3,0xa9,0x7b]);assert.equal(bytes.at(-1),0xfd);
});
