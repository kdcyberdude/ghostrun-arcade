# Native water mechanics and live pit falls

Source: all 32 v2 RAM traces from `scripts/recording/native_ram_trace.py`, and the locally available SMB disassembly (`/tmp/smb-native-sky.asm`, MoveBloober, ProcSwimmingB, MoveFlyingCheepCheep, PlayerHole, RunGameTimer, and SetSecHard). No frame-specific runtime corrections are used.

## Reproducible rule evidence

`tools/harness/native-water-rule-events.mjs --traces DIR` extracts the slot bytes used by `tests/native-water-rules.test.ts`:

- All 6,940 live flying-fish vertical transitions match gravity 13/256, speed cap 5, and the native force bump. The bump table is PRandomSubtracter ($F8,$A0,$70,$BD,$00), FlyCCBPriority ($20,$20,$20,$00,$00), and the following six opcode bytes ($B5,$1E,$29,$20,$F0,$03). The native index intentionally reaches those code bytes. These are native constants, not fitted level parameters.
- The Blooper state machine matches 8,928 of 8,929 transitions using the current observed player position. On 2-2 frame 1500 the player low y wraps 254 to 0 while the observed Blooper transition is consistent with the earlier value. The fixture brackets the input read on page-crossing captures; there is no runtime exception. Native motor state reads its slot counter, force, interval timer, direction, the frame counter, random byte slot+1, and Mario's position/direction. The mask comes from SecondaryHardMode ($06CC), seeded at the entrance and initialized by the native world/course rule (world > 5, or world 5 course >= 3).
- All 25 Blooper spawns initialize counter/force/timer to 0 and direction to 2. All 32 observed reused flying-fish slots keep the prior x/y position fractions until an area load clears them.
- Four automatic intro pipe loads (1-2 frame349, 2-2 frame352, 4-2 frame351, 7-2 frame352) match FrameCounter 24, IntervalTimerControl 0, and every random-register byte. The native load row resets FrameCounter and holds the random/interval registers for one row. The effective helper accounts for that one hold when the remake finishes its pipe phase.

## Live offscreen fall

PlayerHole preserves engine 8 until vertical page 6; page 2 locks scrolling, starts death music, and stops RunGameTimer. The old remake entered its dying phase at feet >272, freezing Mario and the camera early. The automatic fall now continues ordinary player/enemy motion, locks the camera after crossing page 2, and selects the one-row engine-6 death state only at page 6. The right screen bound preserves position/speed fractions and clears only the horizontal speed byte, matching native ImpedePlayerMove.

`tests/native-water-integration.test.ts` replays the real 7-3 decisions and checks every frame 572..838: phase, Mario's x/y, camera, timer, and the life transition. All match, including the frame667 right-edge clamp. Explicit `die(false,true)` callers retain the existing synthetic offscreen-duration helper; ordinary gameplay follows the native live path.

## Survey and remaining work

Relative to c65a9b8, 2-3 first enemy divergence advances 79 ->852 (the newly exposed native id10 fish at x2304 is absent from the compiled roster); 7-2 death1118 ->2169 (native Bloopers now take the ordinary touch test); 7-3 first enemy84 ->297 and death577 ->1526. The 7-2 first position difference is1522, on a later entry after the now-correct first death. These levels are not complete.

Earlier fields introduced by continuing the previously hidden live fall: 4-2 timer1084 ->1060 follows the existing death640; 6-3 enemy1945 ->1611 follows y401/death518; 7-3 camera/x/y1919 ->1913 follows enemy297 and death1526. These are downstream of existing differences, not an earlier first divergence of those levels. Full native-divergence remains strict and unchanged.

Open: native ordinary swimming Cheep slot motion, missing stream fish in2-3, later flying-fish contacts and generator/slot interactions, and later area-load/respawn clocks. The ordinary 8-4 pipe timing differs from automatic intros and is not changed by the intro-clock helper.
