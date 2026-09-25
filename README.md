# Claudian Collab

Collaboration for Obsidian: share projects over LAN or through a Cloud server, track tickets, review changes, and publish updates. AI agents can work with your projects through a local HTTP API.

Works independently of Claudian. Requires Obsidian Desktop 1.13.0 or newer and Git.

## Build and install

Use Node 24.16.0:

```sh
git clone https://github.com/YishenTu/claudian-collab.git
cd claudian-collab
npm ci
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/claudian-collab/` directory, then enable **Claudian Collab** in Settings → Community plugins. If your vault uses a custom configuration directory, replace `.obsidian` with that directory.

## Using Collab

Open the sidebar from the ribbon icon or **Claudian Collab: Open Collab** in the command palette. Create a project or join one from an invitation, then use the sidebar to manage tickets, review changes, and publish your work.

Configure the Projects folder and optional Git executable path in the plugin's settings.

## Agent skill

The [Collab skill](skill/SKILL.md) teaches agents how to discover API operations, find projects and tickets, publish changes, handle retries, and resolve conflicts.

Copy `skill/` into your agent's skills directory as `claudian-collab/`, or give the agent `skill/SKILL.md` directly. With Obsidian running in the intended vault, use **Claudian Collab: Copy agent API instructions** and give the copied instructions to the agent. They include the current HTTP endpoint for that vault.

## Existing users

If you previously used Collab inside Claudian:

1. Back up your vault, including hidden folders, and close other Obsidian instances using it.
2. Update Claudian to a version without embedded Collab, or uninstall the old version, then restart Obsidian. Disabling the old version alone is insufficient.
3. Install and enable Claudian Collab in the same vault on the same device.

Your Collab data moves automatically from `.claudian/collab/` to `.claudian-collab/`. Existing projects, settings, and your device identity carry over. Project folders stay in place, and unrelated Claudian data is unchanged. Chat references to Collab changes and tickets are no longer available.

Repeat these steps on each synced device. If migration reports conflicting storage, keep both folders and resolve the conflict before choosing **Retry**. Do not delete the legacy folder to force startup.

## License

[MIT](LICENSE).
