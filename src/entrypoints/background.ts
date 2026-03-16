/**
 * Background service worker entrypoint.
 *
 * Installs the chrome.sidePanel polyfill on browsers that lack it (Arc)
 * and coordinates between extension API calls and the content script.
 */

import { install, _restoreState, needsPolyfill } from '@/lib/polyfill/sidepanel-shim';

export default defineBackground(async () => {
  // Restore persisted state before installing the polyfill
  await _restoreState();

  // Install the polyfill if the native API is missing
  const polyfillActive = install();

  if (polyfillActive) {
    console.log('[arc-sidepanel-polyfill] Polyfill is active — sidePanel API shimmed');
    // Disable popup so action.onClicked fires for direct toggle
    chrome.action.setPopup({ popup: '' });
  } else {
    console.log('[arc-sidepanel-polyfill] Native sidePanel API detected, polyfill dormant');
  }

  // -------------------------------------------------------------------------
  // Handle messages from content scripts and popup
  // -------------------------------------------------------------------------

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'PANEL_CLOSED': {
        console.log('[arc-sidepanel-polyfill] Panel closed in tab:', sender.tab?.id);
        sendResponse({ ok: true });
        break;
      }

      case 'TOGGLE_PANEL': {
        if (sender.tab?.id) {
          _togglePanelInTab(sender.tab.id);
        }
        sendResponse({ ok: true });
        break;
      }

      case 'GET_POLYFILL_STATUS': {
        sendResponse({
          active: polyfillActive,
          needsPolyfill: needsPolyfill(),
        });
        break;
      }

      default:
        break;
    }

    return true;
  });

  // -------------------------------------------------------------------------
  // Action icon click — toggle panel (fires when popup is disabled)
  // -------------------------------------------------------------------------

  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    await _togglePanelInTab(tab.id);
  });

  // -------------------------------------------------------------------------
  // Extension command (Ctrl+Shift+S) — toggle panel globally
  // -------------------------------------------------------------------------

  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle-panel') return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await _togglePanelInTab(tab.id);
    }
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  async function _togglePanelInTab(tabId: number): Promise<void> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'GET_PANEL_STATE',
      });

      if (response?.isOpen) {
        await chrome.tabs.sendMessage(tabId, { type: 'CLOSE_PANEL', tabId });
      } else {
        const options = await chrome.sidePanel?.getOptions?.({ tabId });
        const path = options?.path ?? 'sidepanel.html';

        await chrome.tabs.sendMessage(tabId, {
          type: 'OPEN_PANEL',
          tabId,
          path,
        });
      }
    } catch (err) {
      console.warn('[arc-sidepanel-polyfill] Content script not ready:', err);

      // Inject content script dynamically and retry
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-scripts/content.js'],
        });

        await chrome.tabs.sendMessage(tabId, {
          type: 'OPEN_PANEL',
          tabId,
          path: 'sidepanel.html',
        });
      } catch (injectErr) {
        console.error('[arc-sidepanel-polyfill] Failed to inject:', injectErr);
      }
    }
  }
});
