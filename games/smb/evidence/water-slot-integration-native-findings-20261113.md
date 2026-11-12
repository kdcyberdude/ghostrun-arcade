# Water slot chronology with native life-load clocks

This slice combines the safe water commits through7064c46 with integration3607c19. Its native RNG hold at InitializeArea exposes previously masked water slot and contact errors. The full7-2 equivalence regression remains enforced.

Native evidence and rules:

- Ordinary placed Bloopers and swimming fish wait for a free enemy slot while still beyond the visible right boundary. A full table at their first load attempt does not permanently discard them. Root cause: the old generic activation path set slotLost immediately for a Blooper with no available slot.
- Place water objects after the current ScrollHandler and before the swimming frenzy sees the table. Their birth row initializes position/state and does not move them. Native7-2 first Blooper is active on482.
- OffscreenBoundsCheck runs after an object's step against the current scrolled left edge. Bloopers and swimming fish have native id<13, so the bound is ScreenLeft-73. Preserve their x/y slot fractions for the next owner; a Blooper moves integer pixels while retaining the inherited x fraction.
- An object erased during its own slot pass does not get re-created in that slot on the same pass. Reserve it through that row. Native7-2: old slot3 erased2362, Blooper1440 born2363; slot1 erased2424, Blooper1504 born2425. Slot2 erased2430, parser task7 inhibits the next load row2431, swimming fish appears2432. FrameCounter/random register/height bag then agree at these births.
- HandlePECollisions branches straight to InjurePlayer in a water area. A swimming Cheep cannot receive the generic land stomp. Native BoundBoxCtrlData control9 is [3,14,13,20], a six-pixel-high enemy box, against Mario's small [3,20,13,32] or big [2,8,14,32] box (big crouching uses [2,20,14,32]). Coordinates precede the trailing whirlpool pass. All6058 visible even-frame rectangle pairs extracted from the32 traces match the helper exactly.
- ForceInjury preserves the swimming motor's separate native y fraction. At7-2 frame2713 it is240 with speed force104. Using the generic float player's fraction0 made the second death arc end one row late at2950. Copy NativeWater.frac into native death motion; its recorded arc now matches every row2713..2950.

Validation includes the unchanged full7-2 legacy equivalence test; recorded birth/erase/parser row checks; every recorded rectangle pair; the existing8913 swimming,8929 Blooper and6940 flying-fish transition checks; and all32-level legacy field regression gates. New source state does not read future frames or use per-level motion corrections.

The previous camera-cross approximation for parser task7 remains shared engine debt: walkers2 is building the actual task/scroll clock, including VRAM-buffer inhibition. The source-driven specialSlot5.frenzyBuffer API is available from sky552c45b and should replace legacy swimming generator camera ranges next. Strict area identity still exposes logical transition ownership and unsupported families; this slice does not mark strict coverage complete.

Final verification: all1446 tests and TypeScript pass. The32-level same-tool survey has zero earlier fields versus the combined-clock baseline;7-2 death/time/x return to null.2-3 remains all-null, and2-2 first remains4276.

## Source AreaFrenzy activation replaces fitted camera windows

The final 2-2 death/time discrepancy (6396/6415) follows a generator activation gap. Native source water area pointer44615 has AreaFrenzy command23 at column1280. Parsing that command at camera928 queues23; its first free native enemy slot consumes it and sets EnemyFrenzyBuffer23. During the third life Mario stalls at camera928 for hundreds of rows. Native fish are born at5540,5572,5604, all at X1215, slots0/1/2, native Y40/152/168. The fitted fromCamera931 kept the remake empty until5904, then generated three unrelated fish. Using the source buffer produces all three native births exactly and makes every legacy field of the entire2-2 replay exact, matching7-2.

The same change removes fitted stop-camera values2700/2564 and the per-course high/low fish ID mapping. Source BulletBillCheepCheep uses random byte s >= `$aa` to index SwimCC_IDData `[10,11]`, increments that index when WorldNumber is not World2, then masks it to one bit. Source EndFrenzy command24 clears the buffer. The generator now accepts any water area with buffer23, so other water rooms and later recordings follow actual parser commands. Native slots below3, timer32, right extent+32, BitMFilter heights, RNG and slot residue behavior remain source rules. Full32-field survey changes only2-2 dead/time to null.
