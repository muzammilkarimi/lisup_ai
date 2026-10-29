// The user's name for sign-offs: the settings field first, else a snippet whose
// trigger looks like a name reference ("name", "my name", "my full name")
const NAME_TRIGGERS = ['my full name', 'my name', 'full name', 'name']
export function resolveUserName(settings, snippets) {
  if (settings?.userName) return settings.userName
  for (const t of NAME_TRIGGERS) {
    const s = (snippets || []).find(sn => sn.trigger?.trim().toLowerCase() === t)
    if (s) return s.expansion
  }
  return ''
}

export function detectAndExpandSnippet(transcript, snippets) {
  if (!snippets || snippets.length === 0) return { isSnippet: false }
  const lower = transcript.toLowerCase().trim()
  const transcriptWords = lower.split(/\s+/).length

  for (const snippet of snippets) {
    const trigger = snippet.trigger?.trim().toLowerCase()
    if (!trigger) continue
    const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(`(?<![\\w])${escaped}(?![\\w])`).test(lower)) continue

    const triggerWords = trigger.split(/\s+/).length
    // Don't fire if the transcript is much longer than the trigger —
    // "add my name at last" contains "name" but is a command, not a snippet invocation
    if (transcriptWords > triggerWords + 2) continue

    return { isSnippet: true, expansion: snippet.expansion }
  }
  return { isSnippet: false }
}
