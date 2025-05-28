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
  openScriptFolder: (scriptPath) => ipcRenderer.invoke('open-script-folder', scriptPath),

  // 定时任务API
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  createTask: (taskData) => ipcRenderer.invoke('create-task', taskData),
  updateTask: (taskId, updates) => ipcRenderer.invoke('update-task', taskId, updates),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  toggleTask: (taskId, enabled) => ipcRenderer.invoke('toggle-task', taskId, enabled),
  runTaskNow: (taskId) => ipcRenderer.invoke('run-task-now', taskId),
  getTasksByScript: (scriptId) => ipcRenderer.invoke('get-tasks-by-script', scriptId),
  getSchedulerStatus: () => ipcRenderer.invoke('get-scheduler-status'),

  // 设置相关API
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),

  // 工具函数
  platform: process.platform,
  version: process.versions.electron,
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});