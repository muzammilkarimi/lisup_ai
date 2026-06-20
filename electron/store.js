const Store = require('electron-store')

const store = new Store({
  schema: {
    groq_api_key: {
      type: 'string',
      default: '',
    },
  },
})

module.exports = store
