/**
 * Content script entrypoint: Panel renderer.
 *
 * Injects a Shadow DOM side panel with an iframe into the current page
 * when triggered by the background service worker.
 */

import type { PolyfillMessage } from '@/lib/types/sidepanel';

const PANEL_ID = 'arc-sidepanel-polyfill-root';
const PANEL_WIDTH_DEFAULT = 400;
const PANEL_WIDTH_MIN = 320;
const PANEL_WIDTH_MAX_RATIO = 0.5;
const ANIMATION_MS = 200;
const Z_INDEX = 2147483647;

let panelRoot: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let iframe: HTMLIFrameElement | null = null;
let currentWidth = PANEL_WIDTH_DEFAULT;
let isResizing = false;
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // -----------------------------------------------------------------------
    // Message listener
    // -----------------------------------------------------------------------

    chrome.runtime.onMessage.addListener(
      (message: PolyfillMessage, _sender, sendResponse) => {
        switch (message.type) {
          case 'OPEN_PANEL':
            openPanel(message.path, message.extensionId);
            sendResponse({ success: true });
            break;

          case 'CLOSE_PANEL':
            closePanel();
            sendResponse({ success: true });
            break;

          case 'GET_PANEL_STATE':
            sendResponse({
              isOpen: panelRoot !== null,
              width: currentWidth,
            });
            break;

          default:
            break;
        }
        return true;
      }
    );

    // -----------------------------------------------------------------------
    // Keyboard shortcut: Cmd/Ctrl + Shift + S to toggle
    // -----------------------------------------------------------------------

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (panelRoot) {
          closePanel();
        } else {
          chrome.runtime.sendMessage({ type: 'TOGGLE_PANEL' });
        }
      }
    });
  },
});

// ---------------------------------------------------------------------------
// Panel injection
// ---------------------------------------------------------------------------

async function openPanel(path: string, extensionId?: string): Promise<void> {
  // Cancel any in-progress close animation
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }

  // Restore saved width preference
  try {
    const stored = await chrome.storage.local.get('_polyfill_panel_width');
    if (stored._polyfill_panel_width) {
      currentWidth = stored._polyfill_panel_width;
    }
  } catch {
    // Ignore storage errors, use default width
  }

  if (panelRoot) {
    updateIframeSrc(path, extensionId);
    panelRoot.style.transform = 'translateX(0)';
    return;
  }

  // Root container
  panelRoot = document.createElement('div');
  panelRoot.id = PANEL_ID;
  Object.assign(panelRoot.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: `${currentWidth}px`,
    height: '100vh',
    zIndex: String(Z_INDEX),
    transform: 'translateX(100%)',
    transition: `transform ${ANIMATION_MS}ms ease-out`,
    pointerEvents: 'auto',
  });

  // Shadow DOM for CSS isolation
  shadowRoot = panelRoot.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getPanelStyles();
  shadowRoot.appendChild(style);

  // Panel container
  const container = document.createElement('div');
  container.className = 'panel-container';
  shadowRoot.appendChild(container);

  // Header bar with drag + close
  const header = document.createElement('div');
  header.className = 'panel-header';
  container.appendChild(header);

  const statusDot = document.createElement('span');
  statusDot.className = 'status-dot';
  header.appendChild(statusDot);

  const title = document.createElement('span');
  title.className = 'panel-title';
  title.textContent = 'Side Panel (Polyfill)';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.title = 'Close (Cmd+Shift+S)';
  closeBtn.addEventListener('click', closePanel);
  header.appendChild(closeBtn);

  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.addEventListener('mousedown', startResize);
  container.appendChild(resizeHandle);

  // Iframe
  iframe = document.createElement('iframe');
  iframe.className = 'panel-iframe';
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
  updateIframeSrc(path, extensionId);
  container.appendChild(iframe);

  // Inject into page
  document.documentElement.appendChild(panelRoot);

  // Trigger slide-in animation (force reflow first)
  void panelRoot.offsetHeight;
  panelRoot.style.transform = 'translateX(0)';

  // Push page content
  document.body.style.transition = `margin-right ${ANIMATION_MS}ms ease-out`;
  document.body.style.marginRight = `${currentWidth}px`;
}

function closePanel(): void {
  if (!panelRoot) return;

  const closingRoot = panelRoot;
  panelRoot = null;
  shadowRoot = null;
  iframe = null;

  closingRoot.style.transform = 'translateX(100%)';
  document.body.style.marginRight = '0';

  closeTimeout = setTimeout(() => {
    closingRoot.remove();
    closeTimeout = null;
  }, ANIMATION_MS);

  chrome.runtime.sendMessage({ type: 'PANEL_CLOSED' });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateIframeSrc(path: string, extensionId?: string): void {
  if (!iframe) return;
  iframe.src = extensionId
    ? `chrome-extension://${extensionId}/${path}`
    : chrome.runtime.getURL(path);
}

function startResize(e: MouseEvent): void {
  e.preventDefault();
  isResizing = true;

  const onMove = (e: MouseEvent) => {
    if (!isResizing || !panelRoot) return;
    const max = window.innerWidth * PANEL_WIDTH_MAX_RATIO;
    const w = Math.max(PANEL_WIDTH_MIN, Math.min(max, window.innerWidth - e.clientX));
    currentWidth = w;
    panelRoot.style.width = `${w}px`;
    document.body.style.marginRight = `${w}px`;
  };

  const onUp = () => {
    isResizing = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    // Persist width preference
    chrome.storage.local.set({ _polyfill_panel_width: currentWidth });
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function getPanelStyles(): string {
  return `
    :host { all: initial; }

    .panel-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #ffffff;
      border-left: 1px solid #e2e2e2;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
    }

    @media (prefers-color-scheme: dark) {
      .panel-container {
        background: #1c1c1e;
        border-left-color: #333;
        box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
      }
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid #e2e2e2;
      background: #f8f8f8;
      flex-shrink: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    @media (prefers-color-scheme: dark) {
      .panel-header {
        background: #2c2c2e;
        border-bottom-color: #444;
      }
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34c759;
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 12px;
      font-weight: 500;
      color: #666;
      flex: 1;
    }

    @media (prefers-color-scheme: dark) {
      .panel-title { color: #999; }
    }

    .close-btn {
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .close-btn:hover { background: rgba(0,0,0,0.08); color: #333; }
    @media (prefers-color-scheme: dark) {
      .close-btn:hover { background: rgba(255,255,255,0.1); color: #eee; }
    }

    .resize-handle {
      position: absolute;
      left: -4px;
      top: 0;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
    }
    .resize-handle:hover { background: rgba(99, 102, 241, 0.15); }
    .resize-handle:active { background: rgba(99, 102, 241, 0.3); }

    .panel-iframe {
      flex: 1;
      width: 100%;
      border: none;
      background: transparent;
    }
  `;
}
