import { sql } from './db';
import { readFileSync } from 'fs';
import path from 'path';
import { peopleOf } from './gantt.js';

const hasDb = !!process.env.DATABASE_URL;

function readSeed(name) {
  const p = path.join(process.cwd(), 'seed-data', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

function itemFromRow(r) {
  return {
    id: r.id,
    resp: r.resp || '',
    client: r.client || '',
    p: r.p || '2',
    order: r.order ?? 1,
    activity: r.activity || '',
    desc: r.description || '',
    doc: r.doc || '',
    date: r.date || '',
    freq: r.freq || '',
    hours: r.hours ?? '',
    status: r.status || '',
    isHistory: !!r.is_history,
    seq: r.seq ?? 0,
    category: r.category || '',
    deliverable: r.deliverable || '',
    projectType: r.project_type || '',
    objectiveGeneral: r.objective_general || '',
    objectiveParticular: r.objective_particular || '',
    dependsOn: r.depends_on || '',
    reviewDate: r.review_date || '',
    metric: r.metric || '',
  };
}

function clientFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    color: r.color || '',
    order: r.order ?? 0,
    meetings: r.meetings || [],
    lastMeeting: r.last_meeting || null,
    updatedAt: r.updated_at || '',
    projectTypes: Array.isArray(r.project_types) ? r.project_types : [],
    objectiveGeneral: r.objective_general || '',
    active: r.active === null || r.active === undefined ? true : !!r.active,
  };
}

function taskFromRow(r) {
  return {
    id: r.id,
    client: r.client || '',
    activity: r.activity || '',
    category: r.category || '',
    dateKind: r.date_kind || '',
    doc: r.doc || '',
    start: r.start || '',
    end: r.end || '',
    note: r.note || '',
    resp: r.resp || '',
    source: r.source || '',
    status: r.status || '',
    milestone: !!r.milestone,
    meetingUrl: r.meeting_url || '',
    meetingDate: r.meeting_date || '',
    assigneeIds: Array.isArray(r.assignee_ids) ? r.assignee_ids : [],
    progress: r.progress === null || r.progress === undefined ? null : Number(r.progress),
    blockedReason: r.blocked_reason || '',
    deliverable: r.deliverable || '',
    projectType: r.project_type || '',
    priority: r.priority || '2',
    objectiveGeneral: r.objective_general || '',
    objectiveParticular: r.objective_particular || '',
    freq: r.freq || '',
    dependsOn: r.depends_on || '',
    reviewDate: r.review_date || '',
    metric: r.metric || '',
  };
}

function personFromRow(r) {
  return { id: r.id, label: r.label, order: r.order ?? 0 };
}

export async function listItems() {
  if (!hasDb) return readSeed('items.json');
  const rows = await sql('SELECT * FROM items ORDER BY seq ASC, id ASC');
  return rows.map(itemFromRow);
}

export async function createItem(data) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const id = data.id || `it_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const rows = await sql(
    `INSERT INTO items (id, resp, client, p, "order", activity, description, doc, date, freq, hours, status, is_history, category, deliverable, project_type, objective_general, objective_particular, depends_on, review_date, metric)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
    [
      id,
      data.resp || 'ALI',
      data.client || '',
      data.p || '2',
      data.order ?? 1,
      data.activity || '',
      data.desc || '',
      data.doc || '',
      data.date || '',
      data.freq || '',
      String(data.hours ?? ''),
      data.status || '',
      !!data.isHistory,
      data.category || '',
      data.deliverable || '',
      data.projectType || '',
      data.objectiveGeneral || '',
      data.objectiveParticular || '',
      data.dependsOn || '',
      data.reviewDate || '',
      data.metric || '',
    ]
  );
  return itemFromRow(rows[0]);
}

