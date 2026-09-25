# Repository constraints

- This plugin is independent from Claudian. Do not import its source, require it to be installed, or restore its chat integration.
- Read scoped guides before changing their owners. Tests also follow their source owners' guides; composition follows the guides of the services it wires.
- Preserve existing storage formats, the installation identity contract, LAN compatibility, and HTTP operation semantics across migration and standalone operation. Renaming a plugin does not authorize changing resource ownership.
- Import `@claudian-collab/protocol` only through its package root, using its exact registry version. Do not vendor its source or copy protocol-owned policy.
- Use the Node version in `.node-version`. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:build` for source changes; LAN binding changes also require `npm run test:lan-compatibility`.
- Demonstrate a failing regression before behavior changes, then rerun it after the fix. Mechanical moves are exempt.
- Use English for code, comments, and identifiers. No production `console.*`. Keep temporary notes and scripts in `.context/`.
- Each scoped guide has a sibling `CLAUDE.md` containing only `@AGENTS.md`.
