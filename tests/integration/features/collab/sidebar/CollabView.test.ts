/** @jest-environment jsdom */
import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { axe } from 'jest-axe';
import type { WorkspaceLeaf } from 'obsidian';
import { CollabView } from '@/features/collab/sidebar/CollabView';

function fixture(ready = jest.fn().mockResolvedValue(undefined)) {
  const container = document.createElement('div');
  const surface = { setActive: jest.fn(), destroy: jest.fn() };
  const host = { ready, createSurface: jest.fn().mockReturnValue(surface) };
  const view = new CollabView({} as WorkspaceLeaf, host);
  Object.assign(container, { empty: () => container.replaceChildren(), addClass: (...names: string[]) => container.classList.add(...names), isShown: () => true });
  Object.assign(view, { contentEl: container, registerEvent: jest.fn() });
  document.body.append(container);
  return { container, view, host, surface };
}
afterEach(() => { document.body.replaceChildren(); });
it('keeps project controls unavailable until migration completes', async () => {
  let complete!: () => void;
  const f = fixture(jest.fn(() => new Promise<void>(resolve => { complete = resolve; })));
  const opening = f.view.onOpen();
  expect(getByRole(f.container, 'status').textContent).toBe('Preparing Collab…');
  expect(f.host.createSurface).not.toHaveBeenCalled();
  complete(); await opening;
  expect(f.surface.setActive).toHaveBeenCalledWith(true);
  await f.view.onClose();
  expect(f.surface.destroy).toHaveBeenCalledTimes(1);
});
it('shows an accessible recovery action and retries without constructing a partial panel', async () => {
  const f = fixture(jest.fn().mockRejectedValueOnce(new Error('Update Claudian and retry.')).mockResolvedValue(undefined));
  await f.view.onOpen();
  expect(getByRole(f.container, 'alert').textContent).toContain('Update Claudian');
  const retry = getByRole(f.container, 'button', { name: 'Retry' });
  expect(retry.getAttribute('type')).toBe('button');
  expect(await axe(f.container)).toHaveNoViolations();
  fireEvent.click(retry);
  await waitFor(() => expect(f.host.createSurface).toHaveBeenCalledTimes(1));
  await f.view.onClose();
});
it('does not mount a panel after its leaf closes during migration', async () => {
  let complete!: () => void;
  const f = fixture(jest.fn(() => new Promise<void>(resolve => { complete = resolve; })));
  const opening = f.view.onOpen();
  await f.view.onClose();
  complete(); await opening;
  expect(f.host.createSurface).not.toHaveBeenCalled();
});
