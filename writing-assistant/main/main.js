// 写作助手 - Electron 主进程入口
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { initStorage } = require('./storage');
const { registerIpc } = require('./ipc');

// 调试模式（仅供开发验证）：把用户数据目录指到项目内，避免写入系统目录
if (process.env.DS_ASSIST_DEBUG === '1') {
  app.setPath('userData', path.join(__dirname, '..', '.debug-userdata'));
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: '写作助手',
    backgroundColor: '#f4f8fc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 生产/开发统一从 dist 加载（vite build 产物）
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // 调试模式：DS_ASSIST_SHOT=1 时加载完成后截图保存到项目根目录并退出
  if (process.env.DS_ASSIST_SHOT === '1') {
    const shotLog = path.join(__dirname, '..', 'shot.log');
    const log = (m) => {
      try {
        fs.appendFileSync(shotLog, m + '\n');
      } catch (e) {}
    };
    log('start: ' + new Date().toISOString());
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      log('did-fail-load: ' + code + ' ' + desc);
    });
    mainWindow.webContents.on('console-message', (_e, level, message) => {
      log('renderer-console: ' + message);
    });
    mainWindow.webContents.once('did-finish-load', async () => {
      log('did-finish-load at ' + new Date().toISOString());
      await new Promise((r) => setTimeout(r, Number(process.env.DS_ASSIST_SHOT_DELAY) || 2500));
      try {
        log('dump: starting');
        // 看门狗：防止转储卡死导致测试挂起
        const watchdog = setTimeout(() => {
          log('watchdog: dump hung, force capture');
          mainWindow.webContents.capturePage().then((img) => {
            fs.writeFileSync(path.join(__dirname, '..', 'shot.png'), img.toPNG());
            log('shot saved (watchdog)');
          }).catch((e) => log('watchdog capture failed: ' + e.message)).finally(() => app.quit());
        }, 20000);
        // DOM 状态转储（验证渲染与 IPC）
        const dump = await mainWindow.webContents.executeJavaScript(`(async () => {
          const out = {};
          const safe = async (name, fn) => { try { out[name] = await fn(); } catch (e) { out[name + 'Err'] = String(e); } };
          await safe('title', () => document.title);
          await safe('hasApi', () => !!window.api);
          await safe('treeRows', () => document.querySelectorAll('.tree-row').length);
          await safe('tabs', () => [...document.querySelectorAll('.tab')].map(t => t.textContent));
          await safe('updateModalText', () => {
            const el = document.querySelector('.modal .upd-body') || document.querySelector('.upd-loading');
            return el ? el.innerText.slice(0, 160).replace(/\\n/g, ' ') : '';
          });
          await safe('projectName', () => document.querySelector('.project-select option:checked')?.textContent || null);
          const clickTab = async (name) => {
            const btns = [...document.querySelectorAll('.tab')];
            const b = btns.find(x => x.textContent.includes(name));
            if (b) b.click();
            await new Promise(r => setTimeout(r, 700));
          };
          await safe('timeline', async () => {
            await clickTab('时间轴');
            return {
              cards: document.querySelectorAll('.tl-card').length,
              badges: [...document.querySelectorAll('.tl-badge')].map(x => x.textContent),
              milestones: document.querySelectorAll('.tl-milestone').length,
            };
          });
          await safe('ai', async () => {
            await clickTab('AI 助手');
            return {
              privacy: !!document.querySelector('.ai-privacy'),
              textarea: !!document.querySelector('.ai-textarea'),
            };
          });
          await safe('editor', async () => {
            await clickTab('写作台');
            const ta = document.querySelector('.editor-textarea');
            return {
              textareaLen: ta ? ta.value.length : -1,
              wordLine: document.querySelector('.editor-status-line')?.textContent?.trim() || '',
              btns: [...document.querySelectorAll('.editor-actions button')].map((b) => b.textContent.trim()),
              selectorCount: document.querySelectorAll('.editor-select option').length,
            };
          });
          await safe('cheerTest', async () => {
            // 选中目标=20 字的测试章，输入超过 20 字 → 应弹出达标弹窗
            const sel = document.querySelector('.editor-select');
            if (sel) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
              setter.call(sel, 'n13');
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              await new Promise((r) => setTimeout(r, 500));
            }
            const ta = document.querySelector('.editor-textarea');
            const text = '短短的开头。一二三四五六七八九十一二三四五六七八九十';
            if (ta) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
              setter.call(ta, text);
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise((r) => setTimeout(r, 800));
            }
            const cheerTitle = document.querySelector('.cheer .cheer-title');
            const btns = [...document.querySelectorAll('.cheer-actions button')].map((b) => b.textContent.trim());
            const label = cheerTitle ? document.querySelector('.cheer .cheer-sub')?.textContent || '' : '';
            const result = cheerTitle
              ? cheerTitle.innerText.replace(/\s+/g, ' ').slice(0, 60)
              : 'NO CHEER';
            // 关掉弹窗，恢复现场
            const closeBtn = [...document.querySelectorAll('.cheer-actions button')].find((b) => b.textContent.includes('休息'));
            if (closeBtn) closeBtn.click();
            await new Promise((r) => setTimeout(r, 400));
            return { title: result, chapter: label, buttons: btns };
          });
          await safe('timelineLayout', async () => {
            await clickTab('时间轴');
            return {
              cards: document.querySelectorAll('.tl-card').length,
              titleFirst: document.querySelectorAll('.tl-card .tl-title').length,
              statusBelow: document.querySelectorAll('.tl-card .tl-status').length,
              writeBtns: document.querySelectorAll('.tl-write').length,
              rightPanel: !!document.querySelector('.timeline-wrap .pane-right'),
              indents: [...document.querySelectorAll('.tl-item')].map((el) => el.style.marginLeft),
            };
          });
          await safe('timelineJump', async () => {
            const card = document.querySelector('.tl-card');
            const titleBefore = card ? (card.querySelector('.tl-title').textContent || '').trim() : '';
            if (card) card.click();
            await new Promise((r) => setTimeout(r, 800));
            const ta = document.querySelector('.editor-textarea');
            const sel = document.querySelector('.editor-select');
            return {
              clicked: titleBefore,
              editorOpen: !!ta,
              selectedTitle: sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].textContent.trim() : '',
            };
          });
          await safe('backToTree', async () => {
            await clickTab('大纲');
            return {
              rows: document.querySelectorAll('.tree-row').length,
              line1: document.querySelectorAll('.row-line1').length,
              line2: document.querySelectorAll('.row-line2').length,
              statusText: document.querySelectorAll('.status-text').length,
              inlineBadge: document.querySelectorAll('.tree-row > .status-badge').length,
            };
          });
          await safe('childrenList', () => {
            const firstChildRow = document.querySelector('.children-list .child');
            return {
              rows: document.querySelectorAll('.children-list .child').length,
              titleLine: !!firstChildRow && !!firstChildRow.querySelector('.child-title'),
              statusBelow: !!firstChildRow && !!firstChildRow.querySelector('.child-meta .status-text'),
              coloredPillLeft: !!firstChildRow && !!firstChildRow.querySelector('.status-badge'),
            };
          });
          await safe('gitPanel', async () => {
            const backupBtn = [...document.querySelectorAll('.topbar button')].find((b) => (b.textContent || '').includes('备份'));
            if (!backupBtn) return 'NO BTN';
            backupBtn.click();
            await new Promise((r) => setTimeout(r, 1200));
            const panel = document.querySelector('.modal-git');
            const txt = panel ? panel.innerText.slice(0, 260) : 'NOT OPENED';
            const closeBtn = [...document.querySelectorAll('.modal-head button')].find((b) => (b.textContent || '').includes('✕'));
            if (closeBtn) closeBtn.click();
            return txt;
          });
          await safe('projects', () => window.api.listProjects());
          return out;
        })()`);
        clearTimeout(watchdog);
        log('DOMDUMP ' + JSON.stringify(dump));
        log('dump: done, taking screenshot');
        const img = await mainWindow.webContents.capturePage();
        fs.writeFileSync(path.join(__dirname, '..', 'shot.png'), img.toPNG());
        log('shot saved, size=' + img.toPNG().length);
        // 多视图截图（给用户目测验收）
        for (const [fname, tabName] of [
          ['shot-editor', '写作台'],
          ['shot-timeline', '时间轴'],
          ['shot-ai', 'AI 助手'],
          ['shot-tree', '大纲'],
        ]) {
          try {
            await mainWindow.webContents.executeJavaScript(
              `(() => { const b = [...document.querySelectorAll('.tab')].find(x => x.textContent.includes('${tabName}')); if (b) b.click(); })()`
            );
            await new Promise((r) => setTimeout(r, 1000));
            const im = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '..', fname + '.png'), im.toPNG());
            log(fname + ' saved');
          } catch (e) {
            log(fname + ' failed: ' + e.message);
          }
        }
      } catch (e) {
        log('capture failed: ' + e.message);
      }
      app.quit();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.DS_ASSIST_SHOT === '1') {
    const log = (m) => {
      try {
        fs.appendFileSync(path.join(__dirname, '..', 'shot.log'), m + '\n');
      } catch (e) {}
    };
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      log('render-process-gone: ' + JSON.stringify(details));
    });
    mainWindow.on('unresponsive', () => log('window unresponsive'));
  }
}

app.whenReady().then(() => {
  if (process.env.DS_ASSIST_SHOT === '1') {
    const log = (m) => {
      try {
        fs.appendFileSync(path.join(__dirname, '..', 'shot.log'), m + '\n');
      } catch (e) {}
    };
    log('whenReady at ' + new Date().toISOString());
    process.on('uncaughtException', (e) => log('uncaughtException: ' + e.message + '\n' + (e.stack || '')));
  }
  initStorage(app.getPath('userData'));
  registerIpc(ipcMain, {
    getMainWindow: () => mainWindow,
    app,
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
