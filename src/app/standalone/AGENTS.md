# Standalone migration

- Migration precedes publication of application services, listeners, and recovery. Keep project working copies in place and preserve Claudian's unrelated data.
- Local identity adoption runs on each installation independently of the vault migration receipt. Never infer Host authority from a synchronized receipt or assign one installation's seed to another.
- Preserve resource incarnation and terminal recovery evidence when relocating private storage. Directory copies cannot substitute for existing authority ownership; do not rewrite ownership markers merely to make an import pass.
- Never merge or overwrite an existing destination implicitly. Interrupted migration and delayed synchronization must not replay an already completed import.
