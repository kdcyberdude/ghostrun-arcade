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

The missing compiler receipt evidence/firebar-5-4-shared-verification.json and
its generator tools/firebar-5-4-shared-verify.ts do not exist in any reachable
git history or the searched project/tmp backups. Production pins its semantic
hash795901128f0a999057bb2440e18f0480b09278c30e98eb35c6ab47d1fd25e4a6
(excluding top-level date), and the proposal pins original raw hash
0c64d9a77ef046482a7b5bc1f4899e80cc854046f7e429d67167eba8fc64f75f.
The receipt cannot be reconstructed honestly from those hashes.
