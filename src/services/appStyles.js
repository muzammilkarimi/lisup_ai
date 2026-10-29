// Maps the app you're dictating into (exe name) to a writing style, like
// Wispr Flow's per-app styles. Returns an instruction for the cleanup prompt,
// or null for apps with no special style.
const STYLES = {
  chat: {
    label: 'casual chat',
    apps: ['slack.exe', 'whatsapp.exe', 'whatsapp.root.exe', 'telegram.exe', 'discord.exe', 'signal.exe', 'ms-teams.exe', 'teams.exe', 'messenger.exe'],
    instruction: 'Style: casual chat message. Conversational and concise, contractions are fine, no formal greeting or sign-off.',
  },
  email: {
    label: 'email',
    apps: ['outlook.exe', 'olk.exe', 'thunderbird.exe', 'hxoutlook.exe'],
    instruction: 'Style: professional email. Clear, polite and well-structured, but natural — not stiff. Keep the speaker\'s meaning.',
  },
  code: {
    label: 'code',
    apps: ['code.exe', 'cursor.exe', 'devenv.exe', 'idea64.exe', 'pycharm64.exe', 'webstorm64.exe', 'windowsterminal.exe', 'cmd.exe', 'powershell.exe', 'pwsh.exe', 'wt.exe'],
    instruction: 'Style: literal and terse, for a code editor or terminal. Preserve identifiers, file names, commands and technical terms exactly as spoken; do not rephrase or add pleasantries.',
  },
}

export function getStyleForApp(exe) {
  if (!exe) return null
  const name = exe.toLowerCase()
  for (const [key, s] of Object.entries(STYLES)) {
    if (s.apps.includes(name)) return { key, label: s.label, instruction: s.instruction }
  }
  return null
}
