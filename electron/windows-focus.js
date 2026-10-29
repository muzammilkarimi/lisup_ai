// Tracks which window had focus before the widget appeared, and gives it back
// before pasting. Calls user32 directly through koffi (microseconds) instead of
// spawning PowerShell (hundreds of ms, and it blocked the main process).
let user32 = null
let kernel32 = null
try {
  const koffi = require('koffi')
  user32 = koffi.load('user32.dll')
  kernel32 = koffi.load('kernel32.dll')
  var GetForegroundWindow = user32.func('intptr_t GetForegroundWindow()')
  var SetForegroundWindow = user32.func('bool SetForegroundWindow(intptr_t h)')
  var IsWindow = user32.func('bool IsWindow(intptr_t h)')
  var GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(intptr_t h, _Out_ uint32_t *pid)')
  var AttachThreadInput = user32.func('bool AttachThreadInput(uint32_t from, uint32_t to, bool attach)')
  var keybd_event = user32.func('void keybd_event(uint8_t vk, uint8_t scan, uint32_t flags, uintptr_t extra)')
  const RECT = koffi.struct('RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' })
  var GUITHREADINFO = koffi.struct('GUITHREADINFO', {
    cbSize: 'uint32', flags: 'uint32',
    hwndActive: 'intptr_t', hwndFocus: 'intptr_t', hwndCapture: 'intptr_t',
    hwndMenuOwner: 'intptr_t', hwndMoveSize: 'intptr_t', hwndCaret: 'intptr_t',
    rcCaret: RECT,
  })
  var GUITHREADINFO_SIZE = koffi.sizeof(GUITHREADINFO)
  var GetGUIThreadInfo = user32.func('bool GetGUIThreadInfo(uint32_t idThread, _Inout_ GUITHREADINFO *pgui)')
  var SetFocus = user32.func('intptr_t SetFocus(intptr_t h)')
  var GetCurrentThreadId = kernel32.func('uint32_t GetCurrentThreadId()')
  var OpenProcess = kernel32.func('void* OpenProcess(uint32_t access, bool inherit, uint32_t pid)')
  var CloseHandle = kernel32.func('bool CloseHandle(void* h)')
  var QueryFullProcessImageNameW = kernel32.func('bool QueryFullProcessImageNameW(void* h, uint32_t flags, _Out_ uint16_t *name, _Inout_ uint32_t *size)')
} catch (err) {
  console.warn('[windows-focus] native focus unavailable:', err.message)
  user32 = null
}

let previousHwnd = 0
let previousThread = 0   // thread that owns previousHwnd
let previousFocus = 0    // the exact control (text box) that had keyboard focus inside it
let previousApp = ''
let previousPid = 0      // process that owns the target window

// Which control currently has keyboard focus inside the window `hwnd` belongs to
function focusedControlOf(hwnd) {
  if (!user32 || !hwnd) return { thread: 0, focus: 0 }
  const thread = GetWindowThreadProcessId(hwnd, [0])
  if (!thread) return { thread: 0, focus: 0 }
  const info = {
    cbSize: GUITHREADINFO_SIZE, flags: 0, hwndActive: 0, hwndFocus: 0, hwndCapture: 0,
    hwndMenuOwner: 0, hwndMoveSize: 0, hwndCaret: 0, rcCaret: { left: 0, top: 0, right: 0, bottom: 0 },
  }
  if (!GetGUIThreadInfo(thread, info)) return { thread, focus: 0 }
  return { thread, focus: Number(info.hwndFocus) || 0 }
}

// "slack.exe" for a window handle, '' if it can't be resolved
function exeNameOf(hwnd) {
  if (!user32 || !hwnd) return ''
  let proc = null
  try {
    const pid = [0]
    GetWindowThreadProcessId(hwnd, pid)
    proc = OpenProcess(0x1000 /* PROCESS_QUERY_LIMITED_INFORMATION */, false, pid[0])
    if (!proc) return ''
    const buf = new Uint16Array(520)
    const size = [buf.length]
    if (!QueryFullProcessImageNameW(proc, 0, buf, size)) return ''
    const full = String.fromCharCode(...buf.subarray(0, size[0]))
    return full.split('\\').pop().toLowerCase()
  } catch {
    return ''
  } finally {
    if (proc) try { CloseHandle(proc) } catch {}
  }
}

