import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { CollabSidebarSurfaceController } from '@/features/FeatureHost';

export const COLLAB_VIEW_TYPE = 'claudian-collab';
interface CollabViewHost {
  ready(): Promise<void>;
  createSurface(container: HTMLElement, leaf: WorkspaceLeaf): CollabSidebarSurfaceController;
}

/** Obsidian owns the pane; the retained Collab panel owns its contents. */
export class CollabView extends ItemView {
  private surface: CollabSidebarSurfaceController | null = null;
  private closed = false;
  private loading = false;
  constructor(leaf: WorkspaceLeaf, private readonly host: CollabViewHost) { super(leaf); }
  getViewType(): string { return COLLAB_VIEW_TYPE; }
  getDisplayText(): string { return 'Collab'; }
  getIcon(): string { return 'users'; }
  async onOpen(): Promise<void> {
    this.closed = false;
    this.contentEl.addClass('claudian-container', 'claudian-collab-standalone');
    this.registerEvent(this.app.workspace.on('layout-change', () => this.updateVisibility()));
    await this.loadPanel();
  }
  async onClose(): Promise<void> {
    this.closed = true;
    this.surface?.destroy();
    this.surface = null;
    this.contentEl.empty();
  }
  private updateVisibility(): void {
    this.surface?.setActive(this.contentEl.isShown());
  }
  private async loadPanel(): Promise<void> {
    if (this.loading || this.closed) return;
    this.loading = true;
    this.contentEl.empty();
    this.contentEl.createDiv({ cls: 'claudian-collab-panel-status', text: 'Preparing Collab…', attr: { role: 'status' } });
    try {
      await this.host.ready();
      if (this.closed) return;
      this.contentEl.empty();
      this.surface = this.host.createSurface(this.contentEl, this.leaf);
      this.updateVisibility();
    } catch (error) {
      if (this.closed) return;
      this.contentEl.empty();
      this.contentEl.createDiv({ cls: 'claudian-collab-panel-status', text: error instanceof Error ? error.message : 'Collab could not start.', attr: { role: 'alert' } });
      const retry = this.contentEl.createEl('button', { text: 'Retry', attr: { type: 'button' } });
      retry.addEventListener('click', () => { void this.loadPanel(); });
    } finally { this.loading = false; }
  }
}
