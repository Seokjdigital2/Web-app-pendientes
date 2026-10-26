'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Filtro genérico de encabezado de columna: lista de valores con checkbox.
// `selected` vacío significa "todos" (sin filtrar). El menú se monta en un
// portal sobre <body> y se posiciona con position:fixed, porque las celdas
// de la tabla (.gt-col) recortan con overflow:hidden cualquier dropdown
// que viva dentro de ellas.
export default function ColumnFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function place() {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const menuW = menuRef.current?.offsetWidth || 200;
      const menuH = menuRef.current?.offsetHeight || 260;
      let left = r.left;
      let top = r.bottom + 4;
      if (left + menuW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - menuW - 8);
      if (top + menuH > window.innerHeight - 8) top = Math.max(8, r.top - menuH - 4);
      setPos({ top, left });
    }
    place();
    const raf = requestAnimationFrame(place);
    function onDocMouseDown(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  function toggle(v) {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  }

  const active = selected.length > 0;

  return (
    <span style={{ position: 'relative', marginLeft: 4 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Filtrar por ${label}`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: active ? 'var(--coral)' : 'inherit', fontSize: 11 }}
      >
        ▾
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="people-picker-menu" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
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
        </div>,
        document.body
      )}
    </span>
  );
}
