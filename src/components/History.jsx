import { useState, useEffect } from 'react'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function History({ onBack }) {
  const [items, setItems] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    window.electronAPI?.getHistory().then(h => setItems(h || []))
  }, [])

  async function handleCopy(item) {
    await window.electronAPI?.writeClipboard(item.text)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  async function handleClear() {
    await window.electronAPI?.clearHistory()
    setItems([])
  }

  return (
    <div
      className="w-[400px] rounded-widget select-none pb-3"
      style={{ background: '#FFFFFF', border: '1px solid #ECE8E1', boxShadow: '0 24px 60px -22px rgba(58,48,33,.45), 0 1px 2px rgba(0,0,0,.04)' }}
    >
      <div className="flex justify-between items-center" style={{ padding: '14px 18px 0' }}>
        <button onClick={onBack} className="text-[12.5px] font-semibold hover:opacity-70" style={{ color: '#7A746B' }}>
          ← Back
        </button>
        <span className="text-[13px] font-semibold" style={{ color: '#26231F' }}>History</span>
        {items?.length > 0
          ? <button onClick={handleClear} className="text-[11.5px] hover:opacity-70" style={{ color: '#CB4F37' }}>Clear</button>
          : <span style={{ width: 28 }} />}
      </div>

      <div className="px-4 pt-3 overflow-y-auto" style={{ maxHeight: 420 }}>
        {items === null && <p className="text-center text-[12.5px] py-6" style={{ color: '#9A938A' }}>Loading…</p>}
        {items?.length === 0 && (
          <p className="text-center text-[12.5px] py-8" style={{ color: '#9A938A' }}>
            Nothing yet. Your last 50 results will show up here.
          </p>
        )}
        {items?.map(item => (
          <div key={item.id} className="rounded-inner mb-2" style={{ background: '#F5F4F1', padding: '10px 12px' }}>
            <p
              className="text-[12.5px] leading-[1.55]"
              style={{ color: '#33302B', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'pre-wrap' }}
              title={item.text}
            >
              {item.text}
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px]" style={{ color: '#A9A299' }}>{timeAgo(item.ts)}</span>
              <div className="flex gap-3">
                <button onClick={() => handleCopy(item)} className="text-[11.5px] font-semibold hover:opacity-70" style={{ color: '#524E47' }}>
                  {copiedId === item.id ? 'Copied ✓' : 'Copy'}
                </button>
                <button
                  onClick={() => window.electronAPI?.injectText(item.text)}
                  className="text-[11.5px] font-semibold hover:opacity-70" style={{ color: '#C0631F' }}
                >
                  Inject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
