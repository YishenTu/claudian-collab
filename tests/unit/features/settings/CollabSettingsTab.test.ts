import type { App, Plugin, Setting, SettingGroup } from 'obsidian';
import { CollabSettingsTab } from '@/features/settings/CollabSettingsTab';

function render(tab: CollabSettingsTab, name: string, setting: Partial<Setting>): void {
  const definition = tab.getSettingDefinitions().find(item => 'name' in item && item.name === name);
  if (!definition || !('render' in definition) || !definition.render) throw new Error(`Missing ${name} setting`);
  definition.render(setting as Setting, {} as SettingGroup);
}

it('registers each Collab setting for Obsidian settings search', () => {
  const tab = new CollabSettingsTab({} as App, {} as Plugin, {
    ready: jest.fn().mockResolvedValue(undefined),
    read: () => ({ collabProjectsFolder: 'workspace', collabGitPath: '' }),
    save: jest.fn().mockResolvedValue(undefined),
    copyAgentInstructions: jest.fn().mockResolvedValue(undefined),
  });

  expect(tab.getSettingDefinitions().flatMap(definition => 'name' in definition ? [definition.name] : []))
    .toEqual(expect.arrayContaining([
    'Projects folder', 'Git executable', 'Save settings', 'Agent API',
  ]));
});

it('keeps edited values staged until Save is selected', async () => {
  const settings = { collabProjectsFolder: 'workspace', collabGitPath: '' };
  const save = jest.fn().mockResolvedValue(undefined);
  const tab = new CollabSettingsTab({} as App, {} as Plugin, {
    ready: jest.fn().mockResolvedValue(undefined), read: () => settings, save,
    copyAgentInstructions: jest.fn().mockResolvedValue(undefined),
  });
  render(tab, 'Collab settings', { controlEl: { createDiv: jest.fn() } as never });
  await Promise.resolve();

  let editFolder: (value: string) => void = () => undefined;
  const text = {
    setValue: jest.fn().mockReturnThis(),
    onChange: jest.fn((handler: (value: string) => void) => { editFolder = handler; }),
  };
  render(tab, 'Projects folder', { addText: callback => { callback(text as never); return {} as Setting; } });
  editFolder('projects');
  expect(settings.collabProjectsFolder).toBe('workspace');
  expect(save).not.toHaveBeenCalled();

  let clickSave: () => Promise<void> = async () => undefined;
  const button = {
    buttonEl: { type: '' }, setButtonText: jest.fn().mockReturnThis(),
    setCta: jest.fn().mockReturnThis(), setDisabled: jest.fn().mockReturnThis(),
    onClick: jest.fn((handler: () => Promise<void>) => { clickSave = handler; }),
  };
  render(tab, 'Save settings', { addButton: callback => { callback(button as never); return {} as Setting; } });
  await clickSave();
  expect(save).toHaveBeenCalledWith({ collabProjectsFolder: 'projects', collabGitPath: '' });
});
