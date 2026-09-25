/** Lifecycle of a mounted collaboration sidebar. */
export interface CollabSidebarSurfaceController {
  preload?(): void;
  setActive(active: boolean): void;
  destroy(): void;
}
