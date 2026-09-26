# Releasing

Release tags must be plain `x.y.z`, matching `manifest.json`, `package.json`, and `package-lock.json`. Record the release's minimum Obsidian version in `versions.json` as well. Obsidian does not accept a `v` prefix or prerelease suffix.

For a version bump, run `npm version <x.y.z> --no-git-tag-version`, update `manifest.json` and `versions.json`, and commit the changes to `main`. For the initial release, the existing `0.1.0` metadata is ready.

After CI passes for the commit you want to release:

```sh
git tag <x.y.z>
git push origin <x.y.z>
```

The Release workflow validates the tag and reuses the retained build from a successful main-branch push CI run for the exact tagged commit. If no such run has usable assets (including when CI is still running or the artifact has expired), it runs the full parallel CI suite and uses that build. Pull request and manual CI runs are not reused for releases.

It validates, attests, and uploads `main.js`, `manifest.json`, and `styles.css`, then publishes the release with generated notes. It never rebuilds the assets after verification or overwrites an existing release. If publication fails after creating a draft, remove the incomplete draft before rerunning the failed publish job; keep the original tag. If a reused artifact expires or is deleted before download, rerun all jobs so the workflow can select another build or run fresh verification.

GitHub releases do not automatically list a new plugin in Obsidian. The initial [Community directory submission](https://docs.obsidian.md/plugins/releasing/submit-plugin) is a separate step after the first release is published. Subsequent releases use the same workflow.
