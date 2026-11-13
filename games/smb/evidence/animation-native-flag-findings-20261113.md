Native flagpole and player pictures
===================================

FlagpoleFNum_Y_Pos/$010d and its $010e dummy are separate from the flag's $d4/$041c motor. FlagpoleObject initializes numberY to176 and retains the dummy. FlagpoleRoutine executes SEC/SBC255 on that dummy followed by SBC1 on Y. This replaces the fitted225−flagTop popup coordinate. Both flag and number artwork use raw OAMY+1; slot5's rawY now follows the flag. Entrance RAM seeds both number bytes.

FlagpoleGfxHandler owns three flag sprites plus two score sprites, gated together by slot5 owner/id48 and horizontal offscreen bits14. The third flag sprite's ADC8 retains carry from the earlier relative-X+8, CLC, ADC12. Near the right edge this gives an extra pixel of Y. All15,838 native flag handlers (4,384 distinct OAM cases) and1,177 FNum transitions validate exactly.

PlayerGfxHandler continues through flag engines4/5. The slide uses the two-frame native PlayerAnim extent, climbing reload8 for upward speed or4 otherwise, and stops animating when Y speed is zero. Pole contact retains native Y speed and the pre-graphics NMI animation control/timer: an ascending grab can animate on its contact row. The castle walk uses the normal native ground/falling action and reload. This removes globalframe/8 climbing and distance/5 walking fits. All7,136 handled native engine4/5 rows have exact drawn cell/facing; the replay fixture also checks raw animation control/timer/reload.

Dense1-1 pictures2118..2845: all728 are exactly0 aligned differing pixels after the change.1590 tests+tsc pass; all256 legacy first-field values and regenerated excerpts unchanged. Same-b0362ae baseline all32 sampled picture gate runs separately.

Open earlier control boundary: the pre-existing end-stage wait leaves phaseflag on1-1 row2845, while native task4 continues until2851, task5 begins2852 and next-level modeTask0 begins2853. The graphics fixture checks handled flag rows; strict stage/runtime work retains this gap. flag_end owns the sourceID49/StarFlagTaskControl/interval/music replacement. No masking or comparison metric changes were made.
