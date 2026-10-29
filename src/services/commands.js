const SLASH_COMMANDS = {
  '/summarize': 'Summarize the context text into 2-3 concise sentences.',
  '/translate': 'Translate the context text to English. If already in English, translate to Hindi.',
  '/reply': 'Write a professional reply to the context message.',
  '/formal': 'Rewrite the context text in a formal, professional tone.',
  '/casual': 'Rewrite the context text in a casual, friendly tone.',
  '/shorter': 'Make the context text shorter while keeping the key message.',
  '/longer': 'Expand the context text with more detail.',
  '/fix': 'Fix grammar, spelling, and punctuation in the context text.',
  '/bullet': 'Convert the context text into a clean bullet point list.',
  '/email': 'Reformat the context text as a professional email.',
  '/tweet': 'Rewrite the context text as a tweet under 280 characters.',
  '/explain': 'Explain the context text in simple terms.',
}

export const QUICK_COMMANDS = ['/reply', '/fix', '/formal', '/summarize', '/translate']

// Whisper never emits "/reply" — spoken commands arrive as "slash reply" or a
// bare "reply formally". Normalize all three forms. `explicit` is true when the
// user said "slash"/typed "/", so auto mode can safely treat it as a command
// without hijacking ordinary dictation that merely starts with e.g. "fix".
export function detectCommand(transcript) {
  const trimmed = transcript.trim().toLowerCase().replace(/^[\s.,!?'"-]+/, '')

  for (const [cmd, instruction] of Object.entries(SLASH_COMMANDS)) {
    const word = cmd.slice(1)
    const m = trimmed.match(new RegExp(`^(?:(/|slash\\s+)\\s*)?${word}(?![a-z])`))
    if (!m) continue
    const extra = trimmed.slice(m[0].length).replace(/^[\s.,:;!?-]+/, '').trim()
    return {
      type: 'slash',
      command: cmd,
      explicit: !!m[1],
      instruction: extra ? `${instruction} Additional instruction: ${extra}` : instruction,
    }
  }

  return {
    type: 'intent',
    instruction: transcript.trim(),
  }
}
