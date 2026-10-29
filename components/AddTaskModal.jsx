'use client';
import { useEffect, useMemo, useState } from 'react';
import { STATUSES, PROJECT_TYPES, PRIORITIES, FREQ_LABELS, categoriesFor, METRIC_OPTIONS } from '@/lib/gantt';
import { findPossibleDuplicates, suggestDependsOn } from '@/lib/advisor';

const EMPTY = {
  clientName: '',
  activity: '',
  projectType: '',
  category: '',
  priority: '2',
  freq: '',
  resp: '',
  status: 'Pendiente',
  start: '',
  end: '',
  reviewDate: '',
  dependsOn: '',
  hours: '',
  objectiveParticular: '',
  metric: '',
  deliverable: '',
  note: '',
};

export default function AddTaskModal({ open, clients, categories, getTasksForClient, onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const categoryOptions = useMemo(() => (form.projectType ? categoriesFor(form.projectType) : categories), [form.projectType, categories]);

  const openTasksForClient = useMemo(() => (form.clientName ? getTasksForClient(form.clientName) : []), [form.clientName, getTasksForClient]);

  const duplicates = useMemo(() => findPossibleDuplicates(form.activity, openTasksForClient), [form.activity, openTasksForClient]);

  const suggestedDependency = useMemo(
    () => (form.dependsOn ? null : suggestDependsOn(form.projectType, form.category, openTasksForClient)),
    [form.projectType, form.category, form.dependsOn, openTasksForClient]
  );

  if (!open) return null;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!form.clientName.trim() || !form.activity.trim()) return;
    await onCreate({
      clientName: form.clientName.trim(),
      activity: form.activity.trim(),
      projectType: form.projectType,
      category: form.category.trim(),
      priority: form.priority,
      freq: form.freq,
      resp: form.resp.trim(),
      status: form.status,
      start: form.start,
      end: form.end,
      reviewDate: form.reviewDate,
      dependsOn: form.dependsOn,
      hours: form.hours,
      objectiveParticular: form.objectiveParticular.trim(),
      metric: form.metric.trim(),
      deliverable: form.deliverable.trim(),
      note: form.note.trim(),
    });
    onClose();
  }

  return (
    <div className="day-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="day-modal" style={{ maxWidth: 560 }}>
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
          {duplicates.length > 0 && (
            <div className="advisor-note advisor-warn">
              ⚠ Se parece a {duplicates.length > 1 ? 'tareas que ya existen' : 'una tarea que ya existe'} para este cliente, revisa antes de duplicar:
              <ul>
                {duplicates.map((t) => <li key={t.id}>{t.activity} <em>({t.status})</em></li>)}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="add-task-field" style={{ flex: 1 }}>
              Tipo de proyecto
              <select value={form.projectType} onChange={(e) => set('projectType', e.target.value)}>
                <option value="">—</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="add-task-field" style={{ flex: 1 }}>
              Categoría
              <input list="add-task-categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Según tipo de proyecto" />
              <datalist id="add-task-categories">
                {categoryOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="add-task-field" style={{ flex: 1 }}>
              Prioridad
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="add-task-field" style={{ flex: 1 }}>
              Frecuencia
              <select value={form.freq} onChange={(e) => set('freq', e.target.value)}>
                {FREQ_LABELS.map(([v, l]) => <option key={v || 'one'} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="add-task-field" style={{ flex: 1 }}>
              Horas estimadas
              <input type="number" min="0" step="0.25" value={form.hours} onChange={(e) => set('hours', e.target.value)} placeholder="Ej. 0.5" />
            </label>
          </div>
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
            <label className="add-task-field" style={{ flex: 1 }}>
              Fecha de revisión
              <input type="date" value={form.reviewDate} onChange={(e) => set('reviewDate', e.target.value)} />
            </label>
          </div>
          <label className="add-task-field">
            Depende de
            <select value={form.dependsOn} onChange={(e) => set('dependsOn', e.target.value)}>
              <option value="">—</option>
              {openTasksForClient.map((t) => <option key={t.id} value={t.id}>{t.activity}</option>)}
            </select>
          </label>
          {suggestedDependency && (
            <div className="advisor-note">
              💡 Sugerencia: según el flujo de {form.projectType}, esto normalmente depende de &quot;{suggestedDependency.activity}&quot; ({suggestedDependency.category}).{' '}
              <button type="button" className="advisor-apply" onClick={() => set('dependsOn', suggestedDependency.id)}>Usar esta dependencia</button>
            </div>
          )}
          <label className="add-task-field">
            Objetivo particular
            <input type="text" value={form.objectiveParticular} onChange={(e) => set('objectiveParticular', e.target.value)} placeholder="¿Qué logra esta actividad puntual?" />
          </label>
          <label className="add-task-field">
            Cómo se mide
            <input list="add-task-metrics" type="text" value={form.metric} onChange={(e) => set('metric', e.target.value)} placeholder="Ej. Tráfico orgánico" />
            <datalist id="add-task-metrics">
              {METRIC_OPTIONS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </label>
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
