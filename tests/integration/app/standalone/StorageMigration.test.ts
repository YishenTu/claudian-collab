import filesystem from 'node:fs/promises';

import * as boundary from '@/app/collab/CollabFilesystemBoundary';

import { cp, rename, mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { TEST_INSTALLATION_A, TEST_INSTALLATION_B } from '@test/helpers/installations';
import { CollabLocalProjectRepository } from '@/app/collab/CollabLocalProjectRepository';

import { migrateCollabStorage } from '@/app/standalone/StorageMigration';
import { parseCollabProjectsFolder } from '@/core/collab/CollabProjectsFolder';

let vault: string;
const oldRoot = '.claudian/collab';
const newRoot = '.claudian-collab';
async function put(name: string, value: string) {
  await mkdir(path.dirname(path.join(vault, name)), { recursive: true });
  await writeFile(path.join(vault, name), value);
}
beforeEach(async () => { vault = await mkdtemp(path.join(os.tmpdir(), 'collab-migration-')); });
afterEach(async () => { jest.restoreAllMocks(); await rm(vault, { recursive: true, force: true }); });

it('moves private data without changing its bytes, physical identity, or project files', async () => {
  await put(`${oldRoot}/authorities/project-a/collab.db`, 'database-bytes');
  await put(`${oldRoot}/cloud-credentials/project-a.json`, '{"credential":"secret"}');
  await put(`${oldRoot}/pending-leaves/member.json`, '{"workspacePath":"Projects/alpha"}');
  await put('.claudian/claudian-settings.json', JSON.stringify({ collabProjectsFolder: 'Projects', collabGitPath: '/bin/git', unrelated: true }));
  await put('Projects/alpha/note.md', 'working copy');
  const original = await stat(path.join(vault, oldRoot, 'authorities/project-a'));
  const result = await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A);
  expect(result.settings).toMatchObject({ collabProjectsFolder: 'Projects', collabGitPath: '/bin/git' });
  expect(result.migrated).toBe(true);
  expect(await stat(path.join(vault, newRoot, 'authorities/project-a'))).toMatchObject({ ino: original.ino, dev: original.dev });
  expect(await readFile(path.join(vault, newRoot, 'authorities/project-a/collab.db'), 'utf8')).toBe('database-bytes');
  expect(await readFile(path.join(vault, newRoot, 'cloud-credentials/project-a.json'), 'utf8')).toBe('{"credential":"secret"}');
  expect(await readFile(path.join(vault, 'Projects/alpha/note.md'), 'utf8')).toBe('working copy');
  expect(JSON.parse(await readFile(path.join(vault, '.claudian/claudian-settings.json'), 'utf8')).unrelated).toBe(true);
  expect((await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).migrated).toBe(false);
});

it('does not merge two independent stores', async () => {
  await put(`${oldRoot}/index.json`, 'old');
  await put(`${newRoot}/index.json`, 'new');
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow(/already contains/);
  expect(await readFile(path.join(vault, oldRoot, 'index.json'), 'utf8')).toBe('old');
});

it('does not import legacy files arriving after completion', async () => {
  await put(`${oldRoot}/index.json`, 'original');
  await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A);
  await put(`${oldRoot}/index.json`, 'late-sync');
  await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A);
  expect(await readFile(path.join(vault, newRoot, 'index.json'), 'utf8')).toBe('original');
});

it('blocks an installed embedded implementation before moving any data', async () => {
  await put(`${oldRoot}/index.json`, 'original');
  await put('.obsidian/plugins/claudian/main.js', 'plugin.settings.collabEnabled');
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow(/Update or uninstall/);
  expect(await readFile(path.join(vault, oldRoot, 'index.json'), 'utf8')).toBe('original');
});

it('rejects links instead of migrating data outside the vault', async () => {
  await mkdir(path.join(vault, '.claudian'));
  await symlink(os.tmpdir(), path.join(vault, oldRoot), process.platform === 'win32' ? 'junction' : 'dir');
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow();
});

it('reserves the standalone private root as a project destination', () => {
  expect(parseCollabProjectsFolder('.claudian-collab/projects').ok).toBe(false);
});

