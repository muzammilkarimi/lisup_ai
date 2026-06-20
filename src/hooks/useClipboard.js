import { useState, useCallback } from 'react'

export function useClipboard() {
  const [clipboardText, setClipboardText] = useState('')

  const readClipboard = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const text = await window.electronAPI.readClipboard()
        setClipboardText(text || '')
        return text || ''
      }
    } catch {
      setClipboardText('')
    }
    return ''
  }, [])

  return { clipboardText, readClipboard }
}
