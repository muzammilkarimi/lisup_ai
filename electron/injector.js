const { clipboard, ClipboardItem } = require('electron')

// Lisup borrows the clipboard for a moment to paste, then puts your old
// contents back. Windows clipboard history (Win+V) and cloud sync would record
// BOTH writes — the dictated text and a duplicate of what you had copied — so
// every dictation left junk and repeated entries. These standard Windows
// markers tell them to ignore our temporary writes.
function excludeFromHistory() {
  const flag = (n) => new Blob([new Uint8Array([n, 0, 0, 0])])
  return {
    'electron application/osclipboard;format="ExcludeClipboardContentFromMonitorProcessing"': flag(1),
    'electron application/osclipboard;format="CanIncludeInClipboardHistory"': flag(0),
    'electron application/osclipboard;format="CanUploadToCloudClipboard"': flag(0),
  }
}

// Temporary text for pasting: on the clipboard, but not remembered
async function writeTemporaryText(text) {
  await clipboard.write([new ClipboardItem({ 'text/plain': text, ...excludeFromHistory() })])
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Electron's clipboard API is asynchronous (W3C-style ClipboardItem objects).
// Snapshot every MIME type we can read so a paste does not destroy a copied
// image or rich text. Formats the platform will not hand back are skipped.
async function snapshotClipboard() {
  const snap = []
  try {
    for (const item of await clipboard.read()) {
      const entry = {}
      for (const type of item.types) {
        // Skip Electron's raw OS-format entries (e.g. Chromium's internal
        // source-URL markers): writing them back makes the whole restore fail
        if (type.startsWith('electron ')) continue
        try { entry[type] = await item.getType(type) } catch {}
      }
      if (Object.keys(entry).length) snap.push(entry)
    }
  } catch {}
  return snap
}

async function restoreClipboard(snap) {
  try {
    // Restoring is also marked, otherwise your old clipboard text is re-added to history as a duplicate
    if (snap && snap.length) await clipboard.write(snap.map((entry) => new ClipboardItem({ ...entry, ...excludeFromHistory() })))
    else clipboard.clear()
  } catch {
    // Last resort: at least bring back the plain text
    try {
      const plain = snap?.[0]?.['text/plain']
      if (plain) await clipboard.writeText(await plain.text())
    } catch {}
  }
}

// keepOnClipboard=true (opt-in): the dictated text is written to the clipboard ONCE
// as a normal entry and left there, so Ctrl+V pastes it again anywhere (and it
// shows once in Win+V). No snapshot/restore, which is what used to re-add your
// old clipboard text to history as a duplicate on every dictation.
// keepOnClipboard=false (default): borrow the clipboard invisibly (kept out of history)
// and put your previous contents back afterwards.
async function injectText(text, { keepOnClipboard = false } = {}) {
  let robot
  try {
    robot = require('@jitsi/robotjs')
  } catch {
    // robotjs not available — fall back to clipboard-only
    await clipboard.writeText(text)
    return { success: false, fallback: true }
  }

  const previous = keepOnClipboard ? null : await snapshotClipboard()

  try {
    if (keepOnClipboard) await clipboard.writeText(text)
    else await writeTemporaryText(text)
    // Wait until the clipboard really holds our text instead of a fixed sleep
    for (let i = 0; i < 10 && (await clipboard.readText()) !== text; i++) await sleep(20)
    robot.keyTap('v', ['control'])
    await sleep(300) // let the target app read the clipboard before anything changes it
    if (previous) await restoreClipboard(previous)
    return { success: true }
  } catch (err) {
    // Leave the result on the clipboard so the user can paste it manually
    try { await clipboard.writeText(text) } catch {}
    return { success: false, fallback: true, error: err.message }
  }
}

module.exports = { injectText, snapshotClipboard, restoreClipboard }
