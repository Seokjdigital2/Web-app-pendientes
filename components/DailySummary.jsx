'use client';
import { useMemo } from 'react';
import { fmtWeekLabel, isoDateLocal, occurrencesForRange, fmtH, DAY_LABELS } from '@/lib/logic';

export default function DailySummary({ items, weekMonday, onShiftWeek, onGoToday, onOpenDay }) {
  const { totals, label } = useMemo(() => {
    const sun = new Date(weekMonday);
    sun.setDate(sun.getDate() + 6);
    const occ = occurrencesForRange(items, isoDateLocal(weekMonday), isoDateLocal(sun));
    const totals = [0, 0, 0, 0, 0, 0, 0];
    Object.keys(occ).forEach((dISO) => {
      const idx = (new Date(dISO + 'T00:00:00').getDay() + 6) % 7;
      occ[dISO].forEach((it) => {
        totals[idx] += Number(it.hours) || 0;
      });
    });
    for (let k = 0; k < 7; k++) totals[k] = Math.round(totals[k] * 100) / 100;
    return { totals, label: fmtWeekLabel(weekMonday) };
  }, [items, weekMonday]);

  const todayISO = isoDateLocal(new Date());

  return (
    <div className="client-block daily-summary-block" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--grey-text)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
          Horas por día — {label}
        </span>
        <div className="filters">
          <button className="ghost" onClick={() => onShiftWeek(-1)}>← anterior</button>
          <button className="ghost" onClick={onGoToday}>hoy</button>
          <button className="ghost" onClick={() => onShiftWeek(1)}>siguiente →</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {totals.map((t, i) => {
          const d = new Date(weekMonday);
          d.setDate(d.getDate() + i);
          const dISO = isoDateLocal(d);
          const cls = t === 0 ? '' : t > 8 ? 'over' : t < 8 ? 'under' : 'ok';
          const isToday = dISO === todayISO ? 'today' : '';
          return (
            <div key={i} className={`day-chip ${cls} ${isToday}`} onClick={() => onOpenDay(dISO)}>
              <div className="d">{DAY_LABELS[i]} {d.getDate()}</div>
              <div className="h">{t > 0 ? fmtH(t) : '0h'}</div>
            </div>
          );
        })}
        <div className="day-chip">
          <div className="d">Total</div>
          <div className="h">{fmtH(totals.reduce((a, b) => a + b, 0)) || '0h'}</div>
        </div>
      </div>
    </div>
  );
}
