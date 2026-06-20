const GROQ_BASE = 'https://api.groq.com/openai/v1'

const FILLER_PATTERNS = [
  /\b(um+|uh+|hmm+|mhm+|err+)\b/gi,
  /\b(you know|i mean|basically|literally|actually|honestly|right\?|so yeah)\b/gi,
  /\b(kind of|sort of|i guess|i think|you see|like)\b/gi,
]

export function removeFillersLocally(text) {
  let out = text
  for (const p of FILLER_PATTERNS) out = out.replace(p, '')
  return out.replace(/\s{2,}/g, ' ').trim()
}

export async function autoEditTranscript(transcript, apiKey) {
  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Fix grammar, spelling, punctuation, and capitalization in the text below.
Do NOT change the meaning, vocabulary, or style.
Do NOT add or remove sentences.
Return ONLY the corrected text — nothing else.`,
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    })
    if (!res.ok) return transcript
    const data = await res.json()
    return data.choices[0].message.content.trim() || transcript
  } catch {
    return transcript
  }
}
