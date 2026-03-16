I want to test compatibility with a new extension. Help me by:

1. Ask which extension I want to test
2. Search the Chrome Web Store or the extension's docs to find if it uses `chrome.sidePanel` and what `sidepanel.html` path it expects
3. Identify any additional API methods or behaviors the extension might need (e.g., `setPanelBehavior`, per-tab options, event listeners)
4. Check if our polyfill implementation covers those methods
5. If anything is missing, implement it
6. Add the extension to the compatibility table in README.md
