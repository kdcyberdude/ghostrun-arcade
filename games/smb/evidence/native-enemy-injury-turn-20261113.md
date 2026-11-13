Source contact turn before own-injury motion hold

In native PlayerEnemyCollision, ChkETmrs compares the cached unsigned relative
X positions. If the player is left of an enemy moving right, or not left of an
enemy not moving right, LInj calls EnemyTurnAround before InjurePlayer. The
turn negates only Enemy_X_Speed and XORs Enemy_MovingDir with3. Injury then
sets TimerControl255, so this slot's movement is held with its NEW direction.
RunNormalEnemies does graphics, BG and enemy collisions before player contact;
its TimerControl test precedes movement. The runtime already held position on
own injury but omitted this speed/direction write.

EnemyTurnAround affects normal IDs0..4/6 and special14/18; it excludes Hammer
Bro5 and other IDs>=7. The contact dispatch bypasses LInj in water EXCEPT Spiny,
which reaches ChkForPlayerInjury before the area-type test. A Spiny injury via
the positive-speed/stomp-timer EnemyStomped route also bypasses LInj. The helper
retains these source distinctions, injury invincibility and unsigned-relative
comparison. It uses the already cached player box's relative origin and this
slot's pre-movement anchor, without reading future native samples.

13,440 actual unmodified PRG0 PlayerEnemyCollision calls validate22 IDs, both
directions, seven raw X speeds (including0/128), five relative-position pairs
(including equality and byte wrap), land/water and injured/uninjured inputs.
Spiny cases additionally cover positive Player_Y_Speed and live StompTimer.
These are controlled RAM/register procedure calls, not full-frame native runs.
NMI is disabled around each call and a synthetic RTS sentinel terminates it.
ROM/source hashes are recorded in the portable fixture. Unique actual opcode
signatures locate the procedure, not per-level fitted constants.

Natural continuous source:
ae9583fa55be72ee31bf2798fb0ea22b7d8096684827ce8723468d874c30f140
The fixture retains POWER-ON initial RAM and every input/RAM frame0..3030,
including the cold prefix and all3029 native World1-1 frames before the first
next-world transition. Whole-source input/RAM and retained-prefix hashes are
recorded. Simulation resets(false) once, consumes every retained pad exactly
once and never receives native RAM as simulation state or any later reseed.

At source526 slot1 now retains X698.5 while speed8 becomes248 and direction1
becomes2. Source524/525 and526..529 match exactly. For all210 rows from own hit
to the slot's native load/erasure boundary, speed/direction mismatches improve
210/210 ->0/210. The combined raw-body comparison improves0match/210mismatch
->209match/1mismatch; its residual is the pre-existing source735 X-subpixel
load clear (native698.0, model698.5), not suppressed or counted as a match.
The independent ordinary STATE comparison remains3030match/1mismatch/0unchecked
on3031 frames: source734 load.parserColumn/scrollLocked differ, unchanged.
These load-control discrepancies are explicit remaining work, not waived.
Pictures and joint results remain unchecked; Anim owns the held-frame picture
snapshot that consumes this corrected direction.

18 focused tests pass: injury-turn, prior player-enemy latch/native prefix,
block-bump clips, Mario BG/full episodes and shell-launch component tests.
No full npm/tsc/corpus/visual audit was duplicated. This commit is separate
from the Mario background unitc62a6c8; PlayerMotor/camera arithmetic is untouched.

Reproduce:
c++ -O2 -std=c++20 -ffp-contract=off -I NESLE/cpp/include -I LAB/rl/csrc tools/harness/native-enemy-injury-turn-proof.cpp NESLE/cpp/src/rom.cpp -o /tmp/enemy-injury-turn-proof
/tmp/enemy-injury-turn-proof 'Super Mario Bros (JU) (PRG 0).nes' > /tmp/enemy-injury-turn-proof.json
npx tsx tools/harness/native-enemy-injury-turn-survey.ts
npx tsx --test tests/native-enemy-injury-turn.test.ts
The committed CPU JSON adds role/ROM/source-hash metadata to the raw output.
