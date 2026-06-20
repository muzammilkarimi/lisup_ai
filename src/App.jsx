import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import Widget from './components/Widget.jsx'
import Settings from './components/Settings.jsx'
import { useRecorder } from './hooks/useRecorder.js'
import { useClipboard } from './hooks/useClipboard.js'
import { transcribeAudio, processCommand } from './services/groq.js'
import { detectCommand, buildFinalPrompt } from './services/commands.js'

function getErrorMessage(err) {
  const msg = err?.message || ''
  if (msg === 'RATE_LIMIT') return 'Too many requests. Wait a moment and try again.'
  if (msg === 'SERVER_ERROR') return 'AI service is down. Try again in a few seconds.'
  if (msg.includes('getUserMedia') || msg.includes('NotAllowedError'))
    return 'Microphone access needed. Check Windows settings.'
  if (msg.includes('NetworkError') || msg.includes('fetch'))
    return 'No internet connection.'
  return msg || 'Something went wrong. Try again.'
}

export default function App() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [detectedCommand, setDetectedCommand] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(true)

  const { startRecording, stopRecording } = useRecorder()
  const { clipboardText, readClipboard } = useClipboard()
  const rootRef = useRef(null)

  // Auto-resize Electron window to match content height
  useLayoutEffect(() => {
    if (!window.electronAPI?.resizeWindow) return
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      window.electronAPI.resizeWindow(el.offsetHeight)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Check API key on mount
  useEffect(() => {
    async function checkKey() {
      if (!window.electronAPI) return
      const key = await window.electronAPI.getApiKey()
      if (!key) {
        setHasApiKey(false)
        setShowSettings(true)
      }
    }
    checkKey()
  }, [])

  const statusRef = useRef('idle')
  useEffect(() => { statusRef.current = status }, [status])

  useEffect(() => {
    if (!window.electronAPI) return

    const handleHotkey = async () => {
      await readClipboard()
      if (statusRef.current !== 'listening') {
        setStatus('idle')
        setResult('')
        setError('')
        setTranscript('')
        setDetectedCommand(null)
      }
    }

    const handleOpenSettings = () => setShowSettings(true)

    window.electronAPI.onHotkeyTriggered(handleHotkey)
    window.electronAPI.onOpenSettings(handleOpenSettings)

    return () => {
      window.electronAPI.removeHotkeyListener()
      window.electronAPI.removeSettingsListener()
    }
  }, [readClipboard])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (showSettings && hasApiKey) setShowSettings(false)
        else if (!showSettings) window.electronAPI?.hideWidget()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showSettings, hasApiKey])

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

  const handleStopRecording = useCallback(async () => {
    try {
      setStatus('thinking')
      const blob = await stopRecording()

      if (!blob || blob.size < 1000) {
        setStatus('error')
        setError("Your mic stayed quiet. Check it's not muted and try again.")
        return
      }

      const apiKey = await window.electronAPI?.getApiKey()
      if (!apiKey) { setShowSettings(true); setStatus('idle'); return }

      const text = await transcribeAudio(blob, apiKey)
      if (!text || text.trim().length === 0) {
        setStatus('error')
        setError("Your mic stayed quiet. Check it's not muted and try again.")
        return
      }

      setTranscript(text)
      const detection = detectCommand(text)
      setDetectedCommand(detection)

      const freshClipboard = await readClipboard()
      const prompt = buildFinalPrompt(detection)
      const ai_result = await processCommand(freshClipboard, prompt, apiKey)

      setResult(ai_result)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [stopRecording, readClipboard])

  const handleRunCommand = useCallback(async (slashCmd) => {
    try {
      const apiKey = await window.electronAPI?.getApiKey()
      if (!apiKey) { setShowSettings(true); return }

      const freshClipboard = await readClipboard()
      if (!freshClipboard || freshClipboard.trim().length === 0) {
        setStatus('error')
        setError('No text selected. Copy some text first, then try again.')
        return
      }

      setDetectedCommand({ type: 'slash', command: slashCmd, instruction: slashCmd })
      setStatus('thinking')
      setError('')
      const ai_result = await processCommand(freshClipboard, slashCmd, apiKey)
      setResult(ai_result)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [readClipboard])

  const handleInject = useCallback(async () => {
    if (!result) return
    try {
      const res = await window.electronAPI?.injectText(result)
      if (res && res.fallback) {
        setStatus('error')
        setError('Copied to clipboard — press Ctrl+V to paste.')
      }
    } catch {
      setStatus('error')
      setError('Injection failed. Result copied — press Ctrl+V to paste.')
    }
  }, [result])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await window.electronAPI?.writeClipboard(result)
    window.electronAPI?.hideWidget()
  }, [result])

  if (showSettings) {
    return (
      <div ref={rootRef}>
        <Settings
          onSave={() => { setHasApiKey(true); setShowSettings(false) }}
          onBack={hasApiKey ? () => setShowSettings(false) : null}
          onHide={() => window.electronAPI?.hideWidget()}
        />
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      <Widget
        status={status}
        clipboardText={clipboardText}
        result={result}
        error={error}
        detectedCommand={detectedCommand}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onInject={handleInject}
        onCopy={handleCopy}
        onRunCommand={handleRunCommand}
        onHide={() => window.electronAPI?.hideWidget()}
        onOpenSettings={() => setShowSettings(true)}
        onRefreshClipboard={readClipboard}
        onTryAgain={handleStartRecording}
      />
    </div>
  )
}
