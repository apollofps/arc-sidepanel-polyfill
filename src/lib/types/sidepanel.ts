/**
 * Type definitions for the chrome.sidePanel API polyfill.
 * These mirror the official Chrome Side Panel API types.
 */

export interface SidePanelOptions {
  /** Tab-specific panel options. If omitted, sets global defaults. */
  tabId?: number;
  /** Path to the HTML file to display in the panel, relative to the extension root. */
  path?: string;
  /** Whether the side panel is enabled for the given tab or globally. */
  enabled?: boolean;
}

export interface SidePanelOpenOptions {
  /** The tab in which to open the side panel. */
  tabId?: number;
  /** The window in which to open the side panel. */
  windowId?: number;
}

export interface SidePanelCloseOptions {
  /** The tab in which to close the side panel. */
  tabId?: number;
  /** The window in which to close the side panel. */
  windowId?: number;
}

export interface PanelBehavior {
  /** Whether clicking the extension's action icon toggles the side panel. */
  openPanelOnActionClick?: boolean;
}

export interface GetOptionsResult {
  tabId?: number;
  path?: string;
  enabled?: boolean;
}

/**
 * Internal state tracked per-tab by the polyfill.
 */
export interface PanelState {
  /** Whether the panel is currently visible. */
  isOpen: boolean;
  /** The HTML path loaded in the panel iframe. */
  path: string;
  /** Whether the panel is enabled for this context. */
  enabled: boolean;
  /** The extension ID that owns this panel. */
  extensionId?: string;
}

/**
 * Messages sent between background, content script, and panel iframe.
 */
export type PolyfillMessage =
  | { type: 'OPEN_PANEL'; tabId: number; path: string; extensionId?: string }
  | { type: 'CLOSE_PANEL'; tabId: number }
  | { type: 'PANEL_OPENED'; tabId: number }
  | { type: 'PANEL_CLOSED'; tabId: number }
  | { type: 'UPDATE_OPTIONS'; tabId?: number; options: SidePanelOptions }
  | { type: 'GET_PANEL_STATE'; tabId: number }
  | { type: 'PANEL_STATE'; state: PanelState | null };
