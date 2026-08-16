// IPC 注册：渲染进程 <-> 主进程 的唯一通道
const fs = require('fs');
const { dialog } = require('electron');
const storage = require('./storage');
const exporter = require('./export');
const deepseek = require('./deepseek');

function registerIpc(ipcMain, ctx) {
  const { getMainWindow } = ctx;

  // 状态事件回调 -> 推送给渲染进程
  deepseek.setStatusCallback((data) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('ai:status', data);
    }
  });

  // ---------- 作品管理 ----------
  ipcMain.handle('projects:list', () => storage.listProjects());

  ipcMain.handle('projects:create', (_e, name) => storage.createProject(name));

  ipcMain.handle('projects:rename', (_e, { id, name }) => storage.renameProject(id, name));

  ipcMain.handle('projects:delete', (_e, id) => storage.deleteProject(id));

  ipcMain.handle('project:load', (_e, id) => storage.loadProject(id));

  ipcMain.handle('project:save', (_e, { id, tree }) => storage.saveTree(id, tree));

  // ---------- 导出 ----------
  ipcMain.handle('export:project', async (_e, { id, format }) => {
    const project = storage.loadProject(id);
    if (!project) return { ok: false, detail: '作品不存在' };
    const win = getMainWindow();
    const ext = format === 'md' ? 'md' : 'txt';
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: '导出作品',
      defaultPath: `${project.name}.${ext}`,
      filters: [{ name: ext.toUpperCase() + ' 文件', extensions: [ext] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    try {
      const content = exporter.exportProject(project, format);
      fs.writeFileSync(filePath, content, 'utf8');
      return { ok: true, filePath };
    } catch (e) {
      return { ok: false, detail: '导出失败: ' + e.message };
    }
  });

  // ---------- 剪贴板 ----------
  ipcMain.handle('clipboard:write', (_e, text) => {
    require('electron').clipboard.writeText(String(text || ''));
    return true;
  });

  // ---------- AI 助手 ----------
  ipcMain.handle('ai:detect', () => deepseek.detectBrowsers());
  ipcMain.handle('ai:status', () => deepseek.getStatus());
  ipcMain.handle('ai:prepare', () => deepseek.prepare());
  ipcMain.handle('ai:check-login', () => deepseek.checkLogin());
  ipcMain.handle('ai:polish', (_e, payload) => deepseek.polish(payload));
  ipcMain.handle('ai:close-browser', () => deepseek.closeBrowser());
}

module.exports = { registerIpc };
