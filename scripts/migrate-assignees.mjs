// Migración de datos (no de esquema): construye el catálogo de personas a
// partir del texto libre en tasks.resp, unificando Ali/ALI/Alitzel en una
// sola persona ("ali" -> "Ali"), y llena assignee_ids. También inicializa
// progress para Pendiente (0) y Hecho (100) cuando todavía es NULL.
import { neon } from '@neondatabase/serverless';
import { peopleOf } from '../lib/gantt.js';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tasks = await sql('SELECT id, resp, status, progress, assignee_ids FROM tasks');
  const peopleSeen = new Map(); // id -> label

  let updated = 0;
  for (const t of tasks) {
    const already = Array.isArray(t.assignee_ids) ? t.assignee_ids : [];
    if (already.length) {
      // ya migrado: solo registra las personas en el catálogo
      continue;
    }
    const people = peopleOf(t.resp || '');
    people.forEach((p) => {
      if (!peopleSeen.has(p.k)) peopleSeen.set(p.k, p.label);
    });
    const ids = people.map((p) => p.k);
    if (ids.length) {
      await sql('UPDATE tasks SET assignee_ids=$1 WHERE id=$2', [JSON.stringify(ids), t.id]);
      updated++;
    }
  }

  let order = 0;
  for (const [id, label] of peopleSeen) {
    await sql(
      `INSERT INTO people (id, label, "order") VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [id, label, order++]
    );
  }

  const prog = await sql(
    `UPDATE tasks SET progress=0 WHERE status='Pendiente' AND progress IS NULL RETURNING id`
  );
  const progDone = await sql(
    `UPDATE tasks SET progress=100 WHERE status='Hecho' AND progress IS NULL RETURNING id`
  );

  console.log(`tareas con assignee_ids llenado: ${updated}`);
  console.log(`personas en el catálogo: ${peopleSeen.size} (${[...peopleSeen.values()].join(', ')})`);
  console.log(`progress inicializado en 0 (Pendiente): ${prog.length}`);
  console.log(`progress inicializado en 100 (Hecho): ${progDone.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
