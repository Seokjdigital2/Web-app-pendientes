'use client';
import { DAY, DOW, N, dm, todayStr, U } from '@/lib/gantt';

export default function GanttGrid({ winStart, rows }) {
  const ti = (U(todayStr()) - winStart) / DAY;
  const weeks = [];
  for (let i = 0; i < 5; i++) {
    const a = winStart + i * 7 * DAY;
    const b = a + 6 * DAY;
    weeks.push(dm(a) + ' – ' + dm(b));
  }
  const days = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(winStart + i * DAY);
    const dw = d.getUTCDay();
    days.push({ dw, date: d.getUTCDate(), isToday: i === Math.round(ti) });
  }
  return (
    <div className="gantt-scroll">
      <div className="gantt" style={{ '--n': N, ...(ti >= 0 && ti < N ? { '--ti': ti } : {}) }}>
        <div className="g-head">
          <div className="g-label">Actividad</div>
          <div className="g-weeks">{weeks.map((w, i) => <div key={i}>{w}</div>)}</div>
        </div>
        <div className="g-head2">
          <div className="g-label">Responsable · estatus</div>
          <div className="g-days">
            {days.map((d, i) => (
              <div key={i} className={`${(d.dw === 0 || d.dw === 6) ? 'we' : ''}${d.isToday ? ' td' : ''}`}>
                {DOW[d.dw]}<b>{d.date}</b>
              </div>
            ))}
          </div>
        </div>
        {rows}
        {ti >= 0 && ti < N && <div className="g-today" aria-hidden="true"></div>}
      </div>
    </div>
  );
}
