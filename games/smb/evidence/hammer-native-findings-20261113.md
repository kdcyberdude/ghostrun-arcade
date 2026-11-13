# Native Hammer Bro motor, 2026-11-13

Source: `https://github.com/MrWint/smb-dis/blob/master/smbdis.asm`, routines
`ProcHammerBro`, `HammerBroBGColl`, `ChkForBump_HammerBroJ`, `SpawnHammerObj`,
`ProcHammerObj`, `OffscreenBoundsCheck`, `InitHammerBro`.

`src/hammer-bro.ts` uses slot jump timer $3C+s, throw timer $03A2+s,
frame timer $078A+s, interval timer $0796+s, state $1E+s, vertical bytes
$A0+s/$0434+s/$0417+s, random bytes $07A8+s/$07A9+s, FrameCounter $09,
and secondary hard mode $06CC. No recorded per-Bro action schedule is read.
The roster still supplies object x/y, as level data. A slot retains its jump
timer between occupants; InitHammerBro does not clear it. A side collision
jumps through SetHJ, executes movement, returns to the caller, and executes
movement again. This double movement is visible in 5-2 rows 823 and 874.

Native-event regression: all 3812 progressing normal-play Hammer Bro rows
match the full motor output (jump/throw/frame/interval timers, state excluding
the later misc-pass throw bit, y/speed/force/fraction, horizontal speed).
Events contain native block-buffer support, side probes, and allocation context.
Tests also cover slot timer reuse, misc allocation guards, held/released
hammers and contact/fireball behavior with native state fixtures.

## Parser-only native row

5-2 rows 2178 -> 2179 hold FrameCounter at 161. Exact RAM differences:
$0000:112->192, $059E:0->85, $071F:8->7. The other 2045 RAM bytes, including
all OAM shadow bytes $0200..$02FF, player/enemy positions, LSFR and timers,
are unchanged. `hammerLagRows` retains the exact changed bytes and both OAM
copies. The motor event test requires an advancing native FrameCounter;
there is no row-number exception in the runtime. Native PPU/CPU scheduling
must be investigated to reproduce this parser-only sampling row globally.

## Campaign results before integration with clock/slot fixes

Compared with 93325db: 5-2 enemy 742->761, death 1044->1758, coins 1092->null.
Its y 1426->1325 and x/camera 1426->1389 follow the enemy divergence at 761.
7-1 x/camera 1036->863 follow the existing enemy 359/y 441 divergences.
8-3 death 572->488 and timer 592->496 follow existing enemy divergence 182;
x/camera 501->855 and y 493->855 move later. Other level fields are unchanged.
All excerpts regenerated; npm test 1241/1241 passes, TypeScript passes.

## Remaining interactions

At 5-2's first Bro, the remake uses slot 0 while native uses slot 1 (native
cannon objects and other actors affect slot order). The standalone branch's
FrameCounter after a cloud return also has the old area-load phase; integration
must keep the animation/water branches' native area clock fixes. Native misc
jumping coins share hammer slots 6..8 and their vertical residue; the existing
coin item system does not yet expose those misc slots. Native hammer collision
and rendering still need complete per-frame native audits.

## CPU observer confirmation

A read-only extension of the native recorder (tools/harness/native-timing-observer.cpp)
replayed the same entrance/pads and confirmed a real CPU/NMI overrun, rather than
a phase inferred from positions. Exact observations: evidence/native-engine-overrun.json.

At row2178 the CPU is at $94FA (CLC in RendBBuf/StrBlock, after writing
a metatile), SP=$F5, parser task8, FrameCounter161, PPU frame38855/dot82186.
At row2179 it is back at idle $8057, SP=$FF, parser task7, FrameCounter161,
PPU frame38856/dot82185. Normally the CPU is already idle at each PPU sample.
The NMI increments FrameCounter before GameEngine, runs AreaParserTaskHandler
at the end of GameEngine, and reenables NMI only after it completes. The parser
work straddles the PPU boundary and misses one game update. There is exactly one
normal-play held-counter event in these 32 traces.

A predictive fix needs CPU instruction/work timing, including graphics and parser
work, rather than a per-frame/per-level skip. No runtime exception was added.
The apparent first-Bro clock offset at5-2 row761 actually follows a respawn:
native clears $09 atrow312 (engine0, area task1), not a cloud return. Keep the
animation/castle branches' respawn FrameCounter reset when integrating.

The initial compiler audit found neither the missing receipt nor its generator
in reachable git/current-project/tmp backups. That search omitted earlier
sibling projects. The later compiler recovery found genuine copies in
/home/kd/Desktop/proj/build_games_from_scratch_in_threejs and its mario-25d
sibling. The recovered original verifier reproduces production semantic hash
795901128f0a999057bb2440e18f0480b09278c30e98eb35c6ab47d1fd25e4a6 exactly.
The hash-pinned rerun attestation also recovers the original complete report
0c64d9a77ef046482a7b5bc1f4899e80cc854046f7e429d67167eba8fc64f75f by restoring
only its independently attested date. Hashes alone were insufficient; actual
original artifact bytes are now bundled. See docs/COMPILER_EVIDENCE_RECOVERY.md.

