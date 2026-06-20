const { app, BrowserWindow, ipcMain, clipboard, screen } = require('electron')
const path = require('path')
const { registerHotkeys, unregisterHotkeys } = require('./hotkey')
const { createTray, destroyTray } = require('./tray')
const { injectText } = require('./injector')
const store = require('./store')

const isDev = !!process.env.ELECTRON_START_URL

let widgetWindow = null

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  widgetWindow = new BrowserWindow({
    width: 380,
    height: 320,
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

  widgetWindow.setPosition(width - 400, height - 340)

  if (isDev) {
    widgetWindow.loadURL(process.env.ELECTRON_START_URL)
  } else {
    widgetWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  widgetWindow.on('blur', () => {
    if (!isDev) {
      widgetWindow.hide()
    }
  })
}

ipcMain.handle('clipboard:read', () => clipboard.readText())
ipcMain.handle('clipboard:write', (_, text) => clipboard.writeText(text))

ipcMain.handle('inject:text', async (_, text) => {
  widgetWindow.hide()
  await new Promise((r) => setTimeout(r, 200))
  return await injectText(text)
})

ipcMain.handle('window:hide', () => widgetWindow.hide())
ipcMain.handle('window:show', () => {
  widgetWindow.show()
  widgetWindow.focus()
})

ipcMain.handle('store:getApiKey', () => store.get('groq_api_key', ''))
ipcMain.handle('store:setApiKey', (_, key) => store.set('groq_api_key', key))

ipcMain.handle('resize:window', (_, height) => {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  widgetWindow.setContentSize(380, Math.ceil(height))
  // Re-anchor to bottom-right after resize
  const [, h] = widgetWindow.getContentSize()
  const wa = screen.getPrimaryDisplay().workAreaSize
  widgetWindow.setPosition(wa.width - 400, wa.height - h - 20)
})

app.whenReady().then(() => {
  createWidgetWindow()
  registerHotkeys(widgetWindow)
  createTray(widgetWindow)
})

app.on('will-quit', () => {
  unregisterHotkeys()
  destroyTray()
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (widgetWindow) {
      widgetWindow.show()
      widgetWindow.focus()
    }
  })
}

app.on('window-all-closed', (e) => {
  e.preventDefault()
})
