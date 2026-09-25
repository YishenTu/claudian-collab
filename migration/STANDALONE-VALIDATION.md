# Standalone validation

Implementation includes a dedicated Obsidian sidebar, retained project/detail UI, settings, commands, local agent API discovery, startup/shutdown wiring, automatic storage migration, and a self-contained production build. GitHub Actions defines Linux verification and native macOS/Windows checks.

## Automated checks

Validated locally on macOS with Node 24.16.0:

- TypeScript typecheck passes.
- Full Jest run: 274 suites and 3,293 tests pass; two suites and three tests skip under their existing conditions.
- After migration repairs, the four standalone suites pass all 24 tests. Interrupted lock/receipt writes and cross-device receipt conflicts were demonstrated failing before their repairs.
- Native cross-platform test selection on macOS: all 37 suites and 515 tests pass.
- Production build and both build checks pass. These round-trip all compressed locales and SQL Wasm, initialize the real bundled SQL engine, and check versions, bundle size, CSS output, and renderer timer guards.
- Published LAN compatibility: seven scenarios pass, including existing Host/Member upgrades through the standalone importer. Four scenarios requiring an external Cloud server skip.

The migration regression suite covers atomic relocation with physical identity and byte preservation, destination conflict, delayed legacy synchronization, interruption recovery, live Host exclusion, installed embedded-plugin exclusion, settings preservation, fresh bootstrap recovery, and a synchronized receipt arriving before the original local recovery resources are migrated. The latter test uses the real authority repository to verify preserved cleanup resources remain recoverable after conflict resolution. Local identity, sidebar retry/accessibility, plugin startup, HTTP listener operation, and shutdown tests run separately. Migration and plugin lifecycle tests are also included in the native cross-platform suite.

Upstream clock propagation and fixture-date fixes through Claudian `4eea89d6` replace the date-sensitive fixtures recorded in the original extraction report. Storage fixture paths follow the new root. Published-version upgrade tests invoke the same importer used at plugin startup before opening the new owners.

Two repair rounds and fresh cumulative reviews are complete, with no confirmed material findings remaining. The final importer passed the published LAN scenarios again and was exercised in the installed Obsidian bundle.

## Installed Obsidian checks

A separate Obsidian 1.13.7 profile and disposable vault verify the three-file installed bundle without Claudian installed:

- Sidebar, Create Project, Add Ticket editor, and working-tree review with CodeMirror rendering.
- Light and dark presentation at a 300-pixel sidebar width.
- Two created LAN projects restored after migrating their private storage and local identity from the legacy layout. Project IDs, workspace paths, and local Host ownership remain unchanged; both Hosts restart successfully.
- HTTP operation catalog responds successfully through the installed plugin's loopback endpoint.
- Application reload restores the sidebar and both healthy running Hosts.

No production vault was changed. Detailed logs, screenshots, temporary scripts, and the disposable Obsidian vault are under ignored `.context/`; they are not release artifacts.

Native Windows/Linux GUI execution and compatibility scenarios requiring an external Cloud server were not run locally. The workflow has been written but has not run on a remote CI service.
