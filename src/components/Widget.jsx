import { QUICK_COMMANDS } from '../services/commands.js'

const TONES = [
  { key: 'formal',  label: 'Formal'  },
  { key: 'casual',  label: 'Casual'  },
  { key: 'funny',   label: 'Funny'   },
  { key: 'polite',  label: 'Polite'  },
  { key: 'social',  label: 'Social'  },
]

// ── Shared header ──────────────────────────────────────────────────────────────

function Header({ onHide, onOpenSettings }) {
  return (
    <div className="flex justify-between items-center" style={{ padding: '14px 18px 0' }}>
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 hover:opacity-70 transition-opacity"
      >
        <div
          className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center flex-shrink-0"
          style={{ background: '#E07B39' }}
        >
          <span className="text-white font-bold" style={{ fontSize: '11px', lineHeight: 1 }}>स</span>
        </div>
        <span className="text-[13px] font-semibold" style={{ color: '#A29B91' }}>
          Suniye <span style={{ color: '#E07B39' }}>Ji</span>
        </span>
      </button>
      <button
        onClick={onHide}
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
        style={{ background: '#F5F4F1' }}
        title="Close (Esc)"
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M1 1L8 8M8 1L1 8" stroke="#BDB6AC" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ── Clipboard pill ─────────────────────────────────────────────────────────────

function ClipboardPill({ text, onRefresh }) {
  return (
    <div className="flex items-center gap-1.5 mx-4 mt-2.5">
      <div
        className="flex-1 min-w-0 text-[12px] rounded-[9px] truncate leading-none"
        style={{ background: '#F5F4F1', color: '#8C857B', padding: '7px 11px' }}
        title={text || ''}
      >
        {text && text.trim()
          ? <>📋 {text.slice(0, 44)}{text.length > 44 ? '…' : ''}</>
          : <span style={{ color: '#C5BFB8' }}>📋 Copy text, then speak a command</span>
        }
      </div>
      <button
        onClick={onRefresh}
        title="Re-read clipboard"
        className="flex-shrink-0 transition-opacity hover:opacity-60"
        style={{ color: '#C5BFB8' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M4 4v5h5M20 20v-5h-5" />
          <path d="M4 9a9 9 0 0 1 15-4.5M20 15a9 9 0 0 1-15 4.5" />
        </svg>
      </button>
    </div>
  )
}

// ── Command chips (idle) ───────────────────────────────────────────────────────

function ChipRow({ onRunCommand }) {
  return (
    <div className="flex flex-wrap justify-center gap-[5px] px-4 pb-4 mt-3">
      {QUICK_COMMANDS.map((cmd) => (
        <button
          key={cmd}
          onClick={() => onRunCommand(cmd)}
          className="text-[11px] font-medium rounded-chip transition-all"
          style={{ color: '#9A938A', border: '1px solid #ECE7DF', padding: '4px 10px', background: 'white' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E07B39'; e.currentTarget.style.color = '#C0631F' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#ECE7DF'; e.currentTarget.style.color = '#9A938A' }}
        >
          {cmd}
        </button>
      ))}
    </div>
  )
}

// ── Tone chips (done + transcribe mode) ───────────────────────────────────────

function ToneChips({ activeTone, onApplyTone }) {
  return (
    <div className="px-4 pb-4 mt-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11.5px]" style={{ color: '#BDB6AC' }}>Tone:</span>
        {TONES.map(({ key, label }) => {
          const active = activeTone === key
          return (
            <button
              key={key}
              onClick={() => onApplyTone(key)}
              className="text-[11px] font-medium rounded-chip transition-all"
              style={{
                padding: '3px 9px',
                background: active ? '#E07B39' : 'white',
                color: active ? 'white' : '#9A938A',
                border: `1px solid ${active ? '#E07B39' : '#ECE7DF'}`,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── State views ────────────────────────────────────────────────────────────────

function IdleView({ onStart }) {
  return (
    <div className="flex flex-col items-center pt-4 pb-1">
      <button
        onClick={onStart}
        className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{ background: '#23201C', boxShadow: '0 8px 20px -8px rgba(35,32,28,.55)' }}
      >
        <MicIcon />
      </button>
      <p className="mt-3 text-[13px] font-medium" style={{ color: '#9A938A' }}>
        Press to speak
      </p>
    </div>
  )
}

function ListeningView({ onStop }) {
  return (
    <div className="flex flex-col items-center pt-4 pb-2">
      <div className="relative flex items-center justify-center w-[64px] h-[64px]">
        <span className="absolute inset-0 rounded-full animate-ring-a" style={{ background: '#E07B39' }} />
        <span className="absolute inset-0 rounded-full animate-ring-b" style={{ background: '#E07B39' }} />
        <button
          onClick={onStop}
          className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center z-10 transition-transform active:scale-95"
          style={{ background: '#E07B39', boxShadow: '0 8px 22px -8px rgba(224,123,57,.6)' }}
        >
          <MicIcon />
        </button>
      </div>
      <p className="mt-4 text-[14px] font-semibold" style={{ color: '#26231F' }}>Listening…</p>
      <button
        onClick={onStop}
        className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium rounded-chip transition-opacity hover:opacity-70"
        style={{ background: '#F5F4F1', border: '1px solid #ECE7DF', color: '#7A746B', padding: '5px 13px' }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="#7A746B">
          <rect x="1" y="1" width="8" height="8" rx="1.5" />
        </svg>
        Stop
      </button>
    </div>
  )
}

function ThinkingView({ detectedCommand, mode }) {
  const modeLabels = {
    transcribe: '🎙️ Cleaning transcript…',
    command:    `⚡ Running ${detectedCommand?.command || 'command'}…`,
    intent:     '🧠 Understanding intent…',
  }
  const label = detectedCommand
    ? (detectedCommand.command || detectedCommand.instruction?.slice(0, 28))
    : null

  return (
    <div className="flex flex-col items-center pt-6 pb-3 px-5">
      <div className="flex gap-[6px]">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`w-[9px] h-[9px] rounded-full ${['animate-dot-1', 'animate-dot-2', 'animate-dot-3'][i]}`}
            style={{ background: '#23201C' }}
          />
        ))}
      </div>
      <p className="mt-3 text-[13.5px] font-semibold" style={{ color: '#26231F' }}>Processing…</p>
      <p className="mt-0.5 text-[11.5px]" style={{ color: '#9A938A' }}>{modeLabels[mode] || '🧠 Understanding…'}</p>
      {label && (
        <div
          className="mt-2 flex items-center gap-2 rounded-chip px-3 py-1 text-[11.5px]"
          style={{ background: '#FBF1E9', border: '1px solid #F4DEC9' }}
        >
          <span style={{ color: '#9A938A' }}>Detected</span>
          <span className="font-semibold" style={{ color: '#C0631F' }}>{label}</span>
        </div>
      )}
    </div>
  )
}

function DoneView({ result, onInject, onCopy }) {
  return (
    <div className="px-4 pt-3 pb-2">
      <div
        className="text-[13px] leading-[1.6] rounded-inner overflow-y-auto"
        style={{ background: '#F5F4F1', color: '#33302B', padding: '12px 14px', maxHeight: '130px' }}
      >
        {result}
      </div>
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={onInject}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold rounded-btn transition-opacity hover:opacity-80 active:scale-[.98]"
          style={{ background: '#23201C', color: 'white', padding: '9px 0' }}
        >
          Inject <span style={{ opacity: 0.6 }}>↵</span>
        </button>
        <button
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold rounded-btn transition-colors hover:bg-gray-50 active:scale-[.98]"
          style={{ border: '1px solid #E2DDD5', color: '#524E47', padding: '9px 0', background: 'white' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      </div>
      <p className="text-center mt-1.5 text-[11px]" style={{ color: '#A9A299' }}>
        Will paste into your active app
      </p>
    </div>
  )
}

function ErrorView({ error, onTryAgain }) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-6 pb-6 gap-2.5">
      <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: '#FBECE8' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CB4F37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div>
        <p className="text-[14px] font-semibold mb-1" style={{ color: '#26231F' }}>Something went wrong</p>
        <p className="text-[13px] leading-[1.55]" style={{ color: '#9A938A' }}>
          {error || "Couldn't hear anything. Check your mic and try again."}
        </p>
      </div>
      <button
        onClick={onTryAgain}
        className="flex items-center gap-2 text-[13px] font-semibold rounded-btn transition-opacity hover:opacity-80 active:scale-[.98] mt-1"
        style={{ background: '#23201C', color: 'white', padding: '10px 20px' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Try again
      </button>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function Widget({
  status, mode, clipboardText, result, error,
  detectedCommand, activeTone,
  onStartRecording, onStopRecording, onInject, onCopy,
  onRunCommand, onApplyTone, onHide, onOpenSettings,
  onRefreshClipboard, onTryAgain,
}) {
  const showClipPill = status !== 'done' && status !== 'error'

  return (
    <div
      className="w-[400px] rounded-widget select-none overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #ECE8E1',
        boxShadow: '0 24px 60px -22px rgba(58,48,33,.45), 0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      <Header onHide={onHide} onOpenSettings={onOpenSettings} />

      {showClipPill && (
        <ClipboardPill text={clipboardText} onRefresh={onRefreshClipboard} />
      )}

      {status === 'idle' && (
        <>
          <IdleView onStart={onStartRecording} />
          <ChipRow onRunCommand={onRunCommand} />
        </>
      )}

      {status === 'listening' && (
        <>
          <ListeningView onStop={onStopRecording} />
          <div className="pb-5" />
        </>
      )}

      {status === 'thinking' && (
        <>
          <ThinkingView detectedCommand={detectedCommand} mode={mode} />
          <div className="pb-2" />
        </>
      )}

      {status === 'done' && (
        <>
          <DoneView result={result} onInject={onInject} onCopy={onCopy} />
          {mode === 'transcribe' && (
            <ToneChips activeTone={activeTone} onApplyTone={onApplyTone} />
          )}
        </>
      )}

      {status === 'error' && (
        <ErrorView error={error} onTryAgain={onTryAgain} />
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" />
    </svg>
  )
}
