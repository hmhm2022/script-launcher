const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 脚本管理API
  loadScripts: () => ipcRenderer.invoke('load-scripts'),
  saveScript: (scriptData) => ipcRenderer.invoke('save-script', scriptData),
  updateScript: (scriptId, scriptData) => ipcRenderer.invoke('update-script', scriptId, scriptData),
  deleteScript: (scriptId) => ipcRenderer.invoke('delete-script', scriptId),
  
  // 脚本启动API（替代执行）
  launchScript: (scriptId) => ipcRenderer.invoke('launch-script', scriptId),
  
  // 进程管理API
  getLaunchedProcesses: () => ipcRenderer.invoke('get-launched-processes'),
  stopScript: (scriptId) => ipcRenderer.invoke('stop-script', scriptId),
  cleanupProcesses: () => ipcRenderer.invoke('cleanup-processes'),
  
  // 文件管理API
  browseFile: () => ipcRenderer.invoke('browse-file'),
  validateFile: (filePath) => ipcRenderer.invoke('validate-file', filePath),
  
  // 工具函数
  platform: process.platform,
  version: process.versions.electron
}); 