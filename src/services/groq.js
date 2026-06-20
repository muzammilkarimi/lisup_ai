const GROQ_BASE = 'https://api.groq.com/openai/v1'

export async function transcribeAudio(audioBlob, apiKey, language = 'auto') {
  const formData = new FormData()
  const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
  formData.append('file', audioFile)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'text')
  if (language && language !== 'auto') formData.append('language', language)

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (res.status >= 500) throw new Error('SERVER_ERROR')
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`)

  return (await res.text()).trim()
}

// tone: 'formal' | 'casual' | 'funny' | 'polite' | 'social' | null
export async function processWithAI(clipboardText, instruction, tone, apiKey, userName = '') {
  const toneInstruction = tone && tone !== 'none'
    ? `\nApply a ${tone === 'social' ? 'social-media-post' : tone} tone to the output.`
    : ''

  const nameInstruction = userName
    ? `\nThe user's name is "${userName}". When writing emails or formal letters, always end with a proper closing and sign with this name. Never use "[Your Name]" or any placeholder.`
    : '\nWhen writing emails or letters, end with a closing line but leave the signature blank — do not write "[Your Name]" or any placeholder.'

  const hasClipboard = clipboardText && clipboardText.trim()

  const systemPrompt = `You are a voice-powered writing assistant embedded in a desktop widget.
Produce ONLY the output text. No explanations, no preamble, no markdown formatting unless explicitly asked.
The output will be injected directly into the user's active text field.
Language rule: if clipboard context is provided, respond in the same language as the clipboard text. If there is no clipboard context, respond in the same language as the user's command.${toneInstruction}${nameInstruction}`

  const userMessage = hasClipboard
    ? `Context (selected text):\n"${clipboardText}"\n\nUser command: "${instruction}"`
    : `User command (no clipboard context): "${instruction}"`

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (res.status >= 500) throw new Error('SERVER_ERROR')
  if (!res.ok) throw new Error(`AI processing failed: ${res.status}`)

  const data = await res.json()
  return data.choices[0].message.content.trim()
}

// Alias kept for any legacy callers
export const processCommand = processWithAI
