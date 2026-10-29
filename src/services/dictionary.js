// Whisper accepts a free-text `prompt` (≈224 tokens) that biases it toward the
// spellings it contains. Feeding it the user's vocabulary fixes names/jargon at
// recognition time instead of only patching them afterwards.
export function buildWhisperPrompt(dictionary, userName = '', people = []) {
  const words = new Set()
  if (userName) words.add(userName)
  for (const p of people || []) if (p.name) words.add(p.name.trim())
  for (const e of dictionary || []) if (e.correct) words.add(e.correct.trim())
  if (!words.size) return ''
  // Whisper's prompt window is small (~224 tokens): add whole words until it is full
  let out = 'Vocabulary:'
  for (const w of words) {
    if (out.length + w.length + 2 > 600) break
    out += ` ${w},`
  }
  return out.replace(/,$/, '.')
}

export function applyDictionary(text, dictionary) {
  if (!dictionary || dictionary.length === 0) return text
  let result = text
  for (const entry of dictionary) {
    if (!entry.wrong || !entry.correct) continue
    const escaped = entry.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Lookarounds instead of \b so entries starting/ending with symbols still match
    const regex = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'gi')
    // Function replacer: "$&" / "$1" in the correction must stay literal
    result = result.replace(regex, () => entry.correct)
  }
  return result
}
