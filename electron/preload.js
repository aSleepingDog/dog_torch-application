const { contextBridge, webUtils ,ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getFilePath: (file) => webUtils.getPathForFile(file),

  allLogFiles: () => ipcRenderer.invoke('allLogFiles:run'),
  loadLogFile: (path,logKey) => ipcRenderer.invoke('loadLogFile:run',path,logKey),
  saveClipBoard: (text) => ipcRenderer.invoke("saveClipBoard:run",text),

  exchange: (input, output, logKey) => ipcRenderer.invoke('exchange:run', input, output, logKey),

  allTaskInfo: () => ipcRenderer.invoke("allTaskInfo:run"),
  allTaskResult: (logKey) => ipcRenderer.invoke("allTaskResult:run", logKey),
  cancel: (taskId) => ipcRenderer.invoke("cancel:run",taskId),
  pause: (taskId) => ipcRenderer.invoke("pause:run",taskId),
  resume: (taskId) => ipcRenderer.invoke("resume:run",taskId),

  allHash: () => ipcRenderer.invoke('allHash:run'),
  hashData: (input, hash, output, logKey) => ipcRenderer.invoke('hashData:run', input, hash, output, logKey),

  allStreamCrypto: () => ipcRenderer.invoke("allStreamCrypto:run"),

  allBlockCrypto: () => ipcRenderer.invoke("allBlockCrypto:run"),
  allBlockMode: () => ipcRenderer.invoke("allBlockMode:run"),
  allBlockPadding: () => ipcRenderer.invoke("allBlockPadding:run"),

  encryptData: (args, logKey) => ipcRenderer.invoke("encryptData:run",args, logKey),
  decryptData: (args, logKey) => ipcRenderer.invoke("decryptData:run",args, logKey),

  loadSettingJson: () => ipcRenderer.invoke("loadSettingJson:run"),
  saveSettingJson: (args) => ipcRenderer.invoke("saveSettingJson:run",args)

})