The Goomba path now reads the temporary block-buffer $23 at its source
ChkUnderEnemy bottom-middle probe, after EnemyGfxHandler and before movement.
The first eligible enemy consumes the cell to zero. The overlay ends when
ReplaceBlockMetatile writes the replacement; area initialization clears it.
The native double SetStun procedure preserves force/fraction, changes raw-low Y
by -4, sets state $22, and picks horizontal motion away from Mario. Its defeated
motor then runs on the same row. The single delayed award is 100 points.

The existing non-Goomba geometric block-kill path remains outside this fix.

Readout is a separate commit: legacy simEntities previously omitted defeated
Goombas, despite strict already covering them. It now reports a live ordinary
Goomba defeat until actual slot erasure. Both baseline ab4a386 and candidate
were compared with THIS SAME readout. This does not suppress native objects.

Six entrance-seeded World1-1 clips, ending eight rows after their previously
reported first failure, contain 3,620 frames and 4,619 native entity rows.
Every checked state field matches throughout every candidate clip, with no
coverage gaps. Baseline strict position/legacy enemy firsts were local
564,556,760,516,584,592 for 8f90807f,31529e18,d5df5907,304e1d98,0afbc8cc,de08fd78.
All six become null. Exact full capture hashes, source offsets, initial RAM,
inputs and every RAM row are authenticated in native-block-enemy-clips.json.
These are bounded diagnostic reseeds, NOT continuous POWER-ON proof. Pictures
and state/picture joint results remain unchecked. There is no claim about
later frames beyond these clips or unrelated failure clusters.

15 focused tests pass, including the existing contact-latch/native prefix and
head-bump cases. The companion primitive has 496 actual ROM controlled calls
plus six natural source events (see native-block-enemy-proof-20261113.md).
Full suite/TypeScript/corpus/pixel checks are left to the parent's combined gate.
