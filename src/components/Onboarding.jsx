import { useCallback, useEffect, useRef, useState } from 'react'
import LisupIcon from './LisupIcon.jsx'
import { validateApiKey } from '../services/groq.js'

// First-run setup wizard. Rendered in its own frameless window (see
// electron/onboarding.js); the floating bar stays visible at the bottom of the
// screen so the "Try it" step can use the real thing.

const C = {
  ink: '#23201C',
  text: '#26231F',
  muted: '#7A746B',
  faint: '#A9A299',
  line: '#ECE7DF',
  soft: '#F5F4F1',
  orange: '#E07B39',
  orangeDark: '#C0631F',
  orangeWash: '#FBF1E9',
  orangeLine: '#F4DEC9',
  green: '#2F9E62',
  danger: '#CB4F37',
}

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'groq',    label: 'Connect Groq' },
  { id: 'mic',     label: 'Microphone' },
  { id: 'keys',    label: 'Shortcuts' },
  { id: 'try',     label: 'Try it' },
]

// ── Small building blocks ──────────────────────────────────────────────────────

function Keycap({ children, dark }) {
  return (
    <kbd
      className="inline-flex items-center justify-center text-[12px] font-semibold"
      style={{
        minWidth: 38, height: 30, padding: '0 10px', borderRadius: 8, fontFamily: 'inherit',
        background: dark ? 'rgba(255,255,255,.1)' : '#fff',
        color: dark ? '#fff' : C.text,
        border: `1px solid ${dark ? 'rgba(255,255,255,.2)' : C.line}`,
        boxShadow: dark ? 'none' : '0 2px 0 #E2DDD5',
      }}
    >
      {children}
    </kbd>
  )
}

function PrimaryButton({ children, onClick, disabled, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="no-drag text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-45 disabled:cursor-not-allowed"
      style={{ background: C.ink, color: '#fff', borderRadius: 12, padding: '13px 26px', minWidth: 148 }}
    >
      {busy ? 'Working…' : children}
    </button>
  )
}

function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="no-drag text-[13.5px] font-semibold transition-colors hover:opacity-70"
      style={{ color: C.muted, padding: '13px 8px' }}
    >
      {children}
    </button>
  )
}

