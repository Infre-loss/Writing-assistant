// IPC 注册：渲染进程 <-> 主进程 的唯一通道
const fs = require('fs');
const { dialog } = require('electron');
const storage = require('./storage');
const exporter = require('./export');
const deepseek = require('./deepseek');
const importer = require('./import');

// 在大纲树中按 id 查找节点
function findNodeInTree(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n;
    const r = findNodeInTree(n.children || [], id);
    if (r) return r;
  }
  return null;
}

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

  // ---------- Word 导入导出 ----------
  ipcMain.handle('export:docx', async (_e, { id, scope, nodeId }) => {
    const project = storage.loadProject(id);
    if (!project) return { ok: false, detail: '作品不存在' };
    const win = getMainWindow();
    try {
      let buffer;
      let defaultName;
      if (scope === 'chapter' && nodeId) {
        const node = findNodeInTree(project.tree, nodeId);
        if (!node) return { ok: false, detail: '章节不存在' };
        buffer = await exporter.exportChapterDocx(node);
        defaultName = `${project.name}-${node.title || '章节'}.docx`;
      } else {
        buffer = await exporter.exportBookDocx(project);
        defaultName = `${project.name}.docx`;
      }
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: '导出 Word 文档',
        defaultPath: defaultName,
        filters: [{ name: 'Word 文档', extensions: ['docx'] }],
      });
      if (canceled || !filePath) return { ok: false, canceled: true };
      fs.writeFileSync(filePath, buffer);
      return { ok: true, filePath };
    } catch (e) {
      return { ok: false, detail: '导出失败: ' + e.message };
    }
  });

  ipcMain.handle('import:docx', async (_e, { id, nodeId }) => {
    const win = getMainWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: '导入 Word 文档（写入当前章节）',
      filters: [{ name: 'Word 文档', extensions: ['docx'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { ok: false, canceled: true };
    try {
      const r = await importer.importDocx(filePaths[0]);
      const updated = storage.updateNodeContent(id, nodeId, r.text, r.charCount);
      if (!updated) return { ok: false, detail: '章节不存在' };
      return { ok: true, filePath: filePaths[0], text: r.text, charCount: r.charCount };
    } catch (e) {
      return { ok: false, detail: '导入失败: ' + e.message };
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
