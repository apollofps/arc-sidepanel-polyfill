# 🧩 Arc SidePanel Polyfill

> **Make Chrome Side Panel extensions work in Arc Browser.**

Arc Browser doesn't support Chrome's `chrome.sidePanel` API — so extensions like **Claude in Chrome**, **Grammarly**, and dozens of others that rely on it simply don't work. This polyfill fixes that.

**Zero changes needed to target extensions.** They call the standard Chrome API, this polyfill intercepts the calls, and everything just works.

![Demo GIF placeholder](docs/demo.gif)

## The Problem

Chrome introduced the [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) in 2023, and it quickly became the standard way for extensions to show persistent UI alongside web pages. But Arc Browser — despite being Chromium-based — **doesn't implement this API** and has [stated they won't add support in the near future](https://community.dust.tt/x/03help/kjx3t5kgu2sj/).

This means thousands of Arc users can't use popular extensions that depend on the Side Panel.

## The Solution

This extension provides a **transparent polyfill** that:

1. **Detects** when `chrome.sidePanel` is missing
2. **Intercepts** all sidePanel API calls from other extensions
3. **Injects** a Shadow DOM iframe sidebar into the current page
4. **Renders** the extension's panel content seamlessly

From the target extension's perspective, the Chrome Side Panel API works exactly as expected. From the user's perspective, they get a resizable, persistent sidebar that looks and feels native.

## Features

- 🔌 **Drop-in compatibility** — No modifications to target extensions
- 🎨 **Shadow DOM isolation** — Panel CSS never leaks into the page
- ↔️ **Resizable** — Drag the edge to adjust panel width
- 🌙 **Dark mode** — Follows system `prefers-color-scheme`
- ⌨️ **Keyboard shortcut** — `Cmd+Shift+S` to toggle
- 📌 **Persistent** — Panel stays open across same-origin navigations
- 🪶 **Zero dependencies** — Pure TypeScript, no runtime libraries
- 🔒 **Minimal permissions** — Only `tabs`, `storage`, `activeTab`

## Tested Extensions

| Extension | Status | Notes |
|-----------|--------|-------|
| Claude in Chrome | ✅ Works | Full browsing agent functionality |
| Grammarly | ✅ Works | Writing suggestions panel |
| ... | 🧪 Testing | PRs welcome! |

## Installation

### From Chrome Web Store
*Coming soon*

### From Source
```bash
git clone https://github.com/YOUR_USERNAME/arc-sidepanel-polyfill.git
cd arc-sidepanel-polyfill
npm install
npm run build
```

1. Open `arc://extensions` (or `chrome://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` directory

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  Target Extension (e.g., Claude in Chrome)           │
│  calls chrome.sidePanel.open()                       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Polyfill Shim (background service worker)           │
│  Intercepts the call, resolves tab + path            │
└──────────────────────┬──────────────────────────────┘
                       │ chrome.tabs.sendMessage()
                       ▼
┌─────────────────────────────────────────────────────┐
│  Content Script (panel renderer)                     │
│  Injects Shadow DOM container + iframe               │
│  Loads chrome-extension://[id]/sidepanel.html        │
└─────────────────────────────────────────────────────┘
```

## Development

```bash
npm run dev      # Start dev server with HMR
npm test         # Run tests
npm run build    # Production build
npm run lint     # Lint check
```

### Project Structure
```
src/
├── background/       # Service worker: API shim, message routing
├── content/          # Content script: Shadow DOM panel renderer
├── polyfill/         # chrome.sidePanel polyfill implementation
├── panel/            # Fallback panel UI
├── types/            # TypeScript type definitions
└── utils/            # Browser detection, messaging helpers
```

## Contributing

PRs welcome! If you've tested with an extension not on the compatibility list, please open an issue or PR to add it.

## Why This Exists

I use Arc as my daily browser and got frustrated that Claude's Chrome extension — which I rely on for work — simply didn't work. Rather than switching browsers, I built the missing piece.

If this helped you, consider giving it a ⭐ — it helps other Arc users find it.

## License

MIT
