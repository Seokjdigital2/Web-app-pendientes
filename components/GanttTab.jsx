'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  SCALES, DAY, SKEY, STATUSES, PROJECT_TYPES, PRIORITIES, FREQ_LABELS, OBJECTIVE_TEMPLATES, METRIC_OPTIONS,
  allClients, byStart, colorOf, datesText, fmt, fmtY, fullRangeOf, isMine, mondayMs,
  onColor, peopleOf, span, tasksOf, todayStr, U, categoriesFor, allCategoryOptions, isOverdue,
} from '@/lib/gantt';
import { TimelineHeader, TimelineBars } from './GanttGrid';
import ResizableCol from './ResizableCol';
import PeoplePicker from './PeoplePicker';
import PercentPopover from './PercentPopover';
import PromptModal from './PromptModal';
import HistoryModal from './HistoryModal';
import ColumnFilter from './ColumnFilter';
import AddTaskModal from './AddTaskModal';
import { advisorWarnings } from '@/lib/advisor';

const HEADER_GROUP = { dia: 'day', semana: 'week', mes: 'month' };

// Equipo interno de KJ (no clientes): únicos con botón de acceso rápido.
// El resto de responsables (gente del lado del cliente) solo se filtra
// desde el desplegable de la columna Responsables.
const KJ_TEAM = ['Ali', 'Alin', 'Lalo', 'Alejandro', 'Laura'];

const DEFAULT_COL_WIDTHS = {
  name: 200,
  client: 110,
  projectType: 100,
  category: 120,
  priority: 110,
  freq: 110,
  hours: 90,
  resp: 130,
  status: 118,
  start: 108,
  end: 108,
  review: 108,
  dependsOn: 150,
  objectiveParticular: 160,
  metric: 150,
  deliverable: 160,
  barriers: 180,
};

const COLUMNS = [
  ['name', 'Nombre de la tarea'],
  ['resp', 'Responsables'],
  ['client', 'Cliente'],
  ['projectType', 'Tipo de proyecto'],
  ['category', 'Categoría'],
  ['priority', 'Prioridad'],
  ['freq', 'Frecuencia'],
  ['hours', 'Horas'],
  ['status', 'Estatus'],
  ['start', 'Fecha inicio'],
  ['end', 'Fecha entrega'],
  ['review', 'Fecha de revisión'],
  ['dependsOn', 'Depende de'],
  ['objectiveParticular', 'Objetivo Particular'],
  ['metric', 'Cómo se mide'],
  ['deliverable', 'Entregable / Meta'],
  ['barriers', 'Barreras / Observaciones'],
];

function slugify(n) {
  return String(n)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function Legend() {
  return (
    <div className="legend">
      <span><i></i>Fecha acordada en junta</span>
      <span><i className="est"></i>Fecha estimada</span>
      <span><i className="done"></i>Hecho</span>
      <span><i className="blk"></i>Bloqueada (depende de otra)</span>
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

// Link a un archivo (Drive, Dropbox, etc.) para el Entregable/Meta. Mientras
// no se edita y ya tiene valor, se ve como link clicable; al enfocar se
// vuelve editable para pegar o cambiar la URL.
function DocLink({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);

  if (!editing && value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--steel)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          📎 {value}
        </a>
        <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--muted)' }}>editar</button>
      </div>
    );
  }
  return (
    <input
      type="url"
      className="gt-date-input"
      placeholder="📎 Link del archivo (Drive, etc.)…"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== (value || '')) onCommit(draft);
      }}
      autoFocus={editing}
    />
  );
}

function Controls({ hideDone, onToggleDone, onShift, onToday }) {
  return (
    <div className="controls">
      <div className="chips">
        <button className="chip" aria-pressed={hideDone} onClick={onToggleDone}>Ocultar hechos</button>
      </div>
      <div className="chips">
        <button className="btn" onClick={() => onShift(-1)}>← 1 sem</button>
        <button className="btn" onClick={onToday}>Hoy</button>
        <button className="btn" onClick={() => onShift(1)}>1 sem →</button>
      </div>
    </div>
  );
}

// responsables de una tarea: si ya tiene assignee_ids (catálogo, tareas
// reales) se usan esos; si no (tareas sintéticas del panel, o tareas viejas
// sin migrar) se derivan del texto libre `resp`, con la misma unificación
// Ali/ALI/Alitzel -> "Ali".
function assigneesOfTask(t, catalog) {
  if (Array.isArray(t.assigneeIds) && t.assigneeIds.length) {
    return t.assigneeIds.map((id) => ({ k: id, label: catalog?.find((p) => p.id === id)?.label || id }));
  }
  return peopleOf(t.resp);
}

