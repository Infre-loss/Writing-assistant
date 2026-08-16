import React from 'react';

export default function TopBar({
  projects,
  activeId,
  stats,
  view,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onExport,
  onSetView,
}) {
  const activeName = projects.find((p) => p.id === activeId)?.name || '未选择作品';

  return (
    <div className="topbar">
      <div className="logo">
        <span className="pen">✍️</span>
        <span>写作助手</span>
      </div>

      <div className="project-box">
        <select
          className="project-select"
          value={activeId || ''}
          onChange={(e) => onSelectProject(e.target.value)}
          disabled={!projects.length}
        >
          {!projects.length && <option value="">暂无作品</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="icon-btn" title="新建作品" onClick={onCreateProject}>
          ＋
        </button>
        <button className="icon-btn" title="重命名当前作品" onClick={onRenameProject}>
          ✎
        </button>
        <button
          className="icon-btn danger"
          title="删除当前作品"
          disabled={!activeId}
          onClick={() => activeId && onDeleteProject(activeId)}
        >
          🗑
        </button>
      </div>

      <div className="progress-summary">
        {stats.total > 0 && (
          <>
            <div className="progress-bar">
              <div style={{ width: stats.percent + '%' }} />
            </div>
            <div className="progress-text">
              完成 <b>{stats.done}</b>/{stats.total} 章 · 总字数 <b>{stats.words.toLocaleString()}</b>
              {stats.target > 0 && <span> / {stats.target.toLocaleString()}</span>}
            </div>
          </>
        )}
        {stats.total === 0 && <div className="progress-text">当前作品还没有大纲节点</div>}
      </div>

      <div className="tabs">
        <button
          className={'tab' + (view === 'tree' ? ' active' : '')}
          onClick={() => onSetView('tree')}
        >
          大纲
        </button>
        <button
          className={'tab' + (view === 'timeline' ? ' active' : '')}
          onClick={() => onSetView('timeline')}
        >
          时间轴
        </button>
        <button
          className={'tab' + (view === 'ai' ? ' active' : '')}
          onClick={() => onSetView('ai')}
        >
          AI 助手
        </button>
      </div>

      <div className="export-group">
        {activeId && (
          <>
            <button className="btn sm" onClick={() => onExport('md')} title="导出为 Markdown">
              ⬇ MD
            </button>
            <button className="btn sm" onClick={() => onExport('txt')} title="导出为 TXT">
              ⬇ TXT
            </button>
          </>
        )}
      </div>
    </div>
  );
}
