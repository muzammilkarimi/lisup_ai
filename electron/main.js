const { app, BrowserWindow, ipcMain, clipboard, shell, Notification } = require('electron')
const path = require('path')
const { registerHotkeys, unregisterHotkeys, cancelQuick, endQuickRecording, setClickRecording, getEditSelection } = require('./hotkey')
const { restoreOriginalClipboard } = require('./selection')
const { restoreForeground, isTargetFocused, getPreviousApp, getPreviousPid, captureForeground } = require('./windows-focus')
const { createBar } = require('./bar')
const { createOnboardingWindow, closeOnboardingWindow } = require('./onboarding')
const { createTray, destroyTray } = require('./tray')
const { injectText } = require('./injector')
const uia = require('./uia')
const store = require('./store')

const isDev = !!process.env.ELECTRON_START_URL

const devUrl = process.env.ELECTRON_START_URL

// The floating bar. `widgetWindow` is a BrowserWindow-compatible facade (see
// bar.js): isVisible() = full widget open, hide() = collapse to the idle pill.
const bar = createBar({ isDev, devUrl })
const widgetWindow = bar

// Single instance lock must be acquired before app.whenReady
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Launching Lisup again opens the widget (or the setup wizard on first run)
    if (!store.get('onboarding_complete', false)) { createOnboardingWindow({ isDev, devUrl }); return }
    captureForeground()
    bar.window?.webContents.send('hotkey:triggered')
  })
}

// The app that had focus when the hotkey fired (for per-app styles)
ipcMain.handle('context:getApp', () => getPreviousApp())

// ── Clipboard ────────────────────────────────────────────────────────────────
ipcMain.handle('clipboard:read',  ()         => clipboard.readText())
ipcMain.handle('clipboard:write', (_, text)  => clipboard.writeText(text))

// ── Injection ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Put focus back on the text box where the user STARTED (not wherever they
// clicked since) and make sure a text box really is focused before pasting.
//   { ok: true }                       -> go ahead and paste
//   { ok: null }                       -> no target known, paste as before
//   { ok: false, reason: 'window-gone' | 'no-text-box' } -> do NOT paste
async function returnToStartingTextBox() {
  const restored = restoreForeground()
  await sleep(150)
  const confirmed = isTargetFocused()
  if (restored === false || confirmed === false) return { ok: false, reason: 'window-gone' }

  if ((store.get('settings') || {}).pasteWhereStarted !== false) {
    // Browsers/Electron apps: put focus back on the element the user started in
    await uia.restore()
    await sleep(120)
    // Then check a text box really has focus. UI Automation's view of focus
    // lags a moment behind the switch, so only trust a reading that belongs to
    // the target app, and only call it "no text box" if that stays true on
    // consecutive readings. Only a firm "no" blocks the paste; "unknown"
    // (apps that don't say) still pastes as before.
    const pid = getPreviousPid()
    let noInARow = 0
    for (let attempt = 0; attempt < 8; attempt++) {
      const focused = await uia.inspect()
      console.log('[paste] focus check:', JSON.stringify(focused))
      const inTarget = !!focused && (!pid || !focused.pid || focused.pid === pid)
      if (inTarget && focused.editable === 'no') {
        if (++noInARow >= 2) return { ok: false, reason: 'no-text-box' }
      } else if (inTarget) {
        break                   // editable / unknown in the target app: go ahead
      } else {
        noInARow = 0            // still showing the previous window's focus: wait
      }
      await sleep(120)
    }
  }
  return { ok: confirmed === null ? null : true }
}

// Dictation replaces typing, so by default it leaves the clipboard alone: your
// previous contents are put back after pasting. Opt-in via Settings.
const keepOnClipboard = () => (store.get('settings') || {}).keepDictationOnClipboard === true

