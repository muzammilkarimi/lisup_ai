export default function QuickWidget({ mode, status, error, wordCount, onCancel }) {
  return (
    <div className="px-3 pb-3">
      <div
        className="flex items-center gap-3 px-4 rounded-[18px]"
        style={{ background: '#1A1A1A', height: '60px' }}
      >
        {status === 'recording' && (
          <>
            <PulsingDot />
            <span className="flex-1 text-[13px] font-medium text-white">Recording…</span>
            {mode === 'double' && <CancelBtn onClick={onCancel} />}
          </>
        )}

        {status === 'processing' && (
          <>
            <Spinner />
            <span className="flex-1 text-[13px] font-medium text-white">Processing…</span>
          </>
        )}

        {status === 'done' && (
          <>
            <CheckMark />
            <span className="flex-1 text-[13px] font-medium text-white">
              Injected
              {wordCount > 0 && (
                <span style={{ color: '#A29B91', fontWeight: 400 }}> · {wordCount} words</span>
              )}
            </span>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorDot />
            <span className="flex-1 text-[12.5px]" style={{ color: '#F87171' }}>
              {error || 'Something went wrong'}
            </span>
            <CancelBtn onClick={onCancel} />
          </>
        )}
      </div>
    </div>
  )
}

function PulsingDot() {
  return (
    <div className="relative flex-shrink-0 w-[28px] h-[28px] flex items-center justify-center">
      <div
        className="absolute w-full h-full rounded-full animate-ping"
        style={{ background: '#E07B39', opacity: 0.3 }}
      />
      <div className="w-[14px] h-[14px] rounded-full" style={{ background: '#E07B39' }} />
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="flex-shrink-0 animate-spin"
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="#E07B39" strokeWidth="2.2" strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function CheckMark() {
  return (
    <div
      className="flex-shrink-0 w-[28px] h-[28px] rounded-full flex items-center justify-center"
      style={{ background: '#16A34A22' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
  )
}

function ErrorDot() {
  return (
    <div className="flex-shrink-0 w-[10px] h-[10px] rounded-full" style={{ background: '#F87171' }} />
  )
}

function CancelBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[28px] h-[28px] rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
      style={{ background: '#2C2C2C' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}