// Una tarea recurrente del panel (Weekly, Link building mensual, etc.) es
// una sola fila "plantilla" que se proyecta a varias fechas (`occ` en
// lib/gantt.js); esa fila plantilla NO representa ninguna ocurrencia en
// particular, así que marcar su `status` no cambiaba lo que se veía en el
// Gantt para la ocurrencia de esta semana. Esto crea (o actualiza, si ya
// existe) una fila histórica propia de esa fecha, que es lo que
// `calendarOccurrences`/`panelTasks` sí leen para pintar cada ocurrencia.
export async function upsertOccurrence(data) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const id = data.id;
  if (!id) throw new Error('occurrence.id es requerido');
  const rows = await sql(
    `INSERT INTO items (id, resp, client, p, "order", activity, description, doc, date, freq, hours, status, is_history, category, deliverable, project_type, objective_general, objective_particular, depends_on, review_date, metric)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'',$10,$11,true,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (id) DO UPDATE SET
       resp=$2, p=$4, activity=$6, description=$7, doc=$8, hours=$10, status=$11,
       category=$12, deliverable=$13, project_type=$14, objective_general=$15,
       objective_particular=$16, depends_on=$17, review_date=$18, metric=$19, updated_at=now()
     RETURNING *`,
    [
      id,
      data.resp || '',
      data.client || '',
      data.p || '2',
      data.order ?? 1,
      data.activity || '',
      data.desc || '',
      data.doc || '',
      data.date || '',
      String(data.hours ?? ''),
      data.status || '',
      data.category || '',
      data.deliverable || '',
      data.projectType || '',
      data.objectiveGeneral || '',
      data.objectiveParticular || '',
      data.dependsOn || '',
      data.reviewDate || '',
      data.metric || '',
    ]
  );
  return itemFromRow(rows[0]);
}

export async function updateItem(id, patch) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const fieldMap = {
    resp: 'resp',
    client: 'client',
    p: 'p',
    order: '"order"',
    activity: 'activity',
    desc: 'description',
    doc: 'doc',
    date: 'date',
    freq: 'freq',
    hours: 'hours',
    status: 'status',
    isHistory: 'is_history',
    category: 'category',
    deliverable: 'deliverable',
    projectType: 'project_type',
    objectiveGeneral: 'objective_general',
    objectiveParticular: 'objective_particular',
    dependsOn: 'depends_on',
    reviewDate: 'review_date',
    metric: 'metric',
  };
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in patch) {
      sets.push(`${col}=$${i++}`);
      vals.push(key === 'hours' ? String(patch[key] ?? '') : patch[key]);
    }
  }
  if (!sets.length) {
    const rows = await sql('SELECT * FROM items WHERE id=$1', [id]);
    return rows[0] ? itemFromRow(rows[0]) : null;
  }
  sets.push('updated_at=now()');
  vals.push(id);
  const rows = await sql(`UPDATE items SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals);
  return rows[0] ? itemFromRow(rows[0]) : null;
}

export async function deleteItem(id) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  await sql('DELETE FROM items WHERE id=$1', [id]);
}

export async function listClients(includeInactive = false) {
  if (!hasDb) return readSeed('clients.json');
  const rows = includeInactive
    ? await sql('SELECT * FROM clients ORDER BY "order" ASC, name ASC')
    : await sql('SELECT * FROM clients WHERE active IS NOT FALSE ORDER BY "order" ASC, name ASC');
  return rows.map(clientFromRow);
}

export async function updateClient(id, patch) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const fieldMap = { name: 'name', color: 'color', objectiveGeneral: 'objective_general', active: 'active' };
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in patch) {
      sets.push(`${col}=$${i++}`);
      vals.push(patch[key]);
    }
  }
  if ('projectTypes' in patch) {
    sets.push(`project_types=$${i++}`);
    vals.push(JSON.stringify(patch.projectTypes || []));
  }
  if (!sets.length) {
    const rows = await sql('SELECT * FROM clients WHERE id=$1', [id]);
    return rows[0] ? clientFromRow(rows[0]) : null;
  }
  vals.push(id);
  const rows = await sql(`UPDATE clients SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals);
  return rows[0] ? clientFromRow(rows[0]) : null;
}

export async function getClient(id) {
  if (!hasDb) return null;
  const rows = await sql('SELECT * FROM clients WHERE id=$1', [id]);
  return rows[0] ? clientFromRow(rows[0]) : null;
}

