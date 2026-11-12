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

## Red vertical Paratroopa follow-up

`src/red-paratroopa.ts` replaces the vertical cosine with the native byte motor: move by signed speed plus fraction carry, add force 3, subtract 6 again when pre-step y is at/below the centre, cap to signed2 using the native fractional thresholds. At zero speed/force reset the fraction; if above the original position, return and move down only when FrameCounter &7 is zero. Original-y $0401 and centre $58 are initialized from the static native object row (centre +48 below sprite-top128, -32 above). All894 captured movement rows across all6 vertical flyers match y, speed, force and fraction exactly. The motor retains its state in `redFlight`; removal writes original-y to the slot's horizontal alias and speed/force/fraction to its vertical residue. This is required for the3-3 subsequent balance platform.

4-3 x576 had an inferred screenshot spawn at feet80; native object initialization is sprite-top40/original-y40/centre88, so its static spawn is feet64. This is corrected in the existing native spawn data source, not in level-specific motion code.

Compared with00442b1:1-3 enemy443->471;4-3 enemy162->204;5-3 enemy427->454, score492->573, y618->1260, death633->1292, timer641->1314. No earlier field on any level.1244 tests and TypeScript pass; excerpts regenerated. The newly exposed1-3/5-3 Goomba atx1280 has an inferred map height and platform-slot ownership to resolve; the3-3 earlier Red Koopa residue remains the first enemy divergence pending platform-slot integration.

## Native static actor aliases

7-1 v2 frame437 changes the existing slot2 Paratroopa fromid14 toid0 in place. The source data additionally spawned a screenshot-derived Koopa1009, so the remake later had two actors. Remove the old native-spawn correction, remove the derivative sighting through the existing ground-actor removal pipeline, and keep the real conversion. First enemy divergence439->443; every other field unchanged. A diagnostic unwinged-fall fixture remains synthetic and no longer asserts that a duplicate belongs in the level.

The shared1-3/5-3 Goomba at1280 natively starts at sprite-top56 (feet80), not the later screenshot-derived feet96. Correct both source walker metadata and generated levels. Firstenemy remains471/454 because the remaining platform-slot/residue mismatch precedes matching the new Goomba's x; correcting static y does not introduce earlier fields.

All32 levels compared againstc7fe7b9: only7-1 enemy439->443 changes.1244tests andTypeScript pass, excerpts regenerated. `node tools/compile-levels.mjs` cannot complete because the baseline checkout lacks `evidence/firebar-5-4-shared-verification.json` (ENOENT before output writing). The source edits use the existing correction/removal formats; this missing evidence must be restored before a full source regeneration can be verified.

## Native enemy-data groups and birth-frame slot order

Baseline for this unit:664f750 (integration81a4632 plus preceding walker units). `data/native-walker-groups.json` contains57 raw group records from10 native areas, decoded from the original world/area tables and enemy-data bytes by `tools/harness/native-walker-layout.mjs --source /tmp/smb-native-sky.asm --apply`. Counts and object columns are static native level input. Build-time association enriches existing screenshot actors and adds missing potential members; the runtime reads no measured spawn-camera thresholds for these groups. The compiler imports the same enrichment helper. Native page-control commands retain EnemyObjectPageSel until the next actual object, so a following page bit does not increment the page twice.

Runtime rules:

- A group becomes eligible when its raw object column reaches `(ScreenRight+48)&0xF0`; it is skipped once that column is behind ScreenRight. While all five slots are busy the parser waits, rather than dropping the first object permanently. This removes the old fitted `spawnCamera-(x-303)<=8` fallback.
- Birth occurs after the current scroll, on the actual native creation frame. The group fills the lowest available slots at camera+255,+279,+303 with their inherited horizontal fractions. A slot above the parser's own slot already executes movement on that birth frame; a slot at/below it starts moving next frame. A formerly occupied higher slot remains reserved until its own later pass even if it is empty at the frame end. This latter distinction is exercised by3-1 v2 row1342.
- Exact raw placed-object columns behind ScreenRight are skipped on an area return. The old1-1 return incorrectly made Goombas1280/1312 behind the screen's right edge, stealing native slots0/1 and corrupting later group fractions.
- The graphic-handler visibility flag distinguishes RAM birth from first drawing: `graphicsVisible=false` for a newly allocated slot at/below the parser slot, true for a slot stepped immediately. The animation worker owns the renderer consumption of this flag and full pre-contact snapshots.
- The metadata's group columns shift with an inserted castle corridor, matching the existing coordinate transformation for actor positions.

