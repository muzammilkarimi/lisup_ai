# Suniye Ji

> *"It's easy."* — Voice-powered AI writing assistant for Windows.

A floating desktop widget that lives in your system tray. Press **Alt + Space** from any app, speak a command, and the result is injected directly into whatever you were typing.

![Widget states: Idle → Listening → Thinking → Done](https://placehold.co/760x200/F5F4F1/9A938A?text=Idle+→+Listening+→+Thinking+→+Done&font=inter)

---

## How it works

1. Copy any text in another app (email, browser, Slack, Word)
2. Press **Alt + Space** — the widget appears bottom-right
3. Speak a command: *"reply formally"*, *"make this shorter"*, or tap a chip like `/fix`
4. Widget transcribes → detects intent → calls Groq AI → shows result
5. Click **Inject** — result is pasted into your active app automatically

---

## Tech stack

| Layer | Choice |
|---|---|
| Shell | Electron 27 |
| UI | React 18 + Vite + Tailwind CSS v3 |
| Voice capture | Web Audio API + MediaRecorder (built into Chromium) |
| Transcription | Groq API — `whisper-large-v3-turbo` |
| AI commands | Groq API — `llama-3.3-70b-versatile` |
| Text injection | `@jitsi/robotjs` (Ctrl+V simulation) |
| Global hotkey | Electron `globalShortcut` |
| Config storage | `electron-store` |

Everything runs locally except the two Groq API calls. No database, no server, no paid services.

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/muzammilkarimi/suniyeji_ai.git
cd suniyeji_ai
npm install
```

### 2. Get a free Groq API key

Sign up at **[console.groq.com](https://console.groq.com)** — no credit card required.  
Free tier: 2,000 Whisper requests/day + 14,400 LLM requests/day.

### 3. Run

```bash
npm run dev
```

On first launch the widget will ask for your Groq API key. Paste it and click **Save & Start**.

> **Note:** If you're running from a VS Code integrated terminal, use the provided launcher scripts directly to avoid the `ELECTRON_RUN_AS_NODE` conflict:
> ```bash
> # Terminal 1
> npx vite
>
> # Terminal 2 (after Vite is ready)
> .\start-electron-dev.bat
> ```

---

## Commands

Speak naturally or use a slash command — both work.

| Chip / spoken | What it does |
|---|---|
| `/reply` | Writes a professional reply to the copied message |
| `/fix` | Fixes grammar, spelling, and punctuation |
| `/formal` | Rewrites in a formal, professional tone |
| `/summarize` | Condenses to 2–3 sentences |
| `/translate` | Translates to English (or Hindi if already English) |
| `/casual` | Rewrites in a casual, friendly tone |
| `/shorter` | Makes it more concise |
| `/longer` | Expands with more detail |
| `/bullet` | Converts to a bullet list |
| `/email` | Reformats as a professional email |
| `/tweet` | Rewrites as a tweet under 280 characters |
| `/explain` | Explains in simple terms |

Natural language also works: *"make this sound more confident"*, *"translate to Urdu"*, *"add a subject line"*.

---

## Scripts

```bash
npm run dev       # Vite dev server + Electron with hot reload
npm run preview   # Build then launch (no hot reload)
npm run build     # Build Vite + package Windows .exe with electron-builder
```

---

## Project structure

```
suniyeji_ai/
├── electron/
│   ├── main.js          # App lifecycle, IPC handlers, window setup
│   ├── preload.js       # Secure contextBridge API exposed to renderer
│   ├── hotkey.js        # Alt+Space global shortcut
│   ├── tray.js          # System tray icon + context menu
│   ├── injector.js      # Text injection via robotjs (Ctrl+V)
│   └── store.js         # electron-store config (API key)
├── src/
│   ├── App.jsx          # State machine + all pipeline logic
│   ├── components/
│   │   ├── Widget.jsx   # All 5 widget states (Idle/Listening/Thinking/Done/Error)
│   │   └── Settings.jsx # First-run API key setup screen
│   ├── hooks/
│   │   ├── useRecorder.js   # MediaRecorder voice capture
│   │   └── useClipboard.js  # IPC clipboard bridge
│   └── services/
│       ├── groq.js      # Whisper transcription + LLM completion
│       └── commands.js  # Slash command detection + intent parsing
├── start-electron.bat       # Launcher for preview (clears ELECTRON_RUN_AS_NODE)
├── start-electron-dev.bat   # Launcher for dev mode
└── package.json
```

---

## Widget states

```
Idle ──(mic pressed)──► Listening ──(stop)──► Thinking ──► Done
                                                    │
                                                    └──► Error ──(try again)──► Listening
```

- **Idle** — dark mic button, clipboard preview pill, command chips
- **Listening** — saffron mic with pulsing rings, "Listening…"
- **Thinking** — bouncing dots, "Processing…", detected-command pill
- **Done** — scrollable result box, Inject + Copy buttons
- **Error** — warning icon, plain-English message, "Try again"

---

## Building a Windows installer

```bash
npm run build
```

Outputs a `.exe` NSIS installer to `release/`. Requires an `assets/icon.ico` file (256×256 recommended).

---

## License

MIT
