import React, { useEffect, useRef, useState } from 'react';

const STYLES = ['更流畅', '更简洁', '更文艺', '更口语化', '扩写', '压缩'];

const STATUS_TEXT = {
  idle: '空闲',
  opening: '正在打开浏览器…',
  need_login: '需要登录 DeepSeek 网页版',
  ready: '已就绪，可以润色',
  working: 'AI 生成中…',
  done: '完成',
  error: '出错',
};

export default function AIView() {
  const [browsers, setBrowsers] = useState([]);
  const [launched, setLaunched] = useState(false);
  const [loginState, setLoginState] = useState(null); // {loggedIn, needLogin, detail}
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [style, setStyle] = useState('更流畅');
  const [custom, setCustom] = useState('');
  const [working, setWorking] = useState(false);
  const [statusLine, setStatusLine] = useState('');
  const [reply, setReply] = useState('');
  const [copied, setCopied] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const b = await window.api.aiDetect();
        if (mounted.current) setBrowsers(b);
        const st = await window.api.aiStatus();
        if (mounted.current) setLaunched(st.launched);
      } catch (e) {
        if (mounted.current) setStatusLine('初始化失败: ' + e.message);
      }
      window.api.onAiStatus((data) => {
        if (!mounted.current) return;
        setStatusLine(data.detail || STATUS_TEXT[data.status] || data.status);
        if (data.status === 'ready') {
          setLoginState({ loggedIn: true, needLogin: false, detail: '已登录' });
        }
        if (data.status === 'need_login') {
          setLoginState({ loggedIn: false, needLogin: true, detail: data.detail });
        }
      });
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  const handlePrepare = async () => {
    setBusy(true);
    setStatusLine('正在打开浏览器…');
    try {
      const st = await window.api.aiPrepare();
      setLoginState(st);
      setLaunched(true);
    } catch (e) {
      setStatusLine('打开失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCheckLogin = async () => {
    setBusy(true);
    setStatusLine('正在检查登录状态…');
    try {
      const st = await window.api.aiCheckLogin();
      setLoginState(st);
      setStatusLine(st.loggedIn ? '已登录，可以开始润色' : '尚未登录：' + (st.detail || ''));
    } catch (e) {
      setStatusLine('检查失败: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    await window.api.aiCloseBrowser();
    setLaunched(false);
    setLoginState(null);
    setStatusLine('浏览器已关闭');
  };

  const handlePolish = async () => {
    if (!text.trim() || working) return;
    setWorking(true);
    setReply('');
    setCopied(false);
    setStatusLine('准备发送…');
    try {
      const instruction = [style, custom.trim()].filter(Boolean).join('；');
      const res = await window.api.aiPolish({ text, instruction });
      if (res.ok) {
        setReply(res.reply);
        setStatusLine('完成');
      } else if (res.needLogin) {
        setLoginState({ loggedIn: false, needLogin: true, detail: res.detail });
        setStatusLine('需要先登录 DeepSeek 网页版：' + (res.detail || ''));
      } else {
        setStatusLine('出错：' + (res.detail || '未知错误'));
      }
    } catch (e) {
      setStatusLine('出错：' + e.message);
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    await window.api.copyText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const browserName = browsers.length ? browsers.map((b) => b.name).join(' / ') : '未检测到';
  const loggedIn = loginState ? loginState.loggedIn : null;

  return (
    <div className="ai-wrap">
      <div className="ai-privacy">
        <span className="lock">🔒</span>
        <div>
          <b>隐私保障：</b>你的大纲与作品数据始终保存在本机，不会被上传。
          只有你<b>主动粘贴</b>到下面输入框里的文字，才会被发送到 DeepSeek 官方网页版进行润色。
        </div>
      </div>

      <div className="ai-status-card">
        <div className="info">
          <span className={'dot' + (browsers.length ? ' ok' : '')} />
          <span>
            浏览器：<b>{browserName}</b>
            {launched && (
              <span style={{ marginLeft: 10 }}>
                登录状态：
                <b style={{ color: loggedIn === true ? 'var(--done)' : loggedIn === false ? 'var(--danger)' : 'var(--text-2)' }}>
                  {loggedIn === true ? '已登录 ✓' : loggedIn === false ? '未登录' : '未检测'}
                </b>
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={handlePrepare} disabled={busy}>
            {launched ? '打开/恢复浏览器' : '打开浏览器（首次需登录）'}
          </button>
          <button className="btn sm" onClick={handleCheckLogin} disabled={busy || !launched}>
            检查登录
          </button>
          <button className="btn sm" onClick={handleClose} disabled={!launched}>
            关闭浏览器
          </button>
        </div>
      </div>

      {!loggedIn && launched && (
        <div className="ai-status-card" style={{ marginTop: 10, background: 'var(--danger-light)', borderColor: '#f3d3d3' }}>
          <div className="info" style={{ color: 'var(--danger)' }}>
            ⚠️ 尚未登录 DeepSeek 网页版。请在弹出的浏览器窗口中登录（手机号即可），登录后点「检查登录」。
          </div>
        </div>
      )}

      <div className="ai-box">
        <div className="label">
          <span>要润色的文字（手动粘贴到这里，不会自动读取你的大纲）</span>
          <span>{text.length} 字</span>
        </div>
        <textarea
          className="ai-textarea"
          placeholder={'把需要润色的段落粘贴在这里……\n\n例如：他走在路上，心里想着刚才的事，觉得很烦。'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="label" style={{ marginTop: 14 }}>
          <span>润色要求</span>
        </div>
        <div className="chips">
          {STYLES.map((s) => (
            <button
              key={s}
              className={'chip' + (style === s ? ' active' : '')}
              onClick={() => setStyle(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          className="custom-instruction"
          placeholder="自定义要求（可选）：例如「改成侦探小说风格」「加入心理描写」"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />

        <div className="ai-send-row">
          <div className="ai-status-line">
            {working && <span className="spin">⏳</span>} {statusLine || '就绪'}
          </div>
          <button
            className="btn primary"
            disabled={!text.trim() || working || (loggedIn === false && !launched)}
            onClick={handlePolish}
          >
            {working ? '润色中…' : '发送润色'}
          </button>
        </div>
      </div>

      {reply && (
        <div className="ai-reply">
          <div className="head">
            <b>AI 润色结果</b>
            <button className="btn sm" onClick={handleCopy}>
              {copied ? '✓ 已复制' : '复制结果'}
            </button>
          </div>
          <pre>{reply}</pre>
        </div>
      )}
    </div>
  );
}
