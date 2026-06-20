const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')

let tray = null

function createTray(widgetWindow) {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) icon = nativeImage.createEmpty()
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Suniye Ji')

  function buildMenu() {
    return Menu.buildFromTemplate([
      { label: 'Suniye Ji', enabled: false },
      { type: 'separator' },
      {
        label: 'Toggle Widget',
        accelerator: 'Alt+Space',
        click: () => {
          if (widgetWindow.isVisible()) {
            widgetWindow.hide()
          } else {
            widgetWindow.show()
            widgetWindow.focus()
            widgetWindow.webContents.send('hotkey:triggered')
          }
        },
      },
      {
        label: 'Settings',
        click: () => {
          widgetWindow.show()
          widgetWindow.focus()
          widgetWindow.webContents.send('open:settings')
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ])
  }

  tray.setContextMenu(buildMenu())

  tray.on('click', () => {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide()
    } else {
      widgetWindow.show()
      widgetWindow.focus()
      widgetWindow.webContents.send('hotkey:triggered')
    }
  })

  return tray
}

function destroyTray() {
  if (tray) { tray.destroy(); tray = null }
}

module.exports = { createTray, destroyTray }