// A failed paste must never be silent — the bar may already be gone
function notifyNotPasted(reason) {
  if (!Notification.isSupported()) return
  new Notification({
    title: 'Lisup — text not pasted',
    body: reason === 'no-text-box'
      ? 'No text box was selected. It’s copied — press Ctrl+V where you want it.'
      : 'Couldn’t get back to your text box. It’s copied — press Ctrl+V where you want it.',
  }).show()
}

ipcMain.handle('inject:text', async (_, text) => {
  widgetWindow.hide()
  const target = await returnToStartingTextBox()
  if (target.ok === false) {
    await clipboard.writeText(text)
    notifyNotPasted(target.reason)
    return { success: false, fallback: true, reason: target.reason }
  }
  return await injectText(text, { keepOnClipboard: keepOnClipboard() })
})

// Quick inject — restores focus + pastes WITHOUT hiding the widget
// (renderer controls when to hide so it can show the "Injected" confirmation)
ipcMain.handle('quick:inject', async (_, text) => {
  const target = await returnToStartingTextBox()
  if (target.ok === false) {
    await clipboard.writeText(text)
    await restoreOriginalClipboard(true)
    notifyNotPasted(target.reason)
    return { success: false, fallback: true, reason: target.reason }
  }
  const res = await injectText(text, { keepOnClipboard: keepOnClipboard() })
  // Edit-selection mode copied the selection; put the user's clipboard back
  await restoreOriginalClipboard(!!res.fallback)
  return res
})

ipcMain.handle('edit:getSelection', () => getEditSelection())

// ── Window ───────────────────────────────────────────────────────────────────
ipcMain.handle('window:hide', () => widgetWindow.hide())

// Floating bar: the renderer measures its content and tells us how big to be,
// and whether the full widget is open (only then may the window take focus).
ipcMain.handle('bar:resize', (_, w, h) => { if (w > 0 && h > 0) bar.resize(w, h) })
ipcMain.handle('bar:setExpanded', (_, value) => bar.setExpanded(value))
// Click on the idle pill: start listening right away (hands-free dictation).
// Remember which app has focus first — the bar never takes it, so the text
// lands back where the user was typing.
ipcMain.handle('bar:record', () => {
  captureForeground()
  setClickRecording(true) // so Ctrl+Win can finish it too
  bar.window?.webContents.send('quick:start', { mode: 'click' })
})
// Expand button on the pill: open the full widget instead
ipcMain.handle('bar:open', () => {
  captureForeground()
  bar.window?.webContents.send('hotkey:triggered')
})
// The recording bar's Stop button (the keyboard path sends this from hotkey.js)
ipcMain.handle('quick:requestStop', () => {
  endQuickRecording()
  bar.window?.webContents.send('quick:stop')
})
ipcMain.handle('window:show', () => { widgetWindow.show(); widgetWindow.focus() })
ipcMain.handle('quick:cancel', () => { cancelQuick(); widgetWindow.hide() })