// Crea el cliente si todavía no existe (usado al agregar un pendiente para un
// cliente nuevo desde el Gantt); si ya existe, no toca nada.
export async function createClientIfMissing(id, name, projectTypes = []) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const existing = await getClient(id);
  if (existing) return existing;
  const countRows = await sql('SELECT COUNT(*)::int AS n FROM clients');
  const rows = await sql(
    `INSERT INTO clients (id, name, color, "order", meetings, last_meeting, updated_at, project_types)
     VALUES ($1,$2,'',$3,'[]',NULL,'',$4) RETURNING *`,
    [id, name, 900 + (countRows[0]?.n ?? 0), JSON.stringify(projectTypes)]
  );
  return clientFromRow(rows[0]);
}

// Usado por la sincronización de juntas de Tactiq: agrega/actualiza una junta
// de un cliente (crea el cliente si no existe) sin pisar las juntas ya guardadas.
export async function upsertClientMeeting(clientId, clientName, meeting) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const existing = await getClient(clientId);
  const meetings = existing ? existing.meetings.slice() : [];
  const already = meetings.some((m) => m.url ? m.url === meeting.url : (m.date === meeting.date && m.title === meeting.title));
  if (!already) {
    meetings.unshift({ date: meeting.date, title: meeting.title, url: meeting.url || '' });
  }
  const lastMeeting = {
    date: meeting.date,
    title: meeting.title,
    url: meeting.url || '',
    summary: meeting.summary || '',
    agreements: meeting.agreements || [],
  };
  if (existing) {
    const rows = await sql(
      `UPDATE clients SET meetings=$1, last_meeting=$2, updated_at=$3 WHERE id=$4 RETURNING *`,
      [JSON.stringify(meetings), JSON.stringify(lastMeeting), meeting.date, clientId]
    );
    return clientFromRow(rows[0]);
  }
  const countRows = await sql('SELECT COUNT(*)::int AS n FROM clients');
  const order = 900 + (countRows[0]?.n ?? 0);
  const rows = await sql(
    `INSERT INTO clients (id, name, color, "order", meetings, last_meeting, updated_at)
     VALUES ($1,$2,'',$3,$4,$5,$6) RETURNING *`,
    [clientId, clientName || clientId, order, JSON.stringify(meetings), JSON.stringify(lastMeeting), meeting.date]
  );
  return clientFromRow(rows[0]);
}

// Usado por /api/tactiq-sync: crea o actualiza una tarea de Gantt a partir de
// una junta. Deriva assignee_ids de `resp` (texto libre) con el mismo
// parser que unifica Ali/ALI/Alitzel, y da de alta cualquier persona nueva
// en el catálogo.
export async function upsertTask(data) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const id = data.id;
  if (!id) throw new Error('task.id es requerido');

  let assigneeIds = data.assigneeIds;
  if (!assigneeIds) {
    const people = peopleOf(data.resp || '');
    assigneeIds = people.map((p) => p.k);
    for (const p of people) await upsertPerson(p.k, p.label);
  }

  const status = data.status || 'Pendiente';
  const progress = data.progress ?? (status === 'Hecho' ? 100 : status === 'Pendiente' ? 0 : null);

  const rows = await sql(
    `INSERT INTO tasks (id, client, activity, category, date_kind, doc, start, "end", note, resp, source, status, milestone, meeting_url, meeting_date, assignee_ids, progress, blocked_reason, deliverable, project_type, priority, objective_particular, freq)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     ON CONFLICT (id) DO UPDATE SET
       -- en un conflicto (la tarea ya existía) solo se actualiza la metadata
       -- de la junta; estatus, fechas, avance, responsables y bloqueo se
       -- dejan intactos para no pisar silenciosamente una edición manual
       -- (ver punto 8 del rediseño del Gantt).
       category=tasks.category, doc=COALESCE(NULLIF(tasks.doc,''), $6),
       source=$11, meeting_url=$14, meeting_date=$15, updated_at=now()
     RETURNING *`,
    [
      id,
      data.client || '',
      data.activity || '',
      data.category || '',
      data.dateKind || '',
      data.doc || '',
      data.start || '',
      data.end || '',
      data.note || '',
      data.resp || '',
      data.source || '',
      status,
      !!data.milestone,
      data.meetingUrl || '',
      data.meetingDate || '',
      JSON.stringify(assigneeIds),
      progress,
      data.blockedReason || '',
      data.deliverable || '',
      data.projectType || '',
      data.priority || '2',
      data.objectiveParticular || '',
      data.freq || '',
    ]
  );
  return taskFromRow(rows[0]);
}

