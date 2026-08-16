import React, { useEffect, useRef, useState } from 'react';
import { STATUS_META, nextStatus, isDescendant } from '../store.js';

export default function TreeView({
  tree,
  selectedId,
  onSelect,
  onAddChild,
  onAddSibling,
  onUpdateNode,
  onDeleteNode,
  onMoveNode,
}) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // {id, position}
  const knownIds = useRef(new Set());

  // 新出现的节点自动展开；用户手动折叠的状态保留
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const walk = (nodes) => {
        for (const n of nodes) {
          if (!knownIds.current.has(n.id)) {
            knownIds.current.add(n.id);
            if (n.children && n.children.length) next.add(n.id);
          }
          walk(n.children || []);
        }
      };
      walk(tree);
      return next;
    });
  }, [tree]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (node) => {
    setEditingId(node.id);
    setEditValue(node.title || '');
  };

  const commitEdit = (node) => {
    const v = editValue.trim();
    if (v && v !== node.title) onUpdateNode(node.id, { title: v });
    setEditingId(null);
  };

  const renderNode = (node, depth) => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const meta = STATUS_META[node.status] || STATUS_META.not_started;
    const pct =
      node.targetWords > 0
        ? Math.min(100, Math.round((node.currentWords / node.targetWords) * 100))
        : 0;
    const isEditing = editingId === node.id;
    const dropCls = dropTarget && dropTarget.id === node.id ? ` drag-over-${dropTarget.position}` : '';

    return (
      <React.Fragment key={node.id}>
        <div
          className={`tree-row${selectedId === node.id ? ' selected' : ''}${
            dragId === node.id ? ' dragging' : ''
          }${dropCls}`}
          style={{ paddingLeft: 8 + depth * 20 }}
          draggable
          onClick={() => onSelect(node.id)}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', node.id);
            e.dataTransfer.effectAllowed = 'move';
            setDragId(node.id);
          }}
          onDragEnd={() => {
            setDragId(null);
            setDropTarget(null);
          }}
          onDragOver={(e) => {
            if (!dragId || dragId === node.id) return;
            if (isDescendant(tree, node.id, dragId)) return; // 目标在自己的子孙上时不处理
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            let position;
            if (hasChildren && y > rect.height * 0.3 && y < rect.height * 0.7) position = 'inside';
            else if (y < rect.height * 0.45) position = 'before';
            else position = 'after';
            if (!dropTarget || dropTarget.id !== node.id || dropTarget.position !== position) {
              setDropTarget({ id: node.id, position });
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (dropTarget && id) onMoveNode(id, dropTarget.id, dropTarget.position);
            setDragId(null);
            setDropTarget(null);
          }}
        >
          {hasChildren ? (
            <button
              className="chevron"
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.id);
              }}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="chevron placeholder">•</span>
          )}

          <span
            className="status-badge"
            style={{ background: meta.color }}
            title={`状态：${meta.label}（点击切换）`}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateNode(node.id, { status: nextStatus(node.status) });
            }}
          >
            {meta.label}
          </span>

          {isEditing ? (
            <input
              className="node-title"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(node)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(node);
                if (e.key === 'Escape') setEditingId(null);
              }}
            />
          ) : (
            <span
              className="node-title"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEdit(node);
              }}
            >
              {node.title || '（未命名）'}
            </span>
          )}

          {node.milestone && <span className="milestone-flag">🏁 {node.milestone}</span>}

          <span className="node-meta">
            {node.targetWords > 0 && (
              <>
                <span className="words">
                  {node.currentWords}/{node.targetWords}
                </span>
                <span className="mini-progress">
                  <div style={{ width: pct + '%' }} />
                </span>
              </>
            )}
          </span>

          <span className="row-actions">
            <button
              className="icon-btn"
              title="添加子节点"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
            >
              ＋
            </button>
            <button
              className="icon-btn"
              title="添加同级节点"
              onClick={(e) => {
                e.stopPropagation();
                onAddSibling(node.id);
              }}
            >
              ⇣
            </button>
            <button
              className="icon-btn danger"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNode(node.id);
              }}
            >
              🗑
            </button>
          </span>
        </div>

        {hasChildren && isOpen && (node.children || []).map((c) => renderNode(c, depth + 1))}
      </React.Fragment>
    );
  };

  const count = (() => {
    let n = 0;
    const walk = (nodes) => {
      for (const x of nodes) {
        n++;
        walk(x.children || []);
      }
    };
    walk(tree);
    return n;
  })();

  return (
    <div className="tree-wrap">
      <div className="pane-header">
        <span>大纲</span>
        <span className="sub">{count} 个节点</span>
      </div>

      <div className="tree-toolbar">
        <button className="btn sm" onClick={() => onAddChild(null)}>
          ＋ 添加章节
        </button>
        <span className="sub" style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
          双击标题可重命名 · 拖拽调整层级与顺序 · 点击状态标签切换进度
        </span>
      </div>

      {tree.length === 0 ? (
        <div className="tree-empty">
          <span className="big">📝</span>
          还没有大纲节点。
          <br />
          点击上方「＋ 添加章节」开始搭建你的故事框架吧。
        </div>
      ) : (
        tree.map((n) => renderNode(n, 0))
      )}
    </div>
  );
}
