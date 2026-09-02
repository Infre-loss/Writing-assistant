import React, { useEffect, useState } from 'react';

export default function UpdatePanel({ onClose }) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState(null);

  const run = async () => {
    setChecking(true);
    try {
      const r = await window.api.checkUpdate();
      setResult(r);
    } catch (e) {
      setResult({ ok: false, configured: true, currentVersion: '', detail: e.message });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    run();
  }, []);

  return (
    <div
      className="modal-mask"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>⤓ 软件更新</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {checking ? (
          <div className="upd-loading">正在检查更新…</div>
        ) : !result.configured ? (
          <div className="upd-body">
            <p>当前版本 <b>v{result.currentVersion}</b></p>
            <p className="upd-tip">
              ℹ️ 本版本尚未配置更新检查地址。开发者配置后（见《发布更新说明.md》），这里会提示新版本。
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                关闭
              </button>
            </div>
          </div>
        ) : !result.ok ? (
          <div className="upd-body">
            <p>当前版本 <b>v{result.currentVersion}</b></p>
            <p className="upd-err">⚠️ 检查失败：{result.detail}</p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                关闭
              </button>
              <button className="btn primary" onClick={run}>
                再试一次
              </button>
            </div>
          </div>
        ) : !result.newer ? (
          <div className="upd-body">
            <p>当前版本 <b>v{result.currentVersion}</b></p>
            <p className="upd-ok">✅ 已是最新版本</p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                关闭
              </button>
              <button className="btn" onClick={run}>
                再检查一次
              </button>
            </div>
          </div>
        ) : (
          <div className="upd-body">
            <p>
              当前版本 <b>v{result.currentVersion}</b> → 发现新版本{' '}
              <b className="upd-new">v{result.latestVersion}</b>
            </p>
            {result.note && (
              <>
                <div className="detail-label" style={{ marginTop: 6 }}>
                  更新内容
                </div>
                <pre className="upd-note">{result.note}</pre>
              </>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                稍后再说
              </button>
              {result.downloadUrl ? (
                <button className="btn primary" onClick={() => window.api.openUrl(result.downloadUrl)}>
                  ⬇ 下载新版本
                </button>
              ) : (
                <span className="upd-tip">（更新清单未提供下载地址）</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