function Heading({ eyebrow, title, children }) {
  return (
    <div>
      <p className="text-[13px] font-semibold" style={{ color: C.orangeDark }}>{eyebrow}</p>
      <h1 className="font-bold mt-2" style={{ color: C.text, fontSize: 32, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
        {title}
      </h1>
      {children && (
        <p className="mt-3 text-[15px]" style={{ color: C.muted, lineHeight: 1.6, maxWidth: 480 }}>{children}</p>
      )}
    </div>
  )
}

function Footer({ children }) {
  return <div className="flex items-center justify-between mt-auto pt-8">{children}</div>
}

// ── Step rail (left) ───────────────────────────────────────────────────────────

function Rail({ step }) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 drag"
      style={{ width: 280, background: C.ink, padding: '34px 30px 30px', color: '#fff' }}
    >
      <div className="flex items-center gap-3">
        <LisupIcon size={38} />
        <span className="text-[21px] font-bold" style={{ letterSpacing: '-0.01em' }}>
          Lis<span style={{ color: C.orange }}>up</span>
        </span>
      </div>

      <ol className="mt-12 flex flex-col">
        {STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          return (
            <li key={s.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className="flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                  style={{
                    width: 28, height: 28, borderRadius: 99,
                    background: done ? C.orange : 'transparent',
                    border: `1.5px solid ${done || current ? C.orange : 'rgba(255,255,255,.25)'}`,
                    color: done ? '#fff' : current ? C.orange : 'rgba(255,255,255,.45)',
                  }}
                >
                  {done
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span style={{ width: 1.5, height: 30, background: done ? C.orange : 'rgba(255,255,255,.15)' }} />
                )}
              </div>
              <span
                className="text-[14px] font-semibold"
                style={{ paddingTop: 4, color: current ? '#fff' : done ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.4)' }}
              >
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-auto text-[12.5px]" style={{ color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>
        Your voice becomes finished writing,<br />in any app on your PC.
      </p>
    </aside>
  )
}

// ── Steps ──────────────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }) {
  return (
    <div className="flex flex-col h-full">
      <Heading eyebrow="Welcome to Lisup" title="Talk. Lisup writes.">
        Speak naturally in any app. Lisup removes the ums, fixes the grammar, and types it for you.
      </Heading>

      <div className="mt-8" style={{ background: C.soft, borderRadius: 16, padding: '20px 22px' }}>
        <p className="text-[11.5px] font-semibold" style={{ color: C.faint }}>What you say</p>
        <p className="text-[14.5px] mt-1.5" style={{ color: C.faint, textDecoration: 'line-through', textDecorationColor: '#D5CFC6' }}>
          um so i wanna uh send the report on friday no wait monday
        </p>
        <div className="flex items-center gap-2 my-3" style={{ color: C.orange }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
          <span className="text-[11.5px] font-semibold">What Lisup types</span>
        </div>
        <p className="text-[16px] font-medium" style={{ color: C.text }}>I want to send the report on Monday.</p>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {['Works in every app', 'Cleans up as you speak', 'Rewrites selected text'].map(t => (
          <span key={t} className="text-[12.5px] font-medium" style={{ padding: '6px 13px', borderRadius: 99, background: C.orangeWash, border: `1px solid ${C.orangeLine}`, color: C.orangeDark }}>
            {t}
          </span>
        ))}
      </div>

      <Footer>
        <span className="text-[12.5px]" style={{ color: C.faint }}>Takes about two minutes</span>
        <PrimaryButton onClick={onNext}>Get started</PrimaryButton>
      </Footer>
    </div>
  )
}

function GroqStep({ onBack, onNext }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { window.electronAPI?.getApiKey().then(k => k && setKey(k)) }, [])

  async function paste() {
    try { setKey((await navigator.clipboard.readText()).trim()) } catch {}
  }

  async function verify() {
    const trimmed = key.trim()
    if (!trimmed) { setError('Paste your Groq API key to continue.'); return }
    if (!trimmed.startsWith('gsk_')) { setError('Groq keys start with “gsk_”. Check you copied the whole key.'); return }
    setBusy(true); setError('')
    try {
      await validateApiKey(trimmed)
      await window.electronAPI.setApiKey(trimmed)
      onNext()
    } catch (err) {
      setError(err?.message === 'INVALID_API_KEY'
        ? 'Groq rejected this key. Create a new one and try again.'
        : 'Couldn’t verify the key. Check your internet connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Heading eyebrow="Step 2 of 5" title="Connect your free Groq key">
        Lisup uses Groq for fast speech recognition and AI. It’s free to start — no credit card needed.
      </Heading>

      <div className="grid grid-cols-3 gap-3 mt-7">
        {[
          ['1', 'Open the Groq console', 'Sign in or create a free account.'],
          ['2', 'Create an API key', 'Name it anything, e.g. “Lisup”.'],
          ['3', 'Paste it below', 'Copy the key that starts with gsk_.'],
        ].map(([n, t, d]) => (
          <div key={n} style={{ background: C.soft, borderRadius: 14, padding: '14px 14px 15px' }}>
            <span className="flex items-center justify-center text-[11.5px] font-bold" style={{ width: 22, height: 22, borderRadius: 99, background: '#fff', color: C.orangeDark, border: `1px solid ${C.orangeLine}` }}>{n}</span>
            <p className="text-[13px] font-semibold mt-2.5" style={{ color: C.text }}>{t}</p>
            <p className="text-[12px] mt-1" style={{ color: C.muted, lineHeight: 1.45 }}>{d}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.electronAPI?.openGroqKeys()}
        className="no-drag self-start text-[13px] font-semibold mt-4 transition-opacity hover:opacity-75"
        style={{ color: C.orangeDark }}
      >
        Open Groq console →
      </button>

      <label htmlFor="ob-key" className="block text-[12.5px] font-semibold mt-5 mb-2" style={{ color: C.text }}>Groq API key</label>
      <div className="relative no-drag">
        <input
          id="ob-key"
          type={show ? 'text' : 'password'}
          value={key}
          onChange={e => { setKey(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="gsk_••••••••••••••••••••"
          autoFocus
          spellCheck={false}
          className="w-full text-[14px] outline-none transition-colors"
          style={{ background: C.soft, color: C.text, border: `1.5px solid ${error ? C.danger : C.line}`, borderRadius: 12, padding: '13px 112px 13px 15px' }}
          onFocus={e => { if (!error) e.target.style.borderColor = C.orange }}
          onBlur={e => { if (!error) e.target.style.borderColor = C.line }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-3">
          <button onClick={paste} className="text-[12px] font-semibold hover:opacity-70" style={{ color: C.muted }}>Paste</button>
          <button onClick={() => setShow(s => !s)} className="text-[12px] font-semibold hover:opacity-70" style={{ color: C.muted }}>{show ? 'Hide' : 'Show'}</button>
        </div>
      </div>
      {error
        ? <p className="text-[12.5px] mt-2" style={{ color: C.danger }}>{error}</p>
        : <p className="text-[12px] mt-2" style={{ color: C.faint }}>Stored encrypted on this PC. Only ever sent to Groq.</p>}

      <Footer>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={verify} busy={busy}>Verify &amp; continue</PrimaryButton>
      </Footer>
    </div>
  )
}

function MicStep({ onBack, onNext }) {
  const [phase, setPhase] = useState('idle') // idle | asking | live | denied
  const [level, setLevel] = useState(0)
  const [heard, setHeard] = useState(false)
  const [device, setDevice] = useState('')
  const cleanup = useRef(() => {})

  useEffect(() => () => cleanup.current(), [])

  const allow = useCallback(async () => {
    setPhase('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      let raf = 0
      let loud = 0

      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) { const x = (v - 128) / 128; sum += x * x }
        const lv = Math.min(1, Math.sqrt(sum / data.length) * 7)
        setLevel(lv)
        if (lv > 0.14 && ++loud > 5) setHeard(true)
        raf = requestAnimationFrame(tick)
      }
      tick()

      setDevice(stream.getAudioTracks()[0]?.label || 'Default microphone')
      setPhase('live')
      cleanup.current = () => {
        cancelAnimationFrame(raf)
        stream.getTracks().forEach(t => t.stop())
        ctx.close().catch(() => {})
      }
    } catch {
      setPhase('denied')
    }
  }, [])

  const bars = Array.from({ length: 21 }, (_, i) => {
    const centre = 1 - Math.abs(i - 10) / 11
    return Math.max(0.1, Math.min(1, level * (0.45 + centre) * (0.8 + 0.4 * Math.sin(i * 1.7 + level * 9))))
  })

  return (
    <div className="flex flex-col h-full">
      <Heading eyebrow="Step 3 of 5" title="Let Lisup hear you">
        Lisup only listens while you hold a shortcut. Audio is sent to Groq to be transcribed and isn’t kept.
      </Heading>

      <div className="mt-8 flex flex-col items-center justify-center" style={{ background: C.soft, borderRadius: 18, padding: '30px 24px', minHeight: 196 }}>
        <div className="flex items-end justify-center gap-[5px]" style={{ height: 64 }} aria-hidden>
          {bars.map((b, i) => (
            <span key={i} style={{
              width: 6, height: `${Math.round(8 + b * 56)}px`, borderRadius: 4,
              background: phase === 'live' ? (heard ? C.green : C.orange) : '#D5CFC6',
              transition: 'height 70ms linear, background 200ms',
            }} />
          ))}
        </div>

        <p className="text-[14px] font-semibold mt-5 text-center" style={{ color: C.text }}>
          {phase === 'idle' && 'Allow microphone access to continue'}
          {phase === 'asking' && 'Waiting for permission…'}
          {phase === 'live' && (heard ? 'We can hear you — sounds great' : 'Say something — the bars should move')}
          {phase === 'denied' && 'Microphone access was blocked'}
        </p>
        {phase === 'live' && <p className="text-[12px] mt-1" style={{ color: C.faint }}>{device}</p>}
        {phase === 'denied' && (
          <p className="text-[12.5px] mt-1.5 text-center" style={{ color: C.muted, maxWidth: 380, lineHeight: 1.5 }}>
            Turn on “Let desktop apps access your microphone” in Windows privacy settings, then try again.
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-5 no-drag">
        {(phase === 'idle' || phase === 'denied') && (
          <button onClick={allow} className="text-[13.5px] font-semibold transition-opacity hover:opacity-85" style={{ background: C.orange, color: '#fff', borderRadius: 11, padding: '11px 20px' }}>
            {phase === 'denied' ? 'Try again' : 'Allow microphone'}
          </button>
        )}
        {phase === 'denied' && (
          <button onClick={() => window.electronAPI?.openMicSettings()} className="text-[13.5px] font-semibold transition-colors hover:opacity-75" style={{ border: `1.5px solid ${C.line}`, color: C.text, borderRadius: 11, padding: '11px 20px' }}>
            Open Windows settings
          </button>
        )}
      </div>

      <Footer>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onNext}>{phase === 'live' ? 'Continue' : 'Skip for now'}</PrimaryButton>
      </Footer>
    </div>
  )
}

function ShortcutCard({ keys, tag, title, desc }) {
  return (
    <div style={{ background: C.soft, borderRadius: 16, padding: '16px 16px 17px' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {keys.map(k => <Keycap key={k}>{k}</Keycap>)}
        </div>
        <span className="text-[11.5px] font-semibold" style={{ color: C.orangeDark, background: C.orangeWash, border: `1px solid ${C.orangeLine}`, borderRadius: 99, padding: '3px 10px' }}>{tag}</span>
      </div>
      <p className="text-[14px] font-semibold mt-3.5" style={{ color: C.text }}>{title}</p>
      <p className="text-[12.5px] mt-1" style={{ color: C.muted, lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

function KeysStep({ onBack, onNext }) {
  return (
    <div className="flex flex-col h-full">
      <Heading eyebrow="Step 4 of 5" title="Four ways to use Lisup" />
      <div className="grid grid-cols-2 gap-3 mt-6">
        <ShortcutCard keys={['Ctrl', 'Win']} tag="Tap" title="Open the widget" desc="Pick a mode, run a command on copied text, review the result." />
        <ShortcutCard keys={['Ctrl', 'Win']} tag="Hold" title="Dictate anywhere" desc="Keep holding while you speak. Let go and the text is typed for you." />
        <ShortcutCard keys={['Ctrl', 'Win']} tag="Double-tap" title="Hands-free" desc="Double-tap to start talking, tap once more when you’re done." />
        <ShortcutCard keys={['Ctrl', 'Alt']} tag="Hold" title="Rewrite a selection" desc="Select text, hold, say “make it shorter”. It’s replaced in place." />
      </div>
      <div className="flex items-center gap-3 mt-5" style={{ background: C.orangeWash, border: `1px solid ${C.orangeLine}`, borderRadius: 14, padding: '12px 16px' }}>
        <span style={{ width: 44, height: 8, borderRadius: 99, background: C.ink, border: '1px solid rgba(255,255,255,.3)', flexShrink: 0 }} />
        <p className="text-[12.5px]" style={{ color: C.orangeDark, lineHeight: 1.5 }}>
          The small bar at the bottom of your screen is always there. Click it any time to start talking, and click it again when you’re done.
        </p>
      </div>
      <Footer>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </Footer>
    </div>
  )
}

function TryStep({ onBack, onFinish, finishing }) {
  const [text, setText] = useState('')
  const area = useRef(null)
  useEffect(() => { area.current?.focus() }, [])
  const worked = text.trim().length > 0

  return (
    <div className="flex flex-col h-full">
      <Heading eyebrow="Step 5 of 5" title="Give it a try">
        Click the box, then hold <b style={{ color: C.text }}>Ctrl + Win</b>, say a sentence, and let go. Or click the bar below, speak, and click it again.
      </Heading>

      <div className="relative mt-6 no-drag">
        <textarea
          ref={area}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Your words will appear here…"
          rows={5}
          className="w-full text-[15px] outline-none resize-none transition-colors"
          style={{ background: C.soft, color: C.text, border: `1.5px solid ${worked ? C.green : C.line}`, borderRadius: 16, padding: '16px 18px', lineHeight: 1.6 }}
          onFocus={e => { if (!worked) e.target.style.borderColor = C.orange }}
          onBlur={e => { if (!worked) e.target.style.borderColor = C.line }}
        />
      </div>

      <div className="flex items-center gap-2.5 mt-4" style={{ minHeight: 24 }}>
        {worked ? (
          <>
            <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 99, background: C.green }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            <span className="text-[13.5px] font-semibold" style={{ color: C.green }}>That’s it — Lisup works the same way in every app.</span>
          </>
        ) : (
          <>
            <span className="wave-bar" style={{ width: 8, height: 8, borderRadius: 99, background: C.orange }} />
            <span className="text-[13px]" style={{ color: C.muted }}>Waiting for your voice… (you can also skip this)</span>
          </>
        )}
      </div>

      <Footer>
        <GhostButton onClick={onBack}>← Back</GhostButton>
        <PrimaryButton onClick={onFinish} busy={finishing}>{worked ? 'Finish setup' : 'Skip & finish'}</PrimaryButton>
      </Footer>
    </div>
  )
}

// ── Wizard ─────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep(s => Math.max(0, s - 1))

  async function finish() {
    setFinishing(true)
    await window.electronAPI?.completeOnboarding()
  }

  return (
    // 16px transparent margin leaves room for the card's drop shadow
    <div className="w-full h-full" style={{ padding: 16 }}>
      <div
        className="flex w-full h-full overflow-hidden"
        style={{ background: '#fff', borderRadius: 24, boxShadow: '0 24px 60px -18px rgba(35,32,28,.5), 0 2px 6px rgba(0,0,0,.08)', border: `1px solid ${C.line}` }}
      >
        <Rail step={step} />

        <main className="relative flex-1 min-w-0 flex flex-col">
          {/* title-bar strip: drag area + window buttons */}
          <div className="drag flex justify-end items-center flex-shrink-0" style={{ height: 46, paddingRight: 14 }}>
            <div className="no-drag flex gap-1">
              <WinButton label="Minimize" onClick={() => window.electronAPI?.minimizeWindow()}>
                <path d="M5 12h14" />
              </WinButton>
              <WinButton label="Close" onClick={() => window.electronAPI?.closeWindow()}>
                <path d="M6 6l12 12M18 6L6 18" />
              </WinButton>
            </div>
          </div>

          <div key={step} className="step-in flex-1 min-h-0 flex flex-col" style={{ padding: '0 52px 36px' }}>
            {step === 0 && <WelcomeStep onNext={next} />}
            {step === 1 && <GroqStep onBack={back} onNext={next} />}
            {step === 2 && <MicStep onBack={back} onNext={next} />}
            {step === 3 && <KeysStep onBack={back} onNext={next} />}
            {step === 4 && <TryStep onBack={back} onFinish={finish} finishing={finishing} />}
          </div>
        </main>
      </div>
    </div>
  )
}

function WinButton({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex items-center justify-center transition-colors hover:bg-[#F5F4F1]"
      style={{ width: 32, height: 32, borderRadius: 9, color: C.faint }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{children}</svg>
    </button>
  )
}
