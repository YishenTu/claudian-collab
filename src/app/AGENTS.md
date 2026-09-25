# Collab application lifecycle


- Disabled startup must not construct Collab, start Agent Runtime, probe Git/SQL/network, restore Host, or write Collab state. Live-disable closes admission and hides presentation, then lets admitted work settle before tearing down dependencies; durable Project/credential/auto-start state survives.
- Plugin load never waits for Collab foundations. Layout-ready recovery is background, failure-isolated by Project and stage, and retries incomplete durable work with bounded backoff. With no recovery or Host auto-start work, ordinary startup performs no Collab foundation I/O.
- Start Agent Runtime asynchronously; close/abort its listener before Collab teardown, but retain mutation dependencies until admitted writes settle. Partial Collab capability bags are not an enabled product mode.
