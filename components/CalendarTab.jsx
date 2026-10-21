'use client';
import { useMemo, useState } from 'react';
import { DAY_LABELS, FILTER_OPTIONS, colorForClient, fmtH, isoDateLocal, occurrencesForRange } from '@/lib/logic';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarTab({ items, onOpenDay }) {
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

  function shiftMonth(delta) {
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <section className="panel active">
      <div className="section-head">
        <div>
          <h2>Calendario</h2>
          <p>Vista mensual — los recurrentes se repiten automáticamente en cada ocurrencia</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filters">
            {FILTER_OPTIONS.map(([val, label]) => (
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
    </section>
  );
}
