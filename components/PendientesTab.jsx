'use client';
import { useState } from 'react';
import { FILTER_OPTIONS, FREQ_OPTIONS, STATUS_OPTIONS } from '@/lib/logic';
import GroupedTable from './GroupedTable';
import DailySummary from './DailySummary';

export default function PendientesTab({ items, activeFilter, setActiveFilter, weekState, onUpdate, onRemove, onAdd, onOpenDay, onCopyAll }) {
  const [form, setForm] = useState({ resp: 'ALI', cliente: '', p: 'R', actividad: '', descripcion: '', documento: '', fecha: '', freq: '', horas: '', status: '' });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    if ((form.p === 'O' || form.p === 'I') ? !form.actividad.trim() : (!form.cliente.trim() || !form.actividad.trim())) return;
    onAdd({
      resp: form.resp.trim() || 'ALI',
      client: form.cliente.trim(),
      p: form.p,
      activity: form.actividad.trim(),
      desc: form.descripcion.trim(),
      doc: form.documento.trim(),
      date: form.fecha,
      freq: form.freq,
      hours: form.horas,
      status: form.status,
    });
    setForm({ resp: 'ALI', cliente: '', p: 'R', actividad: '', descripcion: '', documento: '', fecha: '', freq: '', horas: '', status: '' });
  }

  let list = items.filter((i) => i.status !== 'Hecho' && !i.isHistory);
  if (activeFilter !== 'all') list = list.filter((i) => i.p === activeFilter);

  return (
    <section className="panel active">
      <div className="section-head">
        <div>
          <h2>Pendientes</h2>
          <p>Responsable · Cliente · P · Actividad · Descripción · Documento · Fecha · Horas · Status</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filters">
            {FILTER_OPTIONS.map(([val, label]) => (
              <button key={val} className={activeFilter === val ? 'active' : ''} onClick={() => setActiveFilter(val)}>{label}</button>
            ))}
          </div>
          <button className="ghost" onClick={() => onCopyAll('pendientes')}>📋 copiar todo para el Sheet</button>
        </div>
      </div>
      <div className="legend"><b>R</b> recurrente · <b>1/2/3</b> variable por prioridad · <b>O</b> objetivo de la semana · <b>I</b> idea a futuro</div>
      <DailySummary items={items} weekMonday={weekState.monday} onShiftWeek={weekState.shift} onGoToday={weekState.goToday} onOpenDay={onOpenDay} />
      <div className="client-block">
        <div style={{ overflowX: 'auto' }}>
          <GroupedTable list={list} onUpdate={onUpdate} onRemove={onRemove} emptyMessage="No hay pendientes en este filtro todavía." />
        </div>
        <div className="add-row">
          <input type="text" value={form.resp} onChange={(e) => set('resp', e.target.value)} style={{ maxWidth: 55 }} />
          <input type="text" value={form.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Cliente" />
          <select value={form.p} onChange={(e) => set('p', e.target.value)}>
            <option value="R">R · Recurrente</option>
            <option value="1">1 · Urgente hoy</option>
            <option value="2">2 · Importante</option>
            <option value="3">3 · No olvidar</option>
            <option value="V">V · Revisar (de otros)</option>
            <option value="O">O · Objetivo semana</option>
            <option value="I">I · Idea a futuro</option>
          </select>
          <input type="text" value={form.actividad} onChange={(e) => set('actividad', e.target.value)} placeholder="Actividad" />
          <input type="text" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Descripción" />
          <input type="text" value={form.documento} onChange={(e) => set('documento', e.target.value)} placeholder="Documento (link)" />
          <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
          <select value={form.freq} onChange={(e) => set('freq', e.target.value)}>
            <option value="">Sin repetir</option>
            {FREQ_OPTIONS.filter(([v]) => v).map(([val, label]) => (
              <option key={val} value={val}>Repite {label.toLowerCase()}</option>
            ))}
          </select>
          <input type="number" value={form.horas} onChange={(e) => set('horas', e.target.value)} placeholder="Horas" step="0.5" style={{ maxWidth: 70 }} />
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="primary" onClick={submit}>Agregar</button>
        </div>
      </div>
    </section>
  );
}
