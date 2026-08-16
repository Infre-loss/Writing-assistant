import React from 'react';
import { flatten, STATUS_META } from '../store.js';
import DetailPanel from './DetailPanel.jsx';

export default function TimelineView({
  tree,
  selectedId,
  selectedNode,
  onSelect,
  onUpdate,
  onAddChild,
  onDelete,
}) {
  const flat = flatten(tree);
  const ordered = flat
    .map((n) => ({ ...n, sortKey: n.storyOrder || n.preIndex + 1 }))
    .sort((a, b) => a.sortKey - b.sortKey || a.preIndex - b.preIndex);

  return (
    <div className="timeline-wrap">
      <div className="timeline-scroll">
        <div className="pane-header">
          <span>时间轴 · 按故事发生顺序</span>
          <span className="sub">每个节点可在右侧详情中设置「时间轴顺序」；设置里程碑可标记关键节点</span>
        </div>

        {ordered.length === 0 ? (
          <div className="tree-empty">
            <span className="big">🕰️</span>
            还没有节点。
            <br />
            先到大纲页添加章节，时间轴会自动按顺序展示。
          </div>
        ) : (
          <div className="timeline-line">
            {ordered.map((n) => {
              const meta = STATUS_META[n.status] || STATUS_META.not_started;
              const pct =
                n.targetWords > 0
                  ? Math.min(100, Math.round((n.currentWords / n.targetWords) * 100))
                  : 0;
              return (
                <div key={n.id} className="tl-item">
                  <span className={`tl-dot ${n.status}`} />
                  <div
                    className={'tl-card' + (selectedId === n.id ? ' selected' : '')}
                    onClick={() => onSelect(n.id)}
                  >
                    <div className="tl-title">
                      {n.title || '（未命名）'}
                      <span className="tl-badge" style={{ background: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="tl-sub">
                      {n.targetWords > 0
                        ? `字数 ${n.currentWords} / ${n.targetWords}（${pct}%）`
                        : '未设置目标字数'}
                    </div>
                    {n.milestone && <div className="tl-milestone">🏁 {n.milestone}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="pane pane-right" style={{ flex: '0 0 42%', borderLeft: '1px solid var(--border)' }}>
          <DetailPanel
            node={selectedNode}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
