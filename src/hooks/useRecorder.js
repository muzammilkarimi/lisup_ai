import { useState, useRef, useCallback } from 'react'

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const startPromise = useRef(null)

  const releaseStream = () => {
    mediaRecorder.current?.stream?.getTracks().forEach((t) => t.stop())
  }

  const startRecording = useCallback(() => {
    // Stop any previous recorder/stream so a second start never leaks the mic
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      try { mediaRecorder.current.stop() } catch {}
    }
    releaseStream()

    const p = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {}
      const recorder = new MediaRecorder(stream, options)
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      mediaRecorder.current = recorder
      recorder.start()
      setIsRecording(true)
    })()

    startPromise.current = p
    return p
  }, [])

  const stopRecording = useCallback(async () => {
    // A quick release can arrive before getUserMedia resolves — wait for start
    if (startPromise.current) {
      try { await startPromise.current } catch {}
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorder.current
      if (!recorder || recorder.state === 'inactive') {
        releaseStream()
        setIsRecording(false)
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' })
        recorder.stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        resolve(blob)
      }

      recorder.stop()
    })
  }, [])

  return { isRecording, startRecording, stopRecording }
}
