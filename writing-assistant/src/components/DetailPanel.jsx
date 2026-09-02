import React from 'react';
import { STATUS_META, STATUS_LIGHT } from '../store.js';

export default function DetailPanel({ node, onSelect, onUpdate, onAddChild, onDelete, onGoWrite }) {
  if (!node) {
    return (
      <div className="detail-wrap detail-empty">
        <span className="big">📖</span>
        在左侧选择一个章节节点，
        <br />
        在这里编辑标题、状态、字数与备注。
      </div>
    );
  }

  const num = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : Math.max(0, Math.floor(n));
  };

  return (
    <div className="detail-wrap">
      <input
        className="detail-title-input"
        value={node.title}
        placeholder="章节标题"
        onChange={(e) => onUpdate(node.id, { title: e.target.value })}
      />

      <div className="detail-section">
        <div className="detail-label">写作状态</div>
        <div className="seg">
          {['not_started', 'writing', 'done'].map((s) => (
            <button
              key={s}
              data-status={s}
              className={node.status === s ? 'active' : ''}
              onClick={() => onUpdate(node.id, { status: s })}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label>目标字数</label>
          <input
            type="number"
            min="0"
            value={node.targetWords || ''}
            placeholder="0"
            onChange={(e) => onUpdate(node.id, { targetWords: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>已写字数</label>
          <input
            type="number"
            min="0"
            value={node.currentWords || ''}
            placeholder="0"
            onChange={(e) => onUpdate(node.id, { currentWords: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>时间轴顺序（0 = 按大纲顺序）</label>
          <input
            type="number"
            min="0"
            value={node.storyOrder || ''}
            placeholder="0"
            onChange={(e) => onUpdate(node.id, { storyOrder: num(e.target.value) })}
          />
        </div>
        <div className="field">
          <label>里程碑（可选，如：高潮/转折）</label>
          <input
            value={node.milestone}
            placeholder="例如：真相揭露"
            onChange={(e) => onUpdate(node.id, { milestone: e.target.value })}
          />
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-label">备注（人物设定 / 伏笔 / 场景要点…）</div>
        <textarea
          className="detail-notes"
          value={node.notes}
          placeholder="在这里记录这个章节的设定、灵感、需要注意的伏笔……"
          onChange={(e) => onUpdate(node.id, { notes: e.target.value })}
        />
      </div>

      <div className="detail-actions">
        <button className="btn primary sm" onClick={() => onAddChild(node.id)}>
          ＋ 添加子节点
        </button>
        <button className="btn sm" onClick={() => onGoWrite && onGoWrite()}>
          ✍ 去写作台创作
        </button>
        <button className="btn sm" onClick={() => onDelete(node.id)}>
          删除该节点
        </button>
      </div>
      {node.content && String(node.content).trim() ? (
        <div className="detail-label" style={{ marginTop: 10 }}>
          正文：{String(node.content).replace(/\s/g, '').length} 字（点击「去写作台创作」继续写）
        </div>
      ) : (
        <div className="detail-label" style={{ marginTop: 10 }}>
          还没有正文，点击「去写作台创作」开始写。
        </div>
      )}

      {node.children && node.children.length > 0 && (
        <div className="detail-section">
          <div className="detail-label">子节点（点击跳转到该章节）</div>
          <div className="children-list">
            {node.children.map((c) => {
              const m = STATUS_META[c.status] || STATUS_META.not_started;
              const l = STATUS_LIGHT[c.status] || STATUS_LIGHT.not_started;
              const pct =
                c.targetWords > 0
                  ? Math.min(100, Math.round((c.currentWords / c.targetWords) * 100))
                  : 0;
              return (
                <div key={c.id} className="child" onClick={() => onSelect(c.id)}>
                  <div className="child-title">{c.title || '（未命名）'}</div>
                  <div className="child-meta">
                    <span className="status-text" style={{ background: l }}>
                      <span className="status-dot" style={{ background: m.color }} />
                      {m.label}
                    </span>
                    {c.targetWords > 0 && (
                      <>
                        <span className="words">
                          {c.currentWords}/{c.targetWords}
                        </span>
                        <span className="mini-progress">
                          <div style={{ width: pct + '%' }} />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