// Call when the hotkey / tray fires, before the widget takes focus
function captureForeground() {
  previousHwnd = 0 // never leave a stale window behind
  previousThread = 0
  previousFocus = 0
  previousApp = ''
  previousPid = 0
  if (!user32) return
  try {
    previousHwnd = Number(GetForegroundWindow()) || 0
    previousApp = exeNameOf(previousHwnd)
    const pidOut = [0]
    GetWindowThreadProcessId(previousHwnd, pidOut)
    previousPid = pidOut[0] || 0
    // Remember the exact text box, not just the window: if the user later
    // clicks elsewhere, we can put focus back where they started speaking.
    const { thread, focus } = focusedControlOf(previousHwnd)
    previousThread = thread
    previousFocus = focus
  } catch {}
  // Web pages / Electron apps: remember the exact element through UI Automation
  // (async and best-effort — never blocks or breaks the capture)
  try {
    const startedIn = previousHwnd
    require('./uia').capture(() => Number(GetForegroundWindow()) === startedIn).catch(() => {})
  } catch {}
}

// true  = we put focus back where the user started
// false = we knew the target but could not get back to it (don't paste blindly)
// null  = no target known / native layer unavailable (caller decides)
function restoreForeground() {
  if (!user32 || !previousHwnd) return null
  try {
    if (!IsWindow(previousHwnd)) return false

    let ok = SetForegroundWindow(previousHwnd)
    if (!ok) {
      // Windows' foreground lock can refuse the call; attaching to the current
      // foreground thread's input queue is the standard workaround.
      const fg = Number(GetForegroundWindow())
      const fgThread = fg ? GetWindowThreadProcessId(fg, [0]) : 0
      const me = GetCurrentThreadId()
      if (fgThread && fgThread !== me) AttachThreadInput(me, fgThread, true)
      ok = SetForegroundWindow(previousHwnd)
      if (fgThread && fgThread !== me) AttachThreadInput(me, fgThread, false)
    }
    if (!ok) return false

    // Back to the exact control. Focus is per-thread, so briefly share the
    // target thread's input queue to be allowed to call SetFocus on it.
    if (previousFocus) {
      if (!IsWindow(previousFocus)) return false // the text box itself is gone
      const me = GetCurrentThreadId()
      if (previousThread && previousThread !== me) AttachThreadInput(me, previousThread, true)
      try { SetFocus(previousFocus) } finally {
        if (previousThread && previousThread !== me) AttachThreadInput(me, previousThread, false)
      }
    }
    return true
  } catch {
    return false
  }
}

// Independent check, run after the switch has had a moment to settle:
// is the window AND the original text box really focused right now?
// true / false, or null when we never had a target.
function isTargetFocused() {
  if (!user32 || !previousHwnd) return null
  try {
    if (Number(GetForegroundWindow()) !== previousHwnd) return false
    if (!previousFocus) return true // window-level apps (no separate control): window match is all we can check
    return focusedControlOf(previousHwnd).focus === previousFocus
  } catch {
    return false
  }
}

// Tapping the Win key (even as part of Ctrl+Win) opens the Start menu on
// release unless another key was pressed meanwhile. Injecting an unassigned
// key (VK 0xE8, the same trick AutoHotkey uses) marks Win as "used" without
// triggering anything.
function suppressStartMenu() {
  if (!user32) return
  try {
    keybd_event(0xE8, 0, 0, 0)
    keybd_event(0xE8, 0, 0x2 /* KEYEVENTF_KEYUP */, 0)
  } catch {}
}

function getPreviousApp() { return previousApp }
function getPreviousPid() { return previousPid }

module.exports = { captureForeground, restoreForeground, isTargetFocused, getPreviousApp, getPreviousPid, suppressStartMenu }
