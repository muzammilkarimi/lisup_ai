// The floating bar: one small transparent, always-on-top window pinned to the
// bottom-center of the screen, just above the taskbar. The renderer measures
// its own content and asks us to resize (idle pill -> recording bar -> full
// widget), and we keep the window anchored bottom-center.
//
// The object returned by createBar() deliberately mirrors the handful of
// BrowserWindow methods that hotkey.js and tray.js already call (isVisible,
// hide, showInactive, show, focus, webContents), so they work unchanged:
//   isVisible() -> "is the full widget open?"   hide() -> collapse to the pill
const { BrowserWindow, screen } = require('electron')
const path = require('path')
const { restoreOriginalClipboard } = require('./selection')

const BOTTOM_GAP = 6          // px between the window and the top of the taskbar
const MIN_W = 24
const MIN_H = 16
const MAX_H = 760

function createBar({ isDev, devUrl }) {
  let win = null
  let expanded = false
  let size = { w: 120, h: 44 }

  function place() {
    if (!win || win.isDestroyed()) return
    const wa = screen.getPrimaryDisplay().workArea
    const w = Math.min(size.w, wa.width)
    const h = Math.min(size.h, wa.height)
    const x = Math.round(wa.x + (wa.width - w) / 2)
    win.setBounds({ x, y: Math.round(wa.y + wa.height - h - BOTTOM_GAP), width: w, height: h }, false)

    // Windows enforces a minimum window size. If it made us bigger than asked
    // (e.g. the tiny idle pill), re-anchor so the bottom edge stays put
    // instead of sinking into the taskbar.
    const b = win.getBounds()
    if (b.width !== w || b.height !== h) {
      win.setBounds({
        x: Math.round(wa.x + (wa.width - b.width) / 2),
        y: Math.round(wa.y + wa.height - b.height - BOTTOM_GAP),
        width: b.width,
        height: b.height,
      }, false)
    }
  }

  function create() {
    win = new BrowserWindow({
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      width: size.w,
      height: size.h,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,   // clicking the idle pill must not steal focus from the app you are typing in
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false, // keep timers/recording alive when the bar is not focused
      },
    })
    win.setAlwaysOnTop(true, 'screen-saver') // stay above the taskbar and fullscreen-ish windows
    place()

    if (isDev) win.loadURL(devUrl)
    else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

    win.webContents.once('did-finish-load', () => win.showInactive())

    win.on('blur', () => {
      // Clicking away from the open widget folds it back into the pill
      if (!isDev && expanded) collapse()
    })

    screen.on('display-metrics-changed', place)
    return bar
  }

  // ── Expanded <-> collapsed ─────────────────────────────────────────────────

  function setExpanded(value) {
    if (!win || win.isDestroyed()) return
    expanded = !!value
    // Only the open widget may take focus (buttons, Esc). Pill and recording
    // bars stay unfocusable so the target app keeps its caret and selection.
    win.setFocusable(expanded)
  }

  function collapse() {
    if (!win || win.isDestroyed()) return
    expanded = false
    win.setFocusable(false)
    restoreOriginalClipboard() // no-op unless an edit session was left open
    win.webContents.send('ui:collapse')
    // Lets the renderer stop an in-progress recording (mic must not stay open)
    win.webContents.send('window:hidden')
  }

  function resize(w, h) {
    size = {
      w: Math.max(MIN_W, Math.ceil(w)),
      h: Math.max(MIN_H, Math.min(MAX_H, Math.ceil(h))),
    }
    place()
  }

  const bar = {
    create,
    resize,
    setExpanded,
    collapse,
    get window() { return win },
    get webContents() { return win.webContents },
    // BrowserWindow-compatible surface used by hotkey.js / tray.js / main.js
    isVisible: () => expanded,
    hide: collapse,
    showInactive: () => { if (win && !win.isVisible()) win.showInactive() },
    show: () => { if (win && !win.isVisible()) win.showInactive() },
    focus: () => { if (win && !win.isDestroyed()) { win.setFocusable(true); win.focus() } },
  }
  return bar
}

module.exports = { createBar }
