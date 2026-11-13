Native hammer pictures at timer stops
====================================

DrawHammer reads TimerControl. A nonzero value forces pose0; otherwise only Misc_State low bits equal1 animate from FrameCounter bits2..3. Holding hammers use pose0. This applies to an arc death as well as a power transformation; pit/lava deaths with TimerControl0 continue animating.

The native misc loop runs from higher slots to lower slots. PlayerHammerCollision runs before each hammer's DrawHammer. A contact can set TimerControl in the middle of that loop: original7-1 row1152 draws slot6 with phase3, then slot5's new Misc_Collision_Flag injures Mario, and slots5..2 draw phase0. A single global timer flag would incorrectly freeze the already drawn slot6. The model therefore retains each processed hammer's draw-frame timer snapshot, falling back to the current timer flag on frozen rows when the handler is not run. The shared nativeHammerPicturePhase helper is available to both renderers.

The actual OAM fixture now checks 6,522 native misc sprite pairs across engines8/9/10/11, retaining 2,129 events. It includes163 frozen flying-hammer events and the one already drawn higher slot on the first hurt row. Generator clock selection comes from native TimerControl, newly set Misc_Collision_Flag and descending slot order, rather than from sampled artwork or a level condition.

Movement is unchanged by this picture unit. Source ProcHammerObj also branches to RunHSubs without movement when TimerControl is set by an earlier slot. The existing model still needs that separate handler-order correction. Native power-up slot5 also precedes misc; the model's later collection path needs auditing if a new recording combines a pickup with hammers. Those are explicit remaining source-order questions, not exceptions in the picture rule.

Validation: 1,787 tests and TypeScript pass; all 256 first-field values are unchanged. The fair 32-level sampled picture gate is identical to the HUD baseline on every individual all/HUD/field/aligned metric. The corrected frozen-hammer OAM rows lie beyond earlier state divergences in these recorded inputs, so the sampled gate alone does not demonstrate their improvement; the actual native OAM fixture supplies that evidence.
