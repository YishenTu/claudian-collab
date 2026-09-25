# Extraction validation — 2026-09-25

Scope: move Collab source and supporting assets/tests out of Claudian while preserving behavior. Standalone Obsidian composition and packaging are the next phase. No vault state was moved, deleted, or migrated. No plugin was installed or published.

## Preservation

All 691 files deleted from the Claudian checkout have byte-identical copies in this repository, either at the original path or under `migration/claudian/`. Application, protocol adaptation, storage, HTTP runtime, and presentation implementations are retained. The original main composition, settings implementation, build configuration, styles, and mixed integration tests are reference material, excluded from compilation. Shared utilities needed by both repositories were copied rather than removed from Claudian.

The standalone native test inventory and LAN compatibility runner were adapted for this repository. The latter fetches the exact historical baseline commit from the Claudian upstream into temporary storage rather than depending on this new repository's history or remote.

## Claudian checks

Using Node 24.16.0:

- Typecheck, TypeScript/CSS lint, full tests, production build, performance checks, and Bun lockfile verification passed.
- Full Jest run: 389 suites passed, one skipped; 6,331 tests passed, one skipped. Script checks passed, including the final architecture checks after removal of obsolete Collab assertions.
- Production bundle: 2,743,682 bytes. Cold evaluation median: 58.6 ms, a warning above the 50 ms indicator; no failing performance gate.
- The build used an explicit nonexistent output vault so `.env.local` could not deploy to the user's configured vault.
- A new architecture regression failed before removal on the Collab protocol dependency and passes after separation.
- Existing session-sidebar coverage caught a missing refresh during cleanup; the call was restored and all 100 chat view tests passed, followed by the full suite.

## Extracted repository checks

- Typecheck passed with Node 24.16.0, including after a clean `npm ci` from the retained lockfile.
- Full pinned-Node run: 267 suites passed, two failed, two skipped; 3,268 tests passed, two failed, three skipped. The failures are detailed below.
- An earlier full run using the shell's Node 24.19.0 passed 268 suites and 3,269 tests, with only the date-dependent failure. The pinned-Node run supersedes it for repository verification.
- Published LAN compatibility passed on Node 24.16.0: seven tests passed, four skipped.
- Native test selection resolves the retained suites. It was not run on Windows or Linux in this extraction.
- After retaining the original CodeMirror overrides and seeding the new lockfile from Claudian's locked dependencies, a clean install, typecheck, and focused diff renderer, Markdown editor, ticket editor, and review/acceptance checks passed: four suites, 66 tests. The installed dependency tree contains one overridden CodeMirror state/view version.
- Two independent review passes completed. The first identified the missing native suite inventory and historical-baseline dependency; both were repaired and exercised. The second found no material extraction defects.

## Known test issues

`tests/unit/app/collab/authority-transfer/recovery/AuthorityTransferRecovery.test.ts`, “resumes terminal cleanup when the completion marker precedes entry removal”, fails after its fixed `2026-09-25T00:00:00.000Z` expiry. Unlike nearby tests, it constructs persistence without injecting a fixed clock. The exact failure was reproduced against the unchanged pre-extraction source on Node 24.16.0. No recovery implementation or expectation was altered to make this pass. A follow-up should give the test a deterministic clock appropriate to the behavior it asserts.

`tests/integration/app/collab/gates/ReviewAcceptanceMilestoneGate.test.ts`, the “complete Review” case, failed once in the full pinned-Node run because the local HEAD had not reached the accepted OID at the assertion. It passed in the earlier full run, in the original-source baseline check, and in the final focused destination run. The implementation and test were moved unchanged. Investigate the intermittent synchronization assertion separately; do not infer a clean full-suite result from the focused retry.

## Remaining verification

The standalone plugin has no entry point or distributable yet. Installed Obsidian UI behavior, plugin lifecycle wiring, production asset bundling, and standalone settings/identity adoption must be verified when that phase is implemented. The original dependency-envelope/build tests and composition tests are preserved as reference for that work.
