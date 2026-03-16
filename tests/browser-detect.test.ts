/**
 * Tests for browser detection utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('browser-detect', () => {
  beforeEach(() => {
    vi.resetModules();

    // Default: provide chrome without sidePanel (Arc-like)
    vi.stubGlobal('chrome', {
      sidePanel: undefined,
    });

    // Provide a minimal document/window for _isArc() heuristic
    vi.stubGlobal('document', {
      documentElement: {},
    });
    vi.stubGlobal('window', {
      getComputedStyle: vi.fn().mockReturnValue({}),
    });
  });

  function setUserAgent(ua: string) {
    vi.stubGlobal('navigator', { userAgent: ua });
  }

  it('should detect Chrome with native sidePanel as chrome', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    vi.stubGlobal('chrome', {
      sidePanel: { open: vi.fn() },
    });

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.name).toBe('chrome');
    expect(info.hasSidePanelAPI).toBe(true);
    expect(info.version).toBe('120.0.0.0');
  });

  it('should detect Arc-like browser (Chromium without sidePanel)', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.name).toBe('arc');
    expect(info.hasSidePanelAPI).toBe(false);
  });

  it('should detect Edge', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
    vi.stubGlobal('chrome', { sidePanel: { open: vi.fn() } });

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    // Edge check comes after Arc check. Since sidePanel exists, _isArc returns false.
    expect(info.name).toBe('edge');
  });

  it('should detect Brave', async () => {
    setUserAgent('Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Brave');
    vi.stubGlobal('chrome', { sidePanel: { open: vi.fn() } });

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.name).toBe('brave');
  });

  it('should detect Opera', async () => {
    setUserAgent('Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0');
    vi.stubGlobal('chrome', { sidePanel: { open: vi.fn() } });

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.name).toBe('opera');
  });

  it('should detect Vivaldi', async () => {
    setUserAgent('Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Vivaldi/6.5.3206');
    vi.stubGlobal('chrome', { sidePanel: { open: vi.fn() } });

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.name).toBe('vivaldi');
  });

  it('should return unknown for non-Chromium browsers', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0');

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.name).toBe('unknown');
    expect(info.version).toBe('');
  });

  it('should extract Chrome version correctly', async () => {
    setUserAgent('Mozilla/5.0 AppleWebKit/537.36 Chrome/121.0.6167.85 Safari/537.36');
    vi.stubGlobal('chrome', { sidePanel: { open: vi.fn() } });

    const { detectBrowser } = await import('../src/lib/utils/browser-detect');
    const info = detectBrowser();

    expect(info.version).toBe('121.0.6167.85');
  });
});
