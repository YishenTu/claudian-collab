import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
const run = tag => spawnSync(process.execPath, ['scripts/check-release.mjs', tag], { encoding: 'utf8' });
test('accepts the matching Obsidian release tag', () => {
  const result = run(manifest.version);
  assert.equal(result.status, 0, result.stderr);
});
for (const tag of ['v0.1.0', '0.1.0-beta.1', '0.1.0+build', '01.1.0', '9.9.9', '', 'refs/tags/0.1.0']) {
  test(`rejects invalid or mismatched tag ${JSON.stringify(tag)}`, () => {
    const result = run(tag);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid release tag|Release version mismatch/);
  });
}

test('rejects incomplete assets and a manifest from a different build', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'collab-release-'));
  const check = () => spawnSync(process.execPath, ['scripts/check-release.mjs', manifest.version, directory], { encoding: 'utf8' });
  try {
    writeFileSync(path.join(directory, 'main.js'), 'built bundle');
    writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
    assert.notEqual(check().status, 0);
    writeFileSync(path.join(directory, 'styles.css'), 'built styles');
    assert.equal(check().status, 0);
    writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ ...manifest, version: '9.9.9' }));
    const mismatch = check();
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /artifact manifest differs/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
