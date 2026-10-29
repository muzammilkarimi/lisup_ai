import { useLayoutEffect, useRef } from 'react'

// Wraps whatever the floating bar is showing (idle pill, recording bar, full
// widget) and reports its exact size to the main process, which resizes the
// transparent window to fit and keeps it anchored bottom-center. `padding` is
// the transparent breathing room for drop shadows / hover hit-area.
export default function BarFrame({ children, padding = 0 }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let last = ''

    const report = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const w = Math.ceil(r.width)
        const h = Math.ceil(r.height)
        const key = `${w}x${h}`
        if (key === last || !w || !h) return
        last = key
        window.electronAPI?.resizeBar?.(w, h)
      })
    }

    const ro = new ResizeObserver(report)
    ro.observe(el)
    report()
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div ref={ref} style={{ width: 'max-content', padding }}>
      {children}
    </div>
  )
}