// ── Store — API key ──────────────────────────────────────────────────────────
ipcMain.handle('store:getApiKey', ()        => store.getApiKey())
ipcMain.handle('store:setApiKey', (_, key)  => store.setApiKey(key))
ipcMain.handle('store:getOnboardingComplete', () => store.get('onboarding_complete', false))
ipcMain.handle('store:completeOnboarding', () => {
  store.set('onboarding_complete', true)
  closeOnboardingWindow()
  // Pick up the freshly saved API key / settings in the bar
  bar.window?.webContents.send('store:changed')
})
ipcMain.handle('external:openMicSettings', () => shell.openExternal('ms-settings:privacy-microphone'))
// Custom title-bar buttons for frameless windows
ipcMain.handle('win:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.handle('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.handle('external:openGroqKeys', () => shell.openExternal('https://console.groq.com/keys'))

// ── Store — Settings ─────────────────────────────────────────────────────────
ipcMain.handle('store:getSettings', () => store.get('settings'))

ipcMain.handle('store:saveSettings', (_, s) => {
  store.set('settings', s)
  // Sync auto-start with Windows login items
  if (typeof s.autoStart === 'boolean') {
    app.setLoginItemSettings({ openAtLogin: s.autoStart })
  }
})

// ── Store — Dictionary (stored as JSON string to avoid schema issues) ────────
ipcMain.handle('store:getDictionary', () => {
  try { return JSON.parse(store.get('dictionary_json', '[]')) } catch { return [] }
})
ipcMain.handle('store:saveDictionary', (_, d) => {
  store.set('dictionary_json', JSON.stringify(d))
})

// ── Store — Snippets (stored as JSON string to avoid schema issues) ──────────
ipcMain.handle('store:getSnippets', () => {
  try { return JSON.parse(store.get('snippets_json', '[]')) } catch { return [] }
})
ipcMain.handle('store:saveSnippets', (_, s) => {
  store.set('snippets_json', JSON.stringify(s))
})

// ── Store — History (last 50 results, newest first) ──────────────────────────
const HISTORY_MAX = 50
function readHistory() {
  try { return JSON.parse(store.get('history_json', '[]')) } catch { return [] }
}
ipcMain.handle('store:getHistory', () => readHistory())
ipcMain.handle('store:addHistory', (_, entry) => {
  if (!entry?.text) return
  const list = readHistory()
  list.unshift({ id: Date.now().toString(36), ts: Date.now(), text: String(entry.text), mode: entry.mode || 'transcribe' })
  store.set('history_json', JSON.stringify(list.slice(0, HISTORY_MAX)))
})
ipcMain.handle('store:clearHistory', () => store.set('history_json', '[]'))

// ── Store — People (names Lisup learns while you dictate) ────────────────────
const PEOPLE_MAX = 300
function readPeople() {
  try { return JSON.parse(store.get('people_json', '[]')) } catch { return [] }
}
function cleanPerson(p) {
  const name = String(p?.name || '').trim().slice(0, 40)
  if (!name) return null
  return { name, relation: String(p?.relation || '').trim().toLowerCase().slice(0, 30), auto: !!p?.auto, ts: p?.ts || Date.now() }
}
ipcMain.handle('store:getPeople', () => readPeople())
ipcMain.handle('store:savePeople', (_, list) => {
  const seen = new Set()
  const clean = (list || []).map(cleanPerson).filter(p => {
    if (!p || seen.has(p.name.toLowerCase())) return false
    seen.add(p.name.toLowerCase()); return true
  })
  store.set('people_json', JSON.stringify(clean.slice(-PEOPLE_MAX)))
})
// Merge newly learned people (dedupe by name, keep existing entries) and tell
// the user, so auto-learning is never silent.
ipcMain.handle('store:addPeople', (_, found) => {
  const list = readPeople()
  const added = []
  for (const raw of found || []) {
    const p = cleanPerson({ ...raw, auto: true })
    if (!p) continue
    const existing = list.find(x => x.name.toLowerCase() === p.name.toLowerCase())
    if (existing) { if (!existing.relation && p.relation) existing.relation = p.relation; continue }
    list.push(p); added.push(p.name)
  }
  const all = list.slice(-PEOPLE_MAX)
  store.set('people_json', JSON.stringify(all))
  if (added.length && Notification.isSupported()) {
    const shown = added.slice(0, 6).join(', ') + (added.length > 6 ? ` +${added.length - 6} more` : '')
    new Notification({
      title: `Lisup saved ${added.length} ${added.length === 1 ? 'name' : 'names'}`,
      body: `${shown}\nManage them in Settings → People.`,
      silent: true,
    }).show()
  }
  return { added, all }
})

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (!gotLock) return // duplicate instance is already quitting
  app.setAppUserModelId('com.lisup.app') // so Windows toasts are labelled "Lisup"
  bar.create()
  registerHotkeys(widgetWindow)
  createTray(widgetWindow)
  if (!store.get('onboarding_complete', false)) createOnboardingWindow({ isDev, devUrl })
})

app.on('will-quit', () => {
  uia.shutdown()
  unregisterHotkeys()
  destroyTray()
})

app.on('window-all-closed', e => e.preventDefault())