export async function listTasks() {
  if (!hasDb) return readSeed('tasks.json');
  const rows = await sql('SELECT * FROM tasks ORDER BY start ASC NULLS LAST, id ASC');
  return rows.map(taskFromRow);
}

export async function listPeople() {
  if (!hasDb) return [];
  const rows = await sql('SELECT * FROM people ORDER BY "order" ASC, label ASC');
  return rows.map(personFromRow);
}

export async function upsertPerson(id, label) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const countRows = await sql('SELECT COUNT(*)::int AS n FROM people');
  const rows = await sql(
    `INSERT INTO people (id, label, "order") VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET label=$2 RETURNING *`,
    [id, label, countRows[0]?.n ?? 0]
  );
  return personFromRow(rows[0]);
}

export async function createTask(data) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const id = data.id || `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const status = data.status || 'Pendiente';
  const progress = data.progress ?? (status === 'Hecho' ? 100 : status === 'Pendiente' ? 0 : null);
  const rows = await sql(
    `INSERT INTO tasks (id, client, activity, category, date_kind, doc, start, "end", note, resp, source, status, milestone, meeting_url, meeting_date, assignee_ids, progress, blocked_reason, deliverable, project_type, priority, objective_general, objective_particular, freq, depends_on, review_date, metric)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING *`,
    [
      id,
      data.client || '',
      data.activity || '',
      data.category || '',
      data.dateKind || '',
      data.doc || '',
      data.start || '',
      data.end || '',
      data.note || '',
      data.resp || '',
      data.source || '',
      status,
      !!data.milestone,
      data.meetingUrl || '',
      data.meetingDate || '',
      JSON.stringify(data.assigneeIds || []),
      progress,
      data.blockedReason || '',
      data.deliverable || '',
      data.projectType || '',
      data.priority || '2',
      data.objectiveGeneral || '',
      data.objectiveParticular || '',
      data.freq || '',
      data.dependsOn || '',
      data.reviewDate || '',
      data.metric || '',
    ]
  );
  return taskFromRow(rows[0]);
}

async function logTaskHistory(taskId, field, oldValue, newValue, note = '') {
  const toText = (v) => (v === null || v === undefined ? null : typeof v === 'string' ? v : JSON.stringify(v));
  await sql(
    'INSERT INTO task_history (task_id, field, old_value, new_value, note) VALUES ($1,$2,$3,$4,$5)',
    [taskId, field, toText(oldValue), toText(newValue), note]
  );
}

export async function getTaskHistory(taskId) {
  if (!hasDb) return [];
  const rows = await sql('SELECT * FROM task_history WHERE task_id=$1 ORDER BY changed_at DESC', [taskId]);
  return rows.map((r) => ({
    id: r.id,
    field: r.field,
    oldValue: r.old_value,
    newValue: r.new_value,
    note: r.note || '',
    changedAt: r.changed_at,
  }));
}

// "Bloqueado" no está aquí a propósito: ya no es un estatus que se guarda,
// se calcula solo a partir de "Depende de" (ver isDependencyBlocked en
// GanttTab.jsx), así que nunca debería llegar como valor real a guardar.
const BLOCKABLE_STATUSES = ['Pendiente', 'En proceso', 'En aprobación', 'Por confirmar', 'Pospuesto', 'Hecho'];

// Aplica las reglas de coherencia estatus<->avance, valida fechas, y
// registra en el historial los campos que cambien. Lanza un Error con
// `.code` cuando el cambio pedido necesita más información del usuario
// (confirmación de reinicio de avance, % al reabrir).
export async function updateTask(id, patch) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const rows0 = await sql('SELECT * FROM tasks WHERE id=$1', [id]);
  if (!rows0[0]) throw new Error('Tarea no encontrada');
  const current = taskFromRow(rows0[0]);

  const next = { ...current, ...patch };

  // fechas: no permitir entrega antes de inicio
  if (next.start && next.end && next.end < next.start) {
    const err = new Error('La fecha de entrega no puede ser anterior a la de inicio');
    err.code = 'invalid_dates';
    throw err;
  }

  // coherencia estatus <-> avance
  if ('status' in patch && !('progress' in patch)) {
    if (next.status === 'Hecho') next.progress = 100;
    else if (next.status === 'Pendiente') next.progress = 0;
    else if (current.status === 'Hecho' && next.status !== 'Hecho') {
      // reabrir una tarea hecha: pedir el % actualizado en vez de dejarla abierta con 100%
      const err = new Error('Esta tarea estaba Hecha (100%). Indica el nuevo % de avance al reabrirla.');
      err.code = 'progress_required_on_reopen';
      throw err;
    }
  }
  if ('progress' in patch && !('status' in patch)) {
    const p = Number(patch.progress);
    if (p >= 100) next.status = 'Hecho';
    else if (p > 0 && current.status === 'Pendiente') next.status = 'En proceso';
  }
  if (!BLOCKABLE_STATUSES.includes(next.status)) {
    throw new Error(`Estatus inválido: ${next.status}`);
  }

  const fieldMap = {
    client: 'client',
    activity: 'activity',
    category: 'category',
    dateKind: 'date_kind',
    doc: 'doc',
    start: 'start',
    end: '"end"',
    note: 'note',
    resp: 'resp',
    source: 'source',
    status: 'status',
    milestone: 'milestone',
    deliverable: 'deliverable',
    projectType: 'project_type',
    priority: 'priority',
    objectiveGeneral: 'objective_general',
    objectiveParticular: 'objective_particular',
    freq: 'freq',
    dependsOn: 'depends_on',
    reviewDate: 'review_date',
    metric: 'metric',
  };
  const sets = [];
  const vals = [];
  let i = 1;
  const finalPatch = { ...patch };
  if (next.progress !== current.progress) finalPatch.progress = next.progress;
  if (next.status !== current.status) finalPatch.status = next.status;

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in finalPatch) {
      sets.push(`${col}=$${i++}`);
      vals.push(finalPatch[key]);
    }
  }
  if ('assigneeIds' in finalPatch) {
    sets.push(`assignee_ids=$${i++}`);
    vals.push(JSON.stringify(finalPatch.assigneeIds || []));
  }
  if ('progress' in finalPatch) {
    sets.push(`progress=$${i++}`);
    vals.push(finalPatch.progress === null || finalPatch.progress === undefined ? null : Number(finalPatch.progress));
  }
  if ('blockedReason' in finalPatch) {
    sets.push(`blocked_reason=$${i++}`);
    vals.push(finalPatch.blockedReason || '');
  }

  if (!sets.length) return current;
  sets.push('updated_at=now()');
  vals.push(id);
  const rows = await sql(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals);
  const saved = taskFromRow(rows[0]);

  const historyFields = ['status', 'progress', 'assigneeIds', 'start', 'end', 'blockedReason', 'dependsOn', 'priority'];
  for (const f of historyFields) {
    if (f in finalPatch) {
      const oldV = current[f];
      const newV = saved[f];
      const changed = Array.isArray(oldV) || Array.isArray(newV) ? JSON.stringify(oldV) !== JSON.stringify(newV) : oldV !== newV;
      if (changed) await logTaskHistory(id, f, oldV, newV);
    }
  }

  return saved;
}

export async function deleteTask(id) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  await sql('DELETE FROM tasks WHERE id=$1', [id]);
}

export const dbConnected = hasDb;
