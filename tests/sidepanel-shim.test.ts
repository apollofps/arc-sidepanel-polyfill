/**
 * Tests for the chrome.sidePanel polyfill shim.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

function createChromeMock(withSidePanel = false) {
  const mock: any = {
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1 }]),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    },
    storage: {
      session: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
    },
  };

  if (withSidePanel) {
    mock.sidePanel = {
      open: vi.fn(),
      close: vi.fn(),
      setOptions: vi.fn(),
      getOptions: vi.fn(),
      setPanelBehavior: vi.fn(),
      getPanelBehavior: vi.fn(),
    };
  }

  return mock;
}

describe('sidepanel-shim', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('chrome', createChromeMock());
  });

  describe('needsPolyfill()', () => {
    it('should return true when chrome.sidePanel is undefined', async () => {
      const { needsPolyfill } = await import('../src/lib/polyfill/sidepanel-shim');
      expect(needsPolyfill()).toBe(true);
    });

    it('should return false when chrome.sidePanel.open exists', async () => {
      vi.stubGlobal('chrome', createChromeMock(true));
      const { needsPolyfill } = await import('../src/lib/polyfill/sidepanel-shim');
      expect(needsPolyfill()).toBe(false);
    });

    it('should return true when chrome.sidePanel exists but open is missing', async () => {
      const mock = createChromeMock();
      mock.sidePanel = { setOptions: vi.fn() }; // no open()
      vi.stubGlobal('chrome', mock);
      const { needsPolyfill } = await import('../src/lib/polyfill/sidepanel-shim');
      expect(needsPolyfill()).toBe(true);
    });
  });

  describe('setOptions() / getOptions()', () => {
    it('should store and retrieve global options', async () => {
      const { setOptions, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');

      await setOptions({ path: 'custom-panel.html', enabled: true });
      const result = await getOptions();

      expect(result.path).toBe('custom-panel.html');
      expect(result.enabled).toBe(true);
    });

    it('should store and retrieve tab-specific options', async () => {
      const { setOptions, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');

      await setOptions({ tabId: 42, path: 'tab-panel.html', enabled: false });
      const result = await getOptions({ tabId: 42 });

      expect(result.tabId).toBe(42);
      expect(result.path).toBe('tab-panel.html');
      expect(result.enabled).toBe(false);
    });

    it('should fall back to global options when tab has no specific options', async () => {
      const { setOptions, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');

      await setOptions({ path: 'global.html', enabled: true });
      const result = await getOptions({ tabId: 99 });

      expect(result.path).toBe('global.html');
      expect(result.enabled).toBe(true);
    });

    it('should merge tab options with global defaults', async () => {
      const { setOptions, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');

      await setOptions({ path: 'global.html', enabled: true });
      await setOptions({ tabId: 5, path: 'tab5.html' });
      const result = await getOptions({ tabId: 5 });

      expect(result.path).toBe('tab5.html');
      expect(result.enabled).toBe(true); // inherited from global
    });

    it('should persist state to chrome.storage.session on setOptions', async () => {
      const { setOptions } = await import('../src/lib/polyfill/sidepanel-shim');
      await setOptions({ path: 'test.html' });
      expect(chrome.storage.session.set).toHaveBeenCalled();
    });
  });

  describe('open()', () => {
    it('should send OPEN_PANEL message to the correct tab', async () => {
      const { open } = await import('../src/lib/polyfill/sidepanel-shim');

      await open({ tabId: 10 });

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(10, expect.objectContaining({
        type: 'OPEN_PANEL',
        tabId: 10,
      }));
    });

    it('should use active tab when no tabId provided', async () => {
      const { open } = await import('../src/lib/polyfill/sidepanel-shim');

      await open({});

      expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'OPEN_PANEL',
        tabId: 1,
      }));
    });

    it('should throw when panel is disabled for the tab', async () => {
      const { open, setOptions } = await import('../src/lib/polyfill/sidepanel-shim');
      await setOptions({ tabId: 10, enabled: false });

      await expect(open({ tabId: 10 })).rejects.toThrow('disabled');
    });

    it('should throw when no active tab can be determined', async () => {
      (chrome.tabs.query as any).mockResolvedValue([]);
      const { open } = await import('../src/lib/polyfill/sidepanel-shim');

      await expect(open({})).rejects.toThrow('Could not determine tab');
    });
  });

  describe('close()', () => {
    it('should send CLOSE_PANEL message to the correct tab', async () => {
      const { close } = await import('../src/lib/polyfill/sidepanel-shim');

      await close({ tabId: 7 });

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, expect.objectContaining({
        type: 'CLOSE_PANEL',
        tabId: 7,
      }));
    });

    it('should use active tab when no tabId provided', async () => {
      const { close } = await import('../src/lib/polyfill/sidepanel-shim');

      await close({});

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'CLOSE_PANEL',
      }));
    });
  });

  describe('setPanelBehavior() / getPanelBehavior()', () => {
    it('should store and retrieve panel behavior', async () => {
      const { setPanelBehavior, getPanelBehavior } = await import('../src/lib/polyfill/sidepanel-shim');

      await setPanelBehavior({ openPanelOnActionClick: true });
      const result = await getPanelBehavior();

      expect(result.openPanelOnActionClick).toBe(true);
    });

    it('should default openPanelOnActionClick to false', async () => {
      const { getPanelBehavior } = await import('../src/lib/polyfill/sidepanel-shim');
      const result = await getPanelBehavior();
      expect(result.openPanelOnActionClick).toBe(false);
    });

    it('should persist behavior to storage', async () => {
      const { setPanelBehavior } = await import('../src/lib/polyfill/sidepanel-shim');
      await setPanelBehavior({ openPanelOnActionClick: true });
      expect(chrome.storage.session.set).toHaveBeenCalled();
    });
  });

  describe('install()', () => {
    it('should create chrome.sidePanel namespace when missing', async () => {
      const { install } = await import('../src/lib/polyfill/sidepanel-shim');

      const installed = install();

      expect(installed).toBe(true);
      expect(typeof chrome.sidePanel).toBe('object');
      expect(typeof chrome.sidePanel.open).toBe('function');
      expect(typeof chrome.sidePanel.close).toBe('function');
      expect(typeof chrome.sidePanel.setOptions).toBe('function');
      expect(typeof chrome.sidePanel.getOptions).toBe('function');
      expect(typeof chrome.sidePanel.setPanelBehavior).toBe('function');
      expect(typeof chrome.sidePanel.getPanelBehavior).toBe('function');
    });

    it('should return false and skip when native API exists', async () => {
      vi.stubGlobal('chrome', createChromeMock(true));
      const { install } = await import('../src/lib/polyfill/sidepanel-shim');

      const installed = install();

      expect(installed).toBe(false);
    });
  });

  describe('_restoreState()', () => {
    it('should restore global options from storage', async () => {
      (chrome.storage.session.get as any).mockResolvedValue({
        _polyfill_global: { path: 'restored.html', enabled: true },
        _polyfill_tabs: {},
        _polyfill_behavior: { openPanelOnActionClick: false },
      });

      const { _restoreState, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');
      await _restoreState();

      const result = await getOptions();
      expect(result.path).toBe('restored.html');
    });

    it('should handle empty storage gracefully', async () => {
      (chrome.storage.session.get as any).mockResolvedValue({});

      const { _restoreState, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');
      await _restoreState();

      const result = await getOptions();
      expect(result.path).toBe('sidepanel.html'); // default
    });

    it('should handle storage errors gracefully', async () => {
      (chrome.storage.session.get as any).mockRejectedValue(new Error('Storage unavailable'));

      const { _restoreState, getOptions } = await import('../src/lib/polyfill/sidepanel-shim');
      await _restoreState(); // should not throw

      const result = await getOptions();
      expect(result.path).toBe('sidepanel.html'); // default
    });
  });
});
