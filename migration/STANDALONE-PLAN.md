# Standalone plugin: migration and UI

Recorded from the product discussion on 2026-09-25. This records the agreed product behavior. Implementation and verification status are tracked in [standalone validation](STANDALONE-VALIDATION.md).

## Scope

Claudian and Collab are independent Obsidian plugins. Preserve the existing Collab features and HTTP agent API without requiring Claudian to be installed. Claudian's quick references to Collab changes and tickets are intentionally retired.

## Existing-user migration

On first use, detect the old Collab state, migrate it into the standalone plugin's own storage, and resume existing projects. The normal flow should be automatic, with a short completion notice. Users should not need to recreate projects or rejoin them.

The new private storage root must be separate from Claudian's data and from replaceable plugin installation assets. The implementation uses `.claudian-collab/` as the vault-relative root.

Import these inputs:

- Private state under `.claudian/collab/`, including project records, credentials, certificates, ownership records, retirement evidence, and unfinished-operation journals. Audit stores outside this root for any additional Collab-owned credentials or recovery records before implementing the importer.
- Collab settings from `.claudian/claudian-settings.json`, including the Projects folder and Git executable path. The old Collab enablement value is migration context; standalone activation belongs to the new plugin.
- The existing local installation identity derived from `claudian.deviceSettingsKey` in `localStorage`. Preserve the same identity on this device without deleting or changing Claudian's original value, which Claudian still uses.

Keep actual project working copies at their current paths. Do not move project folders just to change plugin ownership. Leave Claudian's chat, provider, and other unrelated storage intact.

Preserve project and member IDs, credentials, TLS trust, and resource ownership. A copied vault does not grant Host authority: each installation must retain its own identity and pass the existing ownership checks. Vault migration and local identity adoption have different scopes, so a vault-level completion marker must not skip identity adoption on another device.

### Cutover and recovery

1. Discover legacy data and existing destination state before initializing Collab services.
2. Ensure the old embedded Collab implementation has stopped. The new plugin must not run its HTTP API, hosting, or background recovery during migration. The implementation must establish how to enforce exclusive access across the old and new storage locations.
3. Stage and verify the import. Audit stored paths and rewrite only references that point into relocated private storage; preserve project working-copy paths. Retain pending recovery information and validate ownership before permitting recovery to run.
4. Promote the verified state and record durable completion. Support resuming after interruption without importing twice, silently overwriting destination data, or merging two existing installations' state.
5. Start the standalone services only after successful cutover. Keep any retained legacy backup inactive. A later launch or delayed vault sync must not reimport legacy files or reactivate retired resources.

A migration receipt records the originating installation, solely to distinguish local cutover from synchronized state. If a foreign receipt arrives while local legacy storage still exists, stop before publishing services and preserve both trees for conflict resolution. The receipt never grants Host authority.

If destination data already exists or exclusive access cannot be established, show a clear explanation and a recovery action instead of guessing. An interrupted migration must leave a recoverable source or staged copy. The implementation moves the original tree atomically instead of making a duplicate backup, preserving directory ownership identities. It blocks startup while an embedded Claudian plugin remains installed and checks for live legacy Host locks before migration.

### Migration validation

Cover clean installation, existing LAN Host and Member installations, Cloud membership, pending operations, interrupted migration and retry, existing destination data, and delayed vault sync across multiple devices. Verify that existing projects resume with the same identities and trust, and that unrelated Claudian data and project folders remain unchanged.

## Standalone UI

Use the old Claudian Collab pane as the visual and behavioral baseline. The standalone plugin's main UI is an Obsidian sidebar panel containing that same Collab interface, preserving its layout, controls, statuses, and workflows. Reuse the extracted components and styles rather than redesigning the interface during the split.

- Register a dedicated Collab workspace view, with a ribbon action and an “Open Collab” command that reveals the panel. Let Obsidian manage docking, resizing, and workspace restoration.
- Preserve project selection, setup and joining, personal and team changes, tickets, reviews, publishing, membership, access, conflicts, and recovery surfaces as applicable to each project.
- Keep the existing detail views and dialogs opened from the panel. “Sidebar panel” describes the main entry point, not a requirement to squeeze every editor or review into the sidebar.
- Remove the surrounding Claudian chat/session shell and its Collab/chat switcher. Opening Collab should show Collab directly.
- Give the standalone plugin its own settings for Git and project storage, and make HTTP endpoint discovery and agent instructions available without Claudian prompt injection.
- Show migration progress, completion, and actionable failures within the standalone plugin. Keep normal project controls unavailable until migration completes.

The extracted panel lives in `src/features/collab/sidebar/CollabPanel.ts`, with supporting views under `src/features/collab/`. The old embedding and lifecycle wiring are preserved as reference in `migration/claudian/src/features/chat/ClaudianView.ts` and `migration/claudian/src/main.ts`.

Validate the installed UI against the old pane, including narrow and wide sidebar widths, light and dark themes, keyboard navigation, reopening after restart, and operation without Claudian installed.