// "Bloqueada" ya no se elige a mano: se calcula solo si depende de otra
// actividad (del mismo cliente) que todavía no está Hecho.
function isDependencyBlocked(t, siblingTasks) {
  if (!t.dependsOn) return false;
  const dep = siblingTasks.find((x) => x.id === t.dependsOn);
  return !!dep && dep.status !== 'Hecho';
}

export default function GanttTab({ items, clients, tasks, onUpdateItemField, onSaveOccurrence, onCreateTask, onCreateClient, onUpdateTask, onDeleteTask, onUpdateClient }) {
  const [tab, setTab] = useState('super');
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
  const [statusFilter, setStatusFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [projectTypeFilter, setProjectTypeFilter] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [freqFilter, setFreqFilter] = useState([]);
  const [respFilter, setRespFilter] = useState([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

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
    items.forEach((i) => peopleOf(i.resp).forEach((p) => { if (!people.some((pp) => pp.id === p.k)) extra[p.k] = p.label; }));
    return [...people, ...Object.entries(extra).map(([id, label]) => ({ id, label }))];
  }, [people, tasks, items]);

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
    const as = assigneesOfTask(t, peopleCatalog);
    if (respFilter.length && !as.some((p) => respFilter.includes(p.label))) return false;
    if (hideDone && t.status === 'Hecho') return false;
    if (statusFilter.length && !statusFilter.includes(t.status || 'Pendiente')) return false;
    if (categoryFilter.length && !categoryFilter.includes(t.category || '(sin categoría)')) return false;
    if (projectTypeFilter.length && !projectTypeFilter.includes(t.projectType || '(sin tipo)')) return false;
    if (priorityFilter.length && !priorityFilter.includes(t.priority || '2')) return false;
    if (freqFilter.length && !freqFilter.includes(t.freq || 'One-shot')) return false;
    if (goToDate) {
      if (!t.start) return false;
      const end = t.end || t.start;
      if (goToDate < t.start || goToDate > end) return false;
    }
    return true;
  }

  const categoryOptions = useMemo(() => {
    const seen = new Set(allCategoryOptions());
    tasks.forEach((t) => { if (t.category) seen.add(t.category); });
    return [...seen];
  }, [tasks]);

  const respOptions = useMemo(() => {
    const seen = new Set();
    tasks.forEach((t) => assigneesOfTask(t, peopleCatalog).forEach((p) => seen.add(p.label)));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [tasks, peopleCatalog]);

  const CL = useMemo(() => allClients(clients, items), [clients, items]);
  const activeTab = CL.some((c) => c.id === tab) ? tab : 'super';
  const scale = SCALES[scaleKey];
  const headerGroup = HEADER_GROUP[scaleKey];

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
      if (task.needsMaterialize) {
        // Ocurrencia semanal/mensual que todavía no tiene fila propia en la
        // base de datos: se crea ahora, con los valores que ya traía la
        // fila (heredados de la plantilla) más lo que se acaba de editar.
        const occDate = task.occDate || task.start;
        if (!occDate) { toast('Esta ocurrencia no tiene fecha para guardar.'); return; }
        const merged = { ...task, ...patch };
        if (patch.assigneeIds) {
          merged.resp = patch.assigneeIds.map((id) => peopleCatalog.find((p) => p.id === id)?.label || id).join(', ');
        }
        const clientName = CL.find((c) => c.id === task.client)?.name || task.client;
        await onSaveOccurrence({
          id: `${task.baseId}__occ-${occDate}`,
          client: clientName,
          activity: merged.activity,
          resp: merged.resp,
          p: merged.priority,
          category: merged.category,
          deliverable: merged.deliverable,
          doc: merged.doc,
          desc: merged.note,
          projectType: merged.projectType,
          objectiveGeneral: merged.objectiveGeneral,
          objectiveParticular: merged.objectiveParticular,
          dependsOn: merged.dependsOn,
          reviewDate: merged.reviewDate,
          metric: merged.metric,
          hours: merged.hours,
          date: occDate,
          status: merged.status,
        });
        return;
      }
      // fila ya existente del panel de pendientes (plantilla u ocurrencia
      // puntual ya materializada): solo estos campos viven en `items`
      const itemId = task.id.slice(2);
      const map = {
        status: 'status', note: 'desc', activity: 'activity', category: 'category', deliverable: 'deliverable', doc: 'doc',
        priority: 'p', freq: 'freq', projectType: 'projectType', objectiveGeneral: 'objectiveGeneral', objectiveParticular: 'objectiveParticular', dependsOn: 'dependsOn',
        reviewDate: 'reviewDate', metric: 'metric', hours: 'hours',
      };
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'start' || k === 'end') await onUpdateItemField(itemId, 'date', v);
        else if (k === 'assigneeIds') {
          const labels = v.map((id) => peopleCatalog.find((p) => p.id === id)?.label || id).join(', ');
          await onUpdateItemField(itemId, 'resp', labels);
        }
        else if (map[k]) await onUpdateItemField(itemId, map[k], v);
        else toast('Ese campo no aplica a pendientes del panel.');
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

  function requestDelete(task) {
    setModal({ type: 'delete', taskId: task.id, task });
  }

  async function handleCreateTask(form) {
    const client = CL.find((c) => c.name.toLowerCase() === form.clientName.toLowerCase());
    let clientId = client ? client.id : slugify(form.clientName);
    if (!client) {
      const created = await onCreateClient(clientId, form.clientName);
      if (!created) return toast('No se pudo crear el cliente nuevo');
    }
    const assigneePeople = peopleOf(form.resp || '');
    for (const p of assigneePeople) {
      if (!peopleCatalog.some((pp) => pp.id === p.k)) await createPerson(p.label);
    }
    try {
      await onCreateTask({
        client: clientId,
        activity: form.activity,
        category: form.category,
        projectType: form.projectType,
        priority: form.priority,
        freq: form.freq,
        objectiveParticular: form.objectiveParticular,
        metric: form.metric,
        reviewDate: form.reviewDate,
        dependsOn: form.dependsOn,
        hours: form.hours,
        resp: form.resp,
        assigneeIds: assigneePeople.map((p) => p.k),
        status: form.status,
        start: form.start,
        end: form.end,
        deliverable: form.deliverable,
        note: form.note,
        dateKind: 'agreed',
      });
    } catch (e) {
      toast(e.message || 'No se pudo agregar el pendiente');
    }
  }

  function tasksForClientName(name) {
    const c = CL.find((x) => x.name.toLowerCase() === String(name || '').toLowerCase());
    return c ? tasksOf(c.id, clients, items, tasks, winStart, windowDays) : [];
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
    const assignees = assigneesOfTask(task, peopleCatalog);
    const isPanel = String(task.id).indexOf('p-') === 0;
    const sp = task.start ? span(task, winStart, windowDays) : null;
    const hidden = task.occ ? false : (!sp || sp.out);
    const c = client;
    const col = colorOf(c);
    const on = onColor(col);
    const overdue = isOverdue(task, todayStr());
    const dependency = task.dependsOn ? tasksOf(c.id, clients, items, tasks, winStart, windowDays).find((x) => x.id === task.dependsOn) : null;
    const dependencyPending = dependency && dependency.status !== 'Hecho';

    return (
      <div className={`gt-row${overdue ? ' gt-overdue' : ''}`}>
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
              {overdue && <span style={{ color: 'var(--red)', fontWeight: 700 }}>· atrasada</span>}
              <button
                type="button"
                onClick={() => openHistory(task)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 10 }}
                title="Ver historial de cambios"
              >
                🕘 historial
              </button>
              {!isPanel && (
                <button
                  type="button"
                  onClick={() => requestDelete(task)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 10 }}
                  title="Eliminar pendiente"
                >
                  🗑 eliminar
                </button>
              )}
            </div>
          </div>
        </ResizableCol>

        <ResizableCol width={colWidths.resp} onResize={(w) => resizeCol('resp', w)}>
          <PeoplePicker
            people={peopleCatalog}
            selectedIds={assignees.map((p) => p.k)}
            onChange={(ids) => saveTask(task, { assigneeIds: ids })}
            onCreatePerson={createPerson}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.client} onResize={(w) => resizeCol('client', w)}>
          {isPanel ? (
            <span style={{ fontSize: 12.5 }}>{client.name}</span>
          ) : (
            <select
              className="gt-date-input"
              style={{ fontFamily: 'inherit' }}
              value={task.client || ''}
              onChange={(e) => saveTask(task, { client: e.target.value })}
            >
              {CL.filter((x) => x.id !== 'super').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
        </ResizableCol>

        <ResizableCol width={colWidths.projectType} onResize={(w) => resizeCol('projectType', w)}>
          <select
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            value={task.projectType || ''}
            onChange={(e) => saveTask(task, { projectType: e.target.value })}
          >
            <option value="">—</option>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </ResizableCol>

        <ResizableCol width={colWidths.category} onResize={(w) => resizeCol('category', w)}>
          <input
            list={`gx-categories-${task.projectType ? task.projectType.replace(/[^a-z0-9]/gi, '') : 'all'}`}
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            defaultValue={task.category || ''}
            placeholder="—"
            onBlur={(e) => { if (e.target.value !== (task.category || '')) saveTask(task, { category: e.target.value }); }}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.priority} onResize={(w) => resizeCol('priority', w)}>
          <select
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            value={task.priority || '2'}
            onChange={(e) => saveTask(task, { priority: e.target.value })}
          >
            {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </ResizableCol>

        <ResizableCol width={colWidths.freq} onResize={(w) => resizeCol('freq', w)}>
          <select
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            value={task.freq || ''}
            onChange={(e) => saveTask(task, { freq: e.target.value })}
          >
            {FREQ_LABELS.map(([v, l]) => <option key={v || 'one'} value={v}>{l}</option>)}
          </select>
        </ResizableCol>

        <ResizableCol width={colWidths.hours} onResize={(w) => resizeCol('hours', w)}>
          <input
            type="number"
            min="0"
            step="0.25"
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            defaultValue={task.hours || ''}
            placeholder="—"
            title="Horas estimadas que te lleva esta actividad"
            onBlur={(e) => { if (e.target.value !== (task.hours || '')) saveTask(task, { hours: e.target.value }); }}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.status} onResize={(w) => resizeCol('status', w)}>
          <select
            className={`st st-${dependencyPending ? 'b' : SKEY[task.status] || 'p'}`}
            value={task.status || 'Pendiente'}
            onChange={(e) => requestStatusChange(task, e.target.value)}
            title={dependencyPending ? `Bloqueada — depende de: ${dependency.activity}` : undefined}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {dependencyPending && (
            <div style={{ fontSize: 9.5, color: 'var(--red)', marginTop: 2 }} title={`Depende de: ${dependency.activity}`}>
              ⛔ depende de tarea sin terminar
            </div>
          )}
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

        <ResizableCol width={colWidths.review} onResize={(w) => resizeCol('review', w)}>
          <input
            type="date"
            className="gt-date-input"
            value={task.reviewDate || ''}
            onChange={(e) => saveTask(task, { reviewDate: e.target.value })}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.dependsOn} onResize={(w) => resizeCol('dependsOn', w)}>
          <select
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            value={task.dependsOn || ''}
            onChange={(e) => saveTask(task, { dependsOn: e.target.value })}
          >
            <option value="">—</option>
            {tasksOf(c.id, clients, items, tasks, winStart, windowDays)
              .filter((x) => x.id !== task.id)
              .map((x) => <option key={x.id} value={x.id}>{x.activity}</option>)}
          </select>
        </ResizableCol>

        <ResizableCol width={colWidths.objectiveParticular} onResize={(w) => resizeCol('objectiveParticular', w)}>
          <AutoTextarea
            value={task.objectiveParticular}
            readOnly={isPanel}
            placeholder="¿Qué logra esta actividad?"
            onCommit={(v) => saveTask(task, { objectiveParticular: v })}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.metric} onResize={(w) => resizeCol('metric', w)}>
          <input
            list="gx-metrics"
            className="gt-date-input"
            style={{ fontFamily: 'inherit' }}
            defaultValue={task.metric || ''}
            placeholder="—"
            onBlur={(e) => { if (e.target.value !== (task.metric || '')) saveTask(task, { metric: e.target.value }); }}
          />
        </ResizableCol>

        <ResizableCol width={colWidths.deliverable} onResize={(w) => resizeCol('deliverable', w)}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <AutoTextarea
              value={task.deliverable}
              placeholder="Agregar entregable…"
              onCommit={(v) => saveTask(task, { deliverable: v })}
            />
            <DocLink value={task.doc} onCommit={(v) => saveTask(task, { doc: v })} />
          </div>
        </ResizableCol>

        <ResizableCol width={colWidths.barriers} onResize={(w) => resizeCol('barriers', w)}>
          <div style={{ width: '100%' }}>
            {dependencyPending && (
              <span className="gt-blocked-chip">⛔ Bloqueada — depende de &quot;{dependency.activity}&quot;</span>
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
              <ProgressBar task={task} sp={sp} color={col} onColorV={on} winStart={winStart} pxPerDay={scale.pxPerDay} blocked={dependencyPending} />
            </PercentPopover>
          )}
        </TimelineBars>
      </div>
    );
  }

  function ProgressBar({ task, sp, color, onColorV, winStart: ws, pxPerDay, blocked }) {
    if (task.occ) {
      return Object.keys(task.occ).sort().map((d) => {
        const i = (U(d) - ws) / DAY;
        if (i < 0 || i > windowDays - 1) return null;
        const st = task.occ[d].status;
        const cls = 'bar' + (st === 'Hecho' ? ' done' : '') + (st === 'Por confirmar' ? ' cnf' : '');
        return <div key={d} className={cls} style={{ '--s': i, '--l': 1, '--c': color, '--on': onColorV }} title={task.activity + ' · ' + fmt(d)}>{st === 'Hecho' ? '✓' : ''}</div>;
      });
    }
    if (!sp || sp.out) return null;
    const st = task.status;
    const pct = task.progress;
    if (task.milestone) {
      return <div className={'ms' + (blocked ? ' blk' : '') + (st === 'Hecho' ? ' done' : '')} style={{ '--s': sp.s, '--c': color }} title={task.activity}></div>;
    }
    const s0 = Math.max(sp.s, 0);
    const e0 = Math.min(sp.e, windowDays - 1);
    const l = e0 - s0 + 1;
    const cls = 'bar' + (sp.s < 0 ? ' cl' : '') + (sp.e > windowDays - 1 && task.end ? ' cr' : '') + (task.dateKind === 'inferred' ? ' est' : '') + (!task.end ? ' open' : '') +
      (st === 'Hecho' ? ' done' : '') + (blocked ? ' blk' : '') + (st === 'Por confirmar' ? ' cnf' : '');
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
            <span>{label}</span>
            {key === 'category' && (
              <ColumnFilter label="categoría" options={categoryOptions} selected={categoryFilter} onChange={setCategoryFilter} />
            )}
            {key === 'status' && (
              <ColumnFilter label="estatus" options={STATUSES} selected={statusFilter} onChange={setStatusFilter} />
            )}
            {key === 'projectType' && (
              <ColumnFilter label="tipo de proyecto" options={PROJECT_TYPES} selected={projectTypeFilter} onChange={setProjectTypeFilter} />
            )}
            {key === 'priority' && (
              <ColumnFilter label="prioridad" options={PRIORITIES.map(([v]) => v)} selected={priorityFilter} onChange={setPriorityFilter} />
            )}
            {key === 'freq' && (
              <ColumnFilter label="frecuencia" options={['One-shot', 'Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Mensual (1er lunes)']} selected={freqFilter} onChange={setFreqFilter} />
            )}
            {key === 'resp' && (
              <ColumnFilter label="responsable" options={respOptions} selected={respFilter} onChange={setRespFilter} />
            )}
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
                    <span className={`resp${isMine(t.resp) ? ' me' : ''}`}>{assigneesOfTask(t, peopleCatalog).map((p) => p.label).join(', ') || '—'}</span>
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
          <input
            type="date"
            className="gt-date-input"
            style={{ width: 140, border: goToDate ? '1px solid var(--coral)' : '1px solid var(--line)', background: '#fff' }}
            value={goToDate}
            title="Filtrar: muestra solo lo que pasa en este día"
            onChange={(e) => { setGoToDate(e.target.value); jumpToDate(e.target.value); }}
          />
          {goToDate && <button className="btn" onClick={() => setGoToDate('')}>Quitar filtro de fecha</button>}
          <button className="btn" onClick={() => viewFullProject(scopeTasks)}>Ver proyecto completo</button>
        </div>
      </div>
    );
  }

  function AdvisorBoard({ clientTaskLists }) {
    const { overdueByClient, planningGaps } = advisorWarnings(clientTaskLists);
    if (!overdueByClient.length && !planningGaps.length) return null;
    return (
      <div className="advisor-board">
        {overdueByClient.map(({ client, tasks: ts }) => (
          <div key={'ov-' + client.id} className="advisor-item">
            <b>⚠ {client.name}</b>
            {ts.length} pendiente(s) atrasada(s) sin fecha nueva: {ts.map((t) => t.activity).join(', ')}
          </div>
        ))}
        {planningGaps.map((client) => (
          <div key={'gap-' + client.id} className="advisor-item gap">
            <b>— {client.name}</b>
            sin ninguna próxima fecha planeada, le falta agendar siguiente paso.
          </div>
        ))}
      </div>
    );
  }

  function SuperView() {
    const allTasksFlat = [];
    CL.forEach((c) => allTasksFlat.push(...tasksOf(c.id, clients, items, tasks, winStart, windowDays)));
    const today = todayStr();
    const clientTaskLists = CL.map((c) => ({ client: c, tasks: tasksOf(c.id, clients, items, tasks, winStart, windowDays) }));

    const strip = CL.map((c) => {
      const ts = tasksOf(c.id, clients, items, tasks, winStart, windowDays);
      const open = ts.filter((t) => t.status !== 'Hecho');
      const blk = ts.filter((t) => isDependencyBlocked(t, ts)).length;
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
        <Controls hideDone={hideDone} onToggleDone={() => setHideDone((h) => !h)} onShift={shift} onToday={goToday} />
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
        <AdvisorBoard clientTaskLists={clientTaskLists} />
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
    const objectivePlaceholder = (c.projectTypes || []).map((t) => OBJECTIVE_TEMPLATES[t]).filter(Boolean)[0] || 'Define el objetivo general de este cliente…';
    const ownTasksUnfiltered = tasksOf(c.id, clients, items, tasks, winStart, windowDays);

    return (
      <>
        <div className="client-objective">
          <span className="client-objective-label">Objetivo General</span>
          <AutoTextarea
            value={c.objectiveGeneral}
            placeholder={objectivePlaceholder}
            onCommit={(v) => onUpdateClient(c.id, { objectiveGeneral: v })}
          />
        </div>
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
        <Controls hideDone={hideDone} onToggleDone={() => setHideDone((h) => !h)} onShift={shift} onToday={goToday} />
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
        <AdvisorBoard clientTaskLists={[{ client: c, tasks: ownTasksUnfiltered }]} />
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
          <button className="primary" onClick={() => setAddTaskOpen(true)}>+ Agregar pendiente</button>
        </div>
        <datalist id="gx-categories-all">
          {categoryOptions.map((c) => <option key={c} value={c} />)}
        </datalist>
        {PROJECT_TYPES.map((t) => (
          <datalist key={t} id={`gx-categories-${t.replace(/[^a-z0-9]/gi, '')}`}>
            {categoriesFor(t).map((c) => <option key={c} value={c} />)}
          </datalist>
        ))}
        <datalist id="gx-metrics">
          {METRIC_OPTIONS.map((m) => <option key={m} value={m} />)}
        </datalist>
        <div className="gx-tabs">
          <button className="gx-tab" aria-current={activeTab === 'super' ? 'page' : undefined} onClick={() => setTab('super')}>Super Gantt</button>
          {CL.map((c) => (
            <button key={c.id} className="gx-tab" aria-current={activeTab === c.id ? 'page' : undefined} onClick={() => setTab(c.id)}>
              <span className="dot" style={{ background: colorOf(c) }}></span>{c.name}
            </button>
          ))}
        </div>
        <div className="gx-tabs">
          {KJ_TEAM.map((label) => (
            <button
              key={label}
              className="gx-tab"
              aria-current={respFilter.includes(label) ? 'page' : undefined}
              onClick={() => setRespFilter((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]))}
            >
              {label}
            </button>
          ))}
        </div>
        {cur ? <ClientView c={cur} /> : <SuperView />}
      </div>

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
      <PromptModal
        open={modal?.type === 'delete'}
        title="Eliminar pendiente"
        message={`¿Seguro que quieres eliminar "${modal?.task?.activity || ''}"? Esta acción no se puede deshacer.`}
        mode="confirm"
        confirmLabel="Sí, eliminar"
        onConfirm={() => {
          onDeleteTask(modal.task.id);
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
      <HistoryModal open={!!historyModal} entries={historyModal?.entries || []} onClose={() => setHistoryModal(null)} />
      <AddTaskModal
        open={addTaskOpen}
        clients={CL}
        categories={categoryOptions}
        getTasksForClient={tasksForClientName}
        onClose={() => setAddTaskOpen(false)}
        onCreate={handleCreateTask}
      />
      <div className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>
    </section>
  );
}
