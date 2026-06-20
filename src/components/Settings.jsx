import { useState, useEffect } from 'react'

export default function Settings({ onSave, onBack, onHide }) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getApiKey().then((k) => setKey(k || ''))
    }
  }, [])

  async function handleSave() {
    const trimmed = key.trim()
    if (!trimmed) { setError('API key cannot be empty.'); return }
    if (!trimmed.startsWith('gsk_')) { setError('Groq API keys start with "gsk_".'); return }
    setSaving(true)
    setError('')
    try {
      await window.electronAPI.setApiKey(trimmed)
      onSave()
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="w-[380px] rounded-widget overflow-hidden select-none"
      style={{
        background: '#FFFFFF',
        border: '1px solid #ECE8E1',
        boxShadow: '0 24px 60px -22px rgba(58,48,33,.45), 0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center" style={{ padding: '17px 20px 0' }}>
        <span className="text-[13px] font-semibold" style={{ color: '#A29B91' }}>Suniye Ji</span>
        <button
          onClick={onBack || onHide}
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ background: '#F5F4F1' }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1 1L8 8M8 1L1 8" stroke="#BDB6AC" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 22px 24px' }}>
        {/* Heading */}
        <h1
          className="font-bold leading-tight tracking-[-0.01em]"
          style={{ fontSize: '19px', color: '#26231F', marginBottom: '6px' }}
        >
          Setup Suniye Ji
        </h1>

        {/* Subtext */}
        <p className="text-[13px] leading-[1.55]" style={{ color: '#9A938A', marginBottom: '20px' }}>
          Get your free API key at{' '}
          <span className="font-semibold" style={{ color: '#524E47' }}>
            console.groq.com
          </span>
        </p>

        {/* Field */}
        <label
          className="block text-[12px] font-semibold mb-1.5"
          style={{ color: '#7A746B' }}
        >
          Groq API key
        </label>
        <div className="relative mb-1">
          <span className="absolute left-[13px] top-1/2 -translate-y-1/2" style={{ color: '#BDB6AC' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m21 2-9.6 9.6M15.5 7.5l3 3" />
            </svg>
          </span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="gsk_••••••••••••••••"
            autoFocus
            className="w-full text-[13px] outline-none transition-colors"
            style={{
              background: '#F5F4F1',
              border: '1px solid #ECE7DF',
              borderRadius: '11px',
              padding: '11px 14px 11px 36px',
              color: '#26231F',
            }}
            onFocus={e => { e.target.style.borderColor = '#E07B39' }}
            onBlur={e => { e.target.style.borderColor = '#ECE7DF' }}
          />
        </div>
        {error && (
          <p className="text-[12px] mb-3" style={{ color: '#CB4F37' }}>{error}</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full text-[13px] font-semibold rounded-btn transition-opacity hover:opacity-80 disabled:opacity-50 active:scale-[.98] mt-4"
          style={{ background: '#23201C', color: 'white', padding: '12px 0' }}
        >
          {saving ? 'Saving…' : 'Save & Start'}
        </button>

        {/* Link */}
        <p className="text-center mt-3 text-[12.5px] font-semibold" style={{ color: '#C0631F' }}>
          How to get your key →
        </p>
      </div>
    </div>
  )
}
