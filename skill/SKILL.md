---
name: claudian-collab
description: Operate Claudian Collab projects, changes, requests, tickets, comments, and conflicts through its local HTTP API. Use when a task depends on Collab state or asks for a Collab operation in an Obsidian vault.
---

# Claudian Collab

Claudian Collab exposes a vault-scoped local Agent Runtime. Query it for Collab context and operations instead of guessing or modifying private storage. Claudian chat integration is not required.

## Connect and discover

Obsidian must be running with Claudian Collab enabled in the intended vault. Obtain the current `RPC endpoint` from **Claudian Collab: Copy agent API instructions** in the command palette or plugin settings. If no endpoint was supplied, ask the user to copy those instructions. Use the advertised endpoint; do not guess a port or reuse an endpoint from another vault. If the active tool or sandbox policy cannot reach loopback HTTP, state that limitation.

Send HTTP POST requests to that endpoint with `Content-Type: application/json`. Start by discovering the available operations:

```json
{"id":"operations-1","method":"runtime.operations.list","params":{}}
```

Use only operations returned by this catalog. Before calling an operation, obtain its exact parameter and retry contract:

```json
{"id":"contract-1","method":"runtime.operations.get","params":{"name":"<operation-name>"}}
```

Then invoke the operation using the same `{ "id", "method", "params" } envelope and its documented parameters. The catalog reports the maximum UTF-8 bytes of the entire JSON request; parameter schemas separately bound decoded values. Follow the returned limits and paging contracts. Treat results as current structured context; do not invent unavailable state.

## Resolve the Project and references

Use the Project-listing operation reported by the catalog to discover Project IDs and `selectedProjectId`. For an unqualified reference, use a non-null `selectedProjectId` as the default, then pass that Project ID explicitly to every downstream Project-scoped operation. The runtime owns LAN or Cloud routing after a Project ID is supplied.

- `@<exact display name>'s Changes` means that active Member's current open Change Request in the selected Project. Resolve it through the open Request list before reading detail.
- `#<number>` means that Ticket number in the selected Project. Resolve it through the Ticket list before reading detail.

If no Project is selected, a display name is duplicated or missing, a Member has no open Request, or a Ticket is missing, ask for clarification or report the missing context. Never guess an identity or silently choose another Project.

## Writes and uncertain outcomes

An operation whose `access` is `write` mutates Collab state immediately; it does not navigate the Obsidian UI. Keep mutations within the user's requested task.

The envelope `id` only correlates a request and response. Follow the retry contract returned by `runtime.operations.get`:

- When an operation requires `mutationId`, generate a globally unique ID, such as a UUID, for each new intent. After a timeout or lost response, reuse that `mutationId` and all original parameters, including revision expectations. A missing response does not prove the write failed.
- After a known stale-state rejection, read current state before choosing a new intent. Do not refresh revision expectations while replaying an uncertain mutation.
- Publish and Update act on current state and use their existing durable workflows. After an unknown outcome, inspect the Project and My changes before deciding whether to invoke them again. Do not blindly repeat a write with a new identity.

## Update, Publish, and conflicts

Discover and inspect the contracts for these operations before using them:

- `collab.projects.get` reports Update availability. Unknown or offline state does not prove an update is available. When `incoming` is `included` and `nextAction` is null, team content is already present; no explicit Update is needed. Preserve local work and let the next normal publication integrate the accepted history.
- Follow `nextAction`. A `publish-pending` state requires completing the existing publication before Update. Offline state may retain a local Update conflict or recovery task, but continuation requires reconnection.
- `collab.projects.update` receives accepted updates locally while preserving personal work. It does not publish that work or change a Request.
- Conflict reads expose immutable evidence and identify whether the conflict belongs to Update, My changes, or a Request. Edit the real Project files with normal file tools. Continue an Update conflict with `collab.projects.update`; continue a Publish conflict with `collab.changes.publish`.

Do not edit a Request snapshot or run Git directly to resolve a conflict. Use the runtime's current operation contracts to continue the recorded workflow.
