const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron')
const path = require('path')
const { registerHotkeys, unregisterHotkeys, cancelQuick } = require('./hotkey')
const { restoreForeground } = require('./windows-focus')
const { createTray, destroyTray } = require('./tray')
const { injectText } = require('./injector')
const store = require('./store')

const isDev = !!process.env.ELECTRON_START_URL

let widgetWindow = null

// Single instance lock must be acquired before app.whenReady
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (widgetWindow) { widgetWindow.show(); widgetWindow.focus() }
  })
}

function createWidgetWindow() {
  const wa = screen.getPrimaryDisplay().workArea
  // Fixed height — widget content is bottom-anchored inside via CSS flex
  // Transparent empty space above is click-through (transparent: true)
  const FIXED_H = 620

  widgetWindow = new BrowserWindow({
    width: 400,
    height: FIXED_H,
    x: wa.x + wa.width - 420,
    y: wa.y + wa.height - FIXED_H - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    widgetWindow.loadURL(process.env.ELECTRON_START_URL)
  } else {
    widgetWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  widgetWindow.on('blur', () => {
    if (!isDev) widgetWindow.hide()
  })

}

// ── Clipboard ────────────────────────────────────────────────────────────────
ipcMain.handle('clipboard:read',  ()         => clipboard.readText())
ipcMain.handle('clipboard:write', (_, text)  => clipboard.writeText(text))

// ── Injection ────────────────────────────────────────────────────────────────
ipcMain.handle('inject:text', async (_, text) => {
  restoreForeground()
  widgetWindow.hide()
  await new Promise(r => setTimeout(r, 350))
  return await injectText(text)
})

// Quick inject — restores focus + pastes WITHOUT hiding the widget
// (renderer controls when to hide so it can show the "Injected" confirmation)
ipcMain.handle('quick:inject', async (_, text) => {
  restoreForeground()
  await new Promise(r => setTimeout(r, 200))
  return await injectText(text)
})

// ── Window ───────────────────────────────────────────────────────────────────
ipcMain.handle('window:hide', () => widgetWindow.hide())
ipcMain.handle('window:show', () => { widgetWindow.show(); widgetWindow.focus() })
ipcMain.handle('quick:cancel', () => { cancelQuick(); widgetWindow.hide() })

// resize:window is a no-op — window is fixed size, CSS handles layout
ipcMain.handle('resize:window', () => {})

// ── Store — API key ──────────────────────────────────────────────────────────
ipcMain.handle('store:getApiKey', ()        => store.get('groq_api_key', ''))
ipcMain.handle('store:setApiKey', (_, key)  => store.set('groq_api_key', key))

// ── Store — Settings ─────────────────────────────────────────────────────────
ipcMain.handle('store:getSettings', () => store.get('settings'))

ipcMain.handle('store:saveSettings', (_, s) => {
  store.set('settings', s)
  // Sync auto-start with Windows login items
  if (typeof s.autoStart === 'boolean') {
    app.setLoginItemSettings({ openAtLogin: s.autoStart })
  }
})

// ── Store — Dictionary (stored as JSON string to avoid schema issues) ────────
ipcMain.handle('store:getDictionary', () => {
  try { return JSON.parse(store.get('dictionary_json', '[]')) } catch { return [] }
})
ipcMain.handle('store:saveDictionary', (_, d) => {
  store.set('dictionary_json', JSON.stringify(d))
})

// ── Store — Snippets (stored as JSON string to avoid schema issues) ──────────
ipcMain.handle('store:getSnippets', () => {
  try { return JSON.parse(store.get('snippets_json', '[]')) } catch { return [] }
})
ipcMain.handle('store:saveSnippets', (_, s) => {
  store.set('snippets_json', JSON.stringify(s))
})

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWidgetWindow()
  registerHotkeys(widgetWindow)
  createTray(widgetWindow)
})

app.on('will-quit', () => {
  unregisterHotkeys()
  destroyTray()
})

app.on('window-all-closed', e => e.preventDefault())
