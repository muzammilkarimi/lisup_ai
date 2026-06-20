export function applyDictionary(text, dictionary) {
  if (!dictionary || dictionary.length === 0) return text
  let result = text
  for (const entry of dictionary) {
    if (!entry.wrong || !entry.correct) continue
    const escaped = entry.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(regex, entry.correct)
  }
  return result
}
