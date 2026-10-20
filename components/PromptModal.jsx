'use client';
import { useEffect, useState } from 'react';

export default function PromptModal({ open, title, message, mode = 'text', defaultValue = '', confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;

  return (
    <div className="day-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="day-modal" style={{ maxWidth: 440 }}>
        <div className="day-modal-header">
          <span>{title}</span>
          <button onClick={onCancel}>✕</button>
        </div>
        {message && <p style={{ margin: '0 0 12px', color: 'var(--grey-text)', fontSize: 13 }}>{message}</p>}
        {mode !== 'confirm' && (
          <input
            type={mode === 'number' ? 'number' : 'text'}
            min={mode === 'number' ? 0 : undefined}
            max={mode === 'number' ? 100 : undefined}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 4, padding: '8px 10px', fontSize: 14, marginBottom: 14 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm(value);
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ghost" onClick={onCancel}>Cancelar</button>
          <button className="primary" onClick={() => onConfirm(value)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
