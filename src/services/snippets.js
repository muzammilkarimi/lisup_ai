export function detectAndExpandSnippet(transcript, snippets) {
  if (!snippets || snippets.length === 0) return { isSnippet: false }
  const lower = transcript.toLowerCase().trim()
  for (const snippet of snippets) {
    if (!snippet.trigger) continue
    if (lower.includes(snippet.trigger.toLowerCase())) {
      return { isSnippet: true, expansion: snippet.expansion }
    }
  }
  return { isSnippet: false }
}
