// preload：安全地把受限的 IPC 能力暴露给渲染进程
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 作品
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (name) => ipcRenderer.invoke('projects:create', name),
  renameProject: (id, name) => ipcRenderer.invoke('projects:rename', { id, name }),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  loadProject: (id) => ipcRenderer.invoke('project:load', id),
  saveProject: (id, tree) => ipcRenderer.invoke('project:save', { id, tree }),
  // 导出
  exportProject: (id, format) => ipcRenderer.invoke('export:project', { id, format }),
  // Word
  exportDocx: (id, scope, nodeId) => ipcRenderer.invoke('export:docx', { id, scope, nodeId }),
  importDocx: (id, nodeId) => ipcRenderer.invoke('import:docx', { id, nodeId }),
  // 剪贴板
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  // AI
  aiDetect: () => ipcRenderer.invoke('ai:detect'),
  aiStatus: () => ipcRenderer.invoke('ai:status'),
  aiPrepare: () => ipcRenderer.invoke('ai:prepare'),
  aiCheckLogin: () => ipcRenderer.invoke('ai:check-login'),
  aiPolish: (payload) => ipcRenderer.invoke('ai:polish', payload),
  aiCloseBrowser: () => ipcRenderer.invoke('ai:close-browser'),
  onAiStatus: (cb) => {
    ipcRenderer.on('ai:status', (_e, data) => cb(data));
  },
});
