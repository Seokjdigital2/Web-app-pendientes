'use client';
import { useMemo, useState } from 'react';
import { PEOPLE_CAPACITY, weekRange, monthRange, businessHoursInRange, computeTimeSummary } from '@/lib/gantt';

const PEOPLE = Object.entries(PEOPLE_CAPACITY).map(([id, p]) => ({ id, ...p }));

function fmtHours(h) {
  const n = Math.round(h * 100) / 100;
  return (Number.isInteger(n) ? n : n.toFixed(2)).toString();
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function TimeTab({ items, clients, tasks }) {
  const [personId, setPersonId] = useState(PEOPLE[0]?.id || '');
  const [period, setPeriod] = useState('semana'); // 'semana' | 'mes'

  const person = PEOPLE.find((p) => p.id === personId);
  const range = useMemo(() => (period === 'semana' ? weekRange() : monthRange()), [period]);
  const capacity = useMemo(() => {
    if (!person) return 0;
    return period === 'semana' ? person.hoursPerWeek : businessHoursInRange(range.start, range.end, person.hoursPerDay);
  }, [person, period, range]);

  const summary = useMemo(() => {
    if (!person) return { fijo: 0, proyecto: 0, total: 0, clientBreakdown: [] };
    return computeTimeSummary(person.id, range.start, range.end, clients, items, tasks);
  }, [person, range, clients, items, tasks]);

  const pctUsed = capacity ? Math.round((summary.total / capacity) * 100) : 0;
  const level = pctUsed >= 100 ? 'over' : pctUsed >= 80 ? 'warn' : 'ok';
  const freeHours = Math.max(0, capacity - summary.total);

  if (!person) {
    return (
      <section className="panel active">
        <div id="gx">
          <div className="section-head">
            <div><h2>Tiempo</h2><p>Todavía no hay ninguna persona con jornada de referencia definida.</p></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel active">
      <div id="gx">
        <div className="section-head">
          <div>
            <h2>Tiempo</h2>
            <p>Cuánto tiempo se está yendo en qué, para saber si hay margen para proyectos nuevos.</p>
          </div>
        </div>

        <div className="controls" style={{ marginBottom: 16 }}>
          <div className="chips">
            {PEOPLE.map((p) => (
              <button key={p.id} className="chip" aria-pressed={p.id === personId} onClick={() => setPersonId(p.id)}>{p.label}</button>
            ))}
          </div>
          <div className="chips">
            <button className="chip" aria-pressed={period === 'semana'} onClick={() => setPeriod('semana')}>Semana</button>
            <button className="chip" aria-pressed={period === 'mes'} onClick={() => setPeriod('mes')}>Mes</button>
          </div>
        </div>

        <p className="time-range">{fmtDate(range.start)} – {fmtDate(range.end)}</p>

        <div className={`time-headline time-${level}`}>
          <div className="time-headline-num">
            <b>{fmtHours(summary.total)}h</b> comprometidas de <b>{fmtHours(capacity)}h</b> disponibles
          </div>
          <div className="time-bar">
            <div className="time-bar-fill" style={{ width: `${Math.min(100, pctUsed)}%` }}></div>
          </div>
          <div className="time-headline-sub">
            {level === 'over'
              ? `Sin margen — ${fmtHours(summary.total - capacity)}h por encima de la jornada de ${person.label}.`
              : `${fmtHours(freeHours)}h libres (${100 - pctUsed}% de la jornada).`}
          </div>
        </div>

        <div className="time-split">
          <div className="time-card">
            <span className="time-card-label">Fijo (diario / semanal / mensual)</span>
            <span className="time-card-num">{fmtHours(summary.fijo)}h</span>
            <span className="time-card-pct">{summary.total ? Math.round((summary.fijo / summary.total) * 100) : 0}% de lo comprometido</span>
          </div>
          <div className="time-card">
            <span className="time-card-label">Proyectos (one-shot)</span>
            <span className="time-card-num">{fmtHours(summary.proyecto)}h</span>
            <span className="time-card-pct">{summary.total ? Math.round((summary.proyecto / summary.total) * 100) : 0}% de lo comprometido</span>
          </div>
        </div>

        <h3 className="time-section-title">Por cliente</h3>
        {summary.clientBreakdown.length === 0 ? (
          <div className="empty"><b>Sin horas registradas</b>Llena la columna &quot;Horas&quot; en el Gantt para que aparezca aquí.</div>
        ) : (
          <div className="time-clients">
            {summary.clientBreakdown.map((c) => (
              <div key={c.name} className="time-client-row">
                <span className="time-client-name">{c.name}</span>
                <div className="time-client-bar"><div style={{ width: `${c.pct}%` }}></div></div>
                <span className="time-client-num">{fmtHours(c.hours)}h · {c.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
