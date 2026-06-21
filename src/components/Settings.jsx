import { useState, useEffect } from 'react'
import LisupIcon from './LisupIcon.jsx'

// ── Shared ─────────────────────────────────────────────────────────────────────

function SectionHeader({ children }) {
  return (
    <h2 className="text-[12px] font-semibold uppercase tracking-wide mb-3" style={{ color: '#BDB6AC' }}>
      {children}
    </h2>
  )
}

function Toggle({ checked, onChange, label, sub }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors"
        style={{ background: checked ? '#E07B39' : '#ECE7DF' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
      <div>
        <p className="text-[13px] font-medium" style={{ color: '#26231F' }}>{label}</p>
        {sub && <p className="text-[11.5px] mt-0.5" style={{ color: '#9A938A' }}>{sub}</p>}
      </div>
    </label>
  )
}

// ── Tab: General ───────────────────────────────────────────────────────────────

function GeneralTab({ onSave }) {
  const [key, setKey]                = useState('')
  const [userName, setUserName]      = useState('')
  const [autoEdit, setAutoEdit]      = useState(true)
  const [removeFillers, setFillers]  = useState(true)
  const [autoStart, setAutoStart]    = useState(false)
  const [defaultTone, setTone]       = useState('none')
  const [language, setLanguage]      = useState('auto')
  const [saving, setSaving]          = useState(false)
  const [keyError, setKeyError]      = useState('')

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getApiKey().then(k => setKey(k || ''))
    window.electronAPI.getSettings().then(s => {
      if (!s) return
      setAutoEdit(s.autoEdit ?? true)
      setFillers(s.removeFillers ?? true)
      setAutoStart(s.autoStart ?? false)
      setTone(s.defaultTone ?? 'none')
      setLanguage(s.language ?? 'auto')
      setUserName(s.userName ?? '')
    })
  }, [])

  async function handleSave() {
    const trimmed = key.trim()
    if (!trimmed)                      { setKeyError('API key cannot be empty.'); return }
    if (!trimmed.startsWith('gsk_'))   { setKeyError('Groq API keys start with "gsk_".'); return }
    setKeyError('')
    setSaving(true)
    try {
      const settings = { autoEdit, removeFillers, autoStart, defaultTone, language, userName: userName.trim() }
      await window.electronAPI.setApiKey(trimmed)
      await window.electronAPI.saveSettings(settings)
      onSave(settings)
    } catch {
      setKeyError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* API Key */}
      <div>
        <SectionHeader>Groq API Key</SectionHeader>
        <p className="text-[12.5px] mb-2" style={{ color: '#9A938A' }}>
          Free key at <span className="font-semibold" style={{ color: '#524E47' }}>console.groq.com</span> — no credit card.
        </p>
        <div className="relative">
          <span className="absolute left-[13px] top-1/2 -translate-y-1/2" style={{ color: '#BDB6AC' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m21 2-9.6 9.6M15.5 7.5l3 3" />
            </svg>
          </span>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="gsk_••••••••••••••••"
            autoFocus
            className="w-full text-[13px] outline-none transition-colors"
            style={{
              background: '#F5F4F1', border: '1px solid #ECE7DF',
              borderRadius: '11px', padding: '11px 14px 11px 36px', color: '#26231F',
            }}
            onFocus={e => { e.target.style.borderColor = '#E07B39' }}
            onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
          />
        </div>
        {keyError && <p className="text-[12px] mt-1" style={{ color: '#CB4F37' }}>{keyError}</p>}
      </div>

      {/* Your Name */}
      <div>
        <SectionHeader>Your Name</SectionHeader>
        <p className="text-[12.5px] mb-2" style={{ color: '#9A938A' }}>
          Used in emails and letters — replaces "[Your Name]" automatically.
        </p>
        <input
          type="text"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          placeholder="e.g. Muzammil Karimi"
          className="w-full text-[13px] outline-none transition-colors"
          style={{
            background: '#F5F4F1', border: '1px solid #ECE7DF',
            borderRadius: '11px', padding: '11px 14px', color: '#26231F',
          }}
          onFocus={e => { e.target.style.borderColor = '#E07B39' }}
          onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
        />
      </div>

      {/* Processing */}
      <div>
        <SectionHeader>Processing</SectionHeader>
        <div className="flex flex-col gap-3">
          <Toggle
            checked={autoEdit} onChange={setAutoEdit}
            label="Auto-fix grammar"
            sub="Correct spelling, punctuation, and capitalisation in your speech"
          />
          <Toggle
            checked={removeFillers} onChange={setFillers}
            label="Remove filler words"
            sub="Strip um, uh, like, basically, you know before processing"
          />
        </div>
      </div>

      {/* Language */}
      <div>
        <SectionHeader>Speech language</SectionHeader>
        <p className="text-[12px] mb-2" style={{ color: '#9A938A' }}>
          Fix inconsistent detection by setting your language explicitly.
        </p>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="w-full text-[13px] outline-none rounded-btn"
          style={{
            background: '#F5F4F1', border: '1px solid #ECE7DF',
            padding: '10px 14px', color: '#26231F', appearance: 'auto',
          }}
        >
          <option value="auto">Auto-detect</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="hinglish">Hindi — Hinglish (Roman script)</option>
          <option value="ur">Urdu</option>
          <option value="ar">Arabic</option>
          <option value="fr">French</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="pt">Portuguese</option>
          <option value="ru">Russian</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
        </select>
      </div>

      {/* Default tone */}
      <div>
        <SectionHeader>Default tone</SectionHeader>
        <select
          value={defaultTone}
          onChange={e => setTone(e.target.value)}
          className="w-full text-[13px] outline-none rounded-btn transition-colors"
          style={{
            background: '#F5F4F1', border: '1px solid #ECE7DF',
            padding: '10px 14px', color: '#26231F', appearance: 'auto',
          }}
        >
          <option value="none">None (inject as-is)</option>
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
          <option value="funny">Funny</option>
          <option value="polite">Polite</option>
          <option value="social">Social Post</option>
        </select>
      </div>

      {/* System */}
      <div>
        <SectionHeader>System</SectionHeader>
        <Toggle
          checked={autoStart} onChange={setAutoStart}
          label="Start on Windows boot"
          sub="Launch Lisup automatically when you log in"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full text-[13px] font-semibold rounded-btn transition-opacity hover:opacity-80 disabled:opacity-50 active:scale-[.98]"
        style={{ background: '#23201C', color: 'white', padding: '12px 0' }}
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}

// ── Tab: Dictionary ────────────────────────────────────────────────────────────

function DictionaryTab() {
  const [entries, setEntries] = useState([])
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!window.electronAPI?.getDictionary) return
    window.electronAPI.getDictionary()
      .then(d => setEntries(d || []))
      .catch(() => setError('Could not load dictionary.'))
  }, [])

  function addEntry() {
    setEntries(e => [...e, { wrong: '', correct: '' }])
  }

  function removeEntry(i) {
    setEntries(e => e.filter((_, idx) => idx !== i))
  }

  function updateEntry(i, field, val) {
    setEntries(e => e.map((en, idx) => idx === i ? { ...en, [field]: val } : en))
  }

  async function handleSave() {
    if (!window.electronAPI?.saveDictionary) {
      setError('Restart the app to enable saving.')
      return
    }
    const valid = entries.filter(e => e.wrong.trim() && e.correct.trim())
    setSaving(true)
    setError('')
    try {
      await window.electronAPI.saveDictionary(valid)
      setEntries(valid)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError('Save failed. Try restarting the app.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="text-[12.5px] mb-4" style={{ color: '#9A938A' }}>
        Fix words Whisper consistently mishears.
      </p>

      {entries.length === 0 && (
        <p className="text-center text-[12.5px] py-4" style={{ color: '#BDB6AC' }}>
          No entries yet. Add words Whisper gets wrong.
        </p>
      )}

      <div className="flex flex-col gap-2 mb-3">
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={entry.wrong}
              onChange={e => updateEntry(i, 'wrong', e.target.value)}
              placeholder="Wrong"
              className="flex-1 text-[12.5px] outline-none rounded-[9px]"
              style={{ background: '#F5F4F1', border: '1px solid #ECE7DF', padding: '8px 11px', color: '#26231F' }}
              onFocus={e => { e.target.style.borderColor = '#E07B39' }}
              onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
            />
            <span style={{ color: '#BDB6AC', fontSize: '13px' }}>→</span>
            <input
              value={entry.correct}
              onChange={e => updateEntry(i, 'correct', e.target.value)}
              placeholder="Correct"
              className="flex-1 text-[12.5px] outline-none rounded-[9px]"
              style={{ background: '#F5F4F1', border: '1px solid #ECE7DF', padding: '8px 11px', color: '#26231F' }}
              onFocus={e => { e.target.style.borderColor = '#E07B39' }}
              onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
            />
            <button onClick={() => removeEntry(i)} style={{ color: '#BDB6AC' }} className="hover:opacity-60 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addEntry}
        className="text-[12.5px] font-medium mb-3 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
        style={{ color: '#E07B39' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Word
      </button>

      {error && <p className="text-[12px] mb-2" style={{ color: '#CB4F37' }}>{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full text-[13px] font-semibold rounded-btn transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: saved ? '#2D7A4F' : '#23201C', color: 'white', padding: '11px 0' }}
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Dictionary'}
      </button>
    </div>
  )
}

// ── Tab: Snippets ──────────────────────────────────────────────────────────────

function SnippetsTab() {
  const [snippets, setSnippets] = useState([])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!window.electronAPI?.getSnippets) return
    window.electronAPI.getSnippets()
      .then(s => setSnippets(s || []))
      .catch(() => setError('Could not load snippets.'))
  }, [])

  function addSnippet() {
    setSnippets(s => [...s, { trigger: '', expansion: '' }])
  }

  function removeSnippet(i) {
    setSnippets(s => s.filter((_, idx) => idx !== i))
  }

  function updateSnippet(i, field, val) {
    setSnippets(s => s.map((sn, idx) => idx === i ? { ...sn, [field]: val } : sn))
  }

  async function handleSave() {
    if (!window.electronAPI?.saveSnippets) {
      setError('Restart the app to enable saving.')
      return
    }
    const valid = snippets
      .filter(s => s.trigger.trim() && s.expansion.trim())
      .map(s => ({ trigger: s.trigger.trim(), expansion: s.expansion.trim() }))
    setSaving(true)
    setError('')
    try {
      await window.electronAPI.saveSnippets(valid)
      setSnippets(valid)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError('Save failed. Try restarting the app.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="text-[12.5px] mb-4" style={{ color: '#9A938A' }}>
        Speak a trigger phrase to instantly expand it — no AI needed.
      </p>

      {snippets.length === 0 && (
        <p className="text-center text-[12.5px] py-4" style={{ color: '#BDB6AC' }}>
          No snippets yet. Try "my email" → your@email.com
        </p>
      )}

      <div className="flex flex-col gap-3 mb-3">
        {snippets.map((sn, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex gap-2 items-center">
              <input
                value={sn.trigger}
                onChange={e => updateSnippet(i, 'trigger', e.target.value)}
                placeholder='Trigger (e.g. "my email")'
                className="flex-1 text-[12.5px] outline-none rounded-[9px]"
                style={{ background: '#F5F4F1', border: '1px solid #ECE7DF', padding: '8px 11px', color: '#26231F' }}
                onFocus={e => { e.target.style.borderColor = '#E07B39' }}
                onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
              />
              <button onClick={() => removeSnippet(i)} style={{ color: '#BDB6AC' }} className="hover:opacity-60 transition-opacity flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <textarea
              value={sn.expansion}
              onChange={e => updateSnippet(i, 'expansion', e.target.value)}
              placeholder="Expansion (what gets inserted)"
              rows={2}
              className="w-full text-[12.5px] outline-none rounded-[9px] resize-none"
              style={{ background: '#F5F4F1', border: '1px solid #ECE7DF', padding: '8px 11px', color: '#26231F' }}
              onFocus={e => { e.target.style.borderColor = '#E07B39' }}
              onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={addSnippet}
        className="text-[12.5px] font-medium mb-3 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
        style={{ color: '#E07B39' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Snippet
      </button>

      {error && <p className="text-[12px] mb-2" style={{ color: '#CB4F37' }}>{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full text-[13px] font-semibold rounded-btn transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: saved ? '#2D7A4F' : '#23201C', color: 'white', padding: '11px 0' }}
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Snippets'}
      </button>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

const TABS = ['General', 'Dictionary', 'Snippets']

export default function Settings({ onSave, onBack }) {
  const [activeTab, setActiveTab] = useState('General')

  return (
    <div
      className="w-[400px] rounded-widget overflow-hidden select-none"
      style={{
        background: '#FFFFFF',
        border: '1px solid #ECE8E1',
        boxShadow: '0 24px 60px -22px rgba(58,48,33,.45), 0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center" style={{ padding: '14px 18px 0' }}>
        <div className="flex items-center gap-2">
          <LisupIcon size={22} />
          <span className="text-[13px] font-semibold" style={{ color: '#1A1A1A' }}>
            Lis<span style={{ color: '#E07B39' }}>up</span>
          </span>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: '#F5F4F1' }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 1L8 8M8 1L1 8" stroke="#BDB6AC" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mt-3 mx-4 rounded-[10px] p-[3px]" style={{ background: '#F5F4F1' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 text-[12px] font-semibold rounded-[8px] py-[6px] transition-all"
            style={{
              background: activeTab === tab ? '#FFFFFF' : 'transparent',
              color: activeTab === tab ? '#26231F' : '#9A938A',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable so it never overflows the screen */}
      <div
        className="panel-scroll"
        style={{
          padding: '16px 18px 20px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 90px)',
        }}
      >
        {activeTab === 'General'    && <GeneralTab    onSave={onSave} />}
        {activeTab === 'Dictionary' && <DictionaryTab />}
        {activeTab === 'Snippets'   && <SnippetsTab />}
      </div>
    </div>
  )
}
