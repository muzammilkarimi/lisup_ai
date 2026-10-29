// First-run setup wizard: its own centered window (not part of the floating
// bar), loading the same UI bundle with the #onboarding route.
const { BrowserWindow } = require('electron')
const path = require('path')

let win = null

function createOnboardingWindow({ isDev, devUrl }) {
  if (win && !win.isDestroyed()) { win.show(); win.focus(); return win }

  win = new BrowserWindow({
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    width: 960,
    height: 680,
    center: true,
    frame: false,
    transparent: true,   // the UI draws its own rounded card + shadow
    hasShadow: false,
    resizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) win.loadURL(`${devUrl}#onboarding`)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: 'onboarding' })

  win.once('ready-to-show', () => { win.show(); win.focus() })
  win.on('closed', () => { win = null })
  return win
}

function closeOnboardingWindow() {
  if (win && !win.isDestroyed()) win.close()
}

module.exports = { createOnboardingWindow, closeOnboardingWindow }
