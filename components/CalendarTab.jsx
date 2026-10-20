'use client';
import React, { useMemo, useState } from 'react';
import {
  DAY_LABELS,
  FILTER_OPTIONS,
  colorForClient,
  fmtH,
  isoDateLocal,
  mondayOf,
  occurrencesForItemRange,
  occurrencesForRange,
} from '@/lib/logic';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MATRIX_DAYS = 14;

export default function CalendarTab({ items, onOpenDay }) {
  const [viewMode, setViewMode] = useState('month');
  const [calMonth, setCalMonth] = useState(startOfMonth());
  const [calFilter, setCalFilter] = useState('all');
  const [matrixStart, setMatrixStart] = useState(mondayOf(new Date()));

  const todayISO = isoDateLocal(new Date());

  const monthCells = useMemo(() => {
    const firstOfMonth = new Date(calMonth);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startOffset);
    const totalCells = 42;
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridEnd.getDate() + totalCells - 1);
    const startISO = isoDateLocal(gridStart);
    const endISO = isoDateLocal(gridEnd);
    const occMap = occurrencesForRange(items, startISO, endISO);
    const thisMonth = calMonth.getMonth();
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      const dISO = isoDateLocal(d);
      let dayItems = occMap[dISO] || [];
      if (calFilter !== 'all') dayItems = dayItems.filter((it) => it.p === calFilter);
      dayItems = dayItems.slice().sort((a, b) => (a.client || '').localeCompare(b.client || ''));
      cells.push({ d, dISO, dayItems, isOtherMonth: d.getMonth() !== thisMonth, isToday: dISO === todayISO });
    }
    const clientsSeen = new Set();
    Object.values(occMap).flat().forEach((it) => { if (it.client) clientsSeen.add(it.client); });
    return { cells, clientsSeen: [...clientsSeen].sort() };
  }, [items, calMonth, calFilter, todayISO]);

  const matrix = useMemo(() => {
    const days = [];
    for (let i = 0; i < MATRIX_DAYS; i++) {
      const d = new Date(matrixStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const startISO = isoDateLocal(days[0]);
    const endISO = isoDateLocal(days[days.length - 1]);
    let rows = items.filter((it) => !it.isHistory);
    if (calFilter !== 'all') rows = rows.filter((it) => it.p === calFilter);
    const rowOcc = new Map();
    rows.forEach((it) => rowOcc.set(it.id, occurrencesForItemRange(it, startISO, endISO)));
    rows = rows.filter((it) => (rowOcc.get(it.id) || []).length > 0 || !it.date);
    const byClient = {};
    rows.forEach((it) => {
      const c = it.client || 'Sin cliente';
      (byClient[c] = byClient[c] || []).push(it);
    });
    const clientNames = Object.keys(byClient).sort((a, b) => a.localeCompare(b));
    clientNames.forEach((c) => byClient[c].sort((a, b) => (a.order || 0) - (b.order || 0)));
    const dayTotals = days.map((d) => {
      const dISO = isoDateLocal(d);
      let sum = 0;
      rows.forEach((it) => { if ((rowOcc.get(it.id) || []).includes(dISO)) sum += parseFloat(it.hours) || 0; });
      return sum;
    });
    return { days, clientNames, byClient, rowOcc, dayTotals };
  }, [items, matrixStart, calFilter]);

  function shiftMonth(delta) {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <section className="panel active">
      <div className="section-head">
        <div>
          <h2>Calendario</h2>
          <p>{viewMode === 'month' ? 'Vista mensual — los recurrentes se repiten automáticamente en cada ocurrencia' : 'Vista de lista — cada fila es una actividad, cada columna un día'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filters">
            <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Vista mes</button>
            <button className={viewMode === 'matrix' ? 'active' : ''} onClick={() => setViewMode('matrix')}>Vista lista (matriz)</button>
          </div>
          <div className="filters">
            {FILTER_OPTIONS.map(([val, label]) => (
              <button key={val} className={calFilter === val ? 'active' : ''} onClick={() => setCalFilter(val)}>{label}</button>
            ))}
          </div>
          {viewMode === 'month' ? (
            <>
              <div className="filters">
                <button className="ghost" onClick={() => shiftMonth(-1)}>← anterior</button>
                <button className="ghost" onClick={() => setCalMonth(startOfMonth())}>hoy</button>
                <button className="ghost" onClick={() => shiftMonth(1)}>siguiente →</button>
              </div>
              <div className="filters">
                <button className="ghost" onClick={() => shiftMonth(3)}>+3 meses</button>
                <button className="ghost" onClick={() => shiftMonth(6)}>+6 meses</button>
                <button className="ghost" onClick={() => shiftMonth(12)}>+12 meses</button>
              </div>
            </>
          ) : (
            <div className="filters">
              <button className="ghost" onClick={() => setMatrixStart((s) => { const d = new Date(s); d.setDate(d.getDate() - 14); return d; })}>← 2 semanas</button>
              <button className="ghost" onClick={() => setMatrixStart(mondayOf(new Date()))}>hoy</button>
              <button className="ghost" onClick={() => setMatrixStart((s) => { const d = new Date(s); d.setDate(d.getDate() + 14); return d; })}>2 semanas →</button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'month' ? (
        <div>
          <div className="cal-month-label mono">{calMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</div>
          <div className="cal-legend">
            {monthCells.clientsSeen.length === 0 ? (
              <span className="cal-legend-item">Sin actividades este mes</span>
            ) : (
              monthCells.clientsSeen.map((c) => (
                <span className="cal-legend-item" key={c}>
                  <span className="cal-legend-dot" style={{ background: colorForClient(c) }}></span>{c}
                </span>
              ))
            )}
          </div>
          <div className="cal-grid">
            {DAY_LABELS.map((l) => <div className="cal-dow" key={l}>{l}</div>)}
            {monthCells.cells.map(({ d, dISO, dayItems, isOtherMonth, isToday }) => {
              const MAX_SHOW = 14;
              const shown = dayItems.slice(0, MAX_SHOW);
              const extra = dayItems.length - shown.length;
              return (
                <div key={dISO} className={`cal-cell${isOtherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`}>
                  <div className="cal-cell-date">{d.getDate()}</div>
                  <div className="cal-cell-items">
                    {shown.map((it, idx) => {
                      const hrs = fmtH(it.hours) ? ` · ${fmtH(it.hours)}` : '';
                      const hecho = it.status === 'Hecho' ? ' is-hecho' : '';
                      const title = `${it.client || ''} — ${it.activity}${it.desc ? ' · ' + it.desc : ''}`;
                      return (
                        <div
                          key={it.id + idx}
                          className={`cal-chip${hecho}`}
                          style={{ background: colorForClient(it.client) }}
                          title={title}
                          onClick={() => onOpenDay(dISO, dayItems)}
                        >
                          <span className="t">{it.client || ''}</span> {it.status === 'Hecho' ? '✓ ' : ''}{it.activity}{hrs}
                        </div>
                      );
                    })}
                    {extra > 0 && (
                      <div className="cal-cell-more" onClick={() => onOpenDay(dISO, dayItems)}>+{extra} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="cal-month-label mono">
            {matrix.days[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} — {matrix.days[matrix.days.length - 1].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="matrix-wrap">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="mx-head-client">Cliente</th>
                  <th className="mx-head-activity">Actividad</th>
                  {matrix.days.map((d) => {
                    const dISO = isoDateLocal(d);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = dISO === todayISO;
                    return (
                      <th key={dISO} className={`mx-head-date${isWeekend ? ' weekend' : ''}${isToday ? ' today' : ''}`}>
                        <span className="dow">{DAY_LABELS[(d.getDay() + 6) % 7]}</span>{d.getDate()}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="mx-total-row">
                  <td className="mx-head-client">TOTAL</td>
                  <td className="mx-head-activity">Horas por día</td>
                  {matrix.dayTotals.map((sum, i) => (
                    <td key={i} className="mx-total-cell">{sum > 0 ? fmtH(sum) : ''}</td>
                  ))}
                </tr>
                {matrix.clientNames.length === 0 && (
                  <tr><td colSpan={2 + matrix.days.length} className="mx-empty-note">No hay actividades para este filtro en el rango visible.</td></tr>
                )}
                {matrix.clientNames.map((c) => (
                  <React.Fragment key={'c-' + c}>
                    <tr className="mx-client-row">
                      <td className="mx-head-client" colSpan={2}>
                        <span className="mx-client-name"><span className="mx-client-dot" style={{ background: colorForClient(c) }}></span>{c}</span>
                      </td>
                      {matrix.days.map((_, i) => <td key={i}></td>)}
                    </tr>
                    {matrix.byClient[c].map((it) => {
                      const occSet = new Set(matrix.rowOcc.get(it.id) || []);
                      return (
                        <tr className="mx-row" key={it.id}>
                          <td className="mx-head-client"></td>
                          <td className="mx-head-activity">
                            {it.activity}
                            {it.desc && <><br /><span style={{ color: 'var(--grey-text)', fontSize: 10.5 }}>{it.desc}</span></>}
                          </td>
                          {matrix.days.map((d) => {
                            const dISO = isoDateLocal(d);
                            if (!occSet.has(dISO)) return <td key={dISO} className="mx-cell"></td>;
                            const hecho = it.status === 'Hecho' ? ' is-hecho' : '';
                            const hrs = (it.status === 'Hecho' ? '✓ ' : '') + (fmtH(it.hours) || '·');
                            const title = `${it.client || ''} — ${it.activity}`;
                            return (
                              <td key={dISO} className="mx-cell">
                                <div
                                  className={`mx-cell-fill${hecho}`}
                                  style={{ background: colorForClient(it.client) }}
                                  title={title}
                                  onClick={() => onOpenDay(dISO)}
                                >
                                  {hrs}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
