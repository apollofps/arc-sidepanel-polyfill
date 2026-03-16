# Arc SidePanel Polyfill

## Project overview
A Chrome extension that polyfills the `chrome.sidePanel` API for browsers that don't support it (primarily Arc Browser). This allows extensions like Claude in Chrome, Grammarly, and others that depend on the Side Panel API to work seamlessly in Arc — with zero modifications to the target extension.

## Architecture

### How it works
1. **API Interception**: Background service worker monkey-patches `chrome.sidePanel` with a full shim implementation
2. **Message Routing**: When any extension calls `chrome.sidePanel.open()`, the shim sends a message to our content script
3. **Panel Injection**: Content script injects a Shadow DOM container with an iframe into the current page
4. **Iframe Loading**: The iframe loads the target extension's `sidepanel.html` via its `chrome-extension://` URL
5. **State Management**: Per-tab and global panel state is tracked in `chrome.storage.session`

### Key API surface to polyfill
```
chrome.sidePanel.open({ tabId, windowId })
chrome.sidePanel.close({ tabId, windowId })
chrome.sidePanel.setOptions({ tabId, path, enabled })
chrome.sidePanel.getOptions({ tabId }) → Promise<Options>
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick })
chrome.sidePanel.getPanelBehavior() → Promise<Behavior>
```

### Directory structure
```
src/
  entrypoints/
    background.ts     # Service worker: polyfill install, message routing (defineBackground)
    content.ts        # Content script: Shadow DOM panel renderer (defineContentScript)
    popup/
      index.html      # Popup UI entrypoint
      main.ts         # Popup logic: shows status, toggle button
  lib/
    polyfill/         # The chrome.sidePanel polyfill implementation (pure API logic)
    types/            # TypeScript type definitions for the sidePanel API
    utils/            # Shared utilities (browser detection, messaging helpers)
  public/
    icon/             # Extension icons (16, 48, 128)
tests/                # Vitest unit and integration tests
docs/                 # Documentation, demo GIFs, compatibility matrix
```

### WXT conventions (IMPORTANT)
- Files in `src/entrypoints/` are auto-discovered by WXT — do NOT put helper files there
- Use `defineBackground()` and `defineContentScript()` wrappers from WXT
- Shared code goes in `src/lib/` — WXT auto-imports from here with `@/lib/` alias
- WXT generates manifest.json automatically from entrypoints + wxt.config.ts
- Do NOT create a manual manifest.json — WXT owns it

## Tech stack
- **Language**: TypeScript (strict mode)
- **Build**: WXT (Web Extensions Toolkit) — handles Manifest V3, HMR, cross-browser builds
- **Testing**: Vitest + @webext-test/fake-browser for mocking Chrome APIs
- **Linting**: ESLint + Prettier
- **Manifest**: V3

## Code conventions
- Use ES modules (`import`/`export`) everywhere
- Prefer `async`/`await` over `.then()` chains
- All Chrome API calls should be wrapped in try/catch
- Use descriptive variable names — no abbreviations except well-known ones (e.g., `el`, `fn`, `msg`)
- Keep functions small (<40 lines). Extract helpers early.
- All public functions must have JSDoc comments
- Use `const` by default, `let` only when reassignment is needed, never `var`
- Prefix private/internal helpers with underscore: `_calculatePanelWidth()`

## Browser detection
The polyfill should only activate when `chrome.sidePanel` is undefined or non-functional. Detection logic:
```ts
const needsPolyfill = typeof chrome.sidePanel === 'undefined'
  || typeof chrome.sidePanel.open !== 'function';
```

## Shadow DOM panel design
- Panel container uses Shadow DOM for full CSS isolation from the host page
- Default width: 400px, min: 320px, max: 50% of viewport
- Resize handle on the left edge (panel docks to right side)
- Smooth slide-in/slide-out animation (200ms ease-out)
- Panel should persist across same-origin navigations
- Dark/light mode should follow `prefers-color-scheme`
- Panel z-index: 2147483647 (max, to stay above all page content)

## Testing strategy
- Unit tests for polyfill API logic (does `setOptions` correctly update state?)
- Unit tests for state management (per-tab vs global options)
- Integration tests using fake browser APIs
- Manual testing checklist: Claude extension, Grammarly, at least one other sidePanel extension

## Important constraints
- The polyfill must NOT break extensions on browsers that DO have native sidePanel support
- Extensions should not need ANY modification to work with the polyfill
- The polyfill extension itself requires minimal permissions: only `sidePanel`, `tabs`, `storage`, and `activeTab`
- Performance: panel injection should complete in <50ms

## Development workflow
```bash
# Install dependencies
npm install

# Development with HMR
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Milestones
1. **Core shim**: `chrome.sidePanel.open()` → injects iframe panel in Arc ✦ CURRENT
2. **Full API**: `setOptions`, `getOptions`, `setPanelBehavior`, per-tab state
3. **UI polish**: Resize, animation, keyboard shortcut (Cmd+Shift+S), dark mode
4. **Real-world compat**: Test with Claude, Grammarly, other popular extensions
5. **Ship it**: Chrome Web Store listing, README with demo GIF, LinkedIn post
