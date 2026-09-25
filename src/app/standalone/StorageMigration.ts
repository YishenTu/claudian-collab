import { randomUUID } from 'node:crypto';
import { link, lstat, mkdtemp, open, readFile, readdir, rename, rmdir, unlink } from 'node:fs/promises';
import path from 'node:path';

import { resolveCollabVaultPath, writeCollabFileAtomically } from '@/app/collab/CollabFilesystemBoundary';
import { type InstallationKey, isInstallationKey } from '@/core/device/InstallationKey';
import type { CollabPluginSettings } from '@/core/collab/CollabPluginSettings';
import { DEFAULT_COLLAB_PROJECTS_FOLDER, parseCollabProjectsFolder } from '@/core/collab/CollabProjectsFolder';

export const COLLAB_STORAGE_ROOT = '.claudian-collab';
const LEGACY_ROOT = '.claudian/collab';
const RECEIPT = 'standalone-migration.json';

interface Receipt {
  version: 1;
  phase: 'prepared' | 'complete';
  settings: CollabPluginSettings;
  installationKey: InstallationKey;
}

export function decodeCollabSettings(value: unknown, configDirectory: string): CollabPluginSettings {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const folder = typeof record.collabProjectsFolder === 'string'
    ? record.collabProjectsFolder : DEFAULT_COLLAB_PROJECTS_FOLDER;
  const parsed = parseCollabProjectsFolder(folder, { obsidianConfigDirectory: configDirectory });
  if (!parsed.ok) throw new Error(`Invalid Projects folder: ${parsed.message}`);
  return {
    collabProjectsFolder: parsed.value,
    collabGitPath: typeof record.collabGitPath === 'string' ? record.collabGitPath : '',
  };
}

async function exists(file: string): Promise<boolean> {
  try { await lstat(file); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function readJson(file: string): Promise<unknown> {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('Collab migration found unreadable settings or recovery records. Restore the affected file and retry.', { cause: error });
  }
}

function decodeReceipt(value: unknown, configDirectory: string): Receipt | null {
  if (value === null) return null;
  const record = value as Partial<Receipt>;
  if (record.version !== 1 || !['prepared', 'complete'].includes(record.phase ?? '') || !record.settings || !isInstallationKey(record.installationKey)) {
    throw new Error('Unsupported Collab migration record. Update the plugin before retrying.');
  }
  return { version: 1, phase: record.phase!, installationKey: record.installationKey, settings: decodeCollabSettings(record.settings, configDirectory) };
}

async function syncDirectory(directory: string): Promise<void> {
  if (process.platform === 'win32') return;
  const handle = await open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

function processAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

/** Refuse coexistence even when the embedded implementation is currently disabled. */
export async function assertLegacyCollabAbsent(vaultRoot: string, configDirectory: string): Promise<void> {
  const plugins = await resolveCollabVaultPath(vaultRoot, `${configDirectory}/plugins`);
  const entries = await readdir(plugins, { withFileTypes: true }).catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'claudian-collab') continue;
    const manifestPath = await resolveCollabVaultPath(vaultRoot, `${configDirectory}/plugins/${entry.name}/manifest.json`);
    const manifest = await readJson(manifestPath) as { id?: string } | null;
    if (entry.name !== 'claudian' && manifest?.id !== 'claudian') continue;
    const mainPath = await resolveCollabVaultPath(vaultRoot, `${configDirectory}/plugins/${entry.name}/main.js`);
    const main = await readFile(mainPath, 'utf8').catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
      throw error;
    });
    if (main.includes('collabEnabled') || main.includes('collabSurfaceFactory')) {
      throw new Error('Update or uninstall the Claudian version containing Collab, then restart Obsidian and retry migration.');
    }
  }
}

async function inspectTree(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
      throw new Error('Collab storage contains a linked or unsupported file. Resolve it before migration.');
    }
    if (entry.isDirectory()) await inspectTree(file);
    else if (entry.name === 'lan-host.lock') {
      const lock = await readJson(file) as { pid?: number } | null;
      if (!Number.isSafeInteger(lock?.pid) || lock!.pid! <= 0 || processAlive(lock!.pid!)) {
        throw new Error('A Collab Host may still be running. Close other Obsidian instances, then retry migration.');
      }
    }
  }
}