`native-walker-group-events.mjs` extracts all41 supported group births across the32 traces using EnemyDataOffset $0739/page $073A, native slot flags, inherited $0401, ScreenLeft and parser slot order. Every event reproduces exact slot/x/y, including lower-slot reuse and higher-slot same-frame movement. The fixture structurally excludes unrelated simultaneous creations or predecessor kinds whose fraction writer is not modelled; there are no level/frame exception lists. Potential group counts remain full when a recording had only one free slot, so future decisions can expose the missing members.

All-field differences from664f750:

-1-1 enemy741->null: every legacy field now null.
-3-2 enemy454->null: every legacy field now null.
-8-1 enemy2109->null, y2211/x2226/camera2227/score2215/coins2277/death2420/timer2422->null: every legacy field now null.
-5-1 enemy504->566; death2300/timer2669/x2276/camera2276->null. y2267->2265 and score2271->2269 are earlier downstream differences after the newly exposed Paratroopa sink-turn mismatch at566.
-8-4 camera/enemy8520->7594 are downstream of unchanged timer6400, y6718, score6722, x6749 and death6959; the subsequent respawn scene differs. All other fields of all levels are unchanged.

1360 tests andTypeScript pass; excerpts regenerated. The stricter all-area/cardinality audit remains a separate root task; the null claims here refer to the existing native-divergence fields. Full compile-levels remains blocked by the pre-existing missing firebar verification evidence noted above. Subsequent placed-walker birth materialization and floor-contact direction will be separate units.

## Jumping Paratroopa background/movement order

`src/native-paratroopa.ts` implements EnemyJump and DoEnemySideCheck before MoveJ_EnemyVertically/MoveEnemyHorizontally. The side sample is native sprite-top+20 (feet-4), at pre-move integer x or x+16. Any floor landing snaps first, resets speed/force and applies speed-3 before the side sample. The native background cutoff `(spriteY+62)&255 >=68` applies before both probes. Vertical movement then imposes28/256 with cap3; horizontal movement uses the direction after background collision. Initial activation must keep the horizontal fraction inherited by takeNativeSlot (using the earlier pre-activation x would drop that byte).

The generator records every eligible jumping-Paratroopa row from all32 native RAM traces, including actual block-buffer cells. All11498 rows match exact x/y/vx/speed/force/fraction. Rows with new enemy-pair contacts are structurally excluded because that later direction-changing pass has its own fixture; unstable block cells are excluded where before/after RAM cannot identify the enemy-time value. There are no level/frame exception lists. The complete corpus is gzip-packed in a test-only JSON fixture to avoid committing3.2MB of repeated field names.

Compared withb089263:5-1 enemy566->792.8-2 y1316->2472 and score1320->2470 improve; death2521->2003, timer2535->2017, x2498->2472 and camera2499->2472 are earlier downstream differences after unchanged enemy625 (the first mismatch on that level), now that a former false hop no longer delays that later death. All other fields of all levels unchanged.1361 tests andTypeScript pass; excerpts regenerated. The old wall fixture's Paratroopa maximumx199.5 was an undone movement step; native pre-move turning reaches200 before stepping away, as asserted for both Paratroopas and Beetles now.

Group source enrichment correction: native group initialization writes its encoded row before movement. Screenshot sightings can already be falling, so observed Y cannot identify group membership. Re-enrichment now rebuilds owned generated placeholders and matches original sightings by source column interval/kind, then restores the encoded group row. In 1-2 area-2 the original x2161/y160 and x2185/y144 sightings are the two column2208 group members, both initialized at feet144; no third generated Goomba remains. A direct regression covers re-enrichment of an already generated placeholder. Source singles are unchanged. All32 legacy per-field first divergences equal e664f11; excerpts regenerated. The integration checkout has later platform fixes and must re-survey its secondary-area Mario contact separately.

Native parser runtime: seed $071f/$073d from entrance RAM; reset on area load; accumulate only the committed ordinary ScrollHandler delta (before castle page teleports). Tile-coin and above-block-coin removal select buffer2, while ordinary block/coin-block writes do not. Native group births and placed-object slot prediction inspect the current task; delayed ordinary activation retains the preceding birth pass's guard. Advance the clock after pipe-column allocation so the loader's prior reservation cannot be lost when task0 becomes7. Retained runtime regressions cover4-3 rows201..205 and6-2 rows292..293. All32 legacy first fields unchanged except4-3 enemy204→null. Excerpts regenerated;1371tests andtsc pass. First-frame ordinary actor materialization remains pending; this unit does not claim strict cardinality parity. A separate clock audit finds secondary/transition/downstream differences to re-check on current integration (for example old water2-2 camera/scroll first differs1328 despite matching player pixel until1401); no per-level timing exception was added.
