'use client';
import React, { useState } from 'react';
import { isoDateLocal, occurrencesForRange, colorForClient, groupByClient } from '@/lib/logic';
import ItemRow from './ItemRow';
import DailySummary from './DailySummary';

export default function HoyTab({ items, weekState, onUpdate, onRemove, onMoveToTomorrow, onAddForToday, onOpenDay }) {
  const [resp, setResp] = useState('ALI');
  const [cliente, setCliente] = useState('');
  const [p, setP] = useState('2');
  const [actividad, setActividad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [horas, setHoras] = useState('');

  const todayISO = isoDateLocal(new Date());
  const occ = occurrencesForRange(items, todayISO, todayISO);
  const list = occ[todayISO] || [];
  const byClient = groupByClient(list);
  const clientNames = Object.keys(byClient).sort();

  function submit() {
    if (!cliente.trim() || !actividad.trim()) return;
    onAddForToday({ resp: resp.trim() || 'ALI', client: cliente.trim(), p, activity: actividad.trim(), desc: descripcion.trim(), hours: horas });
    setCliente('');
    setActividad('');
    setDescripcion('');
    setHoras('');
  }

  return (
    <section className="panel active">
      <div className="section-head">
        <div>
          <h2>Hoy</h2>
          <p>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>
      <DailySummary
        items={items}
        weekMonday={weekState.monday}
        onShiftWeek={weekState.shift}
        onGoToday={weekState.goToday}
        onOpenDay={onOpenDay}
      />
      <div className="client-block">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Resp.</th><th>Cliente</th><th>P</th><th>Actividad</th><th>Descripción</th><th>Documento</th><th>Fecha</th><th>Frecuencia</th><th>Semana</th><th>Horas</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={12} className="empty">Nada programado para hoy todavía. Agrega algo abajo.</td></tr>
              ) : (
                clientNames.map((client) => (
                  <React.Fragment key={'g-' + client}>
                    <tr className="client-group-row">
                      <td colSpan={12} style={{ borderLeft: `4px solid ${colorForClient(client)}` }}>
                        <span className="client-dot" style={{ background: colorForClient(client) }}></span>
                        {client}
                      </td>
                    </tr>
                    {byClient[client].map((it) => {
                      const projected = it.date !== todayISO;
                      return (
                        <ItemRow
                          key={it.id}
                          item={it}
                          onUpdate={onUpdate}
                          onRemove={onRemove}
                          extraActions={
                            projected ? (
                              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'var(--grey-text)' }}>↻ recurrente</span>
                            ) : (
                              <button className="del-btn" style={{ opacity: 0.8, color: 'var(--teal)' }} onClick={() => onMoveToTomorrow(it.id)}>→ mañana</button>
                            )
                          }
                        />
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="add-row">
          <input type="text" value={resp} onChange={(e) => setResp(e.target.value)} style={{ maxWidth: 55 }} />
          <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" />
          <select value={p} onChange={(e) => setP(e.target.value)}>
            <option value="1">1 · Urgente hoy</option>
            <option value="2">2 · Importante</option>
            <option value="3">3 · No olvidar</option>
            <option value="R">R · Recurrente</option>
            <option value="V">V · Revisar (de otros)</option>
          </select>
          <input type="text" value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Actividad" />
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" />
          <input type="number" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Horas" step="0.5" style={{ maxWidth: 70 }} />
          <button className="primary" onClick={submit}>Agregar a hoy</button>
        </div>
      </div>
    </section>
  );
}
