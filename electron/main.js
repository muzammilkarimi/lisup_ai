const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron')
const path = require('path')
const { registerHotkeys, unregisterHotkeys } = require('./hotkey')
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
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  widgetWindow = new BrowserWindow({
    width: 400,
    height: 460,
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

  widgetWindow.setPosition(width - 420, height - 480)

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
  widgetWindow.hide()
  await new Promise(r => setTimeout(r, 200))
  return await injectText(text)
})

// ── Window ───────────────────────────────────────────────────────────────────
ipcMain.handle('window:hide', () => widgetWindow.hide())
ipcMain.handle('window:show', () => { widgetWindow.show(); widgetWindow.focus() })

ipcMain.handle('resize:window', (_, height) => {
  widgetWindow.setContentSize(400, Math.ceil(height))
  const wa = screen.getPrimaryDisplay().workAreaSize
  widgetWindow.setPosition(wa.width - 420, wa.height - Math.ceil(height) - 20)
})

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

// ── Store — Dictionary ───────────────────────────────────────────────────────
ipcMain.handle('store:getDictionary',  ()    => store.get('dictionary', []))
ipcMain.handle('store:saveDictionary', (_, d) => store.set('dictionary', d))

// ── Store — Snippets ─────────────────────────────────────────────────────────
ipcMain.handle('store:getSnippets',  ()    => store.get('snippets', []))
ipcMain.handle('store:saveSnippets', (_, s) => store.set('snippets', s))

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
