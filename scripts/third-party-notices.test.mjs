import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectThirdPartyNotices } from './third-party-notices.mjs';

test('includes full licenses for bundled packages, including nested dependencies', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'collab-notices-'));
  try {
    for (const [directory, name, license] of [
      ['node_modules/outer', 'outer', 'Outer permission notice'],
      ['node_modules/outer/node_modules/inner', 'inner', 'Inner permission notice'],
    ]) {
      await mkdir(path.join(root, directory), { recursive: true });
      await writeFile(path.join(root, directory, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
      await writeFile(path.join(root, directory, 'LICENSE'), license);
    }
    const result = await collectThirdPartyNotices([
      'src/main.ts', 'node_modules/outer/index.js', 'node_modules/outer/other.js',
      'node_modules/outer/node_modules/inner/index.js',
    ], root);
    assert.match(result, /Outer permission notice/);
    assert.match(result, /Inner permission notice/);
    assert.equal(result.match(/Outer permission notice/g).length, 1);
    await rm(path.join(root, 'node_modules/outer/LICENSE'));
    await assert.rejects(collectThirdPartyNotices(['node_modules/outer/index.js'], root), /Missing license/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
