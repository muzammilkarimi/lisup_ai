const { globalShortcut } = require('electron')

function registerHotkeys(widgetWindow) {
  globalShortcut.register('Alt+Space', () => {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide()
    } else {
      widgetWindow.show()
      widgetWindow.focus()
      widgetWindow.webContents.send('hotkey:triggered')
    }
  })
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll()
}

module.exports = { registerHotkeys, unregisterHotkeys }
