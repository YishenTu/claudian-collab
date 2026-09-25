import { type App, Notice, PluginSettingTab, type Plugin, type Setting, type SettingDefinitionItem } from 'obsidian';
import type { CollabPluginSettings } from '@/core/collab/CollabPluginSettings';

interface SettingsPort {
  ready(): Promise<void>;
  read(): CollabPluginSettings;
  save(settings: CollabPluginSettings): Promise<void>;
  copyAgentInstructions(): Promise<void>;
}

export class CollabSettingsTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private readonly port: SettingsPort) {
    super(app, plugin);
    this.containerEl.addClass('claudian-settings');
  }

  private renderGeneration = 0;
  private loadState: 'loading' | 'ready' | 'error' = 'loading';
  private loadError = '';
  private pendingLoad: Promise<void> | null = null;
  private draft: CollabPluginSettings | null = null;

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      ...(this.loadState === 'ready' ? [] : [{
        name: 'Collab settings',
        render: (setting: Setting) => {
          setting.controlEl.createDiv({
            text: this.loadState === 'error' ? this.loadError : 'Loading Collab settings…',
            attr: { role: this.loadState === 'error' ? 'alert' : 'status' },
          });
          this.startLoad();
        },
      }]),
      {
        name: 'Projects folder',
        desc: 'Vault folder for new projects. Existing projects stay in place.',
        render: setting => {
          const draft = this.draft;
          if (!draft) { this.startLoad(); return; }
          setting.addText(text => text.setValue(draft.collabProjectsFolder)
            .onChange(value => { draft.collabProjectsFolder = value; }));
        },
      },
      {
        name: 'Git executable',
        desc: 'Leave empty to detect Git automatically.',
        render: setting => {
          const draft = this.draft;
          if (!draft) { this.startLoad(); return; }
          setting.addText(text => text.setValue(draft.collabGitPath)
            .onChange(value => { draft.collabGitPath = value; }));
        },
      },
      {
        name: 'Save settings',
        render: setting => {
          const draft = this.draft;
          if (!draft) { this.startLoad(); return; }
          setting.addButton(button => {
            button.buttonEl.type = 'button';
            button.setButtonText('Save').setCta().onClick(async () => {
              button.setDisabled(true);
              try { await this.port.save({ ...draft }); new Notice('Collab settings saved.'); }
              catch (error) { new Notice(error instanceof Error ? error.message : 'Could not save settings.'); }
              finally { button.setDisabled(false); }
            });
          });
        },
      },
      {
        name: 'Agent API',
        desc: 'Copy the running HTTP endpoint and usage instructions for your agent.',
        render: setting => {
          if (!this.draft) { this.startLoad(); return; }
          setting.addButton(button => {
            button.buttonEl.type = 'button';
            button.setButtonText('Copy instructions').onClick(async () => {
              try { await this.port.copyAgentInstructions(); }
              catch (error) { new Notice(error instanceof Error ? error.message : 'Could not start the agent API.'); }
            });
          });
        },
      },
    ];
  }

  hide(): void {
    this.renderGeneration += 1;
    this.loadState = 'loading';
    this.draft = null;
    this.pendingLoad = null;
  }

  private startLoad(): void {
    if (this.loadState !== 'loading' || this.pendingLoad) return;
    const generation = this.renderGeneration;
    const pending = this.port.ready().then(() => {
      if (generation !== this.renderGeneration) return;
      this.draft = { ...this.port.read() };
      this.loadState = 'ready';
      this.update();
    }).catch(error => {
      if (generation !== this.renderGeneration) return;
      this.loadError = error instanceof Error ? error.message : 'Open Collab to retry startup.';
      this.loadState = 'error';
      this.update();
    });
    this.pendingLoad = pending;
    void pending.finally(() => { if (this.pendingLoad === pending) this.pendingLoad = null; });
  }
}
