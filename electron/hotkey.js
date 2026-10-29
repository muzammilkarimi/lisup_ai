const { globalShortcut } = require('electron')
const { uIOhook, UiohookKey } = require('uiohook-napi')
const { captureForeground, suppressStartMenu } = require('./windows-focus')
const { captureSelection, restoreOriginalClipboard } = require('./selection')

let widgetWindow = null

// State machine
// IDLE -> WAITING (first chord press)
//   WAITING + hold timer fires while chord still down -> HOLD_RECORDING
//   WAITING + chord release then no second press in DOUBLE_MS -> IDLE (single press)
//   WAITING + second chord press before DOUBLE_MS -> DOUBLE_RECORDING
// HOLD_RECORDING + chord release -> IDLE (stop recording)
// DOUBLE_RECORDING + chord press again -> IDLE (stop recording)

let state       = 'IDLE'
let ctrlDown    = false
let winDown     = false
let chordDown   = false
// Edit-selection chord: hold Ctrl+Alt, speak an instruction, release.
// The selected text is rewritten in place. Modifier-only on purpose: the hook
// cannot block keys, so a chord with a typing key (like Space) would also type
// into the user's editor and overwrite the very selection being edited.
let altDown     = false
let editActive  = false
let editTimer   = null   // fires once Ctrl+Alt have been held EDIT_HOLD_MS
let editMaxTimer = null  // safety net: never record forever if a release is missed
let editSelectionPromise = null

// Our own injected key (see suppressStartMenu) must not be treated as user input
let ignoreUntil = 0
// While Lisup sends Alt-up / Ctrl+C to copy the selection, the hook sees those
// as real key events. Ignore every key event inside this window.
let injectUntil = 0

// A recording started by clicking the floating pill. Pressing Ctrl+Win during
// it finishes the recording (same as clicking the bar) instead of starting a
// new gesture.
let clickRecording = false

let holdTimer   = null
let singleTimer = null

const HOLD_MS   = 400  // ms held before it counts as hold-record
const DOUBLE_MS = 300  // ms window to detect second press for double
const EDIT_HOLD_MS = 400      // Ctrl+Alt must be held this long to start edit mode
const EDIT_MAX_MS  = 60000    // auto-stop edit recording after a minute
const INJECT_QUIET_MS = 150   // ignore the hook this long after our own keystrokes

function isCtrlKey(e) {
  return e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight
}

function isWinKey(e) {
  return e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight
}

function startQuick(mode) {
  widgetWindow.showInactive()
  widgetWindow.webContents.send('quick:start', { mode })
}

function stopQuick() {
  widgetWindow.webContents.send('quick:stop')
}

function toggleWidget() {
  if (widgetWindow.isVisible()) {
    widgetWindow.hide()
  } else {
    widgetWindow.showInactive()
    widgetWindow.webContents.send('hotkey:triggered')
  }
}

function isAltKey(e) {
  return e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight
}

function cancelEditTimer() {
  clearTimeout(editTimer)
  editTimer = null
}

// Called by selection.js right before each batch of injected keystrokes
function markInjecting() {
  injectUntil = Date.now() + INJECT_QUIET_MS
}

function maybeStartEditTimer() {
  if (editActive || editTimer || winDown || state !== 'IDLE') return
  if (!(ctrlDown && altDown)) return
  editTimer = setTimeout(() => {
    editTimer = null
    if (ctrlDown && altDown && !winDown && state === 'IDLE') handleEditDown()
  }, EDIT_HOLD_MS)
}

function handleEditDown() {
  if (editActive || state !== 'IDLE') return
  editActive = true
  console.log('[edit] chord detected')

  // Keep Windows from treating the Alt release as a menu-bar tap
  markInjecting()
  suppressStartMenu()

  captureForeground()
  editSelectionPromise = captureSelection(markInjecting)
  startQuick('edit')
  editMaxTimer = setTimeout(handleEditUp, EDIT_MAX_MS)
}

function handleEditUp() {
  if (!editActive) return
  editActive = false
  clearTimeout(editMaxTimer)
  console.log('[edit] chord released')
  stopQuick()
}

// Renderer asks for the selection once recording stops
function getEditSelection() {
  return editSelectionPromise || Promise.resolve('')
}

