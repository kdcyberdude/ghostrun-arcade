# Native eight-sprite scanline capability

The2D renderer now applies the first-eight OAM fetch rule when it can reconstruct
all fetch reservations from source state. It does not count opaque GPU quads.
Mario owns eight entries, including the transparent upper half of small Mario;
a live Goomba owns six, including its blank top row. Sprite0 retains its native
HUD marker. Source shuffle offsets determine the addresses. Sprite selection
uses final Y/address ownership regardless of CHR transparency, X or priority.
The compositor clips only the rejected pattern rows and retains existing image,
background priority and palette selection.

The initial capability covers ordinary Mario and live Goomba compositions. It
refuses unknown actors, misc/popup/block/vine/flag/area writers, source control
phases, unsupported player variants, vertical masks and overlapping writers.
`GameRenderer.nativeOamCapability` reports these reasons. Refused compositions
retain the existing renderer; this is an explicit visual gap, not a claim that
those frames satisfy the native cap. No level, recording or frame selects the
runtime path. No Simulation, physics or3D code changed.

MoveSpritesOffscreen clears all nonzero OAM Y bytes to248 before source graphics
writes. The assembler reconstructs every final Y byte and every tile/attribute/X
byte written by the supported handlers. It deliberately leaves hidden unused
pattern/attribute/X residue unknown: those bytes cannot enter a scanline fetch.
Player forced-foot symmetry comes from ChkForPlayerAttrib table offsets50/B8/C0/
C8; Goomba direction/animation comes from the captured graphics turn and
FrameCounter bit3. SprObjectOffscrChk hides whole columns, including the left
column exactly at X0. These rules are in the [native source](https://github.com/Xkeeper0/smb1/blob/master/src/prg.asm)
(RenderPlayerSub, ChkForPlayerAttrib, EnemyGfxHandler, GetXOffscreenBits).

The portable fixture contains the original1-1 input/RAM sequence (3,020 rows)
and the original1-2 prefix (530 of3,060 rows).1,505 supported frames compare
167,249 reconstructed bytes with native OAM, including every Y byte of all64
slots. There are zero mismatches. Unsupported compositions remain counted and
reported. Ground and underground pictures, hidden column writes, both direction
phases, transparent rows and actual shuffle offsets are included. The fixture
checks source-address fetch masks as well as the reconstructed bytes.

Focused pictures are recorded in `evidence/native-oam-cap-focused-pixels.json`.
The retained1-1 native entrance replay authenticates all1,440 CPU RAM rows in a
separate diagnostic backend whose only rendering change expands the native cap
and its fetch arrays from8 to64. At frames1428–1437 the old uncapped remake RGB
matches that diagnostic64 picture exactly. Normal native8 differs by1,424pixels,
with per-frame counts86/94/178/176/180/176/176/180/92/86. Applying the source cap
reduces the focused1420–1440 picture interval from1,424 to0 differing pixels;
all21 frames, HUD and1,008,000 compared playfield pixels are exact. The report
preserves the CLI's incomplete/full-input coverage status; this interval is not
an all-level or whole-input picture pass.

Three focused tests pass. No full npm/TypeScript/corpus/all32/pixel audit was run;
integration owns batch gates. Source CPU/NMI overrun scheduling, retained-buffer
phases and other object families still need their own authoritative OAM writers.
This unit does not invent a clock hold or clear/retain correction for them.
Native3D objects remain unchanged; the pure OAM helpers can separately explain
native2D fetch loss to a future visibility audit.

Reproduce the RAM fixture with `native-oam-picture-events.ts --traces DIR
--entrances DIR --cases 1-1:3020,1-2:530 --out JSON`, and run
`npx tsx --test tests/native-oam-cap.test.ts`. Build paired diagnostic backends
with `node tools/harness/native-oam-cap-backend.mjs --lab LAB --nesle NESLE
--out OUT --slots 8` (or64); use the existing retained-entrance branch tool to
restore the authentic full emulator archive, replay the same pads and verify
every RAM byte. Exported native pixels, ROMs, archives, libraries and copied
backend headers stay outside the repository. The preserved cfee151 diagnostics
also document78 cap-affected crowded frames across12 levels; that earlier
survey is supporting evidence, not expanded runtime capability coverage here.
