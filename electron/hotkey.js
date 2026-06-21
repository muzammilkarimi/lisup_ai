const { globalShortcut } = require('electron')
const { uIOhook, UiohookKey } = require('uiohook-napi')
const { captureForeground } = require('./windows-focus')

let widgetWindow = null

// ── State machine ─────────────────────────────────────────────────────────────
// IDLE → WAITING (first keydown)
//   WAITING + hold timer fires while key still down → HOLD_RECORDING
//   WAITING + keyup then no second press in DOUBLE_MS → IDLE (single press)
//   WAITING + second keydown before DOUBLE_MS → DOUBLE_RECORDING
// HOLD_RECORDING + keyup → IDLE (stop recording)
// DOUBLE_RECORDING + keydown again → IDLE (stop recording)

let state       = 'IDLE'
let altDown     = false
let spaceDown   = false
let holdTimer   = null
let singleTimer = null

const HOLD_MS   = 400  // ms held before it counts as hold-record
const DOUBLE_MS = 300  // ms window to detect second press for double

function startQuick(mode) {
  widgetWindow.showInactive()
  widgetWindow.webContents.send('quick:start', { mode })
}

function stopQuick() {
  widgetWindow.webContents.send('quick:stop')
}

function registerHotkeys(win) {
  widgetWindow = win

  // Suppress the Windows system menu (Alt+Space normally opens Restore/Close dialog).
  // Empty callback is enough — globalShortcut consuming the key prevents it reaching Windows.
  globalShortcut.register('Alt+Space', () => {})

  uIOhook.on('keydown', (e) => {
    if (e.keycode === UiohookKey.Alt) { altDown = true; return }

    if (e.keycode === UiohookKey.Space && altDown && !spaceDown) {
      spaceDown = true

      if (state === 'IDLE') {
        captureForeground()   // capture active app ASAP
        state = 'WAITING'
        holdTimer = setTimeout(() => {
          if (spaceDown && state === 'WAITING') {
            state = 'HOLD_RECORDING'
            startQuick('hold')
          }
        }, HOLD_MS)

      } else if (state === 'WAITING') {
        // Second press arrived — double press
        clearTimeout(holdTimer)
        clearTimeout(singleTimer)
        state = 'DOUBLE_RECORDING'
        startQuick('double')

      } else if (state === 'DOUBLE_RECORDING') {
        // Press again to stop double recording
        state = 'IDLE'
        stopQuick()
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.Alt) { altDown = false; return }

    if (e.keycode === UiohookKey.Space) {
      spaceDown = false

      if (state === 'WAITING') {
        clearTimeout(holdTimer)
        // Quick tap — wait to see if a second press is coming
        singleTimer = setTimeout(() => {
          if (state === 'WAITING') {
            state = 'IDLE'
            // Single press → normal widget toggle
            if (widgetWindow.isVisible()) {
              widgetWindow.hide()
            } else {
              widgetWindow.showInactive()
              widgetWindow.webContents.send('hotkey:triggered')
            }
          }
        }, DOUBLE_MS)

      } else if (state === 'HOLD_RECORDING') {
        state = 'IDLE'
        stopQuick()
      }
    }
  })

  uIOhook.start()
}

function cancelQuick() {
  if (state === 'HOLD_RECORDING' || state === 'DOUBLE_RECORDING') {
    state = 'IDLE'
  }
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll()
  try { uIOhook.stop() } catch {}
}

module.exports = { registerHotkeys, unregisterHotkeys, cancelQuick }
