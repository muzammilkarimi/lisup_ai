import { useState, useEffect, useCallback, useRef } from 'react'
import Widget from './components/Widget.jsx'
import Settings from './components/Settings.jsx'
import QuickWidget from './components/QuickWidget.jsx'
import BarFrame from './components/BarFrame.jsx'
import Pill from './components/Pill.jsx'
import History from './components/History.jsx'
import { useRecorder } from './hooks/useRecorder.js'
import { useClipboard } from './hooks/useClipboard.js'
import { transcribeAudio, processWithAI, transliterateToHinglish } from './services/groq.js'
import { autoEditTranscript, removeFillersLocally } from './services/autoEdit.js'
import { getStyleForApp } from './services/appStyles.js'
import { detectCommand } from './services/commands.js'
import { applyDictionary, buildWhisperPrompt } from './services/dictionary.js'
import { looksLikeIntroducingPeople, extractPeople } from './services/people.js'
import { detectAndExpandSnippet, resolveUserName } from './services/snippets.js'

function getErrorMessage(err) {
  const msg = err?.message || ''
  if (msg === 'INVALID_API_KEY') return 'Groq rejected this API key. Add a valid key in Settings.'
  if (msg === 'RATE_LIMIT')   return 'Too many requests. Wait a moment and try again.'
  if (msg === 'SERVER_ERROR') return 'AI service is down. Try again in a few seconds.'
  if (msg.includes('getUserMedia') || msg.includes('NotAllowed'))
    return 'Microphone access needed. Check Windows Settings → Privacy → Microphone.'
  if (msg.includes('NetworkError') || msg.includes('fetch'))
    return 'No internet connection.'
  return msg || 'Something went wrong. Try again.'
}

// Shown when we deliberately did not paste (the text is on the clipboard)
function notPastedMessage(reason) {
  return reason === 'no-text-box'
    ? 'No text box was selected. Copied — press Ctrl+V where you want it.'
    : 'Couldn’t get back to your text box. Copied — press Ctrl+V to paste.'
}

const DEFAULT_SETTINGS = {
  autoStart: false,
  autoEdit: true,
  removeFillers: true,
  pasteWhereStarted: true,
  keepDictationOnClipboard: false,
  perAppStyles: true,
  defaultTone: 'none',
  language: 'auto',
  userName: '',
}

