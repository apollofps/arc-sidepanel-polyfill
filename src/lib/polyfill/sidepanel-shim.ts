/**
 * Core chrome.sidePanel polyfill implementation.
 *
 * This module provides a drop-in replacement for the chrome.sidePanel API.
 * It stores panel options and state, and delegates rendering to the content
 * script via chrome.runtime messaging.
 */

import type {
  SidePanelOptions,
  SidePanelOpenOptions,
  SidePanelCloseOptions,
  PanelBehavior,
  GetOptionsResult,
} from '@/lib/types/sidepanel';

/** Default panel path when none is specified via manifest or setOptions. */
const DEFAULT_PATH = 'sidepanel.html';

/** Global (non-tab-specific) panel options. */
let _globalOptions: SidePanelOptions = {
  path: DEFAULT_PATH,
  enabled: true,
};

/** Per-tab panel options, keyed by tabId. */
const _tabOptions = new Map<number, SidePanelOptions>();

/** Panel behavior config. */
let _panelBehavior: PanelBehavior = {
  openPanelOnActionClick: false,
};

/**
 * Set side panel options globally or for a specific tab.
 */
export async function setOptions(options: SidePanelOptions): Promise<void> {
  if (options.tabId !== undefined) {
    const existing = _tabOptions.get(options.tabId) ?? { ..._globalOptions };
    _tabOptions.set(options.tabId, { ...existing, ...options });
  } else {
    _globalOptions = { ..._globalOptions, ...options };
  }

  // Persist to storage for cross-context access
  await _persistState();
}

/**
 * Get the effective panel options for a tab, falling back to global defaults.
 */
export async function getOptions(
  filter?: { tabId?: number }
): Promise<GetOptionsResult> {
  if (filter?.tabId !== undefined) {
    const tabOpts = _tabOptions.get(filter.tabId);
    if (tabOpts) {
      return {
        tabId: filter.tabId,
        path: tabOpts.path ?? _globalOptions.path,
        enabled: tabOpts.enabled ?? _globalOptions.enabled,
      };
    }
  }

  return {
    path: _globalOptions.path,
    enabled: _globalOptions.enabled,
  };
}

/**
 * Open the side panel in a specific tab or window.
 * Sends a message to the content script to inject the panel iframe.
 */
export async function open(options: SidePanelOpenOptions): Promise<void> {
  const tabId = options.tabId ?? (await _getActiveTabId());
  if (tabId === undefined) {
    throw new Error('Could not determine tab to open side panel in.');
  }

  const effectiveOptions = await getOptions({ tabId });
  if (effectiveOptions.enabled === false) {
    throw new Error('Side panel is disabled for this tab.');
  }

  const path = effectiveOptions.path ?? DEFAULT_PATH;

  // Send message to content script to render the panel
  await chrome.tabs.sendMessage(tabId, {
    type: 'OPEN_PANEL',
    tabId,
    path,
  });
}

/**
 * Close the side panel in a specific tab or window.
 */
export async function close(options: SidePanelCloseOptions): Promise<void> {
  const tabId = options.tabId ?? (await _getActiveTabId());
  if (tabId === undefined) {
    throw new Error('Could not determine tab to close side panel in.');
  }

  await chrome.tabs.sendMessage(tabId, {
    type: 'CLOSE_PANEL',
    tabId,
  });
}

/**
 * Configure panel behavior (e.g., open on action icon click).
 */
export async function setPanelBehavior(behavior: PanelBehavior): Promise<void> {
  _panelBehavior = { ..._panelBehavior, ...behavior };
  await _persistState();
}

/**
 * Get the current panel behavior configuration.
 */
export async function getPanelBehavior(): Promise<PanelBehavior> {
  return { ..._panelBehavior };
}

/**
 * Check whether the current browser needs the polyfill.
 */
export function needsPolyfill(): boolean {
  return (
    typeof chrome.sidePanel === 'undefined' ||
    typeof chrome.sidePanel?.open !== 'function'
  );
}

/**
 * Install the polyfill onto the chrome.sidePanel namespace.
 * Only activates if the native API is missing.
 */
export function install(): boolean {
  if (!needsPolyfill()) {
    console.log('[arc-sidepanel-polyfill] Native sidePanel API detected, skipping polyfill.');
    return false;
  }

  console.log('[arc-sidepanel-polyfill] Installing sidePanel polyfill...');

  // @ts-expect-error — we're intentionally creating the missing namespace
  chrome.sidePanel = {
    open,
    close,
    setOptions,
    getOptions,
    setPanelBehavior,
    getPanelBehavior,
  };

  console.log('[arc-sidepanel-polyfill] Polyfill installed successfully.');
  return true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function _persistState(): Promise<void> {
  const tabOptionsObj: Record<number, SidePanelOptions> = {};
  _tabOptions.forEach((opts, tabId) => {
    tabOptionsObj[tabId] = opts;
  });

  await chrome.storage.session.set({
    _polyfill_global: _globalOptions,
    _polyfill_tabs: tabOptionsObj,
    _polyfill_behavior: _panelBehavior,
  });
}

/**
 * Restore persisted state (called on service worker wake-up).
 */
export async function _restoreState(): Promise<void> {
  try {
    const data = await chrome.storage.session.get([
      '_polyfill_global',
      '_polyfill_tabs',
      '_polyfill_behavior',
    ]);

    if (data._polyfill_global) {
      _globalOptions = data._polyfill_global;
    }
    if (data._polyfill_tabs) {
      _tabOptions.clear();
      for (const [tabId, opts] of Object.entries(data._polyfill_tabs)) {
        _tabOptions.set(Number(tabId), opts as SidePanelOptions);
      }
    }
    if (data._polyfill_behavior) {
      _panelBehavior = data._polyfill_behavior;
    }
  } catch (err) {
    console.warn('[arc-sidepanel-polyfill] Failed to restore state:', err);
  }
}
