const Store = require('electron-store')

const store = new Store({
  schema: {
    groq_api_key: { type: 'string', default: '' },
    settings: {
      type: 'object',
      default: {
        autoStart: false,
        autoEdit: true,
        removeFillers: true,
        defaultTone: 'none',
        hotkey: 'Alt+Space',
      },
    },
    dictionary: {
      type: 'array',
      default: [],
    },
    snippets: {
      type: 'array',
      default: [],
    },
  },
})

module.exports = store
