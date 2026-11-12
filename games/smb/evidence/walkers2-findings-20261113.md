# Native walker contacts and unwinging, 2026-11-13

Branch base: 96c96ce; inherited WIP: 663258b. Native evidence is the 32 v2 RAM traces. `tools/harness/native-walker-events.mjs` extracts each supported native contact-byte transition and every jumping-Paratroopa unwinging event into `tests/fixtures/native-walker-events.json`. Unsupported collision participants (such as flying Cheeps) are structurally excluded from the contact fixture; no level/frame exceptions are used.

- `EnemiesCollision`: FrameCounter $09 odd, dry areas, inclusive pre-move boxes clamped to both screen edges, slot order, and per-slot $0491 contact bits. A contact turns the higher slot before its move and the lower slot after its move. All 61 supported contact-bit transitions match. A previously untested right edge case is 8-4 row 11854: x-camera=255 clamps both box sides to 255.
- A jumping Paratroopa stomp resets $A0/$0434 to zero, keeps $0417 and pre-move y, then moves half a pixel away from Mario. Equal integer x chooses right (8-4 row 10277). All 27 native unwinging events match. The simulation previously retained the just-computed downward speed and moved to the wrong x/y before converting.
- Bullet Bills write $0401, which survives slot reuse. 5-3 rows 118-122: the departing frenzy Bullet Bill leaves fraction 128 in slot 0; the next red Koopa starts at x480.5 rather than x480.
- 1-1 Goomba x640 initializes left (native row 216, speed $F8), then turns at the pipe. Its recorded direction had been inferred from a later screenshot after turning. Correct the spawn metadata, preserving explicit direction in diagnostic fixtures.
- Beetle background collision precedes its movement: 8-1 rows 624-625 x1247.5 moving left -> x1248 moving right. The old sprite-edge probe moved it one pixel too far. The native pre-step integer probe retains the correct half-pixel path.
- Collision bytes are ordinary cloneable simulation state, cleared on area load; the WIP WeakMap broke structuredClone and several existing tests.

Before/after first divergence from 96c96ce (all other fields unchanged):

- 1-1 enemy 217 -> 741
- 2-1 enemy 249 -> 517
- 5-1 timer 2321 -> 2669
- 5-3 enemy 122 -> 427
- 6-2 enemy 356 -> 494
- 7-1 enemy 359 -> 439
- 8-1 enemy 624 -> 2109
- 8-3 enemy 182 -> 254
- 8-4 enemy 462 -> 8520

No earlier field in any of the 32 levels. Excerpts regenerated with --run v2. Synthetic tests formerly asserting 16px arbitrary overlap, strict edges, or no reaction on first overlap now assert native inclusive contacts. The pause-label fixture uses separated actors so its four actors do not collide before testing pause.

Open: red Paratroopa cosine movement and several red spawn heights are still inferred; normal Goomba/Koopa background-probe velocity phase remains unqualified (switching the shared path to a simple pre-step probe regresses 1-2 at row 468 and was not kept); late spawnCamera fallback and platform slot residues still need native loader modelling; other first-divergence positions remain in the full survey.
