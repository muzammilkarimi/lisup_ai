const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),

  injectText: (text) => ipcRenderer.invoke('inject:text', text),

  hideWidget: () => ipcRenderer.invoke('window:hide'),
  showWidget: () => ipcRenderer.invoke('window:show'),

  getApiKey: () => ipcRenderer.invoke('store:getApiKey'),
  setApiKey: (key) => ipcRenderer.invoke('store:setApiKey', key),

  resizeWindow: (height) => ipcRenderer.invoke('resize:window', height),

  onHotkeyTriggered: (cb) => ipcRenderer.on('hotkey:triggered', cb),
  onOpenSettings: (cb) => ipcRenderer.on('open:settings', cb),

  removeHotkeyListener: () => ipcRenderer.removeAllListeners('hotkey:triggered'),
  removeSettingsListener: () => ipcRenderer.removeAllListeners('open:settings'),
})
