'use client';
import { useEffect, useRef, useState } from 'react';

export default function PeoplePicker({ people, selectedIds, onChange, onCreatePerson, disabled }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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
    <div className="people-picker" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="people-picker-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title="Editar responsables"
      >
        {selectedLabels || '— asignar —'}
      </button>
      {open && (
        <div className="people-picker-menu">
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
        </div>
      )}
    </div>
  );
}
