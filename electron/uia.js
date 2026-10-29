// Windows UI Automation helper: knows whether a TEXT BOX is focused, and can
// put focus back on the element the user started in. Win32 alone can't see
// inside web pages / Electron apps (their text boxes are not separate windows),
// so this talks to UI Automation through one long-lived PowerShell process
// (starting it costs ~0.5s, each query after that ~60ms).
//
// Protocol: one command per line on stdin ("capture" | "inspect" | "restore"),
// one JSON object per line on stdout.
const { spawn } = require('child_process')

const SCRIPT = `
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$AE = [System.Windows.Automation.AutomationElement]
$saved = $null

function Describe($e) {
  if ($null -eq $e) { return @{ editable = 'unknown'; type = 'none' } }
  $type = $e.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
  $vp = $null; $tp = $false; $ro = $null
  try { $vp = $e.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern) } catch {}
  try { $null = $e.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern); $tp = $true } catch {}
  if ($vp) { $ro = [bool]$vp.Current.IsReadOnly }

  # yes = a writable text target; no = positively NOT a text target;
  # unknown = can't tell (paste anyway rather than block something that works)
  $editable = 'unknown'
  if ($vp -and -not $ro) { $editable = 'yes' }
  elseif ($vp -and $ro) { $editable = 'no' }
  elseif ($type -eq 'Edit') { $editable = 'yes' }
  elseif ($type -in @('Group','Text','Button','Hyperlink','Image','ListItem','TabItem','MenuItem','TreeItem','CheckBox','RadioButton','TitleBar','ToolBar','StatusBar')) { $editable = 'no' }
  if ($tp -and $editable -eq 'no' -and -not $vp) { $editable = 'unknown' }
  return @{ type = $type; editable = $editable; readOnly = $ro; textPattern = $tp; cls = $e.Current.ClassName; pid = $e.Current.ProcessId }
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  try {
    switch ($line.Trim()) {
      'capture' { $script:saved = $AE::FocusedElement; $out = Describe $script:saved }
      'inspect' { $out = Describe $AE::FocusedElement }
      'restore' {
        if ($null -eq $script:saved) { $out = @{ restored = $false; reason = 'nothing saved' } }
        else { try { $script:saved.SetFocus(); $out = @{ restored = $true } } catch { $out = @{ restored = $false; reason = $_.Exception.Message } } }
      }
      default { $out = @{ error = 'unknown command' } }
    }
  } catch { $out = @{ error = $_.Exception.Message } }
  [Console]::Out.WriteLine(($out | ConvertTo-Json -Compress))
  [Console]::Out.Flush()
}
`

let proc = null
let buffer = ''
const waiting = [] // FIFO of { resolve, timer }

function settle(value) {
  const w = waiting.shift()
  if (w) { clearTimeout(w.timer); w.resolve(value) }
}

function ensureProcess() {
  if (proc && !proc.killed) return proc
  const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64')
  proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encoded], {
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true,
  })
  buffer = ''
  proc.stdout.setEncoding('utf8')
  proc.stdout.on('data', (chunk) => {
    buffer += chunk
    let i
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim()
      buffer = buffer.slice(i + 1)
      if (!line) continue
      try { settle(JSON.parse(line)) } catch { settle(null) }
    }
  })
  const reset = () => { proc = null; while (waiting.length) settle(null) }
  proc.on('exit', reset)
  proc.on('error', reset)
  proc.stdin.on('error', () => {})
  return proc
}

// Resolves to the parsed reply, or null on timeout / failure — callers must
// treat null as "unknown" and carry on, never as an error.
function send(command, timeoutMs = 2500) {
  return new Promise((resolve) => {
    try {
      const p = ensureProcess()
      const timer = setTimeout(() => {
        // A late reply could be mistaken for the next command's, so drop the
        // helper entirely; it restarts on the next call.
        try { proc && proc.kill() } catch {}
      }, timeoutMs)
      waiting.push({ resolve, timer })
      p.stdin.write(command + '\n')
    } catch {
      resolve(null)
    }
  })
}

// A browser's first answer is only its outer shell ("Pane"): the first query
// is what makes it build the page's accessibility tree. So if we got a shell,
// look again shortly after, while the user is still starting to speak.
// `stillValid()` says whether the user is still where the capture started
// (same window in front, no newer capture). If they already clicked elsewhere,
// the second look would record the WRONG element, so skip it.
let captureSeq = 0
async function capture(stillValid = () => true) {
  const mine = ++captureSeq
  let result = await send('capture', 8000)
  if (!result || result.type === 'Pane' || result.type === 'none') {
    await new Promise((r) => setTimeout(r, 700))
    if (mine === captureSeq && stillValid()) {
      const second = await send('capture', 3000)
      if (second) result = second
    }
  }
  return result
}

module.exports = {
  // Remember the focused element and (as a side effect) wake the target app's
  // accessibility tree — Chromium only builds it once a UIA client asks.
  // The first call also pays the helper's startup, so give it a long timeout.
  capture,
  inspect: () => send('inspect'),
  restore: () => send('restore'),
  shutdown: () => { try { proc && proc.stdin.end(); proc && proc.kill() } catch {} proc = null },
}
