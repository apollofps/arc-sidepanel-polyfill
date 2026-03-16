# Next Steps — Working Task List

Track progress by checking off items. Claude Code can reference this file to understand what's done and what's next.

## Phase 1: Get it building ✦ START HERE
- [ ] Run `npm install` and resolve any dependency issues
- [ ] Run `npm run dev` — fix any WXT build errors
- [ ] Verify the extension loads in Chrome/Arc via `chrome://extensions` → "Load unpacked"
- [ ] Confirm background service worker starts (check console for `[arc-sidepanel-polyfill]` logs)
- [ ] Confirm content script injects on a test page
- [ ] Confirm popup opens and shows polyfill status

## Phase 2: Core polyfill functionality
- [ ] Test `chrome.sidePanel.open()` shim — does it send message to content script?
- [ ] Test panel iframe injection — does Shadow DOM container appear?
- [ ] Test panel close — does the iframe get removed cleanly?
- [ ] Test keyboard shortcut (Cmd+Shift+S) — does it toggle the panel?
- [ ] Test resize handle — can the user drag to resize?
- [ ] Verify CSS isolation — does the panel's CSS leak into the host page? (should not)
- [ ] Test `setOptions({ tabId, path, enabled })` — does per-tab state work?
- [ ] Test `getOptions()` — does it return correct merged state (tab-specific + global)?
- [ ] Test `setPanelBehavior({ openPanelOnActionClick: true })`
- [ ] Verify state persistence — does the panel state survive service worker restart?

## Phase 3: Real-world extension testing
- [ ] Install Claude in Chrome extension alongside the polyfill in Arc
- [ ] Debug: does Claude's `sidepanel.html` load in the iframe?
- [ ] Debug: does the Claude extension have access to chrome.* APIs from within the iframe?
- [ ] Handle cross-extension iframe security: `chrome-extension://` URL loading permissions
- [ ] Test with at least one other sidePanel extension (e.g., Grammarly, a dictionary extension)
- [ ] Document any edge cases or workarounds needed per extension

## Phase 4: UI polish
- [ ] Smooth slide-in/slide-out animation (verify 200ms ease-out)
- [ ] Panel should push page content (margin-right) without layout jank
- [ ] Dark mode: verify panel matches system `prefers-color-scheme`
- [ ] Save user's preferred panel width to `chrome.storage.local`
- [ ] Restore saved panel width on next open
- [ ] Add subtle box-shadow on the panel's left edge
- [ ] Panel header: show the target extension's name/icon if detectable
- [ ] Handle edge case: panel on very narrow viewports (<768px)
- [ ] Handle edge case: multiple panels requested (queue or replace?)

## Phase 5: Robustness
- [ ] Handle navigation: panel should persist across same-origin navigations
- [ ] Handle tab switching: if panel is open, re-show when returning to tab
- [ ] Handle extension reload: gracefully recover if polyfill extension is reloaded
- [ ] Error boundaries: if iframe fails to load, show a helpful error state
- [ ] Content Security Policy: handle pages with strict CSP that blocks iframe injection
- [ ] Performance: measure panel injection time (target: <50ms)

## Phase 6: Testing & CI
- [ ] Get Vitest running with Chrome API mocks
- [ ] Unit tests for all polyfill API methods (open, close, setOptions, getOptions, etc.)
- [ ] Unit tests for state management (per-tab vs global, persistence)
- [ ] Unit tests for browser detection
- [ ] Integration test: full open → interact → close lifecycle
- [ ] Add GitHub Actions CI workflow for lint + typecheck + test
- [ ] Add a `vitest.config.ts` with path aliases matching WXT

## Phase 7: Ship it
- [ ] Design proper extension icon (replace placeholder purple squares)
- [ ] Record a demo GIF showing: install → open Claude in Arc → use it
- [ ] Write Chrome Web Store listing description
- [ ] Create Chrome Web Store screenshots (1280×800)
- [ ] Publish to Chrome Web Store
- [ ] Update README with Chrome Web Store link and installation badge
- [ ] Write LinkedIn post draft (see docs/linkedin-post.md)

## Phase 8: Stretch goals
- [ ] Firefox sidebar API compatibility (Firefox uses `browser.sidebarAction`)
- [ ] Auto-detect installed extensions that use sidePanel and list them in popup
- [ ] "Extension picker" in popup — let user choose which extension's panel to show
- [ ] Panel tab bar — if multiple extensions want panels, show tabs at the top
- [ ] Publish as npm package so other extension devs can bundle the polyfill
- [ ] Analytics: track anonymous usage stats (opt-in only) to show in README
