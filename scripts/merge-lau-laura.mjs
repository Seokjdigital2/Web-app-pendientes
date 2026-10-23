import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // asegura que "laura" exista en el catálogo con esa etiqueta
  await sql(`INSERT INTO people (id, label, "order") VALUES ('laura','Laura', (SELECT COALESCE(MAX("order"),0)+1 FROM people))
             ON CONFLICT (id) DO UPDATE SET label='Laura'`);

  const tasks = await sql("SELECT id, assignee_ids FROM tasks WHERE assignee_ids::text LIKE '%lau%'");
  let updated = 0;
  for (const t of tasks) {
    const ids = Array.isArray(t.assignee_ids) ? t.assignee_ids : [];
    if (!ids.includes('lau')) continue;
    const next = [...new Set(ids.map((id) => (id === 'lau' ? 'laura' : id)))];
    await sql('UPDATE tasks SET assignee_ids=$1 WHERE id=$2', [JSON.stringify(next), t.id]);
    updated++;
  }
  console.log('tasks con assignee_ids actualizado:', updated);

  const del = await sql("DELETE FROM people WHERE id='lau' RETURNING id");
  console.log('entrada "lau" eliminada del catálogo:', del.length > 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
