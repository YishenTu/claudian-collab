import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

try {
  const tag = process.argv[2];
  assert.ok(typeof tag === 'string' && versionPattern.test(tag), 'Invalid release tag: use x.y.z without a v prefix or prerelease suffix.');
  const manifest = readJson('manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const versions = readJson('versions.json');
  assert.ok([manifest.version, pkg.version, lock.version, lock.packages[''].version].every(value => value === tag), 'Release version mismatch between tag, manifest, package, or lockfile.');
  assert.equal(versions[tag], manifest.minAppVersion, 'versions.json must record the minimum Obsidian version.');
  assert.match(manifest.minAppVersion, versionPattern);
  assert.match(manifest.id, /^[a-z]+(?:-[a-z]+)*$/);
  assert.ok(!manifest.id.includes('obsidian') && !manifest.id.endsWith('plugin'));
  assert.equal(manifest.isDesktopOnly, true, 'Node.js and Git require a desktop-only manifest.');
  for (const field of ['name', 'author', 'description']) assert.ok(typeof manifest[field] === 'string' && manifest[field].trim());
  assert.ok(manifest.description.length <= 250 && manifest.description.endsWith('.'));
  for (const file of ['README.md', 'LICENSE']) assert.ok(statSync(path.join(root, file)).size > 0);
  const assets = process.argv[3];
  if (assets) {
    for (const file of ['main.js', 'manifest.json', 'styles.css']) {
      assert.ok(statSync(path.join(assets, file)).size > 0, `Missing release asset: ${file}`);
    }
    assert.deepEqual(JSON.parse(readFileSync(path.join(assets, 'manifest.json'), 'utf8')), manifest, 'Downloaded artifact manifest differs from the tagged source.');
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
