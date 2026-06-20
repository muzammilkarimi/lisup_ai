const GROQ_BASE = 'https://api.groq.com/openai/v1'

export async function transcribeAudio(audioBlob, apiKey) {
  const formData = new FormData()
  const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
  formData.append('file', audioFile)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'text')

  const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (response.status >= 500) throw new Error('SERVER_ERROR')
  if (!response.ok) throw new Error(`Transcription failed: ${response.status}`)

  const text = await response.text()
  return text.trim()
}

export async function processCommand(clipboardText, userCommand, apiKey) {
  const systemPrompt = `You are a voice-powered writing assistant embedded in a desktop widget.
The user has selected some text (clipboard context) and spoken a voice command.
Produce ONLY the output text — no explanations, no preamble, no markdown unless explicitly asked.
Return the final text that will be injected directly into the user's text field.`

  const userMessage = buildUserMessage(clipboardText, userCommand)

  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
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

  if (response.status === 429) throw new Error('RATE_LIMIT')
  if (response.status >= 500) throw new Error('SERVER_ERROR')
  if (!response.ok) throw new Error(`Command failed: ${response.status}`)

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

function buildUserMessage(clipboardText, userCommand) {
  if (clipboardText && clipboardText.trim().length > 0) {
    return `Context (selected text):\n"${clipboardText}"\n\nUser command: "${userCommand}"`
  }
  return `User command (no context selected): "${userCommand}"`
}
