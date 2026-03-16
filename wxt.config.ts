import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Arc SidePanel Polyfill',
    description:
      'Makes Chrome Side Panel extensions work in Arc Browser. Enables Claude, Grammarly, and more.',
    version: '0.1.0',
    permissions: ['tabs', 'storage', 'activeTab', 'scripting'],
    icons: {
      16: 'icon/16.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    commands: {
      'toggle-panel': {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Toggle the side panel',
      },
    },
    web_accessible_resources: [
      {
        resources: ['sidepanel.html'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
