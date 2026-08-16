import React, { useEffect, useRef, useState } from 'react';

export default function Modal({ mode, initialName = '', onCancel, onConfirm }) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  const submit = () => {
    const v = name.trim();
    if (!v) return;
    onConfirm(v);
  };

  return (
    <div
      className="modal-mask"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal">
        <h3>{mode === 'create' ? '新建作品' : '重命名作品'}</h3>
        <input
          ref={inputRef}
          value={name}
          placeholder="作品名称，如：我的第一本小说"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
        />
        {mode === 'create' && (
          <div className="tip">一个作品对应一本小说/一篇文章，可随时新建多个作品。</div>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" onClick={submit} disabled={!name.trim()}>
            {mode === 'create' ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
