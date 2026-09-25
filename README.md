# Claudian Collab

Collaboration for Obsidian: share projects over LAN or through a Cloud server, track tickets, review changes, and publish updates. AI agents can work with your projects through a local HTTP API. Visit [claudian.md](https://claudian.md/) to learn more.

Works independently of Claudian. Requires Obsidian Desktop 1.13.0 or newer and Git.

## Installation

Download `main.js`, `manifest.json`, and `styles.css` from a [GitHub release](https://github.com/YishenTu/claudian-collab/releases), or build them from source below. Copy the three files into your vault's `.obsidian/plugins/claudian-collab/` directory, then enable **Claudian Collab** in Settings → Community plugins. If your vault uses a custom configuration directory, replace `.obsidian` with that directory.

### Build from source

Use Node 24.16.0:

```sh
git clone https://github.com/YishenTu/claudian-collab.git
cd claudian-collab
npm ci
npm run build
```

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

## Privacy & data use

- **Shared data and network access:** Project files and Git history, tickets, comments, review changes, member identities, and collaboration events are exchanged with the LAN host or Cloud server selected for that project. LAN hosting uses HTTPS and WebSockets; Bonjour/mDNS advertises the project's identifier, endpoint, and certificate fingerprint on the local network. Cloud projects connect to the server in your invitation or hosting configuration over HTTP(S) and WebSockets. There is no fixed analytics or AI service endpoint.
- **Background connections:** While enabled, Collab can restore hosted projects, reconnect, receive project events, and recover interrupted operations without another click. Hosting makes a collaboration server available to project members. Disable the plugin to stop its listeners and connections.
- **Local agent API:** A loopback HTTP server starts at `127.0.0.1` after initialization. Local programs can read and change Collab data through it without a separate API token or confirmation for each operation. It checks request Host and Origin headers, but these do not authenticate local programs. Only give access instructions to agents you trust. Collab does not call AI providers itself; any agent's use of your data follows that agent's configuration and provider policies.
- **Local storage and file access:** Project workspaces and private state live in your vault, including `.claudian-collab/`. Private state includes Git repositories, databases, device identity, credentials, and keys; the plugin does not encrypt this storage at rest. Your backup or sync software may copy it. Collab also finds and runs a system or user-configured Git executable outside the vault and creates temporary Git probe directories in the operating system's temporary folder. Clipboard writes happen when you copy invitations or agent instructions.
- **Telemetry, accounts, and payment:** The plugin includes no analytics, telemetry beacons, or ads. It is free and open source; LAN collaboration needs no third-party account. Cloud hosting requires access to a compatible server. Its operator sets any account, payment, retention, logging, and server-side telemetry policies; check those policies before sharing data with that server.

## License

[MIT](LICENSE). Third-party license and attribution notices are included in the built `main.js`.
