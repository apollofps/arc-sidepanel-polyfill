# LinkedIn Post Draft

## Option A: Technical storytelling (recommended)

---

Arc Browser doesn't support Chrome's Side Panel API.

So extensions like Claude, Grammarly, and dozens of others that depend on it? They just... don't work.

Arc has said they won't add support anytime soon.

So I built the missing piece.

🧩 arc-sidepanel-polyfill — a Chrome extension that transparently shims the chrome.sidePanel API for browsers that don't support it.

How it works:
→ Detects when the sidePanel API is missing
→ Intercepts all API calls from other extensions
→ Injects a Shadow DOM iframe sidebar into the page
→ Target extensions need zero modifications

The technical challenges were fun:
• Monkey-patching a Chrome namespace that doesn't exist
• Shadow DOM isolation so the panel CSS never leaks
• Cross-extension iframe security with chrome-extension:// URLs
• State persistence across service worker restarts

Built with TypeScript, WXT, and Manifest V3. Zero dependencies.

Open source: [github link]

If you're an Arc user who misses their Chrome extensions — give it a try.

#webdev #chromeextensions #opensource #browserextension #typescript

---

## Option B: Problem-solution hook (shorter)

---

I use Arc Browser every day. But Chrome's Side Panel extensions don't work in it.

Claude in Chrome? Broken.
Grammarly's side panel? Broken.

Arc won't add support. So I spent a few weeks building a polyfill.

Now those extensions work in Arc — without ANY changes to the extensions themselves.

The trick: intercepting chrome.sidePanel API calls and rendering the panel as an injected Shadow DOM iframe.

Open source, zero dependencies, TypeScript.

[github link]

---

## Tips for maximum engagement
1. Post on Tuesday or Wednesday morning (9-11am your timezone)
2. Add the demo GIF as a video/image — visual posts get 3x more engagement
3. Tag @anthropic and @ArcBrowser in a comment (not the post itself)
4. First comment: "Link to the repo: [url]" — LinkedIn suppresses posts with links in the body
5. Reply to every comment in the first 2 hours