## Shared misc/projectile follow-up

`src/native-misc.ts` now implements the source misc slot, gravity, offscreen
and byte-box rules. Jumping coins use slots8,7,6 (overwrite8 if all busy),
share vertical force/fraction with hammers, and become floating200 numbers
until state48 clears the slot. MiscObjectsCore runs slots8 down to0.

PlayerHammerCollision runs on ODD FrameCounter rows. It reads the hammer's
previous pass bounding box and the shared Misc_OffscreenBits scratch byte
left by the preceding misc object. It reverses speed once, latches $06BE+s,
and injures only without star invincibility. The fixed hammer box is
[0,0,8,8], regardless of the rotating sprite cell. Native DrawHammer erases
objects according to offscreen bits&$FC, rather than a fitted y limit.

GetMiscBoundBox passes object index slot+9 to CheckRightScreenBBox, while
actual misc positions live at sprite-object index slot+13. Clipping thus
reads block positions for misc slots0..3, and four-earlier misc positions
for slots4..8. Example:3-1 row864 hammerx1840/camera1641/y87 has native box
[0,87,0,95] because the aliased reference object is atx0. Source block
position/bounce/shatter slots and the persistent misc position bank supply
these alias inputs; they are not reconstructed from a recorded row number.

Native regressions cover529 misc gravity/box rows,2492 hammer contact rows,
136 offscreen rows,7 coin allocations and100 block-alias motor rows. None
of these recordings contains a true PlayerHammerCollision latch transition;
separate boundary/parity/latch tests cover positive contact behavior. The
simulation coin pass is also replayed against the recorded native rows.
All1249 tests and TypeScript pass; excerpts regenerated.

Relative to66a59e3 only8-3 changes: death488->624, timer496->640,
score497->745 improve. Camera/x855->508 andy855->493 follow the unchanged
enemy divergence182. Other32-level survey fields are unchanged.

Integration notes: render Item.nativeCoin.state>=2 as the200 number, not a
jumping coin; state1 coin pose is(FrameCounter>>1)&3. Animation worker has
this handoff. Native hammer hand pose is0; flying pose is(FrameCounter>>2)&3.
Full special enemy slot5 ownership is still missing: powerup-only occupancy
does not cover a pre-touch flag loaded by the area parser or a living vine.
The flag worker confirmed this and it must remain an explicit open item.

## Reserved enemy slot5 and source area controls

`NativeSpecialSlot` tracks native flag/id/position, vine segment ownership,
AreaFrenzy queue and frenzy buffer. Native ROM row-$0D FlagpoleObject and
AreaFrenzy commands replace inferred late-slot guards: the parser claims a flag
before Mario touches it, a vine/powerup replaces its owner, and queued frenzy
objects can reach slot5 after ordinary slots fill. Flags increment the existing
flag byte; Stop_Frenzy clears its consumed slot. ROM positions are generated
level data, bound to existing area geometry through native-level-map offsets.
They are not measured replay camera/frame thresholds.

Native fixture coverage includes19 retained flag births,8 queue consumptions,
controlled vine growth/limits/offscreen erasure and the CheckFrenzyBuffer
second-vine allocation in ordinary slots. A duplicate vine reserves its ordinary
slot even though the shared VineObjectHandler graphics run from slot5. Growth
stops at48 pixels with one segment and96 with two. The legacy vine visual/climb
representation remains separate; this unit supplies native allocation state,
not complete vine picture equivalence. Existing water/flying generator actor
creation still needs to consume the source-derived frenzy buffer instead of
its legacy ranges. Ordinary queued actor motor creation is not replaced here.

