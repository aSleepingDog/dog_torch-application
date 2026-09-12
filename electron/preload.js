const { contextBridge, webUtils ,ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getFilePath: (file) => webUtils.getPathForFile(file),
  saveClipBoard: (text) => ipcRenderer.invoke("saveClipBoard:run",text),
  exchange: (input, output) => ipcRenderer.invoke('exchange:run', input, output),

  allTaskInfo: () => ipcRenderer.invoke("allTaskInfo:run"),
  allTaskResult: () => ipcRenderer.invoke("allTaskResult:run"),
  cancel: (taskId) => ipcRenderer.invoke("cancel:run",taskId),
  pause: (taskId) => ipcRenderer.invoke("pause:run",taskId),
  resume: (taskId) => ipcRenderer.invoke("resume:run",taskId),

  allHash: () => ipcRenderer.invoke('allHash:run'),
  hashData: (input, hash, output) => ipcRenderer.invoke('hashData:run', input, hash, output),

  allStreamCrypto: () => ipcRenderer.invoke("allStreamCrypto:run"),

  allBlockCrypto: () => ipcRenderer.invoke("allBlockCrypto:run"),
  allBlockMode: () => ipcRenderer.invoke("allBlockMode:run"),
  allBlockPadding: () => ipcRenderer.invoke("allBlockPadding:run"),

  encryptData: (args) => ipcRenderer.invoke("encryptData:run",args),
  decryptData: (args) => ipcRenderer.invoke("decryptData:run",args),
})