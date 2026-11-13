# Native Hammer Bro contact and defeat

`InitHammerBro` selects `BoundBoxCtrlData`11: offsets4,4,12,28. The source `RunNormalEnemies` order is graphics, bounding box, background collision, enemy collision, player collision, TimerControl test, then `ProcHammerBro`. Native ID5 accepts a stomp for positive player Y speed or StompTimer; the ID>=7 test for a player twelve pixels above the enemy does not apply.

The runtime now performs Hammer Bro contact between the existing background and movement steps. An injury leaves the horizontal speed/direction and stopped motor intact; the shared slot visitor holds later actors. A stomp calls the source equivalent of SetStun/InitVStf: move up2, state32, zero speed/force, retain vertical fraction, award1000, and set only Mario's speed byte to$FD while retaining force/fraction. A star defeat uses state34, speed$FD and horizontal speed$10/$F0 from PlayerEnemyDiff. Defeated motion uses MoveD_EnemyVertically plus MoveEnemyHorizontally. Graphics erases the slot after native Y high becomes2; the source ID0 horizontal tail on that erasure turn is retained.

The existing source motor receives an optional callback exactly at the source player-contact point. No runtime frame/level exceptions or pre-recorded event schedules are added. Three hand-seeded layout tests now initialize actual native FrameCounter together with their old public enemy-pass counter; otherwise they accidentally tested an odd source contact row.

`native-hammer-contact-probe.py` packages427 controlled native branches using actual bbox11, small/big player, boundary positions, speed, collision latch, star, injury, counter parity and StompTimer. Both pure action/latch and full runtime X/Y/speed/force/fraction/state match every branch. Native stomp/star trajectories continue through erasure. The observer is built from `native-special-slot-observer.cpp` against current ghostrun-lab, authenticates the recorded5-2 entrance, and writes no ROM. The fixture retains the ROM hash.

The unmodified first550 rows of8-3 and first930 rows of3-1 use their recorded initial RAM and pads. They include the real stomps at492/924 and every intervening row. Pixel positions in the legacy actor adapter match throughout both prefixes. The complete strict field tables explicitly retain existing source-slot gaps:8-3 extra264/missing341;3-1 missing799. All other strict first fields are null within these prefixes. The raw-stream worker owns those placed-object/slot gaps; no row or field is omitted. `native-replay-prefix.ts` regenerates the prefixes.

The legacy adapter now retains active native Hammer Bro/Lakitu corpses until native erasure and applies the16-pixel Y convention for respawn bbox8 Lakitu. Previously it dropped these actors at defeat while native still retained their flags. Its outputs are checked against both Lakitu native defeat trajectories and the actual recorded Hammer Bro prefix.

Full32 before/after fields are preserved in `evidence/hammer-contact-survey.json`, baseline9b70d3a. Principal improvements:3-1 enemy924→1147 with every Mario/HUD field exact for the entire trace;8-3 enemy492→619, death976→3813, timer976→3830, and camera/Mario X/Y become exact. Later unresolved mismatches remain visible. Allowed earlier downstream fields are5-2 camera/X1389 after existing enemy850/strict position654;7-1 death1033/timer1046 and next-level/coin3023 after existing enemy443/strict position395 and Mario Y444;8-3 score989 after enemy/strict position619. No other field moves earlier. Excerpts are regenerated with these explicit downstream exceptions.

Validation:1,864 tests and TypeScript pass, including427 controlled runtime branches, complete native defeat trajectories, both recorded prefixes and the full32 survey. CPU/NMI overrun prediction remains open in the separate scheduling investigation.

## TimerControl during the shared misc pass

Source `ProcHammerObj` checks TimerControl before its state/held/release/gravity/contact logic. A nonzero value branches to `RunHSubs`, which still refreshes offscreen bits, relative position, cached bounding box and drawing. The runtime now guards only motion/contact and preserves that tail. The hammer that causes injury has already moved; the remaining lower misc slots hold their prior motion state. Held hammers also keep their attachment countdown and owner throwing bit.

`native-hammer-hold-events.ts` authenticates all368 captures/5,178,452 rows against the prior corpus hashes. It finds2,732 held calls, thirteen distinct input/output cases (including a held0x8D state), and three lower-slot holds on an injury row. Every observed held position, speed, force, fraction and latch remains unchanged; native boxes are refreshed. There are no diagnostics, rewritten owners or erased held objects in this corpus. The fixture retains both actual full-RAM passes that raise TimerControl via a hammer:7-1 row1152 and8-3 row4001. Subroutine integration tests use those native before/after states and reproduce every hammer position/motion byte, collision latch and cached box in descending slot order. This is a primitive-boundary proof, not a claim that the earlier-diverged whole remake replay reaches those exact poses.

Against619434c all256 legacy first-field results and all strict first fields are unchanged except8-3 state3814→3813, downstream of existing enemy/position619 and remake death3813. Native held-state behavior remains the same generic rule in every scene.1,901 tests, TypeScript and excerpt regeneration pass. The animation worker owns the separate per-slot drawing snapshot, so its already-drawn higher slot keeps the earlier animation phase while later held slots draw with TimerControl set.


The combined4aa045a gate moves8-3 strict state3814→3813 compared with
b4c934e. `evidence/native-hammer-hold-causal-8-3.json` preserves actual RAM,
input hashes, per-slot before/after turns and a guard-only counterfactual. Both
replays already diverge at strict extra264/missing341, and both falsely die3813.
The remake slot5 hammer raises death on3813; its subsequent slot4 turn starts
with TimerControl held and correctly retains state139/x1878. Native remains
engine8/TimerControl0, so native slot4 advances139→138/x1878→1879. Removing
only the guard accidentally matches that native state for one more row by moving
after the remake's own contact. Source ProcHammerObj explicitly branches on
TimerControl before decrementing state and still executes RunHSubs. Preserve
that order and the HUD/graphics tail. This exact state-field shift is downstream
only while the earlier strict extra264 and existing death3813 remain unchanged;
it is not an exemption for other fields/levels or evidence of complete fidelity.