function handleChordDown() {
  if (chordDown) return
  chordDown = true

  // Stop Windows opening the Start menu when Win is released
  ignoreUntil = Date.now() + 100
  suppressStartMenu()

  if (clickRecording) {
    clickRecording = false
    console.log('[click] Ctrl+Win pressed - finishing click-started recording')
    stopQuick()
    return
  }

  if (state === 'IDLE') {
    captureForeground()
    state = 'WAITING'
    holdTimer = setTimeout(() => {
      if (chordDown && state === 'WAITING') {
        state = 'HOLD_RECORDING'
        startQuick('hold')
      }
    }, HOLD_MS)

  } else if (state === 'WAITING') {
    clearTimeout(holdTimer)
    clearTimeout(singleTimer)
    state = 'DOUBLE_RECORDING'
    startQuick('double')

  } else if (state === 'DOUBLE_RECORDING') {
    state = 'IDLE'
    stopQuick()
  }
}

function handleChordUp() {
  if (!chordDown) return
  chordDown = false

  if (state === 'WAITING') {
    clearTimeout(holdTimer)
    singleTimer = setTimeout(() => {
      if (state === 'WAITING') {
        state = 'IDLE'
        toggleWidget()
      }
    }, DOUBLE_MS)

  } else if (state === 'HOLD_RECORDING') {
    state = 'IDLE'
    stopQuick()
  }
}

function registerHotkeys(win) {
  widgetWindow = win

  // Ctrl+Win is handled by uIOhook because Electron accelerators require a
  // non-modifier key. Clear stale accelerators from previous app versions.
  globalShortcut.unregisterAll()

  uIOhook.on('keydown', (e) => {
    const now = Date.now()
    if (now < injectUntil) return // our own injected keystrokes
    if (now < ignoreUntil && !isCtrlKey(e) && !isWinKey(e)) return

    if (isAltKey(e)) { altDown = true; maybeStartEditTimer(); return }
    if (isCtrlKey(e)) { ctrlDown = true; maybeStartEditTimer() }
    else if (isWinKey(e)) { winDown = true; cancelEditTimer() }
    else {
      // Any other key means Ctrl+Alt is part of a different shortcut
      cancelEditTimer()
      // Another key pressed with Ctrl/Win held (e.g. Ctrl+Win+Left to switch
      // virtual desktops) is a different shortcut — abort a pending chord.
      if ((ctrlDown || winDown) && state === 'WAITING') {
        clearTimeout(holdTimer)
        clearTimeout(singleTimer)
        state = 'IDLE'
      }
      return
    }

    if (ctrlDown && winDown) handleChordDown()
  })

  uIOhook.on('keyup', (e) => {
    const now = Date.now()
    if (now < injectUntil) return // our own injected keystrokes
    if (now < ignoreUntil && !isCtrlKey(e) && !isWinKey(e)) return

    if (isAltKey(e)) {
      altDown = false
      cancelEditTimer()
      handleEditUp()
      return
    }
    if (isCtrlKey(e)) {
      cancelEditTimer()
      if (editActive) { ctrlDown = false; handleEditUp(); return }
    }
    const wasChordDown = chordDown

    if (isCtrlKey(e)) ctrlDown = false
    else if (isWinKey(e)) winDown = false
    else return

    if (wasChordDown && !(ctrlDown && winDown)) handleChordUp()
  })

  uIOhook.start()
}

// The bar was clicked to finish a hands-free recording: forget the hands-free
// state so the next Ctrl+Win press starts fresh instead of "stopping" again.
function endQuickRecording() {
  clickRecording = false
  if (state === 'HOLD_RECORDING' || state === 'DOUBLE_RECORDING') state = 'IDLE'
}

function cancelQuick() {
  clickRecording = false
  editActive = false
  cancelEditTimer()
  clearTimeout(editMaxTimer)
  restoreOriginalClipboard()
  if (state === 'HOLD_RECORDING' || state === 'DOUBLE_RECORDING') {
    state = 'IDLE'
  }
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll()
  try { uIOhook.stop() } catch {}
}

function setClickRecording(value) { clickRecording = !!value }

module.exports = { registerHotkeys, unregisterHotkeys, cancelQuick, endQuickRecording, setClickRecording, getEditSelection }