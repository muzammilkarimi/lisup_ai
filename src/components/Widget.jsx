import { QUICK_COMMANDS } from '../services/commands.js'

// Shared header used by all views
function Header({ onHide, onOpenSettings }) {
  return (
    <div className="flex justify-between items-center" style={{ padding: '17px 20px 0' }}>
      <button
        onClick={onOpenSettings}
        className="text-[13px] font-semibold tracking-[-0.01em] hover:opacity-70 transition-opacity"
        style={{ color: '#A29B91' }}
      >
        Suniye Ji
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

// 📋 Clipboard pill shown in Idle / Listening / Thinking
function ClipboardPill({ text, onRefresh }) {
  return (
    <div className="flex items-center gap-1.5 mx-5 mt-3">
      <div
        className="flex-1 min-w-0 text-[12.5px] rounded-[10px] truncate leading-none"
        style={{ background: '#F5F4F1', color: '#8C857B', padding: '9px 12px' }}
        title={text || ''}
      >
        {text && text.trim()
          ? <>📋 {text.slice(0, 42)}{text.length > 42 ? '…' : ''}</>
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

// Command chips row
function ChipRow({ onRunCommand, disabled }) {
  return (
    <div className="flex flex-wrap justify-center gap-[6px] px-5 pb-5 mt-4">
      {QUICK_COMMANDS.map((cmd) => (
        <button
          key={cmd}
          onClick={() => onRunCommand(cmd)}
          disabled={disabled}
          className="text-[11px] font-medium rounded-chip transition-all disabled:opacity-40"
          style={{
            color: '#9A938A',
            border: '1px solid #ECE7DF',
            padding: '5px 11px',
            background: 'white',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E07B39'; e.currentTarget.style.color = '#C0631F' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#ECE7DF'; e.currentTarget.style.color = '#9A938A' }}
        >
          {cmd}
        </button>
      ))}
    </div>
  )
}

// ── Views ──────────────────────────────────────────────────────────────────

function IdleView({ onStart }) {
  return (
    <div className="flex flex-col items-center pt-6 pb-2">
      {/* Mic button */}
      <button
        onClick={onStart}
        className="w-[74px] h-[74px] rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{ background: '#23201C', boxShadow: '0 8px 20px -8px rgba(35,32,28,.55)' }}
      >
        <MicIcon stroke="white" />
      </button>
      {/* Hint */}
      <p className="mt-[14px] text-[13.5px] font-medium" style={{ color: '#9A938A' }}>
        Press to speak
      </p>
    </div>
  )
}

function ListeningView({ onStop }) {
  return (
    <div className="flex flex-col items-center pt-6 pb-2">
      {/* Mic + pulse rings */}
      <div className="relative flex items-center justify-center w-[74px] h-[74px]">
        {/* Ring A */}
        <span
          className="absolute inset-0 rounded-full animate-ring-a"
          style={{ background: '#E07B39' }}
        />
        {/* Ring B */}
        <span
          className="absolute inset-0 rounded-full animate-ring-b"
          style={{ background: '#E07B39' }}
        />
        <button
          onClick={onStop}
          className="relative w-[74px] h-[74px] rounded-full flex items-center justify-center z-10 transition-transform active:scale-95"
          style={{ background: '#E07B39', boxShadow: '0 8px 22px -8px rgba(224,123,57,.6)' }}
        >
          <MicIcon stroke="white" />
        </button>
      </div>
      <p className="mt-[22px] text-[14px] font-semibold" style={{ color: '#26231F' }}>
        Listening…
      </p>
      {/* Stop button */}
      <button
        onClick={onStop}
        className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium rounded-chip transition-opacity hover:opacity-70"
        style={{
          background: '#F5F4F1',
          border: '1px solid #ECE7DF',
          color: '#7A746B',
          padding: '6px 14px',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="#7A746B">
          <rect x="1" y="1" width="8" height="8" rx="1.5" />
        </svg>
        Stop
      </button>
    </div>
  )
}

function ThinkingView({ detectedCommand }) {
  const label = detectedCommand
    ? (detectedCommand.command
        ? `${detectedCommand.command}${detectedCommand.type === 'intent' ? '' : ''}`
        : detectedCommand.instruction?.slice(0, 28))
    : null

  return (
    <div className="flex flex-col items-center pt-8 pb-4 px-5">
      {/* Bouncing dots */}
      <div className="flex gap-[6px]">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`w-[10px] h-[10px] rounded-full ${['animate-dot-1', 'animate-dot-2', 'animate-dot-3'][i]}`}
            style={{ background: '#23201C' }}
          />
        ))}
      </div>
      <p className="mt-4 text-[14px] font-semibold" style={{ color: '#26231F' }}>
        Processing…
      </p>
      {label && (
        <div
          className="mt-3 flex items-center gap-2 rounded-chip px-3 py-1.5 text-[12px]"
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
    <div className="px-5 pt-5 pb-5">
      {/* Result box */}
      <div
        className="text-[13.5px] leading-[1.62] rounded-inner overflow-y-auto result-scroll"
        style={{
          background: '#F5F4F1',
          color: '#33302B',
          padding: '15px 16px',
          maxHeight: '148px',
        }}
      >
        {result}
      </div>
      {/* Buttons */}
      <div className="flex gap-[10px] mt-3">
        <button
          onClick={onInject}
          className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-btn transition-opacity hover:opacity-80 active:scale-[.98]"
          style={{ background: '#23201C', color: 'white', padding: '10px 0' }}
        >
          Inject
          <span style={{ opacity: 0.6 }}>↵</span>
        </button>
        <button
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-btn transition-colors hover:bg-gray-50 active:scale-[.98]"
          style={{ border: '1px solid #E2DDD5', color: '#524E47', padding: '10px 0', background: 'white' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </button>
      </div>
      {/* Caption */}
      <p className="text-center mt-2.5 text-[11.5px]" style={{ color: '#A9A299' }}>
        Will paste into your active app
      </p>
    </div>
  )
}

function ErrorView({ error, onTryAgain }) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-8 pb-8 gap-3">
      {/* Error icon */}
      <div
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#FBECE8' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CB4F37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div>
        <p className="text-[14px] font-semibold mb-1" style={{ color: '#26231F' }}>
          Couldn't hear anything
        </p>
        <p className="text-[13px] leading-[1.55]" style={{ color: '#9A938A' }}>
          {error || "Your mic stayed quiet. Check it's not muted and try again."}
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

// ── Root ───────────────────────────────────────────────────────────────────

export default function Widget({
  status,
  clipboardText,
  result,
  error,
  detectedCommand,
  onStartRecording,
  onStopRecording,
  onInject,
  onCopy,
  onRunCommand,
  onHide,
  onOpenSettings,
  onRefreshClipboard,
  onTryAgain,
}) {
  const showPill = status !== 'done' && status !== 'error'

  return (
    <div
      className="w-[380px] rounded-widget select-none overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #ECE8E1',
        boxShadow: '0 24px 60px -22px rgba(58,48,33,.45), 0 1px 2px rgba(0,0,0,.04)',
      }}
    >
      <Header onHide={onHide} onOpenSettings={onOpenSettings} />

      {showPill && (
        <ClipboardPill text={clipboardText} onRefresh={onRefreshClipboard} />
      )}

      {status === 'idle' && (
        <>
          <IdleView onStart={onStartRecording} />
          <ChipRow onRunCommand={onRunCommand} disabled={false} />
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
          <ThinkingView detectedCommand={detectedCommand} />
          <div className="pb-2" />
        </>
      )}
      {status === 'done' && (
        <DoneView result={result} onInject={onInject} onCopy={onCopy} />
      )}
      {status === 'error' && (
        <ErrorView error={error} onTryAgain={onTryAgain} />
      )}
    </div>
  )
}

// Shared mic SVG
function MicIcon({ stroke = 'white' }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" />
    </svg>
  )
}
