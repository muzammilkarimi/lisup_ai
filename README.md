# Lisup — Voice AI Desktop Widget

> Voice AI · Listen Up

A floating Windows desktop widget that turns your voice into polished text and AI-powered writing — injected directly into any app.

---

## How it works

1. Press **Ctrl + Windows** — the widget appears bottom-right
2. Speak naturally — transcribe, give a command, or trigger a snippet
3. Click **Inject** — result is pasted into whatever app you were typing in

---

## Features

- **Transcribe** — Clean up what you said (grammar fixed, fillers removed, self-corrections cleaned up)
- **Command mode** — Copy text, speak a command ("make this formal", "summarise", "translate") — AI rewrites it
- **Snippets** — Short trigger phrases that expand instantly, no AI needed ("my email" → full address)
- **Personal dictionary** — Auto-correct words Whisper gets wrong
- **5 tones** — Rephrase any result as Formal, Casual, Funny, Polite, or Social
- **Your name** — Set once in Settings; all emails and letters sign with it automatically
- **Inject / Copy** — Paste result directly into any active app or copy to clipboard
- **Auto-start** — Launch with Windows login

---

## Tech stack

| Layer | Choice |
|---|---|
| Shell | Electron 45 |
| UI | React 18 + Vite 5 + Tailwind CSS v3 |
| Transcription | Groq API — `whisper-large-v3-turbo` |
| AI | Groq API — `openai/gpt-oss-120b` (one constant in `src/services/groq.js`) |
| Text injection | `@jitsi/robotjs` + `koffi` (Win32 focus restore) |
| Global hotkey | `uiohook-napi` (Ctrl+Win chord) |
| Storage | `electron-store` (saved to `AppData/Lisup/`); API key encrypted with `safeStorage` |

Everything runs locally except the two Groq API calls. No database, no server.

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/muzammilkarimi/lisup_ai.git
cd lisup_ai
npm install
```

### 2. Get a free Groq API key

Sign up at **[console.groq.com](https://console.groq.com)** — no credit card required.

### 3. Run

```bash
npm run dev
```

On first launch the Settings screen opens. Paste your Groq API key and hit **Save**.

> If you're running from a VS Code integrated terminal, use the launcher scripts directly:
> ```bash
> # Terminal 1
> npx vite
> # Terminal 2 (after Vite is ready)
> .\start-electron-dev.bat
> ```

---

## Usage

| Action | How |
|---|---|
| Show / hide widget | `Ctrl + Windows` |
| Start / stop recording | Click the mic button |
| Inject result into active app | Click **Inject** |
| Copy result | Click **Copy** |
| New recording | Click **↑** (back button in done state) |
| Clear clipboard context | Click **×** on the clipboard pill |
| Open settings | Click the Lisup logo |

### Modes

| Mode | When to use |
|---|---|
| **T** (Transcribe) | Just clean up what you said |
| **C** (Command) | Use clipboard text as context for AI commands |
| Neither | Defaults to Transcribe |

### Quick command chips

`/reply` `/fix` `/formal` `/summarize` `/translate` `/casual` `/shorter` `/longer` `/bullet` `/email` `/tweet` `/explain`

Natural language also works: *"make this sound more confident"*, *"translate to Urdu"*, *"add a subject line"*.

---

## Scripts

```bash
npm run dev       # Vite dev server + Electron with hot reload
npm run preview   # Build then launch
npm run build     # Build Vite + package Windows .exe via electron-builder
```

---

## Project structure

```
lisup_ai/
├── electron/
│   ├── main.js            # App lifecycle, IPC handlers, window setup
│   ├── preload.js         # Context bridge (secure IPC to renderer)
│   ├── store.js           # electron-store config (AppData/Lisup/)
│   ├── hotkey.js          # Ctrl+Win global shortcut
│   ├── tray.js            # System tray icon + context menu
│   ├── injector.js        # Text injection via robotjs
│   └── windows-focus.js   # Windows API focus management (SetForegroundWindow)
├── src/
│   ├── App.jsx            # Full pipeline: record → transcribe → AI → result
│   ├── components/
│   │   ├── Widget.jsx     # Floating widget (Idle / Listening / Thinking / Done / Error)
│   │   ├── Settings.jsx   # 3-tab settings (General / Dictionary / Snippets)
│   │   └── LisupIcon.jsx  # SVG logo component
│   ├── hooks/
│   │   ├── useRecorder.js    # MediaRecorder voice capture
│   │   └── useClipboard.js   # Clipboard read / clear hook
│   └── services/
│       ├── groq.js        # Groq API (Whisper + LLaMA)
│       ├── autoEdit.js    # Grammar + self-correction cleanup
│       ├── snippets.js    # Snippet detection & expansion
│       └── commands.js    # Slash command detection
└── assets/
    └── icon.svg           # App icon (convert to icon.png / icon.ico for tray & installer)
```

---

## Widget states

```
Idle ──(mic)──► Listening ──(stop)──► Thinking ──► Done ──(↑)──► Idle
                                           │
                                           └──► Error ──(try again)──► Listening
```

---

## Building a Windows installer

```bash
npm run build
```

Outputs a `.exe` NSIS installer to `release/`. Requires `assets/icon.ico` (convert from `assets/icon.svg`).

---

## License

MIT

## Code signing

Windows releases are signed for free by the [SignPath Foundation](https://signpath.org/foundation)
using a certificate issued to them for open-source projects. Release builds run in GitHub Actions
(`.github/workflows/release.yml`) and are submitted to SignPath after the build. SHA-256 checksums
are attached to each release.
