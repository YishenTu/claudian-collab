# Claudian Collab

An independent Obsidian Desktop plugin for shared projects, LAN and Cloud collaboration, tickets, reviews, publishing, recovery, and a local HTTP agent API. Claudian is not required.

The sidebar reuses the former Claudian Collab pane. Its project management dialogs and review/detail tabs retain their existing workflows. Chat references to Collab changes and tickets are not included.

## Build and install

Use Node 24.16.0 and Git. Clone the repository and run:

```sh
git clone https://github.com/YishenTu/claudian-collab.git
cd claudian-collab
npm ci
npm run typecheck
npm test
npm run build
npm run test:build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/<config-directory>/plugins/claudian-collab/` and enable **Claudian Collab** in Obsidian. The default configuration directory is `.obsidian`. Obsidian 1.13.0 or newer is required. Builds write only into this repository; they do not deploy into a vault or load `.env.local`.

Open the panel using its ribbon icon or **Claudian Collab: Open Collab**. Create, Join, and Resume project setup are also available in the command palette. Configure the Projects folder and optional Git executable in the plugin's settings.

Use **Copy agent API instructions** in settings or the command palette to copy the running loopback HTTP endpoint and operation instructions. The API retains its existing operation catalog and semantics; an agent does not need Claudian chat integration.

## Existing users

Update Claudian to a version with embedded Collab removed, or uninstall it, and restart Obsidian before enabling this plugin. An installed embedded implementation blocks startup even when disabled, to prevent accidental simultaneous use.

First startup moves `.claudian/collab/` into `.claudian-collab/` within the same vault. It imports the previous Projects-folder and Git settings and adopts this device's existing installation identity into a separate local storage key. Project working copies stay in place. Claudian's other data and its original local identity are left intact.

The move preserves physical directory identities, credentials, certificates, and recovery records. A completion record prevents repeated import, including after delayed synchronization. Interrupted cutover can resume. Conflicting destination data is preserved and reported for resolution. This includes a destination synced from another device while this device still has legacy storage: startup stops so original local recovery resources are not bypassed. Migration runs before the API, hosting, or recovery starts; the sidebar offers Retry if startup is blocked. Other devices keep their own identities and do not acquire Host ownership from synchronized files.

## Verification

`npm run test:cross-platform` runs the retained native suites on the current OS. `npm run test:lan-compatibility` tests against immutable published Claudian 2.2.6 source, including upgrades through the standalone importer. It needs registry and GitHub access. Cloud-server compatibility scenarios additionally need `CLAUDIAN_AUTHORITY_TRANSFER_SERVER_URL`.

`npm run test:build` checks production assets, compressed locale and SQL Wasm round trips, real SQL initialization, versions, and renderer timer guards. Run it after `npm run build`.

[GitHub Actions](https://github.com/YishenTu/claudian-collab/actions) runs the full test suite on Linux, native compatibility tests on macOS and Windows, and production build checks on all three platforms.

## Credits

Originally extracted from [Claudian](https://github.com/YishenTu/claudian). Licensed under the [MIT License](LICENSE).
