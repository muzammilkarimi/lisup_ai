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

export function detectCommand(transcript) {
  const trimmed = transcript.trim().toLowerCase()

  for (const [cmd, instruction] of Object.entries(SLASH_COMMANDS)) {
    if (trimmed.startsWith(cmd)) {
      const extra = trimmed.slice(cmd.length).trim()
      return {
        type: 'slash',
        command: cmd,
        instruction: extra ? `${instruction} Additional instruction: ${extra}` : instruction,
      }
    }
  }

  return {
    type: 'intent',
    instruction: transcript.trim(),
  }
}

export function buildFinalPrompt(detection) {
  return detection.instruction
}
