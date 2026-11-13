# Native end-level event music clock

`src/native-event-music.ts` models the timing dependency used by native
`DelayToAreaEnd`: `EventMusicBuffer == 0`. It implements event `$20`, without
synthesizing audio or changing the other music and sound-effect handlers.

The PRG0 source `MusicHandler` gives event queues priority over area queues.
`LoadEventMusic` loads `EndOfLevelMusHdr` at `$F949`: note-length table offset
`$20`, square-2 data pointer `$FCB0`. `LoadHeader` initializes the square-2
counter to one and falls through to `HandleSquare2Music` in the same call.
That handler decrements `$07B4`; zero fetches the next byte through `$F5/$F6`
and `$F7`. A negative byte selects the low-three-bit duration from the native
`MusicLengthLookupTbl` at `$FF66`, storing `$07B3`; the following note uses
that duration. A zero byte takes `EndOfMusicData`, which clears `$07B1`.
Square-1, triangle, noise and audible SFX do not control this termination.

`tickNativeEndLevelMusic` must run at the SoundEngine turn, before gameplay
queues a new event. Queue `$20` restarts this header even if the previous
buffer is `$20`. An area queue cancels event music. SoundEngine's title-mode
and pause-music branches skip MusicHandler, so the caller supplies those
native gate states. The helper does not count calls during a skipped NMI.
`seedNativeEndLevelMusic` restores the four lifetime bytes from entrance RAM.
Other event queues retain their buffer value, but their lifetimes are outside
this helper's scope. A caller needing another event must implement its source
stream rather than interpreting that retained value as a complete music model.

`tools/harness/native-end-level-music-data.ts --rom <PRG0 ROM>` reproduces
`data/native-end-level-music.json` from the authenticated reference ROM. The
JSON contains only this music header, square-2 note stream and eight lengths;
the ROM itself is not included. The helper walks those bytes. It contains no
recorded duration, level identifier or frame-number condition.

`tools/harness/native-end-level-music-events.ts --traces <v2> --corpus <moods>
--out <fixture>` authenticates all 368 retained inputs by actual RAM SHA-256
(and checks mood capture receipts). Across 5,178,452 PPU samples, all 300,625
queued/active event-$20 rows match the source clock: 331 distinct transitions,
925 complete sequences, zero diagnostics. The checked-in fixture retains all
transition counts, examples, complete sequence boundaries and input hashes.
Every complete sequence takes 324 ticks from first note load to terminator;
this is a validation result, not a runtime delay constant.

For retained 1-1, the event queue is consumed at row 2287 and its buffer clears
at 2611, while StarFlagTaskControl is still two. This is well before the native
late task-four completion at 2852. Correct music timing is a prerequisite for
`DelayToAreaEnd`, but does not account for the existing eight-row early exit
by itself. Native ID49 slot ownership, its interval timer, and the global
interval phase belong to the flag state machine, maintained separately.
