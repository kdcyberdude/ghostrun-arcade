import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// RAM 0x09 read from each level checkpoint (evidence/ctrseed-findings-20261111.md). Native excerpts: row 0 values, and the first control row of a
// fresh level start (counter 164 or 165) or a pipe/underground entry. Parity at a control start differs between levels, which is why one remake clock cannot serve all.
const ctr=JSON.parse(fs.readFileSync(new URL('../data/native-checkpoint-counter.json',import.meta.url),'utf8')) as Record<string,number>;

test('checkpoint counter covers every level with a byte value', () => {
  const levels=Object.keys(ctr).filter(k=>/^[1-8]-[1-4]$/.test(k));
  assert.equal(levels.length,32);
  for(const l of levels)assert.ok(Number.isInteger(ctr[l])&&ctr[l]>=0&&ctr[l]<256,l);
});

test('checkpoint counter matches the native excerpts', () => {
  // [level, row 0 value, first engine-8 row, counter there]
  for(const [l,c0,row,at] of [['1-3',157,7,164],['2-1',157,8,165],['5-1',157,8,165],['1-2',34,7,41],['7-2',51,7,58],['7-1',158,6,164]] as const){
    assert.equal(ctr[l],c0,l);assert.equal(ctr[l]+row,at,l);
  }
});
