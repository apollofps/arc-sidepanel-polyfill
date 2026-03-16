/**
 * Popup script — shows polyfill status and provides a toggle button.
 */

async function init(): Promise<void> {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const browserName = document.getElementById('browser-name')!;
  const polyfillBadge = document.getElementById('polyfill-badge')!;
  const polyfillStatus = document.getElementById('polyfill-status')!;
  const nativeStatus = document.getElementById('native-status')!;
  const toggleBtn = document.getElementById('toggle-btn')!;

  try {
    // Query background for polyfill status
    const status = await chrome.runtime.sendMessage({ type: 'GET_POLYFILL_STATUS' });

    // Detect browser
    const ua = navigator.userAgent;
    let browser = 'Unknown browser';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Brave')) browser = 'Brave';
    else if (ua.includes('OPR/')) browser = 'Opera';
    else if (ua.includes('Vivaldi')) browser = 'Vivaldi';
    else if (ua.includes('Chrome/')) browser = status.needsPolyfill ? 'Arc Browser (detected)' : 'Google Chrome';
    browserName.textContent = browser;

    // Update status display
    if (status.active) {
      polyfillBadge.className = 'badge badge-active';
      polyfillStatus.textContent = 'Active';
      nativeStatus.textContent = 'Missing → Shimmed';
      nativeStatus.style.color = '#f59e0b';
    } else {
      polyfillBadge.className = 'badge badge-dormant';
      polyfillStatus.textContent = 'Dormant';
      nativeStatus.textContent = 'Available ✓';
      nativeStatus.style.color = '#22c55e';
    }

    // Toggle button
    toggleBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      try {
        const state = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PANEL_STATE' });

        if (state?.isOpen) {
          await chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_PANEL', tabId: tab.id });
          toggleBtn.textContent = 'Open Side Panel';
        } else {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'OPEN_PANEL',
            tabId: tab.id,
            path: 'sidepanel.html',
          });
          toggleBtn.textContent = 'Close Side Panel';
        }
      } catch {
        // Content script not injected yet — inject and open
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js'],
        });

        await chrome.tabs.sendMessage(tab.id, {
          type: 'OPEN_PANEL',
          tabId: tab.id,
          path: 'sidepanel.html',
        });
        toggleBtn.textContent = 'Close Side Panel';
      }

      // Close popup after action
      window.close();
    });
  } catch (err) {
    console.error('Failed to get polyfill status:', err);
    polyfillStatus.textContent = 'Error';
  }

  // Update keyboard shortcut hint for current platform
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const hintEl = document.getElementById('shortcut-hint');
  if (hintEl && isMac) {
    hintEl.innerHTML = 'or press <kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>S</kbd>';
  }

  // Show content, hide loading
  loading.style.display = 'none';
  content.style.display = 'block';
}

init();
