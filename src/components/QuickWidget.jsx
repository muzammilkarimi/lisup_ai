// The compact floating bar shown during hold / double-press / click / edit
// recording: a small dark capsule that grows out of the idle pill. Kept short
// on purpose so it never covers much of the screen.
const LABELS = {
  hold:   'Listening…',
  double: 'Listening…',
  click:  'Listening…',
  edit:   'Say your edit…',
}

export default function QuickWidget({ mode, status, error, wordCount, onCancel, onStop }) {
  // In hands-free modes (click the pill / double-tap) the whole bar is the
  // "finish" button: click it to stop listening and insert. The ✕ cancels.
  const clickToStop = status === 'recording' && (mode === 'click' || mode === 'double')

  return (
    <div
      className={`flex items-center gap-2.5 pill-in${clickToStop ? ' stop-bar' : ''}`}
      onClick={clickToStop ? onStop : undefined}
      title={clickToStop ? 'Click to stop and insert' : undefined}
      style={{
        maxWidth: 300, minHeight: 36, padding: '5px 8px 5px 13px',
        borderRadius: 18, background: '#23201C', border: '1px solid rgba(255,255,255,.14)',
        boxShadow: '0 8px 22px -10px rgba(0,0,0,.55)',
        cursor: clickToStop ? 'pointer' : 'default',
      }}
    >
      {status === 'recording' && (
        <>
          <Wave />
          <span className="text-[12.5px] font-medium text-white whitespace-nowrap" style={{ paddingRight: 2 }}>
            {clickToStop ? (
              <span className="stop-label">
                <span className="when-idle">{LABELS[mode] || 'Listening…'}</span>
                <span className="when-hover">Click to stop</span>
              </span>
            ) : (LABELS[mode] || 'Listening…')}
          </span>
          {clickToStop && <CancelBtn onClick={onCancel} />}
        </>
      )}

      {status === 'processing' && (
        <>
          <Spinner />
          <span className="text-[12.5px] font-medium text-white whitespace-nowrap" style={{ paddingRight: 6 }}>Processing…</span>
        </>
      )}

      {status === 'done' && (
        <>
          <CheckMark />
          <span className="text-[12.5px] font-medium text-white whitespace-nowrap" style={{ paddingRight: 6 }}>
            {mode === 'edit' ? 'Replaced' : 'Inserted'}
            {wordCount > 0 && (
              <span style={{ color: '#A29B91', fontWeight: 400 }}> · {wordCount}</span>
            )}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <ErrorDot />
          <span className="flex-1 text-[12px] leading-[1.35]" style={{ color: '#F5A59A' }}>
            {error || 'Something went wrong'}
          </span>
          <CancelBtn onClick={onCancel} />
        </>
      )}
    </div>
  )
}

function Wave() {
  return (
    <div className="flex items-center gap-[2px] flex-shrink-0" style={{ height: 16 }} aria-hidden>
      {[0, 0.15, 0.3, 0.45].map((delay, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{ width: 2.5, height: 14, borderRadius: 2, background: '#E07B39', animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="flex-shrink-0 animate-spin"
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="#E07B39" strokeWidth="2.4" strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function CheckMark() {
  return (
    <div
      className="flex-shrink-0 w-[20px] h-[20px] rounded-full flex items-center justify-center"
      style={{ background: 'rgba(74,222,128,.16)' }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
  )
}

function ErrorDot() {
  return <div className="flex-shrink-0 w-[8px] h-[8px] rounded-full" style={{ background: '#F87171' }} />
}

// Icon-only button keeps the bar small
function CancelBtn({ onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title="Cancel"
      aria-label="Cancel"
      className="flex-shrink-0 w-[24px] h-[24px] rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
      style={{ background: 'rgba(255,255,255,.1)' }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#C9C3BA" strokeWidth="2.8" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}
