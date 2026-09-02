import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flatten } from '../store.js';
import { SIDELINES } from '../celebration.js';

const countChars = (text) => String(text || '').replace(/\s/g, '').length;

export default function EditorView({ project, selectedId, onSelect, onUpdate, onToast, onCelebrate }) {
  const flat = useMemo(() => flatten(project ? project.tree : []), [project]);
  const node =
    flat.find((n) => n.id === selectedId) ||
    flat.find((n) => n.content && String(n.content).trim()) ||
    flat[0] ||
    null;
  const [saveState, setSaveState] = useState('');
  const [busy, setBusy] = useState('');
  const [sideline, setSideline] = useState(null); // { key, text }
  const saveTimer = useRef(null);
  const sideTimer = useRef(null);
  const sideLast = useRef(0);
  const sidePrevIdx = useRef(-1);
  const typeCount = useRef(0);

  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      clearTimeout(sideTimer.current);
    };
  }, []);

  // 写作台小彩蛋：打字时低概率在角落浮现一句鼓励（≥60 秒一次，不打扰）
  const maybeSideline = () => {
    typeCount.current += 1;
    const now = Date.now();
    if (typeCount.current % 24 !== 0 || now - sideLast.current < 60000) return;
    let idx;
    do {
      idx = Math.floor(Math.random() * SIDELINES.length);
    } while (idx === sidePrevIdx.current && SIDELINES.length > 1);
    sidePrevIdx.current = idx;
    sideLast.current = now;
    const text = SIDELINES[idx];
    setSideline({ key: now, text });
    clearTimeout(sideTimer.current);
    sideTimer.current = setTimeout(() => setSideline(null), 4600);
  };

  if (!project) {
    return (
      <div className="editor-wrap">
        <div className="editor-empty">
          <span className="big">✍️</span>
          还没有作品。先到大纲页新建一个作品并搭建章节，再回来创作。
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="editor-wrap">
        <div className="editor-empty">
          <span className="big">📖</span>
          大纲里还没有章节。先到大纲页添加章节，然后在这里开始创作。
        </div>
      </div>
    );
  }

  const handleChange = (value) => {
    const words = countChars(value);
    const target = Number(node.targetWords) || 0;
    const reached = target > 0 && words >= target && node.cheeredTarget !== target;
    const patch = { content: value, currentWords: words };
    // 首次跨过目标字数：记录已庆祝（持久化），并弹出达标鼓励
    if (reached) {
      patch.cheeredTarget = target;
    }
    onUpdate(node.id, patch);
    if (reached && onCelebrate) {
      onCelebrate({ node: { id: node.id, title: node.title, targetWords: target } });
    }
    setSaveState('保存中…');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState('已保存 ✓'), 900);
    maybeSideline();
  };

  const handleImport = async () => {
    setBusy('导入中…');
    try {
      const res = await window.api.importDocx(project.id, node.id);
      if (res.ok) {
        onUpdate(node.id, { content: res.text, currentWords: res.charCount });
        setSaveState('已保存 ✓');
        onToast(`导入成功：${res.charCount} 字，已自动填入「已写字数」`);
      } else if (res.canceled) {
        // 用户取消
      } else {
        onToast('导入失败: ' + (res.detail || '未知错误'));
      }
    } catch (e) {
      onToast('导入失败: ' + e.message);
    } finally {
      setBusy('');
    }
  };

  const handleExport = async (scope) => {
    setBusy(scope === 'book' ? '导出全书中…' : '导出中…');
    try {
      const res = await window.api.exportDocx(project.id, scope, scope === 'chapter' ? node.id : null);
      if (res.ok) onToast('已导出 Word: ' + res.filePath);
      else if (!res.canceled && res.detail) onToast(res.detail);
    } catch (e) {
      onToast('导出失败: ' + e.message);
    } finally {
      setBusy('');
    }
  };

  const content = node.content || '';

  return (
    <div className="editor-wrap">
      <div className="editor-header">
        <select
          className="editor-select"
          value={node.id}
          onChange={(e) => onSelect(e.target.value)}
        >
          {flat.map((n) => (
            <option key={n.id} value={n.id}>
              {'　'.repeat(n.depth)}
              {n.title || '（未命名）'}
            </option>
          ))}
        </select>
        <span className="editor-title">{node.title || '（未命名）'}</span>
        <span className="editor-status-line">
          {content ? `${countChars(content)} 字` : '0 字'}
          {saveState && <span className="editor-save-state"> · {saveState}</span>}
        </span>
      </div>

      <div className="editor-body">
        <textarea
          className="editor-textarea"
          placeholder={'在这里开始写作……\n\n写完后可导出为 Word 文档；也可以导入已有的 Word 文档继续写。'}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
        />
        {sideline && (
          <div key={sideline.key} className="editor-sideline">
            {sideline.text}
          </div>
        )}
      </div>

      <div className="editor-actions">
        <button className="btn primary sm" disabled={!!busy} onClick={() => handleExport('chapter')}>
          {busy === '导出中…' ? busy : '⬇ 导出本章为 Word'}
        </button>
        <button className="btn sm" disabled={!!busy} onClick={() => handleExport('book')}>
          {busy === '导出全书中…' ? busy : '⬇ 导出全书为 Word'}
        </button>
        <button className="btn sm" disabled={!!busy} onClick={handleImport}>
          {busy === '导入中…' ? busy : '⬆ 导入 Word 继续写'}
        </button>
        <span className="editor-hint">
          仅支持 .docx 格式；导入后字数自动同步到大纲「已写字数」
        </span>
      </div>
    </div>
  );
}
