import { groqFetch, CHAT_PARAMS } from './groq.js'

// "People you know": names (with an optional relationship like "brother") that
// Lisup learns while you dictate, so it spells them right next time and
// understands "my brothers". Learning only runs when you clearly sound like
// you are introducing people, and everything is editable in Settings → People.

const GROQ_BASE = 'https://api.groq.com/openai/v1'

const RELATIONS =
  'brothers?|sisters?|sons?|daughters?|kids?|children|friends?|cousins?|uncles?|aunts?|nephews?|nieces?|' +
  'colleagues?|coworkers?|teammates?|boss|manager|wife|husband|partner|mother|father|mom|dad|parents|' +
  'grandfather|grandmother|grandparents|neighbou?rs?|classmates?|roommates?'

// "my brother…", "his sisters…", "names are…", "called/named…"
const INTRO_PATTERN = new RegExp(
  `\\b(?:my|his|her|our|their)\\s+(?:[a-z]+\\s+)?(?:${RELATIONS})\\b|\\bnames?\\s+(?:is|are|was|were)\\b|\\b(?:called|named)\\b`,
  'i',
)

// A capitalized word that is not just the start of a sentence — a likely name
const MID_SENTENCE_CAPITAL = /[^.!?\n]\s+(?!I\b)[A-Z][a-z]{2,}/

export function looksLikeIntroducingPeople(text) {
  if (!text || text.length < 12) return false
  return INTRO_PATTERN.test(text) && MID_SENTENCE_CAPITAL.test(text)
}

// "Ahsan (brother), Almas (brother), Sufyan" — for prompts. Capped to keep prompts small.
export function describePeople(people, max = 60) {
  return (people || [])
    .slice(-max)
    .map(p => (p.relation ? `${p.name} (${p.relation})` : p.name))
    .join(', ')
}

export async function extractPeople(text, apiKey) {
  const res = await groqFetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...CHAT_PARAMS,
      messages: [
        {
          role: 'system',
          content: `Extract people the speaker is introducing or identifying by name.
Return ONLY JSON: {"people":[{"name":"…","relation":"…"}]}

- Include only real personal names (first names or full names) of OTHER people the speaker names,
  e.g. "my brothers are Ahsan and Almas", "his name is Sufyan", "my friend Sara".
- "relation" is how they relate to the speaker, lowercase singular ("brother", "friend",
  "colleague"), or "" if not stated.
- Do NOT include: the speaker themself, places, companies, brands, products, days/months, or
  ordinary words that merely start with a capital letter.
- Keep the spelling exactly as written. If there are no such people, return {"people":[]}`,
        },
        { role: 'user', content: text },
      ],
      max_tokens: 600,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  }, 15000)

  if (!res.ok) return []
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim())
    return (parsed.people || [])
      .map(p => ({
        name: String(p.name || '').trim(),
        relation: String(p.relation || '').trim().toLowerCase(),
      }))
      .filter(p => p.name && p.name.length <= 40 && /^[\p{L}][\p{L}'’.\- ]*$/u.test(p.name))
  } catch {
    return []
  }
}
