import { groqFetch, tokenBudget, CHAT_PARAMS } from './groq.js'
import { describePeople } from './people.js'

const GROQ_BASE = 'https://api.groq.com/openai/v1'

// Only pure hesitation sounds are stripped by regex. Words like "like",
// "actually" or "I think" are meaningful in context ("I like it"), so those
// are left to the LLM edit pass, which can judge them.
const FILLER_PATTERNS = [
  /\b(um+|uh+|hmm+|mhm+|err+)\b[,.]?/gi,
]

export function removeFillersLocally(text) {
  let out = text
  for (const p of FILLER_PATTERNS) out = out.replace(p, '')
  return out.replace(/\s{2,}/g, ' ').trim()
}

export async function autoEditTranscript(transcript, apiKey, styleInstruction = '', people = []) {
  try {
    const res = await groqFetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...CHAT_PARAMS,
        messages: [
          {
            role: 'system',
            content: `Clean up raw voice transcription output.

- Remove self-corrections and false starts — keep only the final intended version
  Example: "meeting at 11 pm, no no, 11:30" → "meeting at 11:30"
- When the speaker gives two or more options for the SAME time, date, number or amount joined by
  "or" / "or maybe" / "or around", the last one is their final choice — keep only that one
  Example: "tonight around 11 pm or around 11:30" → "tonight around 11:30"
  Do NOT do this for ordinary choices between things ("tea or coffee" stays as is)
- Remove repeated words from hesitation: "the the project is is due" → "the project is due"
- Fix grammar, spelling, punctuation, and capitalization
- Apply spoken formatting commands: "new line" → a line break, "new paragraph" → a blank line,
  "comma", "full stop"/"period", "question mark" → the punctuation mark itself
- LISTS. When the speaker names THREE OR MORE things to buy, bring, pack, cook with, or do
  (e.g. "we need to buy milk, eggs and bread"), keep the lead-in as a sentence ending in a colon,
  keeping that lead-in complete (what, where, why — e.g. "from the grocery market"), then put each
  item on its own line starting with "- ":
    - each item is a short capitalized phrase with no trailing punctuation
    - drop filler from items ("we need", "some", "a few") but keep real quantities ("two eggs")
    - keep the speaker's order and wording; never invent or add items
  Example: "so for that we need a few things from the grocery market chips some chocolates and something to drink" →
    "For that, we need a few things from the grocery market:
- Chips
- Chocolates
- Something to drink"
- STEPS. When the speaker gives three or more sequential steps ("first… then… finally…"),
  use a numbered list ("1. …"), one action per line
- SCHEDULES. When the speaker lays out a plan labelled by day or date ("day one… day two…",
  "on Monday… on Wednesday…", "on the 5th… on the 9th…") with TWO OR MORE entries, keep the lead-in
  ending in a colon (keep what the plan is for, e.g. "I'm planning a trip:"; drop only chatty wrap-up
  such as "got it, these are my plan, thank you"), then write one line per entry as "Label: short action" — no bullets and no
  numbers, labels as digits ("Day 1", "Monday"), and drop "I will"/"we will" from the action
  Example: "day one I will see Kim day two I will fly to Spain" → "Day 1: See Kim
Day 2: Fly to Spain"
  Never add, merge or renumber days the speaker did not say; if they say "six day plan" but name
  five days, write exactly the five they named
- Everything else stays normal prose, even long sentences. Two items are not a list.
  Put a blank line before a list and between separate paragraphs. No trailing spaces.
- Do NOT add new content or change the intended meaning
- Keep the same language as the input — do not translate
- Return ONLY the cleaned text, nothing else${people.length ? `

People the speaker knows (saved spellings): ${describePeople(people)}.
- If a word in the transcript sounds like one of these names, write it with the saved spelling exactly.
- Never replace relationship words such as "my brother" with a name; keep the wording as spoken.` : ''}${styleInstruction ? `

${styleInstruction}` : ''}`,
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: tokenBudget(transcript, 300, 2000),
        temperature: 0.1,
      }),
    }, 20000)
    if (!res.ok) {
      // Fall back to the raw text, but don't hide why cleanup stopped working
      console.warn('[autoEdit] cleanup skipped:', res.status, await res.text().catch(() => ''))
      return transcript
    }
    const data = await res.json()
    const choice = data.choices[0]
    // Truncated edit would drop the end of the dictation — keep the original
    if (choice.finish_reason === 'length') return transcript
    return choice.message.content.replace(/[ 	]+$/gm, '').trim() || transcript
  } catch (err) {
    console.warn('[autoEdit] cleanup failed:', err)
    return transcript
  }
}
