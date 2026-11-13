import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

// evidence/water3-findings-20261111.md: 2-2 / 7-2 free-play rows at x 2759..2781 (2-2 explore-r3 mood0 rows 2062..2082, mood5 rows 2118..2131).
const room=(id:string)=>{const level=structuredClone(observedLevels().find(l=>l.id===id)!);return level.areas.find(a=>a.theme==='water'&&a.width===3088)!;};

test('2-2 water room has the pillar top at columns 172-173 like the 7-2 copy (native stands at y 16 there for 153 of 153 rows)',()=>{
 for(const id of ['2-2','7-2']){const tiles=new Set(room(id).tiles.map(t=>`${t[0]},${t[1]}`));for(const t of ['172,3','173,3','172,4','173,4'])assert.ok(tiles.has(t),`${id} ${t}`);}
});

// The old synthetic fresh-A coast assertion was contradicted by native RAM:
// source5b3 epoch10 rows18028/30/32/34 retain speed on fresh Down+Right+A.
// Its full native checkpoint regression is in native-water-seed.test.ts row18020.
