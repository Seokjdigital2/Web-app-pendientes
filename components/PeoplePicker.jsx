'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// El menú se monta en un portal sobre <body> y se posiciona con
// position:fixed, porque las celdas de la tabla (.gt-col) recortan con
// overflow:hidden cualquier dropdown que viva dentro de ellas.
export default function PeoplePicker({ people, selectedIds, onChange, onCreatePerson, disabled }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [newName, setNewName] = useState('');
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

  const selectedLabels = selectedIds
    .map((id) => people.find((p) => p.id === id)?.label || id)
    .join(', ');

  function toggle(id) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  }

  async function createAndAdd() {
    const label = newName.trim();
    if (!label) return;
    const person = await onCreatePerson(label);
    if (person) onChange([...selectedIds, person.id]);
    setNewName('');
  }

  return (
    <div className="people-picker" style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        className="people-picker-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title="Editar responsables"
      >
        {selectedLabels || '— asignar —'}
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="people-picker-menu" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
          {people.map((p) => (
            <label key={p.id} className="people-picker-item">
              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.label}
            </label>
          ))}
          <div className="people-picker-new">
            <input
              type="text"
              value={newName}
              placeholder="Agregar persona…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createAndAdd();
              }}
            />
            <button type="button" onClick={createAndAdd}>+</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
