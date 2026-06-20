const { clipboard } = require('electron')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function injectText(text) {
  let robot
  try {
    robot = require('@jitsi/robotjs')
  } catch {
    // robotjs not available — fall back to clipboard-only
    clipboard.writeText(text)
    return { success: false, fallback: true }
  }

  const previousClipboard = clipboard.readText()

  try {
    clipboard.writeText(text)
    await sleep(100)
    robot.keyTap('v', ['control'])
    await sleep(300)
    clipboard.writeText(previousClipboard)
    return { success: true }
  } catch (err) {
    // Restore clipboard on failure
    try { clipboard.writeText(previousClipboard) } catch {}
    clipboard.writeText(text)
    return { success: false, fallback: true, error: err.message }
  }
}

module.exports = { injectText }
