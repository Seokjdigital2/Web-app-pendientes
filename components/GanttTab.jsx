'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  SCALES, DAY, SKEY, STATUSES,
  allClients, byStart, colorOf, datesText, fmt, fmtY, fullRangeOf, isMine, mondayMs,
  onColor, peopleOf, span, tasksOf, todayStr, U,
} from '@/lib/gantt';
import { TimelineHeader, TimelineBars } from './GanttGrid';
import ResizableCol from './ResizableCol';
import PeoplePicker from './PeoplePicker';
import PercentPopover from './PercentPopover';
import PromptModal from './PromptModal';
import HistoryModal from './HistoryModal';

const HEADER_GROUP = { dia: 'day', semana: 'week', mes: 'month' };

const DEFAULT_COL_WIDTHS = {
  name: 220,
  resp: 140,
  status: 118,
  start: 108,
  end: 108,
  deliverable: 170,
  barriers: 200,
};

const COLUMNS = [
  ['name', 'Nombre de la tarea'],
  ['resp', 'Responsables'],
  ['status', 'Estatus'],
  ['start', 'Fecha inicio'],
  ['end', 'Fecha entrega'],
  ['deliverable', 'Entregable / Meta'],
  ['barriers', 'Barreras / Observaciones'],
];

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

function AutoTextarea({ value, placeholder, onCommit, readOnly }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);
  return (
    <textarea
      className="gt-text-input"
      rows={1}
      readOnly={readOnly}
      value={draft}
      placeholder={placeholder}
      onFocus={(e) => { e.target.rows = 3; }}
      onBlur={(e) => {
        e.target.rows = 1;
        if (!readOnly && draft !== (value || '')) onCommit(draft);
      }}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

function Controls({ scope, fResp, fPerson, hideDone, onRespChange, onPersonChange, onToggleDone, onShift, onToday }) {
  const cnt = {};
  const lab = {};
  (scope || []).forEach((t) => {
    assigneesOfTask(t).forEach((p) => {
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

// responsables de una tarea: si ya tiene assignee_ids (catálogo, tareas
// reales) se usan esos; si no (tareas sintéticas del panel, o tareas viejas
// sin migrar) se derivan del texto libre `resp`, con la misma unificación
// Ali/ALI/Alitzel -> "Ali".
function assigneesOfTask(t) {
  if (Array.isArray(t.assigneeIds) && t.assigneeIds.length) {
    return t.assigneeIds.map((id) => ({ k: id, label: id }));
  }
  return peopleOf(t.resp);
}

export default function GanttTab({ items, clients, tasks, onUpdateItemField, onUpdateTask }) {
  const [tab, setTab] = useState('super');
  const [fResp, setFResp] = useState('all');
  const [fPerson, setFPerson] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [scaleKey, setScaleKey] = useState('dia');
  const [winStart, setWinStart] = useState(() => mondayMs(U(todayStr())) - 7 * DAY);
  const [windowDays, setWindowDays] = useState(SCALES.dia.days);
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const [people, setPeople] = useState([]);
  const [goToDate, setGoToDate] = useState('');
  const [modal, setModal] = useState(null); // {type, taskId, extra}
  const [historyModal, setHistoryModal] = useState(null); // {taskId, entries}
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetch('/api/people').then((r) => r.json()).then((d) => setPeople(d.people || [])).catch(() => {});
  }, []);

  function toast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  }

  const peopleCatalog = useMemo(() => {
    const extra = {};
    tasks.forEach((t) => assigneesOfTask(t).forEach((p) => { if (!people.some((pp) => pp.id === p.k)) extra[p.k] = p.label; }));
    return [...people, ...Object.entries(extra).map(([id, label]) => ({ id, label }))];
  }, [people, tasks]);

  async function createPerson(label) {
    const res = await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
    const data = await res.json();
    if (data.person) {
      setPeople((prev) => (prev.some((p) => p.id === data.person.id) ? prev : [...prev, data.person]));
      return data.person;
    }
    return null;
  }

  const canWrite = true;
  function pass(t) {
    const as = assigneesOfTask(t).map((p) => p.k);
    if (fPerson && !as.includes(fPerson)) return false;
    if (fResp === 'ali' && !as.includes('ali')) return false;
    if (fResp === 'otros' && as.includes('ali')) return false;
    if (hideDone && t.status === 'Hecho') return false;
    return true;
  }

  const CL = useMemo(() => allClients(clients, items), [clients, items]);
  const activeTab = CL.some((c) => c.id === tab) ? tab : 'super';
  const scale = SCALES[scaleKey];
  const headerGroup = HEADER_GROUP[scaleKey];

  function onRespChange(v) { setFResp(v); setFPerson(''); }
  function onPersonChange(v) { setFPerson((p) => (p === v ? '' : v)); setFResp('all'); }
  function shift(weeks) { setWinStart((w) => w + weeks * 7 * DAY); }
  function goToday() { setWinStart(mondayMs(U(todayStr())) - 7 * DAY); setWindowDays(scale.days); }
  function changeScale(key) { setScaleKey(key); setWindowDays(SCALES[key].days); }
  function jumpToDate(dateStr) {
    if (!dateStr) return;
    setWinStart(mondayMs(U(dateStr)) - 7 * DAY);
  }
  function viewFullProject(scopeTasks) {
    const range = fullRangeOf(scopeTasks.filter((t) => t.start));
    if (!range) return toast('No hay tareas con fecha para calcular el rango del proyecto.');
    const spanDays = Math.ceil((range.max - range.min) / DAY) + 14;
    let key = 'dia';
    if (spanDays > 400) key = 'mes';
    else if (spanDays > 60) key = 'semana';
    setScaleKey(key);
    setWindowDays(Math.max(SCALES[key].days, spanDays));
    setWinStart(mondayMs(range.min) - 7 * DAY);
  }

  async function saveTask(task, patch) {
    if (String(task.id).indexOf('p-') === 0) {
      // tarea sintética del panel de pendientes: solo estatus/fecha/nota/nombre viven en `items`
      const itemId = task.id.slice(2);
      const map = { status: 'status', note: 'desc', activity: 'activity' };
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'start' || k === 'end') await onUpdateItemField(itemId, 'date', v);
        else if (map[k]) await onUpdateItemField(itemId, map[k], v);
        else toast('Ese campo no aplica a pendientes del panel — edítalo desde la pestaña Pendientes.');
      }
      return;
    }
    try {
      await onUpdateTask(task.id, patch);
    } catch (e) {
      toast(e.message || 'No se pudo guardar el cambio');
    }
  }

  function requestStatusChange(task, newStatus) {
    if (newStatus === 'Bloqueado') {
      setModal({ type: 'blocked', taskId: task.id, task });
      return;
    }
    if (task.status === 'Hecho' && newStatus !== 'Hecho') {
      setModal({ type: 'reopen', taskId: task.id, task, newStatus, defaultValue: String(task.progress ?? 0) });
      return;
    }
    if (newStatus === 'Pendiente' && task.progress > 0) {
      setModal({ type: 'reset', taskId: task.id, task, newStatus });
      return;
    }
    saveTask(task, { status: newStatus });
  }

  function requestDateChange(task, field, value) {
    const next = { ...task, [field]: value };
    if (next.start && next.end && next.end < next.start) {
      toast('La fecha de entrega no puede ser anterior a la de inicio');
      return;
    }
    saveTask(task, { [field]: value });
  }

  async function openHistory(task) {
    if (String(task.id).indexOf('p-') === 0) return toast('Esta tarea viene del panel de Pendientes, no tiene historial de Gantt.');
    const res = await fetch(`/api/tasks/${task.id}`);
    const data = await res.json();
    setHistoryModal({ taskId: task.id, entries: data.history || [] });
  }

  function resizeCol(key, w) {
    setColWidths((prev) => ({ ...prev, [key]: w }));
  }

  function TaskRow({ task, client }) {
    const assignees = assigneesOfTask(task);
    const isPanel = String(task.id).indexOf('p-') === 0;
    const sp = task.start ? span(task, winStart, windowDays) : null;
    const hidden = task.occ ? false : (!sp || sp.out);
    const c = client;
    const col = colorOf(c);
    const on = onColor(col);

    return (
      <div className="gt-row">
        <ResizableCol width={colWidths.name} sticky onResize={(w) => resizeCol('name', w)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            <AutoTextarea
              value={task.activity}
              readOnly={isPanel && false}
              onCommit={(v) => saveTask(task, { activity: v })}
            />
            <div className="t-meta">
              {task.dateKind === 'inferred' && <span>estimada</span>}
              {task.milestone && <span>· hito</span>}
              <button
                type="button"
                onClick={() => openHistory(task)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 10 }}
                title="Ver historial de cambios"
              >
                🕘 historial
              </button>
            </div>
          </div>
        </ResizableCol>

        <ResizableCol width={colWidths.resp} onResize={(w) => resizeCol('resp', w)}>
          <PeoplePicker
            people={peopleCatalog}
            selectedIds={assignees.map((p) => p.k)}
            disabled={isPanel}
            onChange={(ids) => saveTask(task, { assigneeIds: ids })}
            onCreatePerson={createPerson}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.status} onResize={(w) => resizeCol('status', w)}>
          <select
            className={`st st-${SKEY[task.status] || 'p'}`}
            value={task.status || 'Pendiente'}
            onChange={(e) => requestStatusChange(task, e.target.value)}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </ResizableCol>

        <ResizableCol width={colWidths.start} onResize={(w) => resizeCol('start', w)}>
          <input
            type="date"
            className="gt-date-input"
            value={task.start || ''}
            onChange={(e) => requestDateChange(task, 'start', e.target.value)}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.end} onResize={(w) => resizeCol('end', w)}>
          <input
            type="date"
            className="gt-date-input"
            value={task.end || ''}
            onChange={(e) => requestDateChange(task, 'end', e.target.value)}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.deliverable} onResize={(w) => resizeCol('deliverable', w)}>
          <AutoTextarea
            value={task.deliverable}
            readOnly={isPanel}
            placeholder={isPanel ? '—' : 'Agregar entregable…'}
            onCommit={(v) => saveTask(task, { deliverable: v })}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.barriers} onResize={(w) => resizeCol('barriers', w)}>
          <div style={{ width: '100%' }}>
            {task.status === 'Bloqueado' && (
              task.blockedReason
                ? <span className="gt-blocked-chip">⛔ {task.blockedReason}</span>
                : <span className="gt-blocked-missing" onClick={() => setModal({ type: 'blocked', taskId: task.id, task })}>Falta especificar el bloqueo</span>
            )}
            <AutoTextarea
              value={task.note}
              readOnly={isPanel}
              placeholder="Observaciones…"
              onCommit={(v) => saveTask(task, { note: v })}
            />
          </div>
        </ResizableCol>

        <TimelineBars winStart={winStart} windowDays={windowDays} pxPerDay={scale.pxPerDay}>
          {!hidden && (
            <PercentPopover
              value={task.progress}
              disabled={isPanel || task.occ}
              onCommit={(pct) => saveTask(task, { progress: pct })}
            >
              <ProgressBar task={task} sp={sp} color={col} onColorV={on} winStart={winStart} pxPerDay={scale.pxPerDay} />
            </PercentPopover>
          )}
        </TimelineBars>
      </div>
    );
  }

  function ProgressBar({ task, sp, color, onColorV, winStart: ws, pxPerDay }) {
    if (task.occ) {
      return Object.keys(task.occ).sort().map((d) => {
        const i = (U(d) - ws) / DAY;
        if (i < 0 || i > windowDays - 1) return null;
        const st = task.occ[d].status;
        const cls = 'bar' + (st === 'Hecho' ? ' done' : '') + (st === 'Bloqueado' ? ' blk' : '') + (st === 'Por confirmar' ? ' cnf' : '');
        return <div key={d} className={cls} style={{ '--s': i, '--l': 1, '--c': color, '--on': onColorV }} title={task.activity + ' · ' + fmt(d)}>{st === 'Hecho' ? '✓' : ''}</div>;
      });
    }
    if (!sp || sp.out) return null;
    const st = task.status;
    const pct = task.progress;
    if (task.milestone) {
      return <div className={'ms' + (st === 'Bloqueado' ? ' blk' : '') + (st === 'Hecho' ? ' done' : '')} style={{ '--s': sp.s, '--c': color }} title={task.activity}></div>;
    }
    const s0 = Math.max(sp.s, 0);
    const e0 = Math.min(sp.e, windowDays - 1);
    const l = e0 - s0 + 1;
    const cls = 'bar' + (sp.s < 0 ? ' cl' : '') + (sp.e > windowDays - 1 && task.end ? ' cr' : '') + (task.dateKind === 'inferred' ? ' est' : '') + (!task.end ? ' open' : '') +
      (st === 'Hecho' ? ' done' : '') + (st === 'Bloqueado' ? ' blk' : '') + (st === 'Por confirmar' ? ' cnf' : '');
    const label = pct == null ? 'Avance sin registrar' : `${pct}%`;
    return (
      <div className={cls} style={{ '--s': s0, '--l': l, '--c': color, '--on': onColorV }} title={`${task.activity} · ${datesText(task)} · ${label}`}>
        {pct != null && <div className="bar-fill" style={{ width: `${pct}%` }}></div>}
        <span className="bar-pct">{pct == null ? '·' : `${pct}%`}</span>
      </div>
    );
  }

  function GroupRow({ client, count, windowed }) {
    return (
      <div className="gt-row gt-group-row">
        <ResizableCol width={colWidths.name} sticky onResize={(w) => resizeCol('name', w)}>
          <span className="dot" style={{ background: colorOf(client), width: 10, height: 10, borderRadius: '50%', flex: 'none' }}></span>
          <b>{client.name}</b>
          <span className="cnt">{windowed} en ventana{count ? ` · ${count} sin fecha` : ''}</span>
        </ResizableCol>
        {COLUMNS.slice(1).map(([key]) => (
          <ResizableCol key={key} width={colWidths[key]} onResize={(w) => resizeCol(key, w)}><span></span></ResizableCol>
        ))}
        <TimelineBars winStart={winStart} windowDays={windowDays} pxPerDay={scale.pxPerDay}>{null}</TimelineBars>
      </div>
    );
  }

  function HeaderRow() {
    return (
      <div className="gt-row gt-head-row">
        {COLUMNS.map(([key, label], i) => (
          <ResizableCol key={key} width={colWidths[key]} sticky={i === 0} onResize={(w) => resizeCol(key, w)}>
            {label}
          </ResizableCol>
        ))}
        <TimelineHeader winStart={winStart} windowDays={windowDays} pxPerDay={scale.pxPerDay} headerGroup={headerGroup} />
      </div>
    );
  }

  function UnscheduledList({ list }) {
    if (!list.length) return null;
    return (
      <section className="undated">
        <h3>Sin programar</h3>
        <p className="sub">Tareas sin fecha de inicio y/o entrega. Complétalas para que entren al cronograma.</p>
        <div className="u-list">
          {list.map((t) => {
            const incomplete = (t.start && !t.end) || (!t.start && t.end);
            return (
              <div className="u-item" key={t.id}>
                <div>
                  <div className="t-name" style={{ border: 'none' }}>{t.activity}</div>
                  <div className="t-meta">
                    <span className={`resp${isMine(t.resp) ? ' me' : ''}`}>{assigneesOfTask(t).map((p) => p.label).join(', ') || '—'}</span>
                    {incomplete && <span className="gt-unscheduled-badge">Programación incompleta</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 10.5, color: 'var(--grey-text)' }}>Inicio
                    <input type="date" className="gt-date-input" value={t.start || ''} onChange={(e) => requestDateChange(t, 'start', e.target.value)} />
                  </label>
                  <label style={{ fontSize: 10.5, color: 'var(--grey-text)' }}>Entrega
                    <input type="date" className="gt-date-input" value={t.end || ''} onChange={(e) => requestDateChange(t, 'end', e.target.value)} />
                  </label>
                </div>
                {t.note && <div className="t-note">{t.note}</div>}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function ScaleAndNav({ scopeTasks }) {
    return (
      <div className="controls" style={{ marginBottom: 10 }}>
        <div className="chips gt-scale-toggle">
          {Object.entries(SCALES).map(([key, s]) => (
            <button key={key} className="chip" aria-pressed={scaleKey === key} onClick={() => changeScale(key)}>{s.label}</button>
          ))}
        </div>
        <div className="chips" style={{ alignItems: 'center' }}>
          <input type="date" className="gt-date-input" style={{ width: 140, border: '1px solid var(--line)', background: '#fff' }} value={goToDate} onChange={(e) => { setGoToDate(e.target.value); jumpToDate(e.target.value); }} />
          <button className="btn" onClick={() => viewFullProject(scopeTasks)}>Ver proyecto completo</button>
        </div>
      </div>
    );
  }

  function SuperView() {
    const allTasksFlat = [];
    CL.forEach((c) => allTasksFlat.push(...tasksOf(c.id, clients, items, tasks, winStart, windowDays)));
    const today = todayStr();

    const strip = CL.map((c) => {
      const ts = tasksOf(c.id, clients, items, tasks, winStart, windowDays);
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
    const unscheduled = [];
    CL.forEach((c) => {
      const all = tasksOf(c.id, clients, items, tasks, winStart, windowDays).filter(pass);
      const dated = all.filter((t) => t.start).sort(byStart);
      const vis = dated.filter((t) => t.occ || !span(t, winStart, windowDays).out);
      const und = all.filter((t) => !t.start);
      unscheduled.push(...und);
      hidden += dated.length - vis.length;
      if (!all.length) return;
      rows.push(<GroupRow key={'grp-' + c.id} client={c} count={und.length} windowed={vis.length} />);
      vis.forEach((t) => rows.push(<TaskRow key={t.id} task={t} client={c} />));
    });

    return (
      <>
        <div className="strip">{strip}</div>
        <ScaleAndNav scopeTasks={allTasksFlat} />
        <Controls scope={allTasksFlat} fResp={fResp} fPerson={fPerson} hideDone={hideDone} onRespChange={onRespChange} onPersonChange={onPersonChange} onToggleDone={() => setHideDone((h) => !h)} onShift={shift} onToday={goToday} />
        <Legend />
        {rows.length ? (
          <div className="gantt-scroll">
            <div className="gantt">
              <HeaderRow />
              {rows}
            </div>
          </div>
        ) : (
          <div className="empty"><b>Nada que mostrar con estos filtros</b>Quita un filtro o mueve la ventana de fechas.</div>
        )}
        {hidden > 0 && <p className="note-out">{hidden} tarea(s) con fecha fuera de esta ventana. Usa las flechas, el selector de fecha o &quot;Ver proyecto completo&quot;.</p>}
        <UnscheduledList list={unscheduled} />
      </>
    );
  }

  function ClientView({ c }) {
    const lm = c.lastMeeting;
    const mt = (c.meetings || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const all = tasksOf(c.id, clients, items, tasks, winStart, windowDays).filter(pass);
    const dated = all.filter((t) => t.start).sort(byStart);
    const vis = dated.filter((t) => t.occ || !span(t, winStart, windowDays).out);
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
                <ul>{mt.map((m, i) => <li key={i}><span>{fmt(m.date)}</span>{m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a> : m.title}</li>)}</ul>
              </details>
            )}
          </section>
        ) : (
          <section className="meeting nomeet">
            <div className="kicker">Sin juntas conectadas</div>
            <p>Este cliente se alimenta por dictado: agrega los pendientes de {c.name} y aparecen aquí y en Hoy, Pendientes y Calendario.</p>
          </section>
        )}
        <ScaleAndNav scopeTasks={all} />
        <Controls scope={all} fResp={fResp} fPerson={fPerson} hideDone={hideDone} onRespChange={onRespChange} onPersonChange={onPersonChange} onToggleDone={() => setHideDone((h) => !h)} onShift={shift} onToday={goToday} />
        <Legend />
        {vis.length ? (
          <div className="gantt-scroll">
            <div className="gantt">
              <HeaderRow />
              {vis.map((t) => <TaskRow key={t.id} task={t} client={c} />)}
            </div>
          </div>
        ) : (
          <div className="empty"><b>Sin actividades en estas 5 semanas</b>Mueve la ventana, cambia de escala o quita un filtro.</div>
        )}
        {out > 0 && <p className="note-out">{out} tarea(s) con fecha fuera de esta ventana.</p>}
        <UnscheduledList list={und} />
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

      <PromptModal
        open={modal?.type === 'blocked'}
        title="Motivo del bloqueo"
        message="Indica qué está impidiendo avanzar (qué se espera, de quién depende, o qué problema hay que resolver)."
        mode="text"
        defaultValue={modal?.task?.blockedReason || ''}
        confirmLabel="Bloquear tarea"
        onConfirm={(reason) => {
          if (!reason.trim()) return toast('Falta el motivo del bloqueo');
          saveTask(modal.task, { status: 'Bloqueado', blockedReason: reason.trim() });
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
      <PromptModal
        open={modal?.type === 'reopen'}
        title="Reabrir tarea"
        message="Esta tarea estaba Hecha (100%). Indica el nuevo % de avance para reabrirla."
        mode="number"
        defaultValue={modal?.defaultValue}
        confirmLabel="Reabrir"
        onConfirm={(pct) => {
          saveTask(modal.task, { status: modal.newStatus, progress: Math.max(0, Math.min(99, Number(pct) || 0)) });
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
      <PromptModal
        open={modal?.type === 'reset'}
        title="Volver a Pendiente"
        message="El avance se restablecerá a 0%. ¿Continuar?"
        mode="confirm"
        confirmLabel="Sí, restablecer"
        onConfirm={() => {
          saveTask(modal.task, { status: 'Pendiente', progress: 0 });
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
      <HistoryModal open={!!historyModal} entries={historyModal?.entries || []} onClose={() => setHistoryModal(null)} />
      <div className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>
    </section>
  );
}
