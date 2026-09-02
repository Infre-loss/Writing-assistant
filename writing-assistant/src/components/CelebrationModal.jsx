import React, { useEffect, useState } from 'react';
import Fireworks from './Fireworks.jsx';

// 庆祝弹窗：
// - chapter 章节达标 / milestone 字数里程碑：直接弹卡片
// - book 全书完成：先全屏盛大烟花秀（可跳过），中央大烟花飘落结束后弹祝贺卡片
const BOOK_MAX_MS = 22000; // 兜底：万一动画异常最多等这么久

export default function CelebrationModal({ kind, node, milestoneText, onClose, onPrimary, onPrimaryLabel }) {
  const [bookPhase, setBookPhase] = useState('fireworks'); // 'fireworks' | 'card'

  // 烟花秀阶段：窗口切全屏（无视窗口大小）；进入卡片或关闭时还原
  const rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  useEffect(() => {
    if (kind !== 'book') return undefined;
    if (bookPhase === 'fireworks' && rm) {
      setBookPhase('card');
      return undefined;
    }
    const wantFs = bookPhase === 'fireworks' && !rm;
    if (wantFs && window.api && window.api.setFullScreen) window.api.setFullScreen(true);
    return () => {
      if (window.api && window.api.setFullScreen) window.api.setFullScreen(false);
    };
  }, [kind, bookPhase, rm]);

  // 兜底：动画未正常结束也出卡片
  useEffect(() => {
    if (kind !== 'book' || bookPhase !== 'fireworks') return undefined;
    const t = setTimeout(() => setBookPhase('card'), BOOK_MAX_MS);
    return () => clearTimeout(t);
  }, [kind, bookPhase]);

  // ---- 全书完成：烟花秀阶段（全屏） ----
  if (kind === 'book' && bookPhase === 'fireworks') {
    return (
      <div className="cheer-show">
        <Fireworks onFinish={() => setBookPhase('card')} />
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
      {kind === 'book' && <Fireworks ambientOnly />}
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
