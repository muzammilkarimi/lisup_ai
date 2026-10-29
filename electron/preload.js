const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard
  readClipboard:  () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),

  // Text injection
  injectText:      (text) => ipcRenderer.invoke('inject:text', text),
  quickInjectText: (text) => ipcRenderer.invoke('quick:inject', text),

  // Floating bar
  resizeBar:     (w, h) => ipcRenderer.invoke('bar:resize', w, h),
  setBarExpanded:(v)    => ipcRenderer.invoke('bar:setExpanded', v),
  openFromPill:  ()     => ipcRenderer.invoke('bar:open'),
  recordFromPill:()     => ipcRenderer.invoke('bar:record'),
  requestQuickStop: ()  => ipcRenderer.invoke('quick:requestStop'),
  onCollapse:    (cb)   => ipcRenderer.on('ui:collapse', cb),
  removeCollapseListener: () => ipcRenderer.removeAllListeners('ui:collapse'),
  onStoreChanged:(cb)   => ipcRenderer.on('store:changed', cb),
  removeStoreChangedListener: () => ipcRenderer.removeAllListeners('store:changed'),

  // Frameless-window controls + helpers (onboarding)
  minimizeWindow: () => ipcRenderer.invoke('win:minimize'),
  closeWindow:    () => ipcRenderer.invoke('win:close'),
  openMicSettings:() => ipcRenderer.invoke('external:openMicSettings'),

  // Edit-selection mode
  getEditSelection: () => ipcRenderer.invoke('edit:getSelection'),

  // Context
  getActiveApp: () => ipcRenderer.invoke('context:getApp'),

  // Window
  hideWidget: () => ipcRenderer.invoke('window:hide'),
  showWidget: () => ipcRenderer.invoke('window:show'),

  // API key
  getApiKey: () => ipcRenderer.invoke('store:getApiKey'),
  setApiKey: (key) => ipcRenderer.invoke('store:setApiKey', key),

  // First-run onboarding
  getOnboardingComplete: () => ipcRenderer.invoke('store:getOnboardingComplete'),
  completeOnboarding: () => ipcRenderer.invoke('store:completeOnboarding'),
  openGroqKeys: () => ipcRenderer.invoke('external:openGroqKeys'),

  // Settings
  getSettings:  () => ipcRenderer.invoke('store:getSettings'),
  saveSettings: (s) => ipcRenderer.invoke('store:saveSettings', s),

  // Personal dictionary
  getDictionary:  () => ipcRenderer.invoke('store:getDictionary'),
  saveDictionary: (d) => ipcRenderer.invoke('store:saveDictionary', d),

  // Snippets
  getSnippets:  () => ipcRenderer.invoke('store:getSnippets'),
  saveSnippets: (s) => ipcRenderer.invoke('store:saveSnippets', s),

  // History
  getHistory:   () => ipcRenderer.invoke('store:getHistory'),
  addHistory:   (entry) => ipcRenderer.invoke('store:addHistory', entry),
  clearHistory: () => ipcRenderer.invoke('store:clearHistory'),

  // People (learned names)
  getPeople:  () => ipcRenderer.invoke('store:getPeople'),
  savePeople: (list) => ipcRenderer.invoke('store:savePeople', list),
  addPeople:  (found) => ipcRenderer.invoke('store:addPeople', found),

  // Events from main
  onHotkeyTriggered:    (cb) => ipcRenderer.on('hotkey:triggered', cb),
  onOpenSettings:       (cb) => ipcRenderer.on('open:settings', cb),
  removeHotkeyListener: ()   => ipcRenderer.removeAllListeners('hotkey:triggered'),
  removeSettingsListener:()  => ipcRenderer.removeAllListeners('open:settings'),

  onWindowHidden: (cb) => ipcRenderer.on('window:hidden', cb),
  removeWindowHiddenListener: () => ipcRenderer.removeAllListeners('window:hidden'),

  // Quick record mode
  onQuickStart:          (cb) => ipcRenderer.on('quick:start', (_, d) => cb(d)),
  onQuickStop:           (cb) => ipcRenderer.on('quick:stop', cb),
  removeQuickListeners:  ()   => {
    ipcRenderer.removeAllListeners('quick:start')
    ipcRenderer.removeAllListeners('quick:stop')
  },
  cancelQuick: () => ipcRenderer.invoke('quick:cancel'),
})
