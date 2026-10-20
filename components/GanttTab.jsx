'use client';
import React, { useMemo, useState } from 'react';
import {
  N, DAY, SKEY, STATUSES,
  allClients, byStart, colorOf, datesText, fmt, fmtY, isMine, mondayMs,
  onColor, peopleOf, span, tasksOf, todayStr, U,
} from '@/lib/gantt';
import GanttGrid from './GanttGrid';

function Legend() {
  return (
    <div className="legend">
      <span><i></i>Fecha acordada en junta</span>
      <span><i className="est"></i>Fecha estimada</span>
      <span><i className="done"></i>Hecho</span>
      <span><i className="blk"></i>Bloqueado</span>
      <span><i className="cnf"></i>Por confirmar</span>
      <span><i className="mst"></i>Hito</span>
    </div>
  );
}

function StatusControl({ t, canWrite, onChange }) {
  const cur = t.status || 'Pendiente';
  const k = SKEY[cur] || 'p';
  if (t.occ) return null;
  if (!canWrite || t.ro) return <span className={`st st-${k}`}>{cur}</span>;
  const opts = STATUSES.includes(cur) ? STATUSES : [...STATUSES, cur];
  return (
    <select className={`st st-${k}`} value={cur} onChange={(e) => onChange(t, e.target.value)} aria-label="Estatus">
      {opts.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function TaskLabel({ t, notes, canWrite, onStatusChange }) {
  return (
    <div className="g-label">
      <div className="t-name">{t.activity}</div>
      <div className="t-meta">
        <span className={`resp${isMine(t.resp) ? ' me' : ''}`}>{t.resp || '—'}</span>
        <StatusControl t={t} canWrite={canWrite} onChange={onStatusChange} />
        <span>{datesText(t)}{t.start && t.dateKind === 'inferred' ? ' · estimada' : ''}</span>
      </div>
      {notes && t.note && <div className="t-note">{t.note}</div>}
    </div>
  );
}

function TaskBar({ t, c, winStart }) {
  if (t.occ) {
    const col0 = colorOf(c);
    const on0 = onColor(col0);
    return (
      <div className="g-cells">
        {Object.keys(t.occ).sort().map((d) => {
          const i = (U(d) - winStart) / DAY;
          if (i < 0 || i > N - 1) return null;
          const st = t.occ[d].status;
          const cls = 'bar' + (st === 'Hecho' ? ' done' : '') + (st === 'Bloqueado' ? ' blk' : '') + (st === 'Por confirmar' ? ' cnf' : '');
          return (
            <div key={d} className={cls} style={{ '--s': i, '--l': 1, '--c': col0, '--on': on0 }} title={t.activity + ' · ' + fmt(d) + (st && st !== 'Pendiente' ? ' · ' + st : '')}>
              {st === 'Hecho' ? '✓' : ''}
            </div>
          );
        })}
      </div>
    );
  }
  const sp = span(t, winStart);
  if (!sp || sp.out) return <div className="g-cells"></div>;
  const col = colorOf(c);
  const on = onColor(col);
  const st = t.status;
  const tip = t.activity + ' · ' + datesText(t) + ' · ' + (t.resp || '');
  if (t.milestone) {
    return (
      <div className="g-cells">
        <div className={'ms' + (st === 'Bloqueado' ? ' blk' : '') + (st === 'Hecho' ? ' done' : '')} style={{ '--s': sp.s, '--c': col }} title={tip}></div>
      </div>
    );
  }
  const s0 = Math.max(sp.s, 0);
  const e0 = Math.min(sp.e, N - 1);
  const l = e0 - s0 + 1;
  const cls = 'bar' + (sp.s < 0 ? ' cl' : '') + (sp.e > N - 1 && t.end ? ' cr' : '') + (t.dateKind === 'inferred' ? ' est' : '') + (!t.end ? ' open' : '') +
    (st === 'Hecho' ? ' done' : '') + (st === 'Bloqueado' ? ' blk' : '') + (st === 'Por confirmar' ? ' cnf' : '');
  return (
    <div className="g-cells">
      <div className={cls} style={{ '--s': s0, '--l': l, '--c': col, '--on': on }} title={tip}>
        {st === 'Hecho' ? '✓' : ''}
      </div>
    </div>
  );
}

function Controls({ scope, fResp, fPerson, hideDone, onRespChange, onPersonChange, onToggleDone, onShift, onToday }) {
  const cnt = {};
  const lab = {};
  (scope || []).forEach((t) => {
    peopleOf(t.resp).forEach((p) => {
      if (p.k === 'ali') return;
      cnt[p.k] = (cnt[p.k] || 0) + 1;
      lab[p.k] = lab[p.k] && /[áéíóúÁÉÍÓÚ]/.test(lab[p.k]) ? lab[p.k] : p.label;
    });
  });
  const keys = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b));
  return (
    <>
      <div className="controls">
        <div className="chips">
          <button className="chip" aria-pressed={fResp === 'all' && !fPerson} onClick={() => onRespChange('all')}>Todos</button>
          <button className="chip" aria-pressed={fResp === 'ali' && !fPerson} onClick={() => onRespChange('ali')}>Solo Ali</button>
          <button className="chip" aria-pressed={fResp === 'otros' && !fPerson} onClick={() => onRespChange('otros')}>De otros</button>
          <button className="chip" aria-pressed={hideDone} onClick={onToggleDone}>Ocultar hechos</button>
        </div>
        <div className="chips">
          <button className="btn" onClick={() => onShift(-1)}>← 1 sem</button>
          <button className="btn" onClick={onToday}>Hoy</button>
          <button className="btn" onClick={() => onShift(1)}>1 sem →</button>
        </div>
      </div>
      {keys.length > 0 && (
        <div className="chips people" role="group" aria-label="Filtrar por integrante">
          {keys.map((k) => (
            <button key={k} className="chip" aria-pressed={fPerson === k} onClick={() => onPersonChange(k)}>
              {lab[k]} <em>{cnt[k]}</em>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function GanttTab({ items, clients, tasks, onUpdateItemField, onUpdateTaskStatus }) {
  const [tab, setTab] = useState('super');
  const [fResp, setFResp] = useState('all');
  const [fPerson, setFPerson] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [winStart, setWinStart] = useState(() => mondayMs(U(todayStr())) - 7 * DAY);

  const canWrite = true;

  function pass(t) {
    if (fPerson && !peopleOf(t.resp).map((p) => p.k).includes(fPerson)) return false;
    if (fResp === 'ali' && !isMine(t.resp)) return false;
    if (fResp === 'otros' && isMine(t.resp)) return false;
    if (hideDone && t.status === 'Hecho') return false;
    return true;
  }

  const CL = useMemo(() => allClients(clients, items), [clients, items]);
  const activeTab = CL.some((c) => c.id === tab) ? tab : 'super';

  function onRespChange(v) { setFResp(v); setFPerson(''); }
  function onPersonChange(v) { setFPerson((p) => (p === v ? '' : v)); setFResp('all'); }
  function shift(weeks) { setWinStart((w) => w + weeks * 7 * DAY); }
  function goToday() { setWinStart(mondayMs(U(todayStr())) - 7 * DAY); }

  function statusChange(t, value) {
    if (String(t.id).indexOf('p-') === 0) {
      onUpdateItemField(t.id.slice(2), 'status', value);
    } else {
      onUpdateTaskStatus(t.id, value);
    }
  }

  function renderRows(list, c) {
    return list.map((t) => (
      <div className="g-row" key={t.id}>
        <TaskLabel t={t} notes={true} canWrite={canWrite} onStatusChange={statusChange} />
        <TaskBar t={t} c={c} winStart={winStart} />
      </div>
    ));
  }

  function SuperView() {
    const today = todayStr();
    const allTasksFlat = [];
    CL.forEach((c) => allTasksFlat.push(...tasksOf(c.id, clients, items, tasks, winStart)));

    const strip = CL.map((c) => {
      const ts = tasksOf(c.id, clients, items, tasks, winStart);
      const open = ts.filter((t) => t.status !== 'Hecho');
      const blk = ts.filter((t) => t.status === 'Bloqueado').length;
      const nx = open.filter((t) => t.start && (t.end || t.start) >= today).map((t) => t.end || t.start).sort()[0];
      return (
        <button key={c.id} className="sum" onClick={() => setTab(c.id)}>
          <b><span className="dot" style={{ background: colorOf(c) }}></span>{c.name}</b>
          <div className="nums">
            <span><em>{open.length}</em>abiertas</span>
            <span><em className={blk ? 'warn' : ''}>{blk}</em>bloqueadas</span>
            <span><em>{ts.length - open.length}</em>hechas</span>
          </div>
          <div className="next">{nx ? 'Próxima fecha: ' + fmt(nx) : 'Sin fechas próximas'}</div>
        </button>
      );
    });

    let hidden = 0;
    const rows = [];
    CL.forEach((c) => {
      const all = tasksOf(c.id, clients, items, tasks, winStart).filter(pass);
      const dated = all.filter((t) => t.start).sort(byStart);
      const vis = dated.filter((t) => !span(t, winStart).out);
      const und = all.length - dated.length;
      hidden += dated.length - vis.length;
      if (!all.length) return;
      rows.push(
        <div className="g-row g-group" key={'grp-' + c.id}>
          <div className="g-label"><span className="dot" style={{ background: colorOf(c) }}></span><b>{c.name}</b><span className="cnt">{vis.length} en ventana{und ? ' · ' + und + ' sin fecha' : ''}</span></div>
          <div className="g-cells"></div>
        </div>
      );
      vis.forEach((t) => rows.push(
        <div className="g-row" key={t.id}>
          <TaskLabel t={t} notes={false} canWrite={canWrite} onStatusChange={statusChange} />
          <TaskBar t={t} c={c} winStart={winStart} />
        </div>
      ));
    });

    return (
      <>
        <div className="strip">{strip}</div>
        <Controls scope={allTasksFlat} fResp={fResp} fPerson={fPerson} hideDone={hideDone} onRespChange={onRespChange} onPersonChange={onPersonChange} onToggleDone={() => setHideDone((h) => !h)} onShift={shift} onToday={goToday} />
        <Legend />
        {rows.length ? <GanttGrid winStart={winStart} rows={rows} /> : (
          <div className="empty"><b>Nada que mostrar con estos filtros</b>Quita un filtro o mueve la ventana de fechas.</div>
        )}
        {hidden > 0 && <p className="note-out">{hidden} tarea(s) con fecha fuera de estas 5 semanas. Usa las flechas para verlas.</p>}
      </>
    );
  }

  function ClientView({ c }) {
    const lm = c.lastMeeting;
    const mt = (c.meetings || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const all = tasksOf(c.id, clients, items, tasks, winStart).filter(pass);
    const dated = all.filter((t) => t.start).sort(byStart);
    const vis = dated.filter((t) => !span(t, winStart).out);
    const und = all.filter((t) => !t.start);
    const out = dated.length - vis.length;

    return (
      <>
        {lm ? (
          <section className="meeting">
            <div className="kicker">Última junta · {fmtY(lm.date)}</div>
            <h3>{lm.url ? <a href={lm.url} target="_blank" rel="noopener noreferrer">{lm.title}</a> : lm.title}</h3>
            <div className="cols">
              <div><h4>Qué pasó</h4><p>{lm.summary}</p></div>
              <div><h4>En qué quedamos</h4><ul>{(lm.agreements || []).map((a, i) => <li key={i}>{a}</li>)}</ul></div>
            </div>
            {mt.length > 0 && (
              <details className="hist">
                <summary>Juntas leídas ({mt.length})</summary>
                <ul>
                  {mt.map((m, i) => (
                    <li key={i}><span>{fmt(m.date)}</span>{m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a> : m.title}</li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        ) : (
          <section className="meeting nomeet">
            <div className="kicker">Sin juntas conectadas</div>
            <p>Este cliente se alimenta por dictado: agrega los pendientes de {c.name} y aparecen aquí y en Hoy, Pendientes y Calendario.</p>
          </section>
        )}
        <Controls scope={tasksOf(c.id, clients, items, tasks, winStart)} fResp={fResp} fPerson={fPerson} hideDone={hideDone} onRespChange={onRespChange} onPersonChange={onPersonChange} onToggleDone={() => setHideDone((h) => !h)} onShift={shift} onToday={goToday} />
        <Legend />
        {vis.length ? (
          <GanttGrid winStart={winStart} rows={renderRows(vis, c)} />
        ) : (
          <div className="empty"><b>Sin actividades en estas 5 semanas</b>Mueve la ventana o quita un filtro.</div>
        )}
        {out > 0 && <p className="note-out">{out} tarea(s) con fecha fuera de esta ventana.</p>}
        {und.length > 0 && (
          <section className="undated">
            <h3>Sin fecha</h3>
            <p className="sub">Acuerdos que todavía no tienen fecha de entrega.</p>
            <div className="u-list">
              {und.map((t) => (
                <div className="u-item" key={t.id}>
                  <div className="t-name">{t.activity}</div>
                  <div className="t-meta">
                    <span className={`resp${isMine(t.resp) ? ' me' : ''}`}>{t.resp || '—'}</span>
                    <StatusControl t={t} canWrite={canWrite} onChange={statusChange} />
                  </div>
                  {t.note && <div className="t-note">{t.note}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  const cur = CL.find((c) => c.id === activeTab);
  const sub = 'Un Gantt por cliente · alimentado por juntas de Tactiq y por lo que dictas';

  return (
    <section className="panel active">
      <div id="gx">
        <div className="section-head">
          <div><h2>Gantt de clientes</h2><p>{sub}</p></div>
        </div>
        <div className="gx-tabs">
          <button className="gx-tab" aria-current={activeTab === 'super' ? 'page' : undefined} onClick={() => setTab('super')}>Super Gantt</button>
          {CL.map((c) => (
            <button key={c.id} className="gx-tab" aria-current={activeTab === c.id ? 'page' : undefined} onClick={() => setTab(c.id)}>
              <span className="dot" style={{ background: colorOf(c) }}></span>{c.name}
            </button>
          ))}
        </div>
        {cur ? <ClientView c={cur} /> : <SuperView />}
      </div>
    </section>
  );
}
