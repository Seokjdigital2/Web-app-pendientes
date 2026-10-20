'use client';
import { DAY, DOW, dm, todayStr, U } from '@/lib/gantt';

const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Celdas "menores" del encabezado inferior: 1 día real (escala día), 7 días
// (escala semana) o un mes calendario (escala mes, ancho variable según el
// número real de días — la barra usa el mismo pxPerDay en toda la ventana,
// así que siempre cae alineada con el encabezado).
function buildMinorCells(winStart, windowDays, headerGroup) {
  const cells = [];
  if (headerGroup === 'day') {
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(winStart + i * DAY);
      cells.push({ startIdx: i, days: 1, dow: d.getUTCDay(), date: d.getUTCDate() });
    }
  } else if (headerGroup === 'week') {
    let idx = 0;
    while (idx < windowDays) {
      const ms = winStart + idx * DAY;
      const d = new Date(ms);
      cells.push({ startIdx: idx, days: 7, label: dm(ms), monthKey: `${d.getUTCFullYear()}-${d.getUTCMonth()}` });
      idx += 7;
    }
  } else {
    let idx = 0;
    while (idx < windowDays) {
      const d = new Date(winStart + idx * DAY);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const monthEndMs = Date.UTC(y, m + 1, 1);
      const cellStartMs = winStart + idx * DAY;
      const days = Math.max(1, Math.min(windowDays - idx, Math.round((monthEndMs - cellStartMs) / DAY)));
      cells.push({ startIdx: idx, days, label: MON[m], year: y });
      idx += days;
    }
  }
  return cells;
}

function buildMajorGroups(minorCells, winStart, headerGroup) {
  if (headerGroup === 'day') {
    const groups = [];
    for (let i = 0; i < minorCells.length; i += 7) {
      const slice = minorCells.slice(i, i + 7);
      const days = slice.reduce((a, c) => a + c.days, 0);
      const a = winStart + i * DAY;
      const b = a + (days - 1) * DAY;
      groups.push({ days, label: dm(a) + ' – ' + dm(b) });
    }
    return groups;
  }
  if (headerGroup === 'week') {
    const groups = [];
    let i = 0;
    while (i < minorCells.length) {
      const key = minorCells[i].monthKey;
      let j = i, days = 0;
      while (j < minorCells.length && minorCells[j].monthKey === key) { days += minorCells[j].days; j++; }
      const [y, m] = key.split('-').map(Number);
      groups.push({ days, label: `${MON[m]} ${y}` });
      i = j;
    }
    return groups;
  }
  const groups = [];
  let i = 0;
  while (i < minorCells.length) {
    const y = minorCells[i].year;
    let j = i, days = 0;
    while (j < minorCells.length && minorCells[j].year === y) { days += minorCells[j].days; j++; }
    groups.push({ days, label: String(y) });
    i = j;
  }
  return groups;
}

export function TimelineHeader({ winStart, windowDays, pxPerDay, headerGroup }) {
  const ti = (U(todayStr()) - winStart) / DAY;
  const minorCells = buildMinorCells(winStart, windowDays, headerGroup);
  const majorGroups = buildMajorGroups(minorCells, winStart, headerGroup);
  const totalWidth = windowDays * pxPerDay;

  return (
    <div className="gt-timeline-head" style={{ width: totalWidth }}>
      <div className="g-weeks" style={{ gridTemplateColumns: majorGroups.map((g) => `${g.days}fr`).join(' ') }}>
        {majorGroups.map((g, i) => <div key={i}>{g.label}</div>)}
      </div>
      <div className="g-days" style={{ gridTemplateColumns: minorCells.map((c) => `${c.days}fr`).join(' ') }}>
        {minorCells.map((c, i) => {
          const isToday = headerGroup === 'day' && c.startIdx === Math.round(ti);
          const isWeekend = headerGroup === 'day' && (c.dow === 0 || c.dow === 6);
          return (
            <div key={i} className={`${isWeekend ? 'we' : ''}${isToday ? ' td' : ''}`}>
              {headerGroup === 'day' ? (<>{DOW[c.dow]}<b>{c.date}</b></>) : headerGroup === 'week' ? c.label : <b>{c.label}</b>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimelineBars({ winStart, windowDays, pxPerDay, children }) {
  const ti = (U(todayStr()) - winStart) / DAY;
  const totalWidth = windowDays * pxPerDay;
  const showToday = ti >= 0 && ti < windowDays;
  return (
    <div className="gt-timeline g-cells" style={{ width: totalWidth, '--day-w': `${pxPerDay}px` }}>
      {children}
      {showToday && <div className="g-today" style={{ left: ti * pxPerDay }}></div>}
    </div>
  );
}
