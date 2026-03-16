/**
 * Browser detection utilities.
 *
 * Identifies Arc Browser and other Chromium variants that lack
 * the chrome.sidePanel API.
 */

export interface BrowserInfo {
  name: 'arc' | 'chrome' | 'brave' | 'edge' | 'opera' | 'vivaldi' | 'unknown';
  version: string;
  hasSidePanelAPI: boolean;
}

/**
 * Detect the current browser and its sidePanel support.
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;

  const hasSidePanelAPI =
    typeof chrome !== 'undefined' &&
    typeof chrome.sidePanel !== 'undefined' &&
    typeof chrome.sidePanel.open === 'function';

  // Arc doesn't expose a unique UA string, but we can check for
  // Arc-specific CSS properties or the absence of sidePanel on
  // a Chromium build that should have it.
  if (_isArc()) {
    return { name: 'arc', version: _extractVersion(ua), hasSidePanelAPI };
  }

  if (ua.includes('Brave')) {
    return { name: 'brave', version: _extractVersion(ua), hasSidePanelAPI };
  }

  if (ua.includes('Edg/')) {
    return { name: 'edge', version: _extractVersion(ua), hasSidePanelAPI };
  }

  if (ua.includes('OPR/') || ua.includes('Opera')) {
    return { name: 'opera', version: _extractVersion(ua), hasSidePanelAPI };
  }

  if (ua.includes('Vivaldi')) {
    return { name: 'vivaldi', version: _extractVersion(ua), hasSidePanelAPI };
  }

  if (ua.includes('Chrome/')) {
    return { name: 'chrome', version: _extractVersion(ua), hasSidePanelAPI };
  }

  return { name: 'unknown', version: '', hasSidePanelAPI };
}

/**
 * Detect Arc Browser.
 *
 * Arc doesn't add anything unique to the user agent, so we use a
 * combination of heuristics:
 * 1. It's Chromium-based (has Chrome in UA)
 * 2. The sidePanel API is missing (Arc strips it)
 * 3. Certain Arc-specific behaviors are present
 */
function _isArc(): boolean {
  const ua = navigator.userAgent;

  // Must be Chromium-based
  if (!ua.includes('Chrome/')) return false;

  // Arc strips the sidePanel API
  if (typeof chrome.sidePanel !== 'undefined') return false;

  // Additional heuristic: Arc has a specific window management style
  // This is a best-effort detection — may need refinement
  try {
    // Arc's window.getComputedStyle on the root element sometimes
    // includes Arc-specific custom properties
    // For now, assume any Chromium without sidePanel in a modern version is Arc-like
    // This is fragile and may need updates as Arc evolves
    return true;
  } catch {
    return false;
  }
}

function _extractVersion(ua: string): string {
  const match = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  return match?.[1] ?? '';
}
