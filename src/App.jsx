import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import Widget from './components/Widget.jsx'
import Settings from './components/Settings.jsx'
import { useRecorder } from './hooks/useRecorder.js'
import { useClipboard } from './hooks/useClipboard.js'
import { transcribeAudio, processWithAI } from './services/groq.js'
import { autoEditTranscript, removeFillersLocally } from './services/autoEdit.js'
import { detectCommand } from './services/commands.js'
import { applyDictionary } from './services/dictionary.js'
import { detectAndExpandSnippet } from './services/snippets.js'

function getErrorMessage(err) {
  const msg = err?.message || ''
  if (msg === 'RATE_LIMIT')   return 'Too many requests. Wait a moment and try again.'
  if (msg === 'SERVER_ERROR') return 'AI service is down. Try again in a few seconds.'
  if (msg.includes('getUserMedia') || msg.includes('NotAllowed'))
    return 'Microphone access needed. Check Windows Settings → Privacy → Microphone.'
  if (msg.includes('NetworkError') || msg.includes('fetch'))
    return 'No internet connection.'
  return msg || 'Something went wrong. Try again.'
}

const DEFAULT_SETTINGS = {
  autoStart: false,
  autoEdit: true,
  removeFillers: true,
  defaultTone: 'none',
}

export default function App() {
  const [status, setStatus]             = useState('idle')
  const [mode, setMode]                 = useState('transcribe') // transcribe | command | intent
  const [result, setResult]             = useState('')
  const [error, setError]               = useState('')
  const [detectedCommand, setDetectedCmd] = useState(null)
  const [activeTone, setActiveTone]     = useState('none')
  const [showSettings, setShowSettings] = useState(false)
  const [hasApiKey, setHasApiKey]       = useState(true)
  const [appSettings, setAppSettings]   = useState(DEFAULT_SETTINGS)

  const baseResultRef = useRef('')   // pre-tone result for re-applying different tones
  const dictionaryRef = useRef([])
  const snippetsRef   = useRef([])
  const statusRef     = useRef('idle')

  const { startRecording, stopRecording } = useRecorder()
  const { clipboardText, readClipboard }  = useClipboard()
  const rootRef = useRef(null)

  // Dynamic window resize
  useLayoutEffect(() => {
    if (!window.electronAPI?.resizeWindow) return
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => window.electronAPI.resizeWindow(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Bootstrap: load everything from store
  useEffect(() => {
    async function load() {
      if (!window.electronAPI) return
      const [key, settings, dict, snips] = await Promise.all([
        window.electronAPI.getApiKey(),
        window.electronAPI.getSettings(),
        window.electronAPI.getDictionary(),
        window.electronAPI.getSnippets(),
      ])
      if (!key) { setHasApiKey(false); setShowSettings(true) }
      if (settings) setAppSettings({ ...DEFAULT_SETTINGS, ...settings })
      if (dict)  dictionaryRef.current = dict
      if (snips) snippetsRef.current   = snips
    }
    load()
  }, [])

  useEffect(() => { statusRef.current = status }, [status])

  // Hotkey + settings events
  useEffect(() => {
    if (!window.electronAPI) return
    const handleHotkey = async () => {
      await readClipboard()
      if (statusRef.current !== 'listening') {
        setStatus('idle')
        setResult('')
        setError('')
        setDetectedCmd(null)
        setActiveTone(appSettings.defaultTone || 'none')
        baseResultRef.current = ''
      }
    }
    window.electronAPI.onHotkeyTriggered(handleHotkey)
    window.electronAPI.onOpenSettings(() => setShowSettings(true))
    return () => {
      window.electronAPI.removeHotkeyListener()
      window.electronAPI.removeSettingsListener()
    }
  }, [readClipboard, appSettings.defaultTone])

  // Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (showSettings && hasApiKey) setShowSettings(false)
      else window.electronAPI?.hideWidget()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showSettings, hasApiKey])

  // ── Recording ──────────────────────────────────────────────────────────────

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording()
      setStatus('listening')
      setError('')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [startRecording])

  // ── Full pipeline ──────────────────────────────────────────────────────────

  const handleStopRecording = useCallback(async () => {
    try {
      const blob = await stopRecording()
      if (!blob || blob.size < 500) {
        setStatus('error')
        setError("Couldn't hear anything. Try again.")
        return
      }

      setStatus('thinking')

      const apiKey = await window.electronAPI?.getApiKey()
      if (!apiKey) { setShowSettings(true); setStatus('idle'); return }

      // STEP 3: Transcribe
      const rawTranscript = await transcribeAudio(blob, apiKey)
      if (!rawTranscript || rawTranscript.trim().length === 0) {
        setStatus('error'); setError("Couldn't hear anything. Try again."); return
      }
      if (rawTranscript.trim().split(/\s+/).length < 2) {
        setStatus('error'); setError("Didn't catch that. Speak a bit longer."); return
      }

      // STEP 4: Filler removal (local, instant) — use already-loaded appSettings
      const settings = appSettings
      const cleanTranscript = settings.removeFillers
        ? removeFillersLocally(rawTranscript)
        : rawTranscript

      // STEP 5: Snippet check (local, instant)
      const snipResult = detectAndExpandSnippet(cleanTranscript, snippetsRef.current)
      if (snipResult.isSnippet) {
        const final = applyDictionary(snipResult.expansion, dictionaryRef.current)
        baseResultRef.current = final
        setResult(final)
        setMode('transcribe')
        setStatus('done')
        return
      }

      // STEP 6: Command detection (local, instant)
      const detection = detectCommand(cleanTranscript)
      setDetectedCmd(detection)

      // STEP 7: Determine mode
      const freshClipboard = await readClipboard()
      let currentMode
      if (detection.type === 'slash')               currentMode = 'command'
      else if (freshClipboard && freshClipboard.trim()) currentMode = 'intent'
      else                                           currentMode = 'transcribe'
      setMode(currentMode)

      let processedResult

      if (currentMode === 'transcribe') {
        // STEP 8A: Grammar fix
        processedResult = settings.autoEdit
          ? await autoEditTranscript(cleanTranscript, apiKey)
          : cleanTranscript

        // Apply default tone if configured
        const defaultTone = settings.defaultTone || 'none'
        if (defaultTone !== 'none') {
          processedResult = await processWithAI(
            null,
            `Rephrase the following with a ${defaultTone} tone, preserving meaning:\n\n${processedResult}`,
            null,
            apiKey
          )
          setActiveTone(defaultTone)
        }
      } else {
        // STEP 8B: Command / Intent
        processedResult = await processWithAI(freshClipboard, detection.instruction, null, apiKey)
      }

      // STEP 9: Personal dictionary
      const final = applyDictionary(processedResult, dictionaryRef.current)
      baseResultRef.current = final
      setResult(final)
      setStatus('done')

    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [stopRecording, readClipboard, appSettings])

  // ── Tone chips (transcribe mode, done state) ───────────────────────────────

  const handleApplyTone = useCallback(async (tone) => {
    try {
      const newTone = activeTone === tone ? 'none' : tone  // toggle off if same
      setActiveTone(newTone)

      if (newTone === 'none') {
        setResult(baseResultRef.current)
        return
      }

      const apiKey = await window.electronAPI?.getApiKey()
      if (!apiKey) return

      setStatus('thinking')
      const toneName = newTone === 'social'
        ? 'social-media-post, hook-driven and hashtag-ready'
        : newTone
      const rephrased = await processWithAI(
        null,
        `Rephrase the following text with a ${toneName} tone, keeping the same meaning:\n\n${baseResultRef.current}`,
        null,
        apiKey
      )
      const final = applyDictionary(rephrased, dictionaryRef.current)
      setResult(final)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [activeTone])

  // ── Quick slash command chips ──────────────────────────────────────────────

  const handleRunCommand = useCallback(async (slashCmd) => {
    try {
      const apiKey = await window.electronAPI?.getApiKey()
      if (!apiKey) { setShowSettings(true); return }

      const freshClipboard = await readClipboard()
      if (!freshClipboard || !freshClipboard.trim()) {
        setStatus('error')
        setError('No text selected. Copy some text first, then try again.')
        return
      }

      setDetectedCmd({ type: 'slash', command: slashCmd, instruction: slashCmd })
      setMode('command')
      setStatus('thinking')
      setError('')

      const res = await processWithAI(freshClipboard, slashCmd, null, apiKey)
      const final = applyDictionary(res, dictionaryRef.current)
      baseResultRef.current = final
      setResult(final)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [readClipboard])

  // ── Inject / Copy ──────────────────────────────────────────────────────────

  const handleInject = useCallback(async () => {
    if (!result) return
    const res = await window.electronAPI?.injectText(result)
    if (res && res.fallback) {
      setStatus('error')
      setError('Copied to clipboard — press Ctrl+V to paste.')
    }
  }, [result])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await window.electronAPI?.writeClipboard(result)
    window.electronAPI?.hideWidget()
  }, [result])

  // ── Settings saved ─────────────────────────────────────────────────────────

  const handleSettingsSaved = useCallback((newSettings) => {
    setAppSettings({ ...DEFAULT_SETTINGS, ...newSettings })
    setHasApiKey(true)
    setShowSettings(false)
    if (window.electronAPI) {
      window.electronAPI.getDictionary().then(d => { dictionaryRef.current = d || [] })
      window.electronAPI.getSnippets().then(s => { snippetsRef.current   = s || [] })
    }
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (showSettings) {
    return (
      <div ref={rootRef} style={{ width: 400 }}>
        <Settings
          onSave={handleSettingsSaved}
          onBack={hasApiKey ? () => setShowSettings(false) : null}
        />
      </div>
    )
  }

  return (
    <div ref={rootRef} style={{ width: 400 }}>
      <Widget
        status={status}
        mode={mode}
        clipboardText={clipboardText}
        result={result}
        error={error}
        detectedCommand={detectedCommand}
        activeTone={activeTone}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onInject={handleInject}
        onCopy={handleCopy}
        onRunCommand={handleRunCommand}
        onApplyTone={handleApplyTone}
        onHide={() => window.electronAPI?.hideWidget()}
        onOpenSettings={() => setShowSettings(true)}
        onRefreshClipboard={readClipboard}
        onTryAgain={handleStartRecording}
      />
    </div>
  )
}