async function migrate(vaultRoot: string, configDirectory: string, installationKey: InstallationKey) {
  await assertLegacyCollabAbsent(vaultRoot, configDirectory);
  const source = await resolveCollabVaultPath(vaultRoot, LEGACY_ROOT);
  const destination = await resolveCollabVaultPath(vaultRoot, COLLAB_STORAGE_ROOT);
  const destinationReceiptPath = await resolveCollabVaultPath(vaultRoot, `${COLLAB_STORAGE_ROOT}/${RECEIPT}`);
  const completed = decodeReceipt(await readJson(destinationReceiptPath), configDirectory);
  if (completed) {
    // A synchronized receipt proves cutover on its originating device only.
    // A second device may still hold original, locally owned recovery resources.
    if (completed.installationKey !== installationKey && await exists(source)) {
      throw new Error('Collab was migrated on another device, but this device still has legacy data. Keep both folders and resolve the storage conflict before retrying.');
    }
    if (completed.phase === 'prepared') {
      await writeCollabFileAtomically(vaultRoot, `${COLLAB_STORAGE_ROOT}/${RECEIPT}`, JSON.stringify({ ...completed, phase: 'complete' }));
    }
    return { migrated: completed.phase === 'prepared', settings: completed.settings };
  }
  const sourceExists = await exists(source);
  const destinationExists = await exists(destination);
  if (destinationExists && (sourceExists || !(await lstat(destination)).isDirectory() || (await readdir(destination)).length > 0)) {
    throw new Error('The standalone folder already contains data without a migration record. Keep both copies and resolve the conflict before retrying.');
  }
  if (sourceExists && !(await lstat(source)).isDirectory()) throw new Error('Legacy Collab storage is not a directory.');
  const previous = sourceExists
    ? decodeReceipt(await readJson(await resolveCollabVaultPath(vaultRoot, `${LEGACY_ROOT}/${RECEIPT}`)), configDirectory)
    : null;
  const settings = previous?.settings ?? decodeCollabSettings(
    await readJson(await resolveCollabVaultPath(vaultRoot, '.claudian/claudian-settings.json')), configDirectory,
  );
  const receipt: Receipt = { version: 1, phase: 'prepared', settings, installationKey };
  if (sourceExists) {
    await inspectTree(source);
    await writeCollabFileAtomically(vaultRoot, `${LEGACY_ROOT}/${RECEIPT}`, JSON.stringify(receipt));
    // A same-filesystem rename preserves authority resource incarnations and every byte.
    // Persisted journals use IDs, workspace paths, and directory names; private paths
    // are derived by their owners. Working copies and their Git origins stay in place.
    await rename(source, destination);
    await syncDirectory(path.dirname(source));
  } else {
    // Publish a fresh root together with its receipt. An interrupted temporary
    // write must never leave an unrecognized nonempty destination behind.
    const staging = await mkdtemp(path.join(vaultRoot, '.claudian-collab-setup-'));
    await writeCollabFileAtomically(vaultRoot, `${path.basename(staging)}/${RECEIPT}`, JSON.stringify({ ...receipt, phase: 'complete' }));
    await syncDirectory(staging);
    if (destinationExists) await rmdir(destination);
    await rename(staging, destination);
  }
  await syncDirectory(vaultRoot);
  await writeCollabFileAtomically(vaultRoot, `${COLLAB_STORAGE_ROOT}/${RECEIPT}`, JSON.stringify({ ...receipt, phase: 'complete' }));
  return { migrated: sourceExists, settings };
}

/** Runs before any application owner, listener, or recovery worker is published. */
export async function migrateCollabStorage(vaultRoot: string, configDirectory: string, installationKey: InstallationKey) {
  const lockPath = await resolveCollabVaultPath(vaultRoot, '.claudian-collab-migration.lock');
  const nonce = randomUUID();
  const temporaryLock = `${lockPath}.${nonce}.tmp`;
  const handle = await open(temporaryLock, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, nonce }));
    await handle.sync();
  } finally {
    await handle.close();
  }
  let acquired = false;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Linking publishes the fully written owner record without replacing an
        // existing lock. A crash before this point leaves no canonical lock.
        await link(temporaryLock, lockPath);
        acquired = true;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const lock = await readJson(lockPath) as { pid?: number } | null;
        if (!Number.isSafeInteger(lock?.pid) || lock!.pid! <= 0 || processAlive(lock!.pid!)) {
          throw new Error('Collab migration is already running. Close other Obsidian instances and retry.', { cause: error });
        }
        await unlink(lockPath);
      }
    }
    if (!acquired) throw new Error('Could not acquire the Collab migration lock.');
    try { return await migrate(vaultRoot, configDirectory, installationKey); } finally {
      const current = await readJson(lockPath) as { nonce?: string } | null;
      if (current?.nonce === nonce) await unlink(lockPath);
    }
  } finally {
    await unlink(temporaryLock);
  }
}
