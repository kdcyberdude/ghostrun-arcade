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
