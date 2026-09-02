import React from 'react';

// 庆祝弹窗：三种变体 chapter（章节达标）/ milestone（总字数里程碑）/ book（全书完成）
export default function CelebrationModal({ kind, node, milestoneText, onClose, onPrimary, onPrimaryLabel }) {
  return (
    <div
      className="modal-mask cheer-mask"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={'cheer ' + (kind === 'book' ? 'cheer-book' : '')}>
        {kind === 'chapter' && (
          <>
            <div className="cheer-emoji">🎉</div>
            <div className="cheer-title">
              你已经写了 <b>{node ? node.targetWords : 0}</b> 字了！
              <br />
              你真棒！
            </div>
            <div className="cheer-sub">{node ? node.title : ''}</div>
            <div className="cheer-actions">
              <button className="btn" onClick={onClose}>
                🍵 休息一下
              </button>
              <button className="btn primary" onClick={onPrimary}>
                ✍️ 继续写作
              </button>
            </div>
          </>
        )}

        {kind === 'milestone' && (
          <>
            <div className="cheer-emoji">🌱</div>
            <div className="cheer-title">字数里程碑达成</div>
            <div className="cheer-sub">{milestoneText}</div>
            <div className="cheer-actions">
              <button className="btn" onClick={onClose}>
                收起来
              </button>
              <button className="btn primary" onClick={onPrimary}>
                {onPrimaryLabel || '继续写作'}
              </button>
            </div>
          </>
        )}

        {kind === 'book' && (
          <>
            <div className="cheer-emoji">📚</div>
            <div className="cheer-title">全书写完了！</div>
            <div className="cheer-sub">
              从第一个字到这里，你把一个世界完整地讲完了。
              <br />
              休息一下，好好为自己骄傲一次。
            </div>
            <div className="cheer-actions">
              <button className="btn" onClick={onClose}>
                收起来
              </button>
              <button className="btn primary" onClick={onPrimary}>
                ⬇ 导出全书为 Word
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
