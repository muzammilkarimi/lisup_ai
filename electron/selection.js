// Grabs the text currently selected in the foreground app by sending Ctrl+C.
// The user's own clipboard is put back IMMEDIATELY afterwards (we hold the
// selection in memory), so a failed or cancelled edit can never leave the
// clipboard empty.
const { clipboard } = require('electron')
const { snapshotClipboard, restoreClipboard } = require('./injector')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// onInject: called right before each batch of synthetic keystrokes so the
// hotkey hook can ignore them instead of mistaking them for the user's keys.
async function captureSelection(onInject = () => {}) {
  let robot
  try { robot = require('@jitsi/robotjs') } catch { return '' }

  const original = await snapshotClipboard()
  clipboard.clear() // sentinel: lets us tell "nothing selected" from "copied" (clearing adds no history entry)

  // The user is still physically holding Ctrl+Alt. Release the synthetic Alt
  // so the app sees plain Ctrl+C rather than Ctrl+Alt+C. Some apps (terminals,
  // certain editors) ignore Ctrl+C for copy, so fall back to Ctrl+Insert.
  const attempts = [
    ['Ctrl+C', () => robot.keyTap('c', ['control'])],
    ['Ctrl+Insert', () => robot.keyTap('insert', ['control'])],
  ]
  let selection = ''
  try {
    for (const [label, send] of attempts) {
      try {
        onInject()
        robot.keyToggle('alt', 'up')
        send()
      } catch (err) {
        console.log(`[edit] ${label} failed to send:`, err.message)
        continue
      }
      for (let i = 0; i < 16 && !selection; i++) {
        await sleep(25)
        selection = await clipboard.readText()
      }
      if (selection) { console.log(`[edit] selection captured via ${label}: ${selection.length} chars`); break }
      console.log(`[edit] ${label} produced no text`)
    }
  } finally {
    // Whatever happened, give the user their clipboard back right now
    await restoreClipboard(original)
  }
  return selection
}

// Kept for callers that used to restore later; there is nothing left to restore
async function restoreOriginalClipboard() {}

module.exports = { captureSelection, restoreOriginalClipboard }
