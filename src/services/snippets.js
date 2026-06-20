export function detectAndExpandSnippet(transcript, snippets) {
  if (!snippets || snippets.length === 0) return { isSnippet: false }
  const lower = transcript.toLowerCase().trim()
  const transcriptWords = lower.split(/\s+/).length

  for (const snippet of snippets) {
    const trigger = snippet.trigger?.trim().toLowerCase()
    if (!trigger) continue
    if (!lower.includes(trigger)) continue

    const triggerWords = trigger.split(/\s+/).length
    // Don't fire if the transcript is much longer than the trigger —
    // "add my name at last" contains "name" but is a command, not a snippet invocation
    if (transcriptWords > triggerWords + 2) continue

    return { isSnippet: true, expansion: snippet.expansion }
  }
  return { isSnippet: false }
}