it('finishes a cutover interrupted immediately after the atomic move', async () => {
  await put(`${newRoot}/index.json`, 'preserved');
  await put(`${newRoot}/standalone-migration.json`, JSON.stringify({ version: 1, phase: 'prepared', installationKey: TEST_INSTALLATION_A, settings: { collabProjectsFolder: 'Projects', collabGitPath: '' } }));
  expect((await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).migrated).toBe(true);
  expect(JSON.parse(await readFile(path.join(vault, newRoot, 'standalone-migration.json'), 'utf8')).phase).toBe('complete');
  expect(await readFile(path.join(vault, newRoot, 'index.json'), 'utf8')).toBe('preserved');
});
it('blocks migration while a legacy Host process is alive', async () => {
  await put(`${oldRoot}/installations/device-a/lan-host.lock`, JSON.stringify({ pid: process.pid, nonce: 'test' }));
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow(/Host may still be running/);
  await expect(stat(path.join(vault, newRoot))).rejects.toMatchObject({ code: 'ENOENT' });
});
it('accepts the cleaned-up Claudian plugin alongside standalone Collab', async () => {
  await put('.obsidian/plugins/claudian/main.js', 'class ClaudianPlugin {}');
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).resolves.toMatchObject({ migrated: false });
});
it('refuses a corrupt completion record without touching either store', async () => {
  await put(`${newRoot}/standalone-migration.json`, '{broken');
  await put(`${oldRoot}/index.json`, 'legacy');
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow(/unreadable/);
  expect(await readFile(path.join(vault, oldRoot, 'index.json'), 'utf8')).toBe('legacy');
});
it('resumes an interrupted fresh install with an empty destination', async () => {
  await mkdir(path.join(vault, newRoot));
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).resolves.toMatchObject({ migrated: false });
});

it('can retry after interruption while writing a migration lock', async () => {
  await put(`${oldRoot}/index.json`, 'preserved');
  const originalOpen = filesystem.open;
  const openSpy = jest.spyOn(filesystem, 'open').mockImplementation(async (file, flags, mode) => {
    const handle = await originalOpen(file, flags, mode);
    if (String(file).includes('migration') && flags === 'wx') {
      jest.spyOn(handle, 'writeFile').mockRejectedValueOnce(new Error('simulated interruption'));
    }
    return handle;
  });
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow('simulated interruption');
  openSpy.mockRestore();
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).resolves.toMatchObject({ migrated: true });
  expect(await readFile(path.join(vault, newRoot, 'index.json'), 'utf8')).toBe('preserved');
});

it('can retry fresh setup after interruption while writing its first receipt', async () => {
  const atomicWrite = boundary.writeCollabFileAtomically;
  const writeSpy = jest.spyOn(boundary, 'writeCollabFileAtomically').mockImplementationOnce(async (root, relative) => {
    const parent = path.dirname(path.join(root, relative));
    await mkdir(parent, { recursive: true });
    await writeFile(path.join(parent, '.interrupted-write.tmp'), '{');
    throw new Error('simulated interruption');
  });
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).rejects.toThrow('simulated interruption');
  writeSpy.mockImplementation(atomicWrite);
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A)).resolves.toMatchObject({ migrated: false });
  expect(JSON.parse(await readFile(path.join(vault, newRoot, 'standalone-migration.json'), 'utf8')).phase).toBe('complete');
});

it('blocks a synchronized completion receipt before bypassing original local cleanup resources', async () => {
  const repository = new CollabLocalProjectRepository(vault, { installationKey: TEST_INSTALLATION_B });
  const resource = await repository.createOwnedAuthorityDirectory('project-alpha');
  await repository.detachOwnedAuthorityDirectory(resource);
  await mkdir(path.join(vault, '.claudian'));
  await rename(path.join(vault, newRoot), path.join(vault, oldRoot));
  const originalTree = path.join(vault, oldRoot, 'authority-removals/project-alpha', `${resource.resourceId}.tree`);
  const originalIdentity = await stat(originalTree);
  await cp(path.join(vault, oldRoot), path.join(vault, newRoot), { recursive: true });
  await put(`${newRoot}/standalone-migration.json`, JSON.stringify({
    version: 1, phase: 'complete', installationKey: TEST_INSTALLATION_A,
    settings: { collabProjectsFolder: 'workspace', collabGitPath: '' },
  }));
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_B)).rejects.toThrow(/another device/);
  expect(await stat(originalTree)).toMatchObject({ ino: originalIdentity.ino, dev: originalIdentity.dev });
  // Simulate resolving the conflict in favor of this device's untouched original.
  await rm(path.join(vault, newRoot), { recursive: true });
  await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_B);
  const reopened = new CollabLocalProjectRepository(vault, { installationKey: TEST_INSTALLATION_B });
  await expect(reopened.reclaimDetachedAuthorityDirectories()).resolves.toBeUndefined();
});

it('accepts a synchronized destination on a device without legacy storage', async () => {
  await put(`${oldRoot}/index.json`, 'shared state');
  await migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_A);
  await expect(migrateCollabStorage(vault, '.obsidian', TEST_INSTALLATION_B)).resolves.toMatchObject({ migrated: false });
});
