import React, { useEffect, useState } from 'react';
import Fireworks from './Fireworks.jsx';

// 庆祝弹窗：
// - chapter 章节达标 / milestone 字数里程碑：直接弹卡片
// - book 全书完成：先全屏盛大烟花秀（可跳过），播完再弹祝贺卡片
const BOOK_SHOW_MS = 6500; // 烟花秀时长

export default function CelebrationModal({ kind, node, milestoneText, onClose, onPrimary, onPrimaryLabel }) {
  const [bookPhase, setBookPhase] = useState('fireworks'); // 'fireworks' | 'card'

  useEffect(() => {
    if (kind !== 'book') return undefined;
    // 尊重系统“减少动态”：不播烟花直接出卡片
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setBookPhase('card');
      return undefined;
    }
    const t = setTimeout(() => setBookPhase('card'), BOOK_SHOW_MS);
    return () => clearTimeout(t);
  }, [kind]);

  // ---- 全书完成：烟花秀阶段（全屏） ----
  if (kind === 'book' && bookPhase === 'fireworks') {
    return (
      <div className="cheer-show">
        <Fireworks finaleAtMs={BOOK_SHOW_MS - 800} />
        <button
          className="cheer-skip"
          onClick={() => setBookPhase('card')}
          title="跳过烟花，直接查看祝贺"
        >
          跳过 →
        </button>
      </div>
    );
  }

  // ---- 卡片阶段（所有类型） ----
  return (
    <div
      className="modal-mask cheer-mask"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {kind === 'book' && <Fireworks />}
      <div className={'cheer ' + (kind === 'book' ? 'cheer-book' : '')}>
        {kind === 'chapter' && (
          <>
            <div className="cheer-emoji">😉</div>
            <div className="cheer-title">
              你已经写了 <b>{node ? node.targetWords : 0}</b> 字了！
              <br />
              你真棒！
            </div>
            <div className="cheer-sub">{node ? node.title : ''}</div>
            <div className="cheer-actions">
              <button className="btn" onClick={onClose}>
                休息一下
              </button>
              <button className="btn primary" onClick={onPrimary}>
                继续写作
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
                导出全书为 Word
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