Above-block coins expose a native SetupJumpCoin carry quirk: four ASLs on the
block-buffer low byte leave its original bit4 in carry, and ADC $20 has no CLC.
Odd native buffer pages therefore start the coin one pixel lower. Native1-2
row865 startsx949/y129, then gravity makes y124;4-2 row2517 starts at y128,
then123. `spawnNativeAboveBlockCoin` derives this from native geometry/page
parity. Integration must call this helper from its existing CheckTopOfBlock
award path (that earlier path is absent from this branch's base), replacing the
old x*16+5,y*16-32 visual coin push while preserving the score award.

All1257 tests and TypeScript pass, native excerpts regenerated. Full32 survey
compared with5fb43ff: no first-divergence field changes. Integration must retain
its a885064 nativePowerState/powerup motor while combining the new parser-time
slot claims; this branch's base contains only the prior generic item motor.

## Unvisited8-3 late geometry evidence (no tile edits)

`native-eight-three-late-map.json` records a controlled native ROM parser probe.
The retained8-3 runs visit columns0..161/141/159; zero mismatch on their visited
block buffers says nothing about the remaining map. Restore the recorded8-3
entrance, set HalfwayPage $075B=8, OperMode_Task $0772=0, engine $0E=0, then
run neutral inputs. When parser task $071F is idle, set ScrollThirtyTwo $073D=32
to request normal parser pairs. Keep player vertical state and star timer fixed
to prevent termination. Sample MetatileBuffer $06A1..$06AD after tasks7/3 and
block buffers $0500/$05D0 after column advance. No ROM/metatile writes occur.
`native-late-area-probe.py` and `native-special-slot-observer.cpp` reproduce
this probe with explicit lab/ROM/boot/recording/library paths. This is controlled
parser evidence with a stationary camera, not an ordinary gameplay recording.

ROM L_GroundArea2 tail: A5 60 C3 31 FE31 6D C1 BE42 EF20 FD.
The 6D C1 FlagpoleObject command is native column214: slot5x3416/y48,
ball metatile36 at(col214,row2). Existing model ball is(col215,row2), exit
x3448 and doorX3568. No native door coordinate is inferred from those values.
Raw native columns152..239 are retained. Against model tiles within width3696,
158 cells differ over42 columns spanning162..230; the artifact lists every
cell. Native castle roof69 occurs at220/221 row7,222 row4,223..225 row2,
226 row4,227 onward row7; model roof begins221/222 row7,223 row4,
224..226 row2,227 row4,228/229 row7. The ROM source and controlled buffers
must determine the eventual full geometry fix; no per-level runtime offset or
manual tile shift was added. Parent owns the data/compiler correction.

## Native Lakitu reappearance lifecycle

LakituAndSpinyHandler's missing-Lakitu branch now reads the frenzy timer,
$06D1 reappearance counter and ordinary slot flag/ID banks. An expired attempt
sets $078F=128; if no Lakitu ID17 remains (including a defeated but unerased
owner), it increments $06D1. At7 it chooses the highest free slot4..0, resets
the counter, and SetupLakitu/PutAtRightExtent place the actor at screenRight+32,
nativey32 with zero horizontal speed/fraction and vertical speed/force. A higher
slot then moves during its remaining turn in the same pass; creation in the
initiating slot waits for the next pass. MoveLakitu preserves that nativey32,
rather than forcing every Lakitu to the original level object's nativey48.

Eight controlled native engine branches cover first/sixth/seventh attempts,
one/two/all free slots, a full bank, running timer and a defeated existing ID.
`native-lakitu-reappear-probe.py` reproduces the fixture through the committed
special-slot observer; the retained entrance hash is verified before RAM setup.
The actor starts at x287/y32 on a still camera; when born in a later slot its
first MoveLakitu producesx286+176/256, speed$FB/direction0. These are consequences
of source slot order and byte arithmetic, not level/frame exceptions.

All1259 tests and TypeScript pass; excerpts regenerated. Full32 field survey
is unchanged from552c45b. Current recordings do not exercise this reappearance
path, so this is native branch evidence rather than a claim of a corrected
recorded first divergence. Native FinishFlame also leaves reappearing Lakitu
with bounding-box control8 (original Lakitu uses3); contact/render equivalence
of that smaller post-respawn box remains to be ported and separately verified.
The source-derived lifecycle does not add a predictive CPU overrun scheduler.

## Respawn Lakitu bounding-box contact follow-up

Reappearing Lakitu now keeps source bounding-box control8 as actor state;
normal Lakitu defaults to control3. BoundBoxCtrlData gives respective offsets
[6,4,10,8] and[2,9,14,21]. `lakitu-contact.ts` ports those byte rectangles,
native mask/clipping and PlayerEnemyCollision's even-frame test, overlap latch,
star bypass and stomp/injury precedence. Only reappearing actors use this new
runtime path, preserving the already-exact recorded normal Lakitu interactions.
The player rectangle is the pre-background-snap capture already used by native
misc collisions. An enemy rectangle uses its pre-movement position.

A native overlap is not always injury: positive player vertical speed, player
nativey+12 above enemy nativey, or StompTimer triggers a Lakitu stomp. This
awards800, sets player speed$FD while retaining player force, moves the enemy
up2 and zeros its vertical speed/force. Star contact awards200 and applies
SetStun's up2/speed$FD. MoveLakitu then runs only native downward gravity for
both defeated states, with retained slot fraction. Injury freezes that row's
horizontal step. The defeated motor is followed until EnemyGfxHandler sees
vertical high byte2 and clears the slot before its next movement. Erased
replacement actors cannot reactivate as static list objects.

`native-lakitu-contact-probe.py` generates847 controlled native branches with
bbox3/8, small/big Mario, boundary dx/dy, rising/still/falling velocity, latch,
star, injury, frame parity and StompTimer. Every measured rectangle, action and
latch matches. Runtime tests replay every control8 response and score/speed/
vertical byte output. Separate native star/stomp trajectories retain78/59 rows
through slot erasure. These are controlled native evidence, not claimed new
recorded first divergences. Full32 survey vs813918c is unchanged in every field.

StompTimer $0791 is now retained as native state, initialized from entrance RAM,
counted down on enemy passes and incremented by ordinary Koopa/Goomba-class
stomps (source HandleStompedShellE); it affects only the new respawn contact
path. Normal actor contact/motors remain unchanged. All1263 tests and TypeScript
pass; excerpts regenerated. CPU-overrun scheduling remains a separate open item.

## Pipe actors behind the early8-3/5-2 enemy mismatches

Read-only integration29b5de7 peeks identify Piranhas, not Hammer Bro motion:
8-3 native row254 creates plant856 in slot2 on parser task3, but the old model
only marks its slot held and exposes the actor on255.5-2 row776 creates plant888
at nativey160; the screenshot-era spec calls160 its feet, so the old model
initializes nativey136. At777 nativey159 compares with model135. Native source
VerticalPipe supplies actor x=column*16+8,y=row*16+32; InitPiranhaPlant saves down=y,
up=y-24, speed1, flag0. Its creation is after enemy movement and has no motor step.

`native-pipes.ts` decodes vertical pipe records from the ROM, checks its SHA
against source area pointer evidence, and applies existing source geometry
normalizations. All140 retained native births match the ROM x/y exactly. The
39 mapped areas contain106 source plants:90 existing specs agree, two5-2
heights change,14 plants missing from screenshot rosters are included, and the
old4-2 far-roof x3448 is replaced by native3432. Unmapped areas retain existing
actors; this is not a claim that every unvisited compiled room has a ROM mapping.
`observedLevels()` applies the source actor roster without modifying any tile.

Exact records:5-2 pointer$AA94+$1C bytes78 7A ->x888/nativey160/feet184;
$AA94+$58 bytesD9 71 ->x2776/nativey176/feet200.4-2 pointer$ACDA+$96 bytes68 7A
->x3432/nativey160/feet184. Its source pipe left is3424, but the protected model
map puts pipe-left metatile16 atcolumn215/x3440. This is another unvisited late
geometry mismatch; no tile was edited. The obsolete roof test's plant3448
assertion now uses source3432. Native ScrollLockObject_Warp calls KillEnemies
for all live Piranhas; runtime erasure now follows that source rule instead of
matching a screenshot-derived artwork x list. Warp activation/geometry timing
itself is outside this unit and still has previously documented limitations.

Parser births now make the hidden actor/slot visible immediately, preserving
native initialization bytes and waiting until the next enemy pass to move it.
Slots whose earlier enemy pass erased an object can be reused that same row.
All140 births replay their native slot-flag allocation and initial plant state
in component fixtures, including8-3's erased Bullet Bill slot. Full32 first-
divergence fields vsf74dbe7 are all unchanged on this old branch (earlier foreign
field divergences hide these later events). Target peeks nevertheless show the
correct native Piranha y and birth row. All1267 tests and TypeScript pass;
excerpts regenerated. Root must require the integration field ratchet after merge.


## Compiler evidence recovery

The restored original verifier and all compiler hash guards pass.259 missing
inputs (228 evidence/31 tools) are preserved in a deterministic2.9MB archive
with per-file/source checksums and a restore tool. Nine core files are ordinary
files so the original firebar verifier can run directly. Its7 histories,
482 coherent orientations and2461 centers reproduce the exact original semantic
SHA, while all raw2px image cases remain explicitly failing with maximum8px.
No validation predicate, threshold, proposal hash or source hash was relaxed.

A clean archive extraction and an ordinary restored compile both produced
SHA da775a5b39637f8c59cd58688e8035718586c9245a836fd528371cf90ae61bae.
The compiler now supports --out for isolated preview builds; default atomic
production output behavior remains. Protected data/levels.json was never
changed. Preview output differs from the later native-aligned production map
in1779 effective tile cells across33 areas and81 other area fields. The full
list and immutable baseline hashes are in evidence/compiler-recovery-validation.json.
This restores the historical validation pipeline, not native map equivalence;
preview promotion remains prohibited until those source/native differences
are resolved. The manifest contains no ROM, dependencies or scratch checkout.

Recovery gates:1268 tests and TypeScript pass, excerpts regenerated, every
field of all32 native surveys unchanged vsd72cd8c, protected production hash
unchanged, and git diff --check passes. The regression extracts and hashes the
entire archive in a fresh temporary directory, authenticates original report/
attestation/before-report hashes and keeps all seven raw-image failures explicit.
