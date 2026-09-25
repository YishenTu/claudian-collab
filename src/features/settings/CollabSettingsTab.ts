import { type App, Notice, PluginSettingTab, type Plugin, Setting } from 'obsidian';
import type { CollabPluginSettings } from '@/core/collab/CollabPluginSettings';

interface SettingsPort {
  ready(): Promise<void>;
  read(): CollabPluginSettings;
  save(settings: CollabPluginSettings): Promise<void>;
  copyAgentInstructions(): Promise<void>;
}
export class CollabSettingsTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private readonly port: SettingsPort) { super(app, plugin); }
  private renderGeneration = 0;
  display(): void {
    const generation = ++this.renderGeneration;
    this.containerEl.empty();
    this.containerEl.createDiv({ text: 'Loading Collab settings…', attr: { role: 'status' } });
    void this.port.ready().then(() => {
      if (generation === this.renderGeneration) this.render();
    }).catch(error => {
      if (generation !== this.renderGeneration) return;
      this.containerEl.empty();
      this.containerEl.createDiv({ text: error instanceof Error ? error.message : 'Open Collab to retry startup.', attr: { role: 'alert' } });
    });
  }
  hide(): void { this.renderGeneration += 1; }
  private render(): void {
    this.containerEl.empty();
    this.containerEl.addClass('claudian-settings');
    let folder = this.port.read().collabProjectsFolder;
    let git = this.port.read().collabGitPath;
    new Setting(this.containerEl).setName('Projects folder').setDesc('Vault folder for new projects. Existing projects stay in place.')
      .addText(text => text.setValue(folder).onChange(value => { folder = value; }));
    new Setting(this.containerEl).setName('Git executable').setDesc('Leave empty to detect Git automatically.')
      .addText(text => text.setValue(git).onChange(value => { git = value; }));
    new Setting(this.containerEl).setName('Save settings').addButton(button => {
      button.buttonEl.type = 'button';
      button.setButtonText('Save').setCta().onClick(async () => {
        button.setDisabled(true);
        try { await this.port.save({ collabProjectsFolder: folder, collabGitPath: git }); new Notice('Collab settings saved.'); }
        catch (error) { new Notice(error instanceof Error ? error.message : 'Could not save settings.'); }
        finally { button.setDisabled(false); }
      });
    });
    new Setting(this.containerEl).setName('Agent API').setDesc('Copy the running HTTP endpoint and usage instructions for your agent.')
      .addButton(button => {
        button.buttonEl.type = 'button';
        button.setButtonText('Copy instructions').onClick(async () => {
          try { await this.port.copyAgentInstructions(); }
          catch (error) { new Notice(error instanceof Error ? error.message : 'Could not start the agent API.'); }
        });
      });
  }
}
