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
    dictionary_json: { type: 'string', default: '[]' },
    snippets_json:   { type: 'string', default: '[]' },
    settings: {
      type: 'object',
      default: {
        autoStart:     false,
        autoEdit:      true,
        removeFillers: true,
        defaultTone:   'none',
        language:      'auto',
        hotkey:        'Alt+Space',
        userName:      '',
      },
    },
  },
})

module.exports = store
