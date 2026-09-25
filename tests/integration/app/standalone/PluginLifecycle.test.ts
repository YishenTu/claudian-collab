import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { App, PluginManifest } from 'obsidian';
import CollabPlugin from '@/main';

let vault: string;
let plugin: CollabPlugin;
let copied = '';
async function waitForServerClose(endpoint: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { await fetch(endpoint); }
    catch { return; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Collab agent API did not close after unload.');
}
beforeEach(async () => {
  vault = await mkdtemp(path.join(os.tmpdir(), 'standalone-plugin-'));
  copied = '';
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async (text: string) => { copied = text; } } } });
  const app = {
    vault: { adapter: { basePath: vault }, configDir: '.obsidian', on: jest.fn() },
    workspace: { onLayoutReady: jest.fn(), detachLeavesOfType: jest.fn(), getLeavesOfType: jest.fn(() => []) },
  } as unknown as App;
  plugin = new CollabPlugin(app, { id: 'claudian-collab' } as PluginManifest);
});
afterEach(async () => {
  plugin.onunload();
  const endpoint = copied.match(/RPC endpoint: (\S+)/)?.[1];
  if (endpoint) await waitForServerClose(endpoint);
  await rm(vault, { recursive: true, force: true });
});
it('returns from the unload hook synchronously', async () => {
  plugin.onload();
  await plugin.ensureReady();
  await plugin.copyAgentInstructions();
  const endpoint = copied.match(/RPC endpoint: (\S+)/)![1];
  const result = (plugin.onunload as () => unknown)();
  expect(result).toBeUndefined();
  await waitForServerClose(endpoint);
});
it('loads without Claudian and serves the existing operation catalog before Git initialization', async () => {
  plugin.onload();
  await plugin.ensureReady();
  await plugin.copyAgentInstructions();
  const endpoint = copied.match(/RPC endpoint: (\S+)/)![1];
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'catalog', method: 'runtime.operations.list', params: {} }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ id: 'catalog' });
  expect(await readFile(path.join(vault, '.claudian-collab/settings.json'), 'utf8')).toContain('workspace');
  plugin.onunload();
  await waitForServerClose(endpoint);
});
it('does not publish the API when migration is blocked and can retry after correction', async () => {
  await mkdir(path.join(vault, '.claudian-collab'));
  await writeFile(path.join(vault, '.claudian-collab/foreign-data'), 'preserve');
  plugin.onload();
  await expect(plugin.ensureReady()).rejects.toThrow(/already contains/);
  await expect(plugin.copyAgentInstructions()).rejects.toThrow(/already contains/);
  expect(copied).toBe('');
  await rm(path.join(vault, '.claudian-collab'), { recursive: true });
  await plugin.ensureReady();
  await plugin.copyAgentInstructions();
  expect(copied).toContain('RPC endpoint: http://127.0.0.1:');
});
it('fences startup when unloaded during migration', async () => {
  plugin.onload();
  plugin.onunload();
  await expect(plugin.copyAgentInstructions()).rejects.toThrow(/unloading/);
});
it('preserves sidebar placement and clears session-only detail views on unload', async () => {
  const sidebar = { setViewState: jest.fn(async () => undefined) };
  const detail = { setViewState: jest.fn(async () => undefined) };
  jest.mocked(plugin.app.workspace.getLeavesOfType).mockImplementation(type =>
    (type === 'claudian-collab' ? [sidebar] : [detail]) as never);
  plugin.onload();
  await plugin.ensureReady();
  plugin.onunload();
  for (let attempt = 0; attempt < 50 && detail.setViewState.mock.calls.length === 0; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  expect(plugin.app.workspace.detachLeavesOfType).not.toHaveBeenCalled();
  expect(sidebar.setViewState).not.toHaveBeenCalled();
  expect(detail.setViewState).toHaveBeenCalledWith({ type: 'empty' });
});
