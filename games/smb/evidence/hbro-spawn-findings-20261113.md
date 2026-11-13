# Hammer Bro initialization belongs to the physical enemy stream

Base: 1f3a544. Runtime changes are confined to the shared placed-scene/profile, ID5 activation and its native-bank dispatcher callbacks. No Hammer Bro motion/contact, collision-latch, Cannon, EF scratch or generic slot-release rule was changed.

## Root cause and source rule

Original 3-1 has raw Hammer Bro records at offsets19/21, 5-2 at7/13/20/22, 8-3 at4/6/12/14/18/20/24/26. The compiled screenshot actors had no nativeId/nativeOffset; the supported physical-stream whitelist omitted ID5. Consequently these actors bypassed ProcessEnemyData, falling back to screenshot activation metadata instead of sharing the cursor and native free-slot attempts with the ordinary walkers and groups.

The generic scene helper now admits fully supported ID5/walker/group rooms, builds actors from raw ROM records even with no screenshot actors, and stamps native identity/offset/column. Unsupported actor IDs still reject this profile. Catalog admission covers original 3-1/main, 5-2/area-2, 7-1/main and 8-3/main, determined by the raw records, not by level names.

Pinned source SMBDIS.ASM revision59e88c0028a58c6d7b9156749230ccac647bc7d4, SHA256 e5c17c42783f430029ab90aa37c73d51c2c320898e533b3ff196dad38c50ae42:

- ProcessEnemyData/InitEnemyObject (8012) clears Enemy_State and calls the ID's initializer, then returns without running that newly allocated slot's handler.
- InitHammerBro (8188) clears HammerThrowingTimer($03a2) and horizontal speed; selects interval $80/$50 from SecondaryHardMode; SetBBox (8224) sets moving direction2 and clears Y speed($a0)/move force($0434).
- Jump timer($3c), frame timer($078a), X fraction($0401) and Y fraction($0417) survive initialization. The existing source-backed Hammer Bro motor consumes these states unchanged.
- Free slots are attempted in ascending order alongside the existing enemy-bank visit. The new actor is not stepped/drawn on its own allocation row. Group followers retain the existing source same-frame movement behavior; their constructor reads the same effective post-scroll camera as ProcessEnemyData, avoiding a second stale-camera eligibility check.

Existing EF capture hooks and the Cannon pass call order are preserved. This unit does not claim that every group scratch callback has been reconstructed.

## Focused native evidence

`tests/fixtures/native-hbro-spawn.json` authenticates four one-time native entrances and 3750 RAM/pad rows: original v2 3-1 first900, 5-2 first1000, 8-3 first900, and independent POWER-ON capture308c986d49124f4bbb39de61a97321678a1dcae576bdf836bc22523bb174d60a entry13 first950 (different random/timer state). Tests compare every legacy/strict field, the raw cursor on every row, and live ID5 state/jump/throw/frame/interval/Y-speed/force/fraction bytes. Separate synthetic source-state checks prove roster-independent construction, preserved residue and unsupported-handler rejection.

```
npx tsx --test tests/native-hbro-spawn.test.ts tests/native-walker-parser.test.ts tests/native-walker-groups.test.ts tests/native-placed-stream-runtime.test.ts tests/native-enemy-cursor-instructions.test.ts
```

19 tests pass. The four prefixes all have zero legacy/strict divergence; before this unit their first missing HBro was799,741,341,860 respectively. Generator: `tools/harness/native-hbro-spawn-events.ts` (path flags in its header). Mood capture integrity is checked against both its pad SHA and authenticated RAM receipt before extracting the initial seed and prefix. Later RAM is used only for comparison.

## Complete original-route first-field ratchet

Portable field/coverage summaries are in `hbro-spawn-comparison-20261113.json`.

- 3-1,2616 inputs: strict missing799→NULL (second missing actor818 also fixed); every legacy and strict field now NULL, all7022 actor rows compared.
- 5-2,3552 inputs: strict missing741→1338. All other first fields unchanged; earlier Y1328 and later transition/coverage failures remain. This is not a whole-input pass.
- 8-3,4208 inputs: strict missing341→1034. All other first fields unchanged; position987/score989 remain.
- 7-1,3816 inputs: strict missing499→589, continuation.load.ready3651→NULL. All other first fields unchanged; position443/Y444/score448 remain. This is not a whole-input pass.

No field diverges earlier in these four affected original routes. No fullsuite, full TypeScript, all32 corpus/pixel or 3D run was repeated; root integration owns those combined gates.

## Remaining independent limits

At 5-2 frame870 native still owns the offscreen living Bro at x736/camera757, while the existing generic holdsNativeSlot reach17 marks its remake slotFreed. Its active motor bytes still match exactly, but the strict comparator excludes that offscreen native actor. The explicit byte checks locate the retained active actor, and do not assert offscreen ownership or defeated-handler lifetime. Correcting generic release ownership is outside this initialization unit and was reported to integration. Earlier Cannon/physics and later transition failures above also remain; no masking or per-frame RAM corrections were introduced.
