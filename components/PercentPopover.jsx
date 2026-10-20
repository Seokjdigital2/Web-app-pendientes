'use client';
import { useEffect, useRef, useState } from 'react';

export default function PercentPopover({ value, onCommit, disabled, children }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const ref = useRef(null);

  useEffect(() => {
    setDraft(value == null ? '' : String(value));
  }, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function commit() {
    const n = Math.max(0, Math.min(100, Math.round(Number(draft) || 0)));
    onCommit(n);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{ cursor: disabled ? 'default' : 'pointer', width: '100%', height: '100%' }}
      >
        {children}
      </div>
      {open && (
        <div className="percent-popover">
          <input
            type="number"
            min="0"
            max="100"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <span>%</span>
          <button type="button" onClick={commit}>OK</button>
        </div>
      )}
    </div>
  );
}
