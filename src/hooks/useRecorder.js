import { useState, useRef } from 'react'

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : {}
    mediaRecorder.current = new MediaRecorder(stream, options)
    chunks.current = []

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data)
    }

    mediaRecorder.current.start()
    setIsRecording(true)
  }

  function stopRecording() {
    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
        setIsRecording(false)
        resolve(null)
        return
      }

      mediaRecorder.current.onstop = () => {
        const mimeType = mediaRecorder.current.mimeType || 'audio/webm'
        const blob = new Blob(chunks.current, { type: mimeType })
        mediaRecorder.current.stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        resolve(blob)
      }

      mediaRecorder.current.stop()
    })
  }

  return { isRecording, startRecording, stopRecording }
}