export default function App() {
  const [status, setStatus]             = useState('idle')
  const [mode, setMode]                 = useState('transcribe') // transcribe | command | intent
  const [manualMode, setManualMode]     = useState('auto')       // auto | transcribe | command
  const [result, setResult]             = useState('')
  const [error, setError]               = useState('')
  const [detectedCommand, setDetectedCmd] = useState(null)
  const [activeTone, setActiveTone]     = useState('none')
  const [showSettings, setShowSettings] = useState(false)
  const [expanded, setExpanded]       = useState(false)   // false = idle pill, true = full widget
  const [showHistory, setShowHistory]   = useState(false)
  const [hasApiKey, setHasApiKey]       = useState(true)
  const [appSettings, setAppSettings]   = useState(DEFAULT_SETTINGS)

  const [quickMode, setQuickMode]       = useState(null)   // null | 'hold' | 'double'
  const [quickStatus, setQuickStatus]   = useState('recording')
  const [quickError, setQuickError]     = useState('')
  const [quickWordCount, setQuickWordCount] = useState(0)

  const quickModeRef  = useRef(null) // 'hold' | 'double' | 'click' | 'edit'
  const quickStoppingRef = useRef(false) // a stop is already being processed
  const baseResultRef = useRef('')   // pre-tone result for re-applying different tones
  const dictionaryRef = useRef([])
  const peopleRef     = useRef([])   // names Lisup has learned (spelling + relationship)
  const snippetsRef   = useRef([])
  const statusRef     = useRef('idle')

  const { startRecording, stopRecording } = useRecorder()
  const { readClipboard } = useClipboard()
  const rootRef = useRef(null)

  // Fire-and-forget: history must never block or break the pipeline
  const saveHistory = useCallback((text, mode) => {
    if (text?.trim()) window.electronAPI?.addHistory({ text, mode }).catch(() => {})
  }, [])

  // Auto-learn people's names from what you dictate. Fire-and-forget: it never
  // delays the paste, and it only calls the AI when you sound like you are
  // introducing people ("my brothers are…", "his name is…").
  const learnPeople = useCallback(async (text, apiKey) => {
    if (!apiKey || !looksLikeIntroducingPeople(text)) return
    try {
      const found = await extractPeople(text, apiKey)
      if (!found.length) return
      const res = await window.electronAPI.addPeople(found)
      if (res?.all) peopleRef.current = res.all
    } catch { /* learning is best-effort */ }
  }, [])

  // Style for the app you're dictating into ('' when disabled / no special style)
  const getStyleInstruction = useCallback(async (settings) => {
    if (!settings.perAppStyles || (settings.defaultTone && settings.defaultTone !== 'none')) return ''
    try {
      return getStyleForApp(await window.electronAPI.getActiveApp())?.instruction || ''
    } catch { return '' }
  }, [])

  // Load everything from the store (on start, and again when setup finishes)
  const loadAll = useCallback(async () => {
    {
      if (!window.electronAPI) return
      const [key, settings, dict, snips, onboardingComplete, people] = await Promise.all([
        window.electronAPI.getApiKey(),
        window.electronAPI.getSettings(),
        window.electronAPI.getDictionary(),
        window.electronAPI.getSnippets(),
        window.electronAPI.getOnboardingComplete(),
        window.electronAPI.getPeople(),
      ])
      setHasApiKey(!!key)
      // First-run setup lives in its own window; only nag here if the key vanished later
      if (onboardingComplete && !key) setShowSettings(true)
      if (settings) setAppSettings({ ...DEFAULT_SETTINGS, ...settings })
      if (dict)  dictionaryRef.current = dict
      if (snips) snippetsRef.current   = snips
      if (people) peopleRef.current    = people
    }
  }, [])

  useEffect(() => {
    loadAll()
    window.electronAPI?.onStoreChanged?.(loadAll)
    return () => window.electronAPI?.removeStoreChangedListener?.()
  }, [loadAll])

  // Tell the main process whether the full widget is open (only then may the
  // window take focus), and fold back to the pill when it collapses us.
  useEffect(() => { window.electronAPI?.setBarExpanded?.(expanded) }, [expanded])
  useEffect(() => {
    window.electronAPI?.onCollapse?.(() => setExpanded(false))
    return () => window.electronAPI?.removeCollapseListener?.()
  }, [])

  useEffect(() => { statusRef.current = status }, [status])

  // Hotkey + settings events
  useEffect(() => {
    if (!window.electronAPI) return
    const handleHotkey = async () => {
      setExpanded(true)
      if (statusRef.current !== 'listening') {
        setStatus('idle')
        setResult('')
        setError('')
        setDetectedCmd(null)
        setActiveTone(appSettings.defaultTone || 'none')
        setManualMode('auto')
        baseResultRef.current = ''
      }
    }
    window.electronAPI.onHotkeyTriggered(handleHotkey)
    window.electronAPI.onOpenSettings(() => { setExpanded(true); setShowSettings(true) })
    return () => {
      window.electronAPI.removeHotkeyListener()
      window.electronAPI.removeSettingsListener()
    }
  }, [appSettings.defaultTone])

  // Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (showHistory) { setShowHistory(false); return }
      if (showSettings && hasApiKey) setShowSettings(false)
      else window.electronAPI?.hideWidget()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showSettings, showHistory, hasApiKey])

  // Widget hidden while recording (blur / Esc / tray) — release the mic
  useEffect(() => {
    if (!window.electronAPI?.onWindowHidden) return
    window.electronAPI.onWindowHidden(async () => {
      if (statusRef.current === 'listening') {
        try { await stopRecording() } catch {}
        setStatus('idle')
      }
    })
    return () => window.electronAPI.removeWindowHiddenListener?.()
  }, [stopRecording])

  // ── Quick record mode (hold / double press) ───────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onQuickStart(async ({ mode: qm }) => {
      quickModeRef.current = qm
      quickStoppingRef.current = false
      setQuickMode(qm)
      setQuickStatus('recording')
      setQuickError('')
      setQuickWordCount(0)
      try {
        await startRecording()
      } catch (err) {
        setQuickStatus('error')
        setQuickError('Microphone not available')
      }
    })

    window.electronAPI.onQuickStop(async () => {
      if (quickStoppingRef.current) return
      quickStoppingRef.current = true
      try {
        const blob = await stopRecording()
        if (!blob || blob.size < 500) {
          setQuickStatus('error')
          setQuickError("Couldn't hear anything. Try again.")
          return
        }
        setQuickStatus('processing')

        const isEdit = quickModeRef.current === 'edit'
        // Check the selection first so we do not spend API calls on nothing
        const selection = isEdit ? await window.electronAPI.getEditSelection() : ''
        if (isEdit && !selection.trim()) {
          setQuickStatus('error')
          setQuickError('Select some text first, then hold Ctrl+Alt and speak.')
          return
        }

        const apiKey = await window.electronAPI.getApiKey()
        if (!apiKey) {
          setQuickStatus('error')
          setQuickError('Add your Groq API key in Settings first')
          return
        }
        const rawTranscript = await transcribeAudio(blob, apiKey, appSettings.language || 'auto', buildWhisperPrompt(dictionaryRef.current, appSettings.userName, peopleRef.current))
        if (!rawTranscript || !rawTranscript.trim()) {
          setQuickStatus('error')
          setQuickError("Couldn't transcribe audio.")
          return
        }

        let text
        if (isEdit) {
          // Spoken instruction rewrites the selected text ("make this shorter")
          const instruction = detectCommand(rawTranscript).instruction
          text = await processWithAI(
            selection, instruction, null, apiKey,
            resolveUserName(appSettings, snippetsRef.current), appSettings.language, peopleRef.current,
          )
          text = applyDictionary(text, dictionaryRef.current)
        } else {
          text = appSettings.removeFillers ? removeFillersLocally(rawTranscript) : rawTranscript
          if (appSettings.language === 'hinglish') text = await transliterateToHinglish(text, apiKey)

          // Snippets expand verbatim (skip the LLM edit), same as the full widget
          const snip = detectAndExpandSnippet(text, snippetsRef.current)
          if (snip.isSnippet) text = snip.expansion
          else if (appSettings.autoEdit) text = await autoEditTranscript(text, apiKey, await getStyleInstruction(appSettings), peopleRef.current)
          text = applyDictionary(text, dictionaryRef.current)
        }

        setQuickWordCount(text.trim().split(/\s+/).length)

        saveHistory(text, isEdit ? 'edit' : 'quick')
        if (!isEdit) learnPeople(text, apiKey)

        // Use quickInjectText — restores focus + pastes WITHOUT hiding the widget
        // so we can show the "Injected" confirmation before disappearing
        const res = await window.electronAPI.quickInjectText(text)
        if (res && res.fallback) {
          setQuickStatus('error')
          setQuickError(notPastedMessage(res.reason))
          return
        }

        setQuickStatus('done')
        setTimeout(() => {
          setQuickMode(null)
          window.electronAPI.hideWidget()
        }, 1200)
      } catch (err) {
        setQuickStatus('error')
        setQuickError(getErrorMessage(err))
      }
    })

    return () => window.electronAPI.removeQuickListeners?.()
  }, [startRecording, stopRecording, appSettings])

  const handleQuickCancel = useCallback(async () => {
    try { await stopRecording() } catch {}
    setQuickMode(null)
    window.electronAPI?.cancelQuick()
  }, [stopRecording])

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
      const rawTranscript = await transcribeAudio(blob, apiKey, appSettings.language || 'auto', buildWhisperPrompt(dictionaryRef.current, appSettings.userName, peopleRef.current))
      if (!rawTranscript || rawTranscript.trim().length === 0) {
        setStatus('error'); setError("Couldn't hear anything. Try again."); return
      }
      // One-word results are usually Whisper noise on silence — but a bare
      // command keyword ("summarize") is valid
      if (rawTranscript.trim().split(/\s+/).length < 2 && detectCommand(rawTranscript).type !== 'slash') {
        setStatus('error'); setError("Didn't catch that. Speak a bit longer."); return
      }

      // STEP 4: Filler removal + optional Hinglish transliteration
      const settings = appSettings
      const fillerStripped = settings.removeFillers
        ? removeFillersLocally(rawTranscript)
        : rawTranscript
      const cleanTranscript = settings.language === 'hinglish'
        ? await transliterateToHinglish(fillerStripped, apiKey)
        : fillerStripped

      // STEP 5: Snippet check (local, instant)
      const snipResult = detectAndExpandSnippet(cleanTranscript, snippetsRef.current)
      if (snipResult.isSnippet) {
        const final = applyDictionary(snipResult.expansion, dictionaryRef.current)
        baseResultRef.current = final
        setResult(final)
        setMode('transcribe')
        saveHistory(final, 'snippet')
        setStatus('done')
        return
      }

      // STEP 6: Command detection (local, instant)
      const detection = detectCommand(cleanTranscript)
      setDetectedCmd(detection)

      // STEP 7: Determine mode — manual selection overrides auto-detection
      // Only touch the clipboard when this dictation can actually be a command
      const mayBeCommand = manualMode === 'command' || (manualMode === 'auto' && detection.type === 'slash' && detection.explicit)
      const freshClipboard = mayBeCommand ? await readClipboard() : ''
      let currentMode
      if (manualMode === 'command') {
        currentMode = detection.type === 'slash' ? 'command' : 'intent'
      } else if (manualMode === 'transcribe') {
        currentMode = 'transcribe'
      } else if (detection.type === 'slash' && detection.explicit && freshClipboard?.trim()) {
        // auto: an explicit "slash <command>" with clipboard context runs as a command
        currentMode = 'command'
      } else {
        // auto: otherwise default to transcribe
        currentMode = 'transcribe'
      }
      setMode(currentMode)

      let processedResult

      if (currentMode === 'transcribe') {
        // STEP 8A: Grammar fix
        processedResult = settings.autoEdit
          ? await autoEditTranscript(cleanTranscript, apiKey, await getStyleInstruction(settings), peopleRef.current)
          : cleanTranscript

        // Apply default tone if configured
        const defaultTone = settings.defaultTone || 'none'
        if (defaultTone !== 'none') {
          processedResult = await processWithAI(
            null,
            `Rephrase the following with a ${defaultTone} tone, preserving meaning:\n\n${processedResult}`,
            null,
            apiKey,
            '',
            settings.language,
          )
          setActiveTone(defaultTone)
        }
      } else {
        // STEP 8B: Command / Intent
        const resolvedName = resolveUserName(settings, snippetsRef.current)
        processedResult = await processWithAI(
          freshClipboard,
          detection.instruction,
          null,
          apiKey,
          resolvedName,
          settings.language,
          peopleRef.current,
        )
      }

      // STEP 9: Personal dictionary
      const final = applyDictionary(processedResult, dictionaryRef.current)
      baseResultRef.current = final
      setResult(final)
      saveHistory(final, currentMode)
      if (currentMode === 'transcribe') learnPeople(final, apiKey)
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
      if (!apiKey) { setShowSettings(true); return }

      setStatus('thinking')
      const toneName = newTone === 'social'
        ? 'social-media-post, hook-driven and hashtag-ready'
        : newTone
      const rephrased = await processWithAI(
        null,
        `Rephrase the following text with a ${toneName} tone, keeping the same meaning:\n\n${baseResultRef.current}`,
        null,
        apiKey,
        '',
        appSettings.language,
      )
      const final = applyDictionary(rephrased, dictionaryRef.current)
      setResult(final)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [activeTone, appSettings.language])

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

      const resolvedName = resolveUserName(appSettings, snippetsRef.current)
      const res = await processWithAI(
        freshClipboard,
        slashCmd,
        null,
        apiKey,
        resolvedName,
        appSettings.language,
        peopleRef.current,
      )
      const final = applyDictionary(res, dictionaryRef.current)
      baseResultRef.current = final
      setResult(final)
      saveHistory(final, 'command')
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err))
    }
  }, [readClipboard, appSettings.userName, appSettings.language])

  // ── Inject / Copy ──────────────────────────────────────────────────────────

  const handleInject = useCallback(async () => {
    if (!result) return
    const res = await window.electronAPI?.injectText(result)
    if (res && res.fallback) {
      setStatus('error')
      setError(notPastedMessage(res.reason))
    }
  }, [result])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await window.electronAPI?.writeClipboard(result)
    window.electronAPI?.hideWidget()
  }, [result])

  // ── Settings closed (back or save) ────────────────────────────────────────

  const reloadUserData = useCallback(() => {
    if (!window.electronAPI) return
    window.electronAPI.getDictionary().then(d => { dictionaryRef.current = d || [] })
    window.electronAPI.getSnippets().then(s => { snippetsRef.current   = s || [] })
    window.electronAPI.getPeople().then(p => { peopleRef.current = p || [] })
  }, [])

  const handleSettingsSaved = useCallback((newSettings) => {
    setAppSettings({ ...DEFAULT_SETTINGS, ...newSettings })
    setHasApiKey(true)
    setShowSettings(false)
    reloadUserData()
  }, [reloadUserData])

  const handleBackFromSettings = useCallback(() => {
    setShowSettings(false)
    reloadUserData()
  }, [reloadUserData])

  // ── Render ─────────────────────────────────────────────────────────────────
  // Everything is wrapped in <BarFrame>, which sizes the transparent window to
  // fit and keeps it centered above the taskbar.

  const WIDGET_PAD = '12px 20px 30px' // room for the widget's drop shadow

  if (quickMode) {
    return (
      <BarFrame padding="4px 8px 6px">
        <QuickWidget
          mode={quickMode}
          status={quickStatus}
          error={quickError}
          wordCount={quickWordCount}
          onCancel={handleQuickCancel}
          onStop={() => window.electronAPI?.requestQuickStop()}
        />
      </BarFrame>
    )
  }

  if (!expanded) {
    return (
      <BarFrame>
        <Pill
          onRecord={() => window.electronAPI?.recordFromPill()}
          onOpen={() => window.electronAPI?.openFromPill()}
          needsSetup={!hasApiKey}
        />
      </BarFrame>
    )
  }

  if (showHistory) {
    return (
      <BarFrame padding={WIDGET_PAD}>
        <History onBack={() => setShowHistory(false)} />
      </BarFrame>
    )
  }

  if (showSettings) {
    return (
      <BarFrame padding={WIDGET_PAD}>
        <div style={{ width: 400 }}>
          <Settings
            onSave={handleSettingsSaved}
            onBack={hasApiKey ? handleBackFromSettings : null}
          />
        </div>
      </BarFrame>
    )
  }

  return (
    <BarFrame padding={WIDGET_PAD}>
      <Widget
        status={status}
        mode={mode}
        manualMode={manualMode}
        result={result}
        error={error}
        detectedCommand={detectedCommand}
        activeTone={activeTone}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onInject={handleInject}
        onCopy={handleCopy}
        onNew={() => { setStatus('idle'); setResult(''); setActiveTone(null) }}
        onRunCommand={handleRunCommand}
        onApplyTone={handleApplyTone}
        onSetManualMode={(m) => setManualMode(prev => prev === m ? 'auto' : m)}
        onHide={() => window.electronAPI?.hideWidget()}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        onTryAgain={handleStartRecording}
      />
    </BarFrame>
  )
}
