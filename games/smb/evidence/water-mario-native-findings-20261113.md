# Native Mario swimming, whirlpools and life entry

Base: verified integration snapshot1ba23a7 merged into water worker7fb18cd (prior water slices751c208/297665d retained). Native evidence is the32 v2 full RAM traces plus PlayerCtrlRoutine, JumpSwimSub, ProcessWhirlpools, PlayerBGCollision and ScrollHandler in the SMB disassembly.

Rules corrected, all driven by native state:

- JumpSwimSub's surface-gravity check reads Player_Y_Position ($CE), not its page. Thus native y257 behaves as low byte1: ordinary gravity24, even during an offscreen fall. Native2-2 frames1400..1401 independently check the exact speed/force/fraction transitions.
- A life entry initializes swimming from zero position fractions and forces, rather than the older screenshot-seeded direct-room state. PlayerEntrance begins gravity on the next row; an automatic pipe load has one intervening engine row. Explicit `lifeEntry` state passed by PlayerLoseLife/ContinueGame prevents a stale prior phase from affecting a fresh reset. Native2-2 and7-2 respawn positions match through the first movement frames.
- ProcessWhirlpools runs after ScrollHandler and PlayerBGCollision. A trailing x pull must not be mistaken for a side-wall stop: doing so set SideCollisionTimer16 and froze2-2's camera at959 rather than native1009. Coin probes also read the pre-whirlpool x/y; using the final position awarded7-2's frame4202 coin one row early.
- Whirlpool horizontal pull occurs on odd native FrameCounter ($09), not on the global remake frame. The counter's parity changes across a life load, which exposed7-2's alternating one-pixel x errors from frame2209.
- A supported Down+A stroke that rises from a pillar keeps horizontal speed after SaveJoyp masks the directional bits. The old height176 cutoff was fitted to floor samples. The native surface bound20 distinguishes a rising stroke from a surface stroke. Native2-2 frame2086 keeps speed6184 while rising fromy128 toy126; the old remake braked to6032 and later diverged in pixels at2165.

Validation: actual recorded-input tests compare Mario x/y, underwater camera, timer and live state through2-2 frame2809 and7-2 frame2208; a full-run7-2 comparison test requires every legacy field to remain null. Existing surface-pillar and swimming-wall regression fixtures remain enforced.

Result relative to1ba23a7:2-2 first divergence1401 ->2810 (death1770 ->2810, timer1927 ->2821, x1699 ->3239, y1401 ->3239). Every7-2 legacy field is now null (death/time/score/coins/camera/x/y/enemy). No earlier legacy field is accepted.

Strict coverage is deliberately reported separately: the independently authored strict audit still finds area identity at328 (native load versus the remake's later logical switch), missing first Blooper at482,2-2 slot-position mismatch1500, and7-2 slot-position mismatch1118. Legacy enemy=null skips secondary areas. This slice does not claim water enemy/area coverage is complete. The strict reports were saved to `/tmp/water-mario-strict.json` before the final parity/coin fixes; strict mode must be re-surveyed on integration.

Open:2-2 death2810 follows a native Blooper touch that the remake misses; later differences follow that missed death. Slot birth/erase timing and engine-area phases need the strict audit. No runtime frame-specific correction or per-level movement offset was added.

## Blooper input-phase follow-up

The frame1500 Blooper discrepancy is explained by native engine order: GameRoutines performs ordinary Mario movement, GameEngine then processes enemy slots, and ProcessWhirlpools follows. Mario's end-row position is therefore the wrong input for MoveBloober while in a whirlpool. The runtime now subtracts the trailing whirlpool y movement and x pull before the Blooper's player-relative comparisons. This adds no per-frame correction.

The real-input2-2 regression checks every native Blooper position on frames1488..1508 across Mario's byte wrap. With the independent strict audit, first2-2 slot-position divergence advances1500 ->2592; first missing482 and first extra902 remain unchanged. Every legacy field of all32 levels must remain unchanged or later;7-2 stays exact under that legacy comparison. The pure helper fixture's end-row input bracket is retained as a measurement limitation, while the runtime regression verifies the actual engine phase.

## Floor Down and a previous side contact

The next independent 2-2 Mario discrepancy (integer X at 4276) starts in the fractional bytes at 4128. Native 4126 hits the right wall while facing left: speed byte 0, force 208, X fraction 128, collision bits `$fe`. On 4127 Down remains held on the floor; speed/force and X fraction stay unchanged, but `PlayerBGCollision` restores collision bits to `$ff`. Releasing Down at 4128 resumes right steering, with the old left-facing/right-moving pair doubling friction: force 208 + 304 = speed 2 / force 0, X fraction 160. The inferred motor had retained both a wall pause and its plain-step restart state through the Down branch, delaying acceleration another row. Consuming those states on the intervening floor Down row models the source's unconditional collision-bit restoration, with no course identifiers or row offsets in the rule. A native replay regression checks all six speed/fraction pairs at 4126–4131. All integer positions and secondary-area camera positions now match through 6242; the next fractional error begins 6233, exposed as integer X at 6243.

## Wall reversal and the stale absolute-speed register

The remaining X mismatch at 6243 begins at 6232: after wall contact, speed byte is 0 / force 64 and the neutral swimming row preserves `Player_XSpeedAbsolute=$0700` at 14. Source `GetPlayerAnimSpeed` / `ProcSkid` compares that stale absolute byte with `$0b` before clearing both speed bytes. Since 14 is above the threshold, the left press subtracts 152 from the retained force64, yielding -88 (speed `$ff`, force168). The old helper discarded the force and yielded -152. At the otherwise similar wall reversal 4276, the native stale absolute byte is 3; that row correctly clears the force 24 and yields -152. The simulation now passes its existing native absolute-byte state to the water horizontal helper, preserving this distinction. Recorded-input regressions check both cases and the next three native speed/fraction pairs. Integer Mario X is now exact for all recorded 2-2 frames where the native comparison can evaluate live play; the remaining death mismatch 6396 is a later fish-position/generator issue.
