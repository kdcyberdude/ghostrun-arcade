# Native castle slots and contact, 2026-11-13

Branch `fix/smb-castle`, resumed from untested WIP `096e93f`; base `c65a9b8`.

Rules now read native enemy-slot speed/fraction residue, random registers, interval control, flame timer/counter, and parser scroll blocking. Firebars use the same shared slots in every castle, replacing the selected per-level prefixes and fitted initial angles. Podoboos keep $0417+s when reusing a slot and wait when the five-slot buffer is full. Paired 3-4 bars and the missing 4-4 bar are level objects witnessed in native RAM and retained by the compiler.

Firebar contact reads previous-frame Mario OAM x and current camera/y, including the x240 cutoff and the big-Mario 0/12/24 probes. Native OAM regressions cover 1-4 rows540-541 and 6-4 rows261-262. Offscreen Bowser flames now occupy slots, use $078F/$0367 and random byte s, and release with native offscreen bounds. KillAllEnemies clears flames and the frenzy on castle loopback. The 36 recorded offscreen flame births are extracted by `tools/harness/native-castle-flames.mjs`; every birth passes its regression.

Native source: https://gist.github.com/WillSams/678a2d8a49d3f01e1d6e0362f83d1fbc (local read-only copy `/tmp/smb-native-disassembly.asm`). Flame-generator positions in `data/native-castle-flames.json` are object-$15 positions decoded from E_CastleArea1..5, not fitted per-level timing constants.

Base -> final first differing fields on all 32 traces:
- 1-4: dead541 ->764; time542 ->928.
- 2-4: enemy185 ->1083.
- 3-4: enemy120 ->1294; x/y null ->2406, camera null ->2734, downstream of the already-divergent death887.
- 4-4: dead5324 ->null; time5343 ->11398; camera/x/y5731 ->null.
- 6-4: dead262 ->841; time660 ->852; camera702/x666/y679 ->1333; enemy768 ->802.
- 7-4: enemy203 ->10223.
- Other fields/levels unchanged. All v2 excerpts regenerated.

Validation: full npm test and TypeScript pass. Obsolete synthetic expectations for continuous firebar motion, rectangle collision, and isolated fitted initial angles were removed; standalone motor/lookup and native slot/OAM tests retain the applicable coverage. Collision fixtures moved inside the native x240 bound. Compiler execution is blocked by the pre-existing missing `evidence/firebar-5-4-shared-verification.json`; its new metadata application was reviewed, but full regeneration cannot yet run.

Open: native death arcs and respawn clocks, Bowser motion/mouth flames, late mixed-slot castle entities, and the remaining field divergences above. General death-arc changes in the inherited WIP broke older life-flow tests and are deliberately separated from this tranche; full WIP saved at `/tmp/castle-death-wip-simulation.ts`. The native gravity equation (down40/max4) matches all6250 changing engine11->11 RAM transitions, but full launch/freeze/exit timing still needs integration tests. 6-4 enemy802 occurs on the second life and needs the shared area-load/frame-clock work before attributing it to Podoboo motion.

## Life-screen timer followup on integration b31a752

`ScreenRoutines` loads the ordinary lives-screen timer on row9 after the engine6 death row, through DisplayIntermediate; DisplayTimeUp loads it on row8. The old row10 estimate dropped a tick if $077F wrapped on row10. In 4-2 v2: death889, ScreenTimer loaded898 with control0, first tick899, seventh tick1025; native engine7 begins1043 and engine8 begins1060. A native falling entrance must begin its engine7 stage18rows after the final tick; a grounded entrance reaches engine8 one row later. The change applies by engine/entry state, not level id. Native fixtures also cover 1-4 death763 and 7-4 timeout9823; existing life/death tests remain unchanged.

4-2 improves first1060 ->2083, time1060 ->2236, x1067 ->2085, y1065 ->2083, score/coins1288 ->2227/2517, dead1910 ->2226. No other fields of any level move against the integrated castle baseline. Native death arcs remain a separate open item.

## Exact death arcs, load clocks, and Podoboo edge contact

Every frame of all31 retained engine11 arcs (through their engine6 exit rows) is now checked by `tests/native-death-arcs.test.ts`; extraction and RAM addresses are in `tools/harness/native-death-arcs.mjs`. KillPlayer replaces only the signed speed byte with -4. After15 frozen following rows, ImposeGravity uses down40/max4, retaining the $0416 position fraction and $0433 move force; grounded launches retain the last landing fraction. Death exits at native page4 (remake feet800), replacing the802 estimate and the fitted208-row below-screen arc branch.

InitializeArea holds the LFSR and clears $09 on the third row after PlayerLoseLife, as directly witnessed across the native respawns. The first engine8 row already has the in-range Podoboo initialized on engine7 and its first MoveJ step completed. Native bbox9 puts Podoboo top at y+14/bottom at y+20, so small Mario contacts at dy0..18 inclusive; old dy16 fit missed the native edge death6-4 row841. The vague old dy17 'alive row' could not establish a vertical-only bound (other contact conditions also matter); the replacement fixture cites the precise native box and death row.

DisplayIntermediate/DisplayTimeUp queues text and enables PPU output; the text becomes visible at the following NMI. Both renderers now read the simulation's native early-visibility condition. Existing screenshot visibility brackets pass unchanged. Legacy direct synthetic arc tests now explicitly count their engine6 exit row and zero position fraction; full31-arc frame tests replace their approximate207/208 duration assumption.

All32 replay survey: 6-4 has NO divergent field. 7-4 enemy becomesnull. 1-4 dead/time/x/y becomenull (enemyBowser1855 and camera1927 remain). 2-4 dead/score/coins become null; enemy1053 ->3600. 3-4 dead/time/score/coins/x/y become null; enemy1294 ->3434. 5-4 first355 ->681; 7-3 first1526 ->1914. 8-2 dead2521 ->2003/time2535 ->2017/camera2499 ->2474/x2498 ->2474 occur downstream of unchanged enemy625, Mario y1316 and score1320 divergences. At native2003 Mario is grounded and dies; the remake is airborne after an earlier divergent stomp, with already-different enemies. The corrected universal respawn LFSR phase changes that later encounter; no field becomes earlier than its level's existing first divergence.

## Death-row game-timer ordering on integration3607c19

Native RunGameTimer executes after enemy contacts and returns immediately on engine11. When an enemy/firebar kills Mario on a due digit-tick row, the remake must undo its earlier digit tick; the time-out branch itself is excluded. Native4-4 row11398 keeps292 while entering engine11. The dedicated full4-4 excerpt regression checks every compared field on every frame and now has no divergence. This case does not reach Bowser/castle completion in the retained recording.
