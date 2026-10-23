'use client';
import { useMemo, useState } from 'react';
import { DAY_LABELS, isoDateLocal } from '@/lib/logic';
import { calendarOccurrences, PRIORITIES } from '@/lib/gantt';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarTab({ items, clients, tasks, onOpenDay }) {
  const [calMonth, setCalMonth] = useState(startOfMonth());
  const [calFilter, setCalFilter] = useState('all');

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
    const occMap = calendarOccurrences(clients, items, tasks, startISO, endISO);
    const thisMonth = calMonth.getMonth();
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      const dISO = isoDateLocal(d);
      let dayItems = occMap[dISO] || [];
      if (calFilter !== 'all') dayItems = dayItems.filter((it) => (it.priority || '2') === calFilter);
      dayItems = dayItems.slice().sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));
      cells.push({ d, dISO, dayItems, isOtherMonth: d.getMonth() !== thisMonth, isToday: dISO === todayISO });
    }
    const clientsSeen = new Map();
    Object.values(occMap).flat().forEach((it) => { if (it.clientName) clientsSeen.set(it.clientName, it.clientColor); });
    return { cells, clientsSeen: [...clientsSeen.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
  }, [items, clients, tasks, calMonth, calFilter, todayISO]);

  function shiftMonth(delta) {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <section className="panel active">
      <div className="section-head">
        <div>
          <h2>Calendario</h2>
          <p>Vista mensual — alimentado por las tareas reales del Gantt, con su % de avance</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filters">
            <button className={calFilter === 'all' ? 'active' : ''} onClick={() => setCalFilter('all')}>Todos</button>
            {PRIORITIES.map(([val, label]) => (
              <button key={val} className={calFilter === val ? 'active' : ''} onClick={() => setCalFilter(val)}>{label}</button>
            ))}
          </div>
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
        </div>
      </div>

      <div className="cal-month-label mono">{calMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</div>
      <div className="cal-legend">
        {monthCells.clientsSeen.length === 0 ? (
          <span className="cal-legend-item">Sin actividades este mes</span>
        ) : (
          monthCells.clientsSeen.map(([name, color]) => (
            <span className="cal-legend-item" key={name}>
              <span className="cal-legend-dot" style={{ background: color }}></span>{name}
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
                  const pct = it.progress == null ? '' : ` · ${it.progress}%`;
                  const hecho = it.status === 'Hecho' ? ' is-hecho' : '';
                  const title = `${it.clientName || ''} — ${it.activity}${it.note ? ' · ' + it.note : ''}`;
                  return (
                    <div
                      key={it.id + idx}
                      className={`cal-chip${hecho}`}
                      style={{ background: it.clientColor }}
                      title={title}
                      onClick={() => onOpenDay(dISO, dayItems)}
                    >
                      <span className="t">{it.clientName || ''}</span> {it.status === 'Hecho' ? '✓ ' : ''}{it.activity}{pct}
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
    </section>
  );
}
