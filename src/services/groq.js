const GROQ_BASE = 'https://api.groq.com/openai/v1'

export async function transcribeAudio(audioBlob, apiKey, language = 'auto') {
  const formData = new FormData()
  const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
  formData.append('file', audioFile)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'text')

  const isHinglish = language === 'hinglish'
  const whisperLang = isHinglish ? 'hi' : language
  if (whisperLang && whisperLang !== 'auto') formData.append('language', whisperLang)
  // Whisper mirrors the script of its prompt — supplying Roman-script words steers it
  // away from Devanagari and produces Hinglish output
  if (isHinglish) {
    formData.append('prompt', 'yaar, kya, hai, theek, matlab, basically, toh, aur, lekin, bahut, accha, bilkul, nahi, haan, abhi, phir')
  }

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
// outputLanguage: pass appSettings.language — 'hinglish' adds a Hinglish output rule
export async function processWithAI(clipboardText, instruction, tone, apiKey, userName = '', outputLanguage = '') {
  const toneInstruction = tone && tone !== 'none'
    ? `\nApply a ${tone === 'social' ? 'social-media-post' : tone} tone to the output.`
    : ''

  const nameInstruction = userName
    ? `\nThe user's name is "${userName}". When writing emails or formal letters, always end with a proper closing and sign with this name. Never use "[Your Name]" or any placeholder.`
    : '\nWhen writing emails or letters, end with a closing line but leave the signature blank — do not write "[Your Name]" or any placeholder.'

  const hasClipboard = clipboardText && clipboardText.trim()

  const hinglishInstruction = outputLanguage === 'hinglish'
    ? '\nLanguage rule: ALWAYS respond in Hinglish — Hindi words written in Roman English script, naturally mixed with English. Never use Devanagari script under any circumstances.'
    : '\nLanguage rule: if clipboard context is provided, respond in the same language as the clipboard text. If there is no clipboard context, respond in the same language as the user\'s command.'

  const systemPrompt = `You are a voice-powered writing assistant embedded in a desktop widget.
Produce ONLY the output text. No explanations, no preamble, no markdown formatting unless explicitly asked.
The output will be injected directly into the user's active text field.${hinglishInstruction}${toneInstruction}${nameInstruction}`

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
