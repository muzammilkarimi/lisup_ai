const { globalShortcut } = require('electron')
const { captureForeground } = require('./windows-focus')

function registerHotkeys(widgetWindow) {
  globalShortcut.register('Alt+Space', () => {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide()
    } else {
      captureForeground()          // async — stores HWND of user's current app
      widgetWindow.showInactive()  // appear without stealing focus
      widgetWindow.webContents.send('hotkey:triggered')
    }
  })
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll()
}

module.exports = { registerHotkeys, unregisterHotkeys }
