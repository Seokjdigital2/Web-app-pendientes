'use client';
import { useEffect, useRef, useState } from 'react';

// Filtro genérico de encabezado de columna: lista de valores con checkbox.
// `selected` vacío significa "todos" (sin filtrar).
export default function ColumnFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function toggle(v) {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  }

  const active = selected.length > 0;

  return (
    <span ref={ref} style={{ position: 'relative', marginLeft: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Filtrar por ${label}`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: active ? 'var(--coral)' : 'inherit', fontSize: 11 }}
      >
        ▾
      </button>
      {open && (
        <div className="people-picker-menu">
          {options.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Sin valores todavía</div>}
          {options.map((o) => (
            <label key={o} className="people-picker-item">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
          {active && (
            <div className="people-picker-new" style={{ borderTop: '1px solid var(--line-soft)', marginTop: 6, paddingTop: 6 }}>
              <button type="button" onClick={() => onChange([])} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 11 }}>Limpiar filtro</button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
