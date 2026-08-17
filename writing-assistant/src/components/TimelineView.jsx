import React from 'react';
import { flatten, STATUS_META } from '../store.js';

export default function TimelineView({ tree, onGoWrite }) {
  const flat = flatten(tree);
  const ordered = flat
    .map((n) => ({ ...n, sortKey: n.storyOrder || n.preIndex + 1 }))
    .sort((a, b) => a.sortKey - b.sortKey || a.preIndex - b.preIndex);

  return (
    <div className="timeline-wrap">
      <div className="timeline-scroll">
        <div className="pane-header">
          <span>时间轴 · 按故事顺序排列（层级缩进）</span>
          <span className="sub">
            点击卡片直接进入写作台创作；层级顺序可在大纲中拖拽调整，故事顺序可在详情里设置「时间轴顺序」
          </span>
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
                <div
                  key={n.id}
                  className="tl-item"
                  style={{ marginLeft: n.depth * 26 }}
                  title={`点击进入写作台：${n.title || '未命名'}`}
                >
                  <span className={`tl-dot ${n.status}`} />
                  <div
                    className="tl-card"
                    onClick={() => onGoWrite && onGoWrite(n.id)}
                  >
                    <div className="tl-title">
                      {n.title || '（未命名）'}
                      <span className="tl-write">✍ 去写作</span>
                    </div>
                    <div className="tl-status">
                      <span className="tl-status-dot" style={{ background: meta.color }} />
                      <span className="tl-status-text">{meta.label}</span>
                      <span className="tl-sep">·</span>
                      <span>
                        {n.targetWords > 0
                          ? `字数 ${n.currentWords} / ${n.targetWords}（${pct}%）`
                          : '未设置目标字数'}
                      </span>
                    </div>
                    {n.milestone && <div className="tl-milestone">🏁 {n.milestone}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
