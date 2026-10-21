'use client';
import { useEffect, useState } from 'react';
import { STATUSES } from '@/lib/gantt';

const EMPTY = {
  clientName: '',
  activity: '',
  category: '',
  resp: '',
  status: 'Pendiente',
  start: '',
  end: '',
  deliverable: '',
  note: '',
};

export default function AddTaskModal({ open, clients, categories, onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  if (!open) return null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!form.clientName.trim() || !form.activity.trim()) return;
    await onCreate({
      clientName: form.clientName.trim(),
      activity: form.activity.trim(),
      category: form.category.trim(),
      resp: form.resp.trim(),
      status: form.status,
      start: form.start,
      end: form.end,
      deliverable: form.deliverable.trim(),
      note: form.note.trim(),
    });
    onClose();
  }

  return (
    <div className="day-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="day-modal" style={{ maxWidth: 520 }}>
        <div className="day-modal-header">
          <span>Agregar pendiente</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="add-task-field">
            Cliente
            <input list="add-task-clients" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Cliente existente o nuevo" />
            <datalist id="add-task-clients">
              {clients.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </label>
          <label className="add-task-field">
            Actividad
            <input type="text" value={form.activity} onChange={(e) => set('activity', e.target.value)} placeholder="¿Qué hay que hacer?" />
          </label>
          <label className="add-task-field">
            Categoría
            <input list="add-task-categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Planeación, Revisión, Operación técnica…" />
            <datalist id="add-task-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
          <label className="add-task-field">
            Responsable(s)
            <input type="text" value={form.resp} onChange={(e) => set('resp', e.target.value)} placeholder="Ej. Ali, Diego" />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="add-task-field" style={{ flex: 1 }}>
              Estatus
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="add-task-field" style={{ flex: 1 }}>
              Fecha inicio
              <input type="date" value={form.start} onChange={(e) => set('start', e.target.value)} />
            </label>
            <label className="add-task-field" style={{ flex: 1 }}>
              Fecha entrega
              <input type="date" value={form.end} onChange={(e) => set('end', e.target.value)} />
            </label>
          </div>
          <label className="add-task-field">
            Entregable / Meta
            <input type="text" value={form.deliverable} onChange={(e) => set('deliverable', e.target.value)} />
          </label>
          <label className="add-task-field">
            Barreras / Observaciones
            <textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="ghost" onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={submit}>Agregar</button>
        </div>
      </div>
    </div>
  );
}
