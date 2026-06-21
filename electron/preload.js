const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard
  readClipboard:  () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),

  // Text injection
  injectText:      (text) => ipcRenderer.invoke('inject:text', text),
  quickInjectText: (text) => ipcRenderer.invoke('quick:inject', text),

  // Window
  hideWidget: () => ipcRenderer.invoke('window:hide'),
  showWidget: () => ipcRenderer.invoke('window:show'),
  resizeWindow: (height) => ipcRenderer.invoke('resize:window', height),

  // API key
  getApiKey: () => ipcRenderer.invoke('store:getApiKey'),
  setApiKey: (key) => ipcRenderer.invoke('store:setApiKey', key),

  // Settings
  getSettings:  () => ipcRenderer.invoke('store:getSettings'),
  saveSettings: (s) => ipcRenderer.invoke('store:saveSettings', s),

  // Personal dictionary
  getDictionary:  () => ipcRenderer.invoke('store:getDictionary'),
  saveDictionary: (d) => ipcRenderer.invoke('store:saveDictionary', d),

  // Snippets
  getSnippets:  () => ipcRenderer.invoke('store:getSnippets'),
  saveSnippets: (s) => ipcRenderer.invoke('store:saveSnippets', s),

  // Events from main
  onHotkeyTriggered:    (cb) => ipcRenderer.on('hotkey:triggered', cb),
  onOpenSettings:       (cb) => ipcRenderer.on('open:settings', cb),
  removeHotkeyListener: ()   => ipcRenderer.removeAllListeners('hotkey:triggered'),
  removeSettingsListener:()  => ipcRenderer.removeAllListeners('open:settings'),

  // Quick record mode
  onQuickStart:          (cb) => ipcRenderer.on('quick:start', (_, d) => cb(d)),
  onQuickStop:           (cb) => ipcRenderer.on('quick:stop', cb),
  removeQuickListeners:  ()   => {
    ipcRenderer.removeAllListeners('quick:start')
    ipcRenderer.removeAllListeners('quick:stop')
  },
  cancelQuick: () => ipcRenderer.invoke('quick:cancel'),
})
