import { sql } from './db';
import { readFileSync } from 'fs';
import path from 'path';

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
  };
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
    `INSERT INTO items (id, resp, client, p, "order", activity, description, doc, date, freq, hours, status, is_history)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
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

export async function listClients() {
  if (!hasDb) return readSeed('clients.json');
  const rows = await sql('SELECT * FROM clients ORDER BY "order" ASC, name ASC');
  return rows.map(clientFromRow);
}

export async function getClient(id) {
  if (!hasDb) return null;
  const rows = await sql('SELECT * FROM clients WHERE id=$1', [id]);
  return rows[0] ? clientFromRow(rows[0]) : null;
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

export async function upsertTask(data) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const id = data.id;
  if (!id) throw new Error('task.id es requerido');
  const rows = await sql(
    `INSERT INTO tasks (id, client, activity, category, date_kind, doc, start, "end", note, resp, source, status, milestone, meeting_url, meeting_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO UPDATE SET
       client=$2, activity=$3, category=$4, date_kind=$5, doc=$6, start=$7, "end"=$8, note=$9, resp=$10, source=$11, status=$12, milestone=$13, meeting_url=$14, meeting_date=$15, updated_at=now()
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
      data.status || 'Pendiente',
      !!data.milestone,
      data.meetingUrl || '',
      data.meetingDate || '',
    ]
  );
  return taskFromRow(rows[0]);
}

export async function listTasks() {
  if (!hasDb) return readSeed('tasks.json');
  const rows = await sql('SELECT * FROM tasks ORDER BY start ASC NULLS LAST, id ASC');
  return rows.map(taskFromRow);
}

export async function createTask(data) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  const id = data.id || `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const rows = await sql(
    `INSERT INTO tasks (id, client, activity, category, date_kind, doc, start, "end", note, resp, source, status, milestone, meeting_url, meeting_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
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
      data.status || 'Pendiente',
      !!data.milestone,
      data.meetingUrl || '',
      data.meetingDate || '',
    ]
  );
  return taskFromRow(rows[0]);
}

export async function updateTask(id, patch) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
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
  };
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in patch) {
      sets.push(`${col}=$${i++}`);
      vals.push(patch[key]);
    }
  }
  if (!sets.length) {
    const rows = await sql('SELECT * FROM tasks WHERE id=$1', [id]);
    return rows[0] ? taskFromRow(rows[0]) : null;
  }
  sets.push('updated_at=now()');
  vals.push(id);
  const rows = await sql(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, vals);
  return rows[0] ? taskFromRow(rows[0]) : null;
}

export async function deleteTask(id) {
  if (!hasDb) throw new Error('DATABASE_URL no configurada');
  await sql('DELETE FROM tasks WHERE id=$1', [id]);
}

export const dbConnected = hasDb;
