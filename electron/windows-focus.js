const { execFile, execFileSync } = require('child_process')

let previousHwnd = 0

const PS_GET = [
  '-NoProfile', '-NonInteractive', '-Command',
  `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class SJ{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();}';[SJ]::GetForegroundWindow().ToInt64()`,
]

const psSet = (hwnd) => [
  '-NoProfile', '-NonInteractive', '-Command',
  `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class SJ{[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);}';[SJ]::SetForegroundWindow([IntPtr]${hwnd})`,
]

// Call async when hotkey fires — by the time user clicks Inject, result is ready
function captureForeground() {
  execFile('powershell', PS_GET, { timeout: 5000 }, (err, out) => {
    if (!err) previousHwnd = parseInt(out.trim()) || 0
  })
}

// Call sync right before inject — small one-time delay (~300ms)
function restoreForeground() {
  if (!previousHwnd) return
  try {
    execFileSync('powershell', psSet(previousHwnd), { timeout: 3000 })
  } catch {}
}

module.exports = { captureForeground, restoreForeground }
