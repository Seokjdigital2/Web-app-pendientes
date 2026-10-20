import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJSON(name) {
  return JSON.parse(readFileSync(path.join(__dirname, '../seed-data', name), 'utf8'));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en el entorno. Ejemplo: DATABASE_URL=... npm run db:seed');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  const items = readJSON('items.json');
  const clients = readJSON('clients.json');
  const tasks = readJSON('tasks.json');

  console.log(`Insertando ${items.length} pendientes...`);
  for (const it of items) {
    await sql(
      `INSERT INTO items (id, resp, client, p, "order", activity, description, doc, date, freq, hours, status, is_history, seq)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         resp=$2, client=$3, p=$4, "order"=$5, activity=$6, description=$7, doc=$8, date=$9, freq=$10, hours=$11, status=$12, is_history=$13, seq=$14, updated_at=now()`,
      [
        it.id,
        it.resp || '',
        it.client || '',
        it.p || '2',
        it.order ?? 1,
        it.activity || '',
        it.desc || '',
        it.doc || '',
        it.date || '',
        it.freq || '',
        String(it.hours ?? ''),
        it.status || '',
        !!it.isHistory,
        it.seq ?? 0,
      ]
    );
  }

  console.log(`Insertando ${clients.length} clientes...`);
  for (const c of clients) {
    await sql(
      `INSERT INTO clients (id, name, color, "order", meetings, last_meeting, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         name=$2, color=$3, "order"=$4, meetings=$5, last_meeting=$6, updated_at=$7`,
      [
        c.id,
        c.name || c.id,
        c.color || '',
        c.order ?? 0,
        JSON.stringify(c.meetings || []),
        c.lastMeeting ? JSON.stringify(c.lastMeeting) : null,
        c.updatedAt || '',
      ]
    );
  }

  console.log(`Insertando ${tasks.length} tareas de Gantt...`);
  for (const t of tasks) {
    await sql(
      `INSERT INTO tasks (id, client, activity, category, date_kind, doc, start, "end", note, resp, source, status, milestone, meeting_url, meeting_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         client=$2, activity=$3, category=$4, date_kind=$5, doc=$6, start=$7, "end"=$8, note=$9, resp=$10, source=$11, status=$12, milestone=$13, meeting_url=$14, meeting_date=$15, updated_at=now()`,
      [
        t.id,
        t.client || '',
        t.activity || '',
        t.category || '',
        t.dateKind || '',
        t.doc || '',
        t.start || '',
        t.end || '',
        t.note || '',
        t.resp || '',
        t.source || '',
        t.status || '',
        !!t.milestone,
        t.meetingUrl || '',
        t.meetingDate || '',
      ]
    );
  }

  console.log('Seed completo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
