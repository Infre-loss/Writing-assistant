import React, { useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import TreeView from './components/TreeView.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import TimelineView from './components/TimelineView.jsx';
import AIView from './components/AIView.jsx';
import EditorView from './components/EditorView.jsx';
import Modal from './components/Modal.jsx';
import UpdatePanel from './components/UpdatePanel.jsx';
import {
  makeNode,
  addChild,
  addSibling,
  updateNode,
  removeNode,
  moveNode,
  findNode,
  calcStats,
} from './store.js';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [project, setProject] = useState(null);
  const [view, setView] = useState('tree'); // tree | timeline | ai
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // {mode:'create'} | {mode:'rename', id, name}
  const [showUpdate, setShowUpdate] = useState(false);
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // 启动：加载作品列表
  useEffect(() => {
    (async () => {
      try {
        const list = await window.api.listProjects();
        setProjects(list);
        if (list.length) setActiveId(list[0].id);
      } catch (e) {
        showToast('读取本地数据失败: ' + e.message);
      }
    })();
  }, []);

  // 启动后静默检查更新：发现新版本才弹窗
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const r = await window.api.checkUpdate();
        if (r && r.ok && r.newer) setShowUpdate(true);
      } catch (e) {
        /* 静默失败，用户可手动点「检查更新」 */
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 切换作品：加载大纲
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const p = await window.api.loadProject(activeId);
        if (!p) {
          showToast('作品数据读取失败，文件可能已损坏');
          return;
        }
        setProject(p);
        setSelectedId(null);
      } catch (e) {
        showToast('加载作品失败: ' + e.message);
      }
    })();
  }, [activeId]);

  // 大纲改动 -> 更新内存 + 防抖自动保存到本地
  const changeTree = (tree) => {
    setProject((prev) => (prev ? { ...prev, tree } : prev));
    if (!activeId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.api.saveProject(activeId, tree);
      } catch (e) {
        showToast('保存失败: ' + e.message);
      }
    }, 500);
  };

  const refreshProjects = async () => {
    const list = await window.api.listProjects();
    setProjects(list);
    return list;
  };

  // 窗口关闭前把未保存的改动立即写盘
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current && activeId && project) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        window.api.saveProject(activeId, project.tree).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [activeId, project]);

  // ---------- 作品操作 ----------
  const handleCreateProject = async (name) => {
    const p = await window.api.createProject(name);
    await refreshProjects();
    setActiveId(p.id);
    showToast(`已创建作品「${p.name}」`);
  };

  const handleRenameProject = async (id, name) => {
    await window.api.renameProject(id, name);
    await refreshProjects();
    if (id === activeId) {
      const p = await window.api.loadProject(id);
      setProject(p);
    }
    showToast('已重命名');
  };

  const handleDeleteProject = async (id) => {
    const p = projects.find((x) => x.id === id);
    if (!window.confirm(`确定删除作品「${p ? p.name : ''}」吗？此操作不可恢复。`)) return;
    await window.api.deleteProject(id);
    const list = await refreshProjects();
    if (id === activeId) {
      setActiveId(list.length ? list[0].id : null);
      setProject(null);
    }
    showToast('作品已删除');
  };

  // ---------- 大纲操作 ----------
  const tree = project ? project.tree : [];
  const stats = calcStats(tree);
  const selectedNode = selectedId ? findNode(tree, selectedId) : null;

  const handleAddChild = (parentId) => {
    changeTree(addChild(tree, parentId, makeNode('新章节')));
  };

  const handleAddSibling = (id) => {
    changeTree(addSibling(tree, id, makeNode('新章节')));
  };

  const handleUpdateNode = (id, patch) => {
    changeTree(updateNode(tree, id, patch));
  };

  const handleDeleteNode = (id) => {
    const n = findNode(tree, id);
    if (!window.confirm(`确定删除「${(n && n.title) || '该节点'}」及其所有子节点吗？`)) return;
    const next = removeNode(tree, id);
    changeTree(next);
    if (selectedId === id) setSelectedId(null);
  };

  const handleMoveNode = (dragId, targetId, position) => {
    changeTree(moveNode(tree, dragId, targetId, position));
  };

  // ---------- 导出 ----------
  const handleExport = async (format) => {
    if (!activeId) return;
    const res = await window.api.exportProject(activeId, format);
    if (res.ok) showToast('已导出: ' + res.filePath);
    else if (res.detail) showToast(res.detail);
  };

  const openCreate = () => setModal({ mode: 'create' });
  const openRename = () => {
    if (activeId && project) setModal({ mode: 'rename', id: activeId, name: project.name });
  };

  return (
    <div className="app">
      <TopBar
        projects={projects}
        activeId={activeId}
        stats={stats}
        view={view}
        onSelectProject={(id) => setActiveId(id)}
        onCreateProject={openCreate}
        onRenameProject={openRename}
        onDeleteProject={handleDeleteProject}
        onExport={handleExport}
        onSetView={setView}
        onCheckUpdate={() => setShowUpdate(true)}
      />

      <div className="content">
        {view === 'tree' &&
          (projects.length === 0 ? (
            <div className="welcome">
              <div className="icon">✍️</div>
              <h2>欢迎使用「写作助手」</h2>
              <p>
                把你的写作灵感整理成清晰的大纲，标记每章进度；
                <br />
                需要润色文字时，可到「AI 助手」页使用 DeepSeek 网页版。
              </p>
              <button className="btn primary" onClick={openCreate}>
                新建第一个作品
              </button>
            </div>
          ) : (
            <div className="split">
              <div className="pane pane-left">
                <TreeView
                  tree={tree}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAddChild={handleAddChild}
                  onAddSibling={handleAddSibling}
                  onUpdateNode={handleUpdateNode}
                  onDeleteNode={handleDeleteNode}
                  onMoveNode={handleMoveNode}
                />
              </div>
              <div className="pane pane-right">
                <DetailPanel
                  node={selectedNode}
                  onSelect={setSelectedId}
                  onUpdate={handleUpdateNode}
                  onAddChild={handleAddChild}
                  onDelete={handleDeleteNode}
                  onGoWrite={() => setView('editor')}
                />
              </div>
            </div>
          ))}

        {view === 'timeline' && (
          <TimelineView
            tree={tree}
            onGoWrite={(id) => {
              setSelectedId(id);
              setView('editor');
            }}
          />
        )}

        {view === 'editor' && (
          <EditorView
            project={project}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={handleUpdateNode}
            onToast={showToast}
          />
        )}

        {view === 'ai' && <AIView />}
      </div>

      {modal && (
        <Modal
          mode={modal.mode}
          initialName={modal.name || ''}
          onCancel={() => setModal(null)}
          onConfirm={(name) => {
            setModal(null);
            if (modal.mode === 'create') handleCreateProject(name);
            else handleRenameProject(modal.id, name);
          }}
        />
      )}

      {showUpdate && <UpdatePanel onClose={() => setShowUpdate(false)} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
