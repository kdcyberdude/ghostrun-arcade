The level compiler's missing historical evidence was recovered from
`/home/kd/Desktop/proj/build_games_from_scratch_in_threejs`, independently also
present in the sibling `build_games_from_scratch_in_threejs-mario-25d` checkout.
The original verifier reproduces the exact pinned semantic SHA256
`795901128f0a999057bb2440e18f0480b09278c30e98eb35c6ab47d1fd25e4a6`.
No proposal hash, input hash, acceptance threshold or production tile changed.

Run these commands from `games/smb`:

```sh
node tools/restore-compiler-evidence.mjs
npx tsx tools/firebar-5-4-shared-verify.ts
node tools/compile-levels.mjs --out /tmp/smb-levels-preview.json
```

The compiler automatically restores missing inputs. The explicit restore command
is useful before running other historical verification tools. Existing files
are preserved, including a verifier rerun that changes only the report date;
the compiler still checks the original semantic digest. Use `--out` for preview
builds. Without it, the compiler retains its original production output path.

`data/compiler-evidence.tar.gz` contains only the259 missing compiler evidence
and tool inputs, with normalized archive metadata. No ROM, dependencies, account
configuration or scratch checkout is included. Its manifest records every file's
size, SHA256 and original source. The restore tool verifies the archive digest,
extracts only listed missing paths, and verifies each extracted file. Generated
loose files need not be committed; the archive is their durable source. Nine
small core verifier/report inputs are also retained as ordinary files.

The original full-file reports were recovered from the authenticated rerun
attestation's exact dates. Changing only that date in the recovered current
report reproduces the proposal's original complete-file SHA256 and its pinned
before-report SHA256. Those original snapshots and the attestation are retained
in the archive. This restores provenance; it does not reinterpret failed raw
image comparisons as passes. The original verifier still reports seven histories,
482 coherent orientations,2461 sprite centers, zero wrong coherent orientations,
and a failing raw8px maximum against the unchanged2px threshold.

A clean extraction into `/tmp/sky-clean-compiler` and an ordinary restored build
produced identical preview SHA256
`da775a5b39637f8c59cd58688e8035718586c9245a836fd528371cf90ae61bae` at source
commit `d72cd8c`. The protected production file remained SHA256
`427c9333f303145a9bba59445f1be98d02a0b429c7709af15aa8095ace171e69`.
The preview differs in1779 effective tile cells across33 areas and81 other area
fields. See `evidence/compiler-recovery-validation.json` for the complete list.
The historical compile pipeline therefore runs again, but its output must not
replace the later native-aligned production map without native verification.
These checks do not establish gameplay or pixel equivalence.

When a pinned artifact appears lost, search the original project and sibling
migration/evidence checkouts before declaring it unrecoverable. Git history and
current-project/tmp searches did not include the earlier source repository here.
An authentic hash match is evidence of recovery; a hash alone cannot reconstruct
missing arbitrary content.
