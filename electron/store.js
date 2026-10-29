const Store = require('electron-store')
const path  = require('path')
const fs    = require('fs')

// Use a stable explicit directory so renames never lose saved data again
const dataDir   = path.join(process.env.APPDATA || '', 'Lisup')
const oldConfig = path.join(process.env.APPDATA || '', 'voicecommand', 'config.json')
const newConfig = path.join(dataDir, 'config.json')

// Migrate from the old voicecommand directory if needed
if (fs.existsSync(oldConfig) && !fs.existsSync(newConfig)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.copyFileSync(oldConfig, newConfig)
  } catch {}
}

const store = new Store({
  name: 'config',
  cwd:  dataDir,
  schema: {
    groq_api_key:    { type: 'string', default: '' },
    groq_api_key_enc: { type: 'string', default: '' },
    onboarding_complete: { type: 'boolean', default: false },
    dictionary_json: { type: 'string', default: '[]' },
    snippets_json:   { type: 'string', default: '[]' },
    history_json:    { type: 'string', default: '[]' },
    people_json:     { type: 'string', default: '[]' },
    settings: {
      type: 'object',
      default: {
        autoStart:     false,
        autoEdit:      true,
        removeFillers: true,
        pasteWhereStarted: true,
        keepDictationOnClipboard: false,
        defaultTone:   'none',
        language:      'auto',
        userName:      '',
      },
    },
  },
})

// ── API key: encrypted at rest with OS-level protection (DPAPI on Windows) ──
// Stored as base64 in `groq_api_key_enc`. Falls back to plaintext only if
// encryption is unavailable. Legacy plaintext keys are migrated on first read.
async function getApiKey() {
  const { safeStorage } = require('electron')
  const enc = store.get('groq_api_key_enc', '')
  if (enc && await safeStorage.isAsyncEncryptionAvailable()) {
    try {
      const { result } = await safeStorage.decryptStringAsync(Buffer.from(enc, 'base64'))
      return result
    } catch {}
  }
  const legacy = store.get('groq_api_key', '')
  if (legacy) {
    await setApiKey(legacy) // migrate (and wipe the plaintext copy when possible)
    return legacy
  }
  return ''
}

async function setApiKey(key) {
  const { safeStorage } = require('electron')
  if (key && await safeStorage.isAsyncEncryptionAvailable()) {
    const buf = await safeStorage.encryptStringAsync(key)
    store.set('groq_api_key_enc', buf.toString('base64'))
    store.set('groq_api_key', '')
  } else {
    store.set('groq_api_key', key || '')
    store.set('groq_api_key_enc', '')
  }
}

store.getApiKey = getApiKey
store.setApiKey = setApiKey

module.exports = store
