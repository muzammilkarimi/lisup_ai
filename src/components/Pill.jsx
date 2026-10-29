import { useState } from 'react'

// The always-visible idle bar: a tiny dark capsule pinned bottom-center.
// Hovering grows it into a labelled button; clicking opens the full widget.
export default function Pill({ onRecord, onOpen, needsSetup }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-end justify-center"
      style={{ padding: hover ? '10px 14px' : '10px 18px', cursor: 'pointer' }}
      onClick={needsSetup ? onOpen : onRecord}
      title={needsSetup ? 'Finish setup' : 'Click to speak'}
    >
      {hover ? (
        <div
          className="flex items-center gap-2 pill-in"
          style={{
            height: 34, padding: '0 14px 0 8px', borderRadius: 99,
            background: '#23201C', border: '1px solid rgba(255,255,255,.14)',
            boxShadow: '0 6px 18px -6px rgba(0,0,0,.5)',
          }}
        >
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22, borderRadius: 99, background: needsSetup ? '#D9A23A' : '#E07B39' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
            </svg>
          </span>
          <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,.88)' }}>
            {needsSetup ? 'Finish setup' : 'Click to speak'}
          </span>
          {!needsSetup && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpen() }}
              title="Open widget"
              aria-label="Open widget"
              className="flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/20"
              style={{ width: 22, height: 22, borderRadius: 99, background: 'rgba(255,255,255,.1)', marginLeft: 2 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            width: 52, height: 8, borderRadius: 99,
            background: '#23201C', border: '1px solid rgba(255,255,255,.28)',
            boxShadow: needsSetup ? '0 0 0 2px rgba(217,162,58,.55)' : '0 1px 4px rgba(0,0,0,.35)',
          }}
        />
      )}
    </div>
  )
}
